/**
 * RBAC — controle de acesso baseado em perfil.
 *
 * Centraliza TODAS as regras de autorização em um único lugar.
 * As API routes importam daqui; a UI usa os mesmos predicados para
 * decidir o que mostrar — garantindo consistência entre camadas.
 */

import { UserRole, TicketStatus } from "@/types";

// ─── Predicados de permissão ───────────────────────────────────────────────────

/** Pode ver qualquer ticket (não só os próprios) */
export function canViewAllTickets(role: UserRole) {
  return role === "admin" || role === "support";
}

/** Pode mudar status, atribuir responsável */
export function canUpdateTicket(role: UserRole) {
  return role === "admin" || role === "support";
}

/** Pode fechar (close) um ticket */
export function canCloseTicket(role: UserRole) {
  return role === "admin" || role === "support";
}

/** Pode deletar ticket */
export function canDeleteTicket(role: UserRole) {
  return role === "admin";
}

/** Pode adicionar nota interna */
export function canAddInternalNote(role: UserRole) {
  return role === "admin" || role === "support";
}

/** Pode ver nota interna */
export function canViewInternalNotes(role: UserRole) {
  return role === "admin" || role === "support";
}

/** Pode criar/editar usuários */
export function canManageUsers(role: UserRole) {
  return role === "admin";
}

/** Pode acessar painel admin (SLA, relatórios) */
export function canAccessAdmin(role: UserRole) {
  return role === "admin" || role === "support";
}

/** Pode fazer upload de anexo em um ticket */
export function canAddAttachment(role: UserRole, isCreator: boolean) {
  return role === "admin" || role === "support" || isCreator;
}

/** Pode deletar anexo */
export function canDeleteAttachment(role: UserRole, isUploader: boolean) {
  return role === "admin" || isUploader;
}

/** Pode alterar prioridade */
export function canChangePriority(role: UserRole) {
  return role === "admin" || role === "support";
}

// ─── Transições de status permitidas por perfil ────────────────────────────────

const USER_ALLOWED_TRANSITIONS: Partial<Record<TicketStatus, TicketStatus[]>> = {
  waiting_user: ["open"], // usuário pode reabrir se estiver aguardando resposta
};

const SUPPORT_ALLOWED_TRANSITIONS: Partial<Record<TicketStatus, TicketStatus[]>> = {
  open:         ["in_progress", "waiting_user", "resolved", "closed"],
  in_progress:  ["waiting_user", "resolved", "closed", "open"],
  waiting_user: ["in_progress", "resolved", "closed", "open"],
  resolved:     ["closed", "open"],
  closed:       ["open"],
};

export function getAllowedTransitions(
  role: UserRole,
  current: TicketStatus
): TicketStatus[] {
  if (role === "admin" || role === "support") {
    return SUPPORT_ALLOWED_TRANSITIONS[current] ?? [];
  }
  return USER_ALLOWED_TRANSITIONS[current] ?? [];
}

// ─── Helper para API routes ────────────────────────────────────────────────────

export type RBACError = { error: string; status: 403 | 401 };

export function requireRole(
  role: UserRole | null | undefined,
  check: (r: UserRole) => boolean,
  message = "Permissão negada"
): RBACError | null {
  if (!role) return { error: "Não autorizado", status: 401 };
  if (!check(role)) return { error: message, status: 403 };
  return null;
}
