import type { SupabaseClient } from "@supabase/supabase-js";
import { Ticket, Comment, User, SLAConfig, DashboardStats, TicketStatus, TicketPriority, TicketCategory } from "@/types";

/**
 * Toda função aqui recebe o client Supabase como primeiro argumento, em vez
 * de importar um singleton fixo. Motivo: em Server Components / Route
 * Handlers o client precisa estar amarrado aos cookies da requisição
 * (lib/supabase-server.ts) para que `auth.uid()` exista nas policies de
 * RLS; no browser, o client é o singleton de lib/supabase.ts. Usar o client
 * errado em cada contexto faz selects voltarem vazios e inserts/updates
 * falharem silenciosamente contra as políticas do schema.sql.
 */

// ─── TICKETS ──────────────────────────────────────────────────────────────────

export async function getTickets(
  client: SupabaseClient,
  filters?: {
    status?: TicketStatus | "all";
    priority?: TicketPriority | "all";
    search?: string;
    assigned_to?: string;
    created_by?: string;
  }
) {
  let query = client
    .from("tickets")
    .select(`
      *,
      created_by_user:users!tickets_created_by_fkey(id, name, email, department, role),
      assigned_to_user:users!tickets_assigned_to_fkey(id, name, email, department, role)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`);
  }
  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }
  if (filters?.created_by) {
    query = query.eq("created_by", filters.created_by);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Ticket[];
}

export async function getTicketById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("tickets")
    .select(`
      *,
      created_by_user:users!tickets_created_by_fkey(id, name, email, department, role),
      assigned_to_user:users!tickets_assigned_to_fkey(id, name, email, department, role),
      comments(
        *,
        author:users(id, name, email, role)
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Ticket;
}

export async function createTicket(
  client: SupabaseClient,
  payload: {
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    created_by: string;
  }
) {
  // Generate ticket number
  const { count } = await client.from("tickets").select("*", { count: "exact", head: true });
  const ticketNumber = `TKT-${String((count || 0) + 1).padStart(3, "0")}`;

  // Calculate SLA deadline
  const slaHours: Record<TicketPriority, number> = {
    low: 72, medium: 24, high: 8, critical: 4,
  };
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + slaHours[payload.priority]);

  const { data, error } = await client
    .from("tickets")
    .insert({
      ...payload,
      ticket_number: ticketNumber,
      status: "open",
      sla_deadline: deadline.toISOString(),
      sla_breached: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Ticket;
}

export async function updateTicket(client: SupabaseClient, id: string, updates: Partial<Ticket>) {
  const payload: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };

  if (updates.status === "resolved" && !updates.resolved_at) {
    payload.resolved_at = new Date().toISOString();
  }
  if (updates.status === "closed" && !updates.closed_at) {
    payload.closed_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from("tickets")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Ticket;
}

// ─── COMMENTS ─────────────────────────────────────────────────────────────────

export async function addComment(
  client: SupabaseClient,
  payload: {
    ticket_id: string;
    author_id: string;
    content: string;
    is_internal: boolean;
  }
) {
  const { data, error } = await client
    .from("comments")
    .insert(payload)
    .select(`*, author:users(id, name, email, role)`)
    .single();

  if (error) throw error;

  // Update ticket updated_at
  await client
    .from("tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", payload.ticket_id);

  return data as Comment;
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function getUsers(client: SupabaseClient) {
  const { data, error } = await client
    .from("users")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as User[];
}

export async function getUserById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as User;
}

export async function upsertUser(client: SupabaseClient, user: Partial<User> & { id: string; email: string }) {
  const { data, error } = await client
    .from("users")
    .upsert(user, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data as User;
}

// ─── SLA ──────────────────────────────────────────────────────────────────────

export async function getSLAConfigs(client: SupabaseClient) {
  const { data, error } = await client
    .from("sla_configs")
    .select("*")
    .order("response_hours");
  if (error) throw error;
  return data as SLAConfig[];
}

export async function updateSLAConfig(client: SupabaseClient, id: string, updates: Partial<SLAConfig>) {
  const { data, error } = await client
    .from("sla_configs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as SLAConfig;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getDashboardStats(client: SupabaseClient): Promise<DashboardStats> {
  const [tickets, resolved] = await Promise.all([
    client.from("tickets").select("status, priority, category, sla_breached, created_at, resolved_at"),
    client
      .from("tickets")
      .select("resolved_at, created_at")
      .in("status", ["resolved", "closed"])
      .not("resolved_at", "is", null),
  ]);

  if (tickets.error) throw tickets.error;
  if (resolved.error) throw resolved.error;

  const all = tickets.data || [];
  const resolvedList = resolved.data || [];

  const today = new Date().toDateString();
  const resolvedToday = resolvedList.filter(
    (t) => t.resolved_at && new Date(t.resolved_at).toDateString() === today
  ).length;

  const avgResolution =
    resolvedList.length > 0
      ? resolvedList.reduce((acc, t) => {
          if (!t.resolved_at) return acc;
          const diff = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
          return acc + diff;
        }, 0) / resolvedList.length
      : 0;

  // Category breakdown
  const catMap: Record<string, number> = {};
  all.forEach((t) => {
    catMap[t.category] = (catMap[t.category] || 0) + 1;
  });

  // Priority breakdown
  const priMap: Record<string, number> = {};
  all.forEach((t) => {
    priMap[t.priority] = (priMap[t.priority] || 0) + 1;
  });

  // 7-day trend
  const trend: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = resolvedList.filter(
      (t) => t.resolved_at && new Date(t.resolved_at).toDateString() === dateStr
    ).length;
    trend.push({ date: label, count });
  }

  const CATEGORY_MAP: Record<string, string> = {
    hardware: "Hardware", software: "Software", network: "Rede", access: "Acesso", other: "Outros",
  };
  const PRIORITY_MAP: Record<string, string> = {
    critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa",
  };

  return {
    total_open: all.filter((t) => t.status === "open").length,
    total_in_progress: all.filter((t) => t.status === "in_progress").length,
    total_resolved_today: resolvedToday,
    total_sla_breached: all.filter((t) => t.sla_breached).length,
    avg_resolution_hours: Math.round(avgResolution * 10) / 10,
    tickets_by_category: Object.entries(catMap).map(([k, v]) => ({ category: CATEGORY_MAP[k] || k, count: v })),
    tickets_by_priority: Object.entries(priMap).map(([k, v]) => ({ priority: PRIORITY_MAP[k] || k, count: v })),
    resolution_trend: trend,
  };
}

// ─── AUDIT EVENTS ─────────────────────────────────────────────────────────────

export async function getAuditEvents(client: SupabaseClient, ticketId: string) {
  const { data, error } = await client
    .from("audit_events")
    .select("*, actor:users(id, name, email, role)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertAuditEvent(
  client: SupabaseClient,
  payload: { ticket_id: string; actor_id: string; action: string; meta: Record<string, unknown> }
) {
  const { data, error } = await client.from("audit_events").insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ─── ATTACHMENTS ──────────────────────────────────────────────────────────────

export async function getAttachments(client: SupabaseClient, ticketId: string) {
  const { data, error } = await client
    .from("attachments")
    .select("*, uploader:users(id, name, email)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
