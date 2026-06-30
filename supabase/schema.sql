-- ============================================================
-- HelpDesk - Schema completo para Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- ============================================================

-- Extensão para UUID
create extension if not exists "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null,
  role        text not null default 'user' check (role in ('admin', 'support', 'user')),
  department  text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.users enable row level security;

-- Usuários podem ver todos os outros usuários
create policy "Users are viewable by authenticated users"
  on public.users for select
  using (auth.role() = 'authenticated');

-- Usuário pode atualizar seus próprios dados
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Admin pode inserir/atualizar qualquer usuário
create policy "Admins can manage users"
  on public.users for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── TICKETS ────────────────────────────────────────────────
create table public.tickets (
  id              uuid primary key default uuid_generate_v4(),
  ticket_number   text not null unique,
  title           text not null,
  description     text not null,
  status          text not null default 'open'
                  check (status in ('open','in_progress','waiting_user','resolved','closed')),
  priority        text not null default 'medium'
                  check (priority in ('low','medium','high','critical')),
  category        text not null default 'other'
                  check (category in ('hardware','software','network','access','other')),
  created_by      uuid not null references public.users(id),
  assigned_to     uuid references public.users(id),
  sla_deadline    timestamptz,
  sla_breached    boolean not null default false,
  resolved_at     timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.tickets enable row level security;

-- Usuário vê os próprios tickets; suporte/admin vê todos
create policy "Users see own tickets, support/admin see all"
  on public.tickets for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'support')
    )
  );

-- Qualquer usuário autenticado pode criar ticket
create policy "Authenticated users can create tickets"
  on public.tickets for insert
  with check (auth.uid() = created_by);

-- Suporte/admin podem atualizar qualquer ticket
create policy "Support and admin can update tickets"
  on public.tickets for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'support')
    )
  );

-- ─── COMMENTS ───────────────────────────────────────────────
create table public.comments (
  id          uuid primary key default uuid_generate_v4(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  author_id   uuid not null references public.users(id),
  content     text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.comments enable row level security;

-- Comentários públicos visíveis para quem pode ver o ticket
-- Notas internas apenas para suporte/admin
create policy "Comments visibility"
  on public.comments for select
  using (
    (is_internal = false and (
      auth.uid() = (select created_by from public.tickets where id = ticket_id)
      or exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'support'))
    ))
    or (is_internal = true and exists (
      select 1 from public.users where id = auth.uid() and role in ('admin', 'support')
    ))
  );

create policy "Authenticated users can comment"
  on public.comments for insert
  with check (auth.uid() = author_id);

-- ─── SLA CONFIGS ────────────────────────────────────────────
create table public.sla_configs (
  id               uuid primary key default uuid_generate_v4(),
  priority         text not null unique check (priority in ('low','medium','high','critical')),
  response_hours   int not null,
  resolution_hours int not null
);

alter table public.sla_configs enable row level security;

create policy "SLA configs viewable by authenticated"
  on public.sla_configs for select
  using (auth.role() = 'authenticated');

create policy "Only admins can update SLA"
  on public.sla_configs for update
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

-- ─── SEED: SLA padrão ───────────────────────────────────────
insert into public.sla_configs (priority, response_hours, resolution_hours) values
  ('low',      24, 72),
  ('medium',    8, 24),
  ('high',      4,  8),
  ('critical',  1,  4);

-- ─── FUNCTION: auto-criar user na tabela após signup ────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── FUNCTION: verificar SLA breach ─────────────────────────
create or replace function public.check_sla_breaches()
returns void language plpgsql security definer
as $$
begin
  update public.tickets
  set sla_breached = true
  where
    sla_deadline < now()
    and sla_breached = false
    and status not in ('resolved', 'closed');
end;
$$;

-- ─── REALTIME ────────────────────────────────────────────────
-- Habilitar realtime para tickets e comentários
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.comments;


-- ─── ATTACHMENTS ─────────────────────────────────────────────────────────────

create table if not exists public.attachments (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  comment_id    uuid references public.comments(id) on delete set null,
  uploaded_by   uuid not null references public.users(id),
  filename      text not null,
  size_bytes    bigint not null default 0,
  mime_type     text not null default 'application/octet-stream',
  url           text not null,
  created_at    timestamptz not null default now()
);

