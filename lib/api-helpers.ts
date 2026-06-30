/**
 * Helpers compartilhados pelas API routes:
 * - Obter usuário autenticado com papel (role)
 * - Respostas de erro padronizadas
 * - Rate limiting simples em memória (prod: use Redis/Upstash)
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User, UserRole } from "@/types";
import { CURRENT_USER } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase";

// ─── Erro padronizado ──────────────────────────────────────────────────────────

export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export const E = {
  unauthorized: () => apiError("Não autenticado", 401),
  forbidden:    (msg = "Permissão negada") => apiError(msg, 403),
  notFound:     (res = "Recurso") => apiError(`${res} não encontrado`, 404),
  badRequest:   (msg: string) => apiError(msg, 400),
  internal:     (e: unknown) => apiError("Erro interno", 500, e instanceof Error ? e.message : e),
};

// ─── Usuário autenticado ───────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  email: string;
}

/**
 * Retorna o usuário autenticado com role.
 * Em modo mock (sem Supabase), retorna CURRENT_USER.
 */
export async function getAuthUser(
  supabase?: SupabaseClient
): Promise<AuthenticatedUser | null> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: CURRENT_USER.id,
      role: CURRENT_USER.role,
      email: CURRENT_USER.email,
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return { id: user.id, role: profile.role as UserRole, email: profile.email };
}

// ─── Rate limiting simples ─────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; reset: number }>();

/**
 * Limite por IP/user: `max` requisições a cada `windowMs` ms.
 * Retorna true se o limite foi atingido.
 */
export function isRateLimited(
  key: string,
  max = 30,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.reset < now) {
    rateLimitMap.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count++;
  if (entry.count > max) return true;
  return false;
}
