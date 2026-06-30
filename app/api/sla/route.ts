import { NextRequest, NextResponse } from "next/server";
import { getSLAConfigs, updateSLAConfig } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const configs = await getSLAConfigs(supabase);
    return NextResponse.json(configs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;
    const config = await updateSLAConfig(supabase, id, updates);
    return NextResponse.json(config);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
