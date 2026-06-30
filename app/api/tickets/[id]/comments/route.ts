import { NextRequest, NextResponse } from "next/server";
import { addComment, getTicketById } from "@/lib/db";
import { emailNewComment } from "@/lib/email";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAuthUser, E, isRateLimited } from "@/lib/api-helpers";
import { canViewAllTickets, canAddInternalNote } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (isRateLimited(`comment:${ip}`, 20, 60_000)) {
      return E.badRequest("Muitas requisições. Aguarde um momento.");
    }

    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    const { id } = await params;
    const body = await req.json();

    // Validar conteúdo
    if (!body.content?.trim()) return E.badRequest("content é obrigatório");
    if (body.content.trim().length < 3) return E.badRequest("Comentário muito curto");
    if (body.content.length > 10_000) return E.badRequest("Comentário muito longo (máx 10.000 caracteres)");

    // Nota interna: só support/admin
    if (body.is_internal && !canAddInternalNote(authUser.role)) {
      return E.forbidden("Apenas suporte ou admin pode adicionar notas internas");
    }

    if (!supabase) {
      return NextResponse.json({
        id: `c${Date.now()}`,
        ticket_id: id,
        author_id: authUser.id,
        content: body.content,
        is_internal: body.is_internal || false,
        created_at: new Date().toISOString(),
      }, { status: 201 });
    }

    // Verificar acesso ao ticket
    const ticket = await getTicketById(supabase, id);
    if (!canViewAllTickets(authUser.role) && ticket.created_by !== authUser.id) {
      return E.forbidden("Você não tem acesso a este ticket");
    }

    const comment = await addComment(supabase, {
      ticket_id: id,
      author_id: authUser.id,
      content: body.content,
      is_internal: body.is_internal || false,
    });

    // Notificar criador se comentário público e autor diferente
    if (!comment.is_internal && ticket.created_by !== authUser.id) {
      const { data: creator } = await supabase
        .from("users").select("email").eq("id", ticket.created_by).single();
      if (creator?.email) await emailNewComment(ticket, comment, creator.email);
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    return E.internal(e);
  }
}
