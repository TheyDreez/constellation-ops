import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const stats = await getDashboardStats(supabase);
    return NextResponse.json(stats);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
