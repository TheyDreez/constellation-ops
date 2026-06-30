import { NextRequest, NextResponse } from "next/server";
import { createTicket, getTickets } from "@/lib/db";
import { emailTicketCreated } from "@/lib/email";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAuthUser, E, isRateLimited } from "@/lib/api-helpers";
import { canViewAllTickets } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    const { searchParams } = new URL(req.url);

    const filters: Parameters<typeof getTickets>[1] = {
      status:   (searchParams.get("status") as any)   || "all",
      priority: (searchParams.get("priority") as any) || "all",
      search:   searchParams.get("search") || undefined,
    };

    // Usuários comuns só veem os próprios tickets
    if (!canViewAllTickets(authUser.role)) {
      filters.created_by = authUser.id;
    }

    if (!supabase) {
      const { MOCK_TICKETS } = await import("@/lib/mock-data");
      return NextResponse.json(MOCK_TICKETS);
    }

    const tickets = await getTickets(supabase, filters);
    return NextResponse.json(tickets);
  } catch (e) {
    return E.internal(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 tickets por minuto por IP
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (isRateLimited(`create-ticket:${ip}`, 10, 60_000)) {
      return E.badRequest("Muitas requisições. Aguarde um momento.");
    }

    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    const body = await req.json();

    // Validate required fields
    if (!body.title?.trim())       return E.badRequest("title é obrigatório");
    if (!body.description?.trim()) return E.badRequest("description é obrigatório");
    if (body.title.trim().length < 10) return E.badRequest("title deve ter pelo menos 10 caracteres");
    if (body.description.trim().length < 20) return E.badRequest("description deve ter pelo menos 20 caracteres");

    // Usuário comum não pode criar ticket crítico diretamente
    if (body.priority === "critical" && authUser.role === "user") {
      body.priority = "high"; // eleva para revisão do suporte
    }

    if (!supabase) {
      return NextResponse.json({ id: "mock", ...body, created_by: authUser.id }, { status: 201 });
    }

    const ticket = await createTicket(supabase, { ...body, created_by: authUser.id });

    const { data: supportUsers } = await supabase
      .from("users").select("email").in("role", ["admin", "support"]);
    const supportEmails = (supportUsers || []).map((u: any) => u.email);
    await emailTicketCreated(ticket, authUser.email, supportEmails);

    return NextResponse.json(ticket, { status: 201 });
  } catch (e) {
    return E.internal(e);
  }
}
