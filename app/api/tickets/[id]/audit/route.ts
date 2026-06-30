import { NextRequest, NextResponse } from "next/server";
import { getAuditEvents } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAuthUser, E } from "@/lib/api-helpers";
import { canViewAllTickets } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    const { id } = await params;

    if (!supabase) {
      const { MOCK_AUDIT } = await import("@/lib/mock-audit");
      return NextResponse.json(MOCK_AUDIT.filter(a => a.ticket_id === id));
    }

    const events = await getAuditEvents(supabase, id);
    return NextResponse.json(events);
  } catch (e) {
    return E.internal(e);
  }
}
