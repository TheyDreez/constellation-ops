import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAuthUser, E, isRateLimited } from "@/lib/api-helpers";
import { canManageUsers, canAccessAdmin } from "@/lib/rbac";

export async function GET() {
  try {
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    if (!canAccessAdmin(authUser.role)) return E.forbidden("Acesso restrito a admins e suporte");

    if (!supabase) {
      const { MOCK_USERS } = await import("@/lib/mock-data");
      return NextResponse.json(MOCK_USERS);
    }

    const users = await getUsers(supabase);
    return NextResponse.json(users);
  } catch (e) {
    return E.internal(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (isRateLimited(`create-user:${ip}`, 5, 60_000)) return E.badRequest("Limite atingido");

    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();
    if (!canManageUsers(authUser.role)) return E.forbidden("Apenas admin pode criar usuários");

    const body = await req.json();
    if (!body.name?.trim())  return E.badRequest("name é obrigatório");
    if (!body.email?.trim()) return E.badRequest("email é obrigatório");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return E.badRequest("email inválido");

    const VALID_ROLES = ["admin", "support", "user"];
    if (body.role && !VALID_ROLES.includes(body.role)) return E.badRequest("role inválido");

    if (!supabase) return NextResponse.json({ id: `u${Date.now()}`, ...body, created_at: new Date().toISOString() }, { status: 201 });

    const { data, error } = await supabase
      .from("users")
      .insert({ name: body.name, email: body.email, role: body.role ?? "user", department: body.department ?? null })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return E.internal(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();
    if (!canManageUsers(authUser.role)) return E.forbidden("Apenas admin pode editar usuários");

    const body = await req.json();
    if (!body.id) return E.badRequest("id é obrigatório");

    // Prevent self-demotion
    if (body.id === authUser.id && body.role && body.role !== "admin") {
      return E.forbidden("Você não pode alterar o próprio perfil de admin");
    }

    if (!supabase) return NextResponse.json({ ...body });

    const ALLOWED = ["name", "role", "department"];
    const update = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)));
    const { data, error } = await supabase.from("users").update(update).eq("id", body.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return E.internal(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();
    if (!canManageUsers(authUser.role)) return E.forbidden("Apenas admin pode excluir usuários");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return E.badRequest("id é obrigatório");
    if (id === authUser.id) return E.forbidden("Você não pode excluir o próprio usuário");

    if (!supabase) return NextResponse.json({ deleted: true });

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return E.internal(e);
  }
}
