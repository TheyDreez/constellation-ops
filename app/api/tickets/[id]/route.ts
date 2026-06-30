import { NextRequest, NextResponse } from "next/server";
import { getTicketById, updateTicket } from "@/lib/db";
import { emailTicketResolved } from "@/lib/email";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAuthUser, E } from "@/lib/api-helpers";
import {
  canViewAllTickets,
  canUpdateTicket,
  canCloseTicket,
  canChangePriority,
  getAllowedTransitions,
} from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    const { id } = await params;

    if (!supabase) {
      const { MOCK_TICKETS } = await import("@/lib/mock-data");
      const ticket = MOCK_TICKETS.find(t => t.id === id);
      if (!ticket) return E.notFound("Ticket");

      // Usuário comum só vê os próprios
      if (!canViewAllTickets(authUser.role) && ticket.created_by !== authUser.id) {
        return E.forbidden("Você não tem acesso a este ticket");
      }
      return NextResponse.json(ticket);
    }

    const ticket = await getTicketById(supabase, id);

    // Usuário comum só vê os próprios
    if (!canViewAllTickets(authUser.role) && ticket.created_by !== authUser.id) {
      return E.forbidden("Você não tem acesso a este ticket");
    }

    return NextResponse.json(ticket);
  } catch (e) {
    return E.notFound("Ticket");
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    // RBAC: só support/admin pode atualizar tickets
    if (!canUpdateTicket(authUser.role)) {
      return E.forbidden("Apenas suporte ou admin pode atualizar tickets");
    }

    const { id } = await params;
    const body = await req.json();

    // Validar campos permitidos (whitelist)
    const ALLOWED_FIELDS = ["status", "priority", "assigned_to", "sla_deadline"];
    const forbidden = Object.keys(body).filter(k => !ALLOWED_FIELDS.includes(k));
    if (forbidden.length > 0) {
      return E.badRequest(`Campos não permitidos: ${forbidden.join(", ")}`);
    }

    if (!supabase) {
      return NextResponse.json({ id, ...body });
    }

    const prev = await getTicketById(supabase, id);

    // Validar transição de status
    if (body.status && body.status !== prev.status) {
      const allowed = getAllowedTransitions(authUser.role, prev.status);
      if (!allowed.includes(body.status)) {
        return E.badRequest(
          `Transição de "${prev.status}" para "${body.status}" não permitida para o perfil ${authUser.role}`
        );
      }
    }

    // Fechar ticket: só admin/support
    if (body.status === "closed" && !canCloseTicket(authUser.role)) {
      return E.forbidden("Apenas suporte ou admin pode fechar tickets");
    }

    // Mudar prioridade: só admin/support
    if (body.priority && !canChangePriority(authUser.role)) {
      return E.forbidden("Apenas suporte ou admin pode alterar a prioridade");
    }

    const ticket = await updateTicket(supabase, id, body);

    if (body.status === "resolved" && prev.status !== "resolved") {
      const { data: creator } = await supabase
        .from("users").select("email").eq("id", ticket.created_by).single();
      if (creator?.email) await emailTicketResolved(ticket, creator.email);
    }

    return NextResponse.json(ticket);
  } catch (e) {
    return E.internal(e);
  }
}