create index if not exists attachments_ticket_id_idx on public.attachments(ticket_id);
create index if not exists attachments_uploaded_by_idx on public.attachments(uploaded_by);

alter table public.attachments enable row level security;

create policy "attachments_select" on public.attachments
  for select using (
    auth.uid() in (
      select id from public.users where role in ('admin','support')
    )
    or uploaded_by = auth.uid()
    or ticket_id in (
      select id from public.tickets where created_by = auth.uid()
    )
  );

create policy "attachments_insert" on public.attachments
  for insert with check (
    uploaded_by = auth.uid()
    and (
      auth.uid() in (select id from public.users where role in ('admin','support'))
      or ticket_id in (select id from public.tickets where created_by = auth.uid())
    )
  );

create policy "attachments_delete" on public.attachments
  for delete using (
    uploaded_by = auth.uid()
    or auth.uid() in (select id from public.users where role = 'admin')
  );

-- ─── AUDIT EVENTS ─────────────────────────────────────────────────────────────

create table if not exists public.audit_events (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets(id) on delete cascade,
  actor_id   uuid references public.users(id) on delete set null,
  action     text not null,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_events_ticket_id_idx on public.audit_events(ticket_id);
create index if not exists audit_events_created_at_idx on public.audit_events(created_at desc);

alter table public.audit_events enable row level security;

create policy "audit_events_select" on public.audit_events
  for select using (
    auth.uid() in (select id from public.users where role in ('admin','support'))
    or ticket_id in (select id from public.tickets where created_by = auth.uid())
  );

create policy "audit_events_insert" on public.audit_events
  for insert with check (
    actor_id = auth.uid()
  );

-- ─── Supabase Storage bucket for attachments ──────────────────────────────────
-- Run once in the Supabase dashboard > Storage > New bucket
-- Name: attachments, Public: true
--   (precisa ser público porque app/api/tickets/[id]/attachments/route.ts usa
--   getPublicUrl() para gerar o link salvo em attachments.url; se o bucket for
--   privado esse link retorna 400/403 ao ser acessado. Acesso à *linha* do
--   anexo já é restrito pelas RLS policies acima — o arquivo em si só é
--   alcançável por quem conhece a URL completa, que nunca é exposta a quem
--   não tem permissão de ver o ticket.)
-- Ou via CLI: supabase storage create attachments --public

-- O bucket por si só não basta: o Storage do Supabase guarda os arquivos na
-- tabela interna storage.objects, que também tem RLS própria. Sem as
-- policies abaixo, todo upload/delete feito pela rota de API falha com
-- "new row violates row-level security policy" mesmo o bucket sendo público
-- (público controla apenas LEITURA, não escrita).
create policy "attachments_bucket_upload" on storage.objects
  for insert with check (
    bucket_id = 'attachments' and auth.role() = 'authenticated'
  );

create policy "attachments_bucket_read" on storage.objects
  for select using (bucket_id = 'attachments');

create policy "attachments_bucket_delete" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and (
      owner = auth.uid()
      or auth.uid() in (select id from public.users where role in ('admin', 'support'))
    )
  );

-- ─── Trigger: auto-insert audit event on ticket update ────────────────────────

create or replace function public.fn_audit_ticket_update()
returns trigger language plpgsql security definer as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_events(ticket_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if old.priority is distinct from new.priority then
    insert into public.audit_events(ticket_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'priority_changed',
      jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;
  if old.assigned_to is distinct from new.assigned_to then
    insert into public.audit_events(ticket_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'assigned',
      jsonb_build_object('to', new.assigned_to));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_ticket_update on public.tickets;
create trigger trg_audit_ticket_update
  after update on public.tickets
  for each row execute function public.fn_audit_ticket_update();

-- Trigger: auto-insert audit event on comment insert

create or replace function public.fn_audit_comment_insert()
returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_events(ticket_id, actor_id, action, meta)
  values (new.ticket_id, new.author_id,
    case when new.is_internal then 'internal_note_added' else 'comment_added' end,
    jsonb_build_object('preview', left(new.content, 60)));
  return new;
end;
$$;

drop trigger if exists trg_audit_comment_insert on public.comments;
create trigger trg_audit_comment_insert
  after insert on public.comments
  for each row execute function public.fn_audit_comment_insert();
