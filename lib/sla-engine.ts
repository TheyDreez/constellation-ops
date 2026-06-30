import { Ticket, TicketPriority, SLAConfig } from "@/types";

export type SLARiskLevel = "safe" | "warning" | "danger" | "breached" | "paused" | "none";

export interface SLAStatus {
  level: SLARiskLevel;
  label: string;
  hoursRemaining: number | null;
  percentUsed: number;
  deadline: Date | null;
}

/**
 * Calcula o status de SLA de um ticket em tempo real.
 * - safe: > 50% do tempo restante
 * - warning: entre 20% e 50% do tempo restante
 * - danger: < 20% do tempo restante (risco iminente)
 * - breached: prazo expirado
 * - paused: ticket aguardando o usuário (SLA não corre)
 * - none: ticket resolvido/fechado ou sem deadline
 */
export function calculateSLAStatus(ticket: Ticket): SLAStatus {
  if (ticket.status === "resolved" || ticket.status === "closed") {
    return { level: "none", label: "Finalizado", hoursRemaining: null, percentUsed: 100, deadline: null };
  }

  if (ticket.status === "waiting_user") {
    return { level: "paused", label: "SLA pausado", hoursRemaining: null, percentUsed: 0, deadline: null };
  }

  if (!ticket.sla_deadline) {
    return { level: "none", label: "Sem SLA", hoursRemaining: null, percentUsed: 0, deadline: null };
  }

  const deadline = new Date(ticket.sla_deadline);
  const created = new Date(ticket.created_at);
  const now = new Date();

  const totalMs = deadline.getTime() - created.getTime();
  const elapsedMs = now.getTime() - created.getTime();
  const remainingMs = deadline.getTime() - now.getTime();
  const hoursRemaining = remainingMs / 3600000;
  const percentUsed = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  if (remainingMs <= 0) {
    return {
      level: "breached",
      label: `Violado há ${formatHours(Math.abs(hoursRemaining))}`,
      hoursRemaining,
      percentUsed: 100,
      deadline,
    };
  }

  if (percentUsed >= 80) {
    return {
      level: "danger",
      label: `${formatHours(hoursRemaining)} restantes`,
      hoursRemaining,
      percentUsed,
      deadline,
    };
  }

  if (percentUsed >= 50) {
    return {
      level: "warning",
      label: `${formatHours(hoursRemaining)} restantes`,
      hoursRemaining,
      percentUsed,
      deadline,
    };
  }

  return {
    level: "safe",
    label: `${formatHours(hoursRemaining)} restantes`,
    hoursRemaining,
    percentUsed,
    deadline,
  };
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d ${Math.round(hours % 24)}h`;
}

export function calculateSLADeadline(priority: TicketPriority, configs: SLAConfig[]): Date {
  const config = configs.find((c) => c.priority === priority);
  const hours = config?.resolution_hours || 24;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

/**
 * Estatísticas agregadas de SLA para o dashboard/relatórios.
 */
export interface SLAMetrics {
  totalActive: number;
  compliant: number;
  breached: number;
  atRisk: number; // danger level, ainda não violado
  compliancePercent: number;
  avgResolutionHours: number;
}

export function calculateSLAMetrics(tickets: Ticket[]): SLAMetrics {
  const active = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const finished = tickets.filter((t) => t.status === "resolved" || t.status === "closed");

  const breached = tickets.filter((t) => t.sla_breached).length;
  const atRisk = active.filter((t) => calculateSLAStatus(t).level === "danger").length;

  const finishedTotal = finished.length;
  const finishedCompliant = finished.filter((t) => !t.sla_breached).length;
  const compliancePercent = finishedTotal > 0 ? Math.round((finishedCompliant / finishedTotal) * 100) : 100;

  const avgResolutionHours =
    finished.length > 0
      ? finished.reduce((acc, t) => {
          if (!t.resolved_at) return acc;
          const diff = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
          return acc + diff;
        }, 0) / finished.length
      : 0;

  return {
    totalActive: active.length,
    compliant: finishedCompliant,
    breached,
    atRisk,
    compliancePercent,
    avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
  };
}

export const SLA_RISK_STYLES: Record<SLARiskLevel, { bg: string; text: string; border: string; dot: string }> = {
  safe:     { bg: "bg-[var(--tone-green-bg)]",  text: "text-[var(--tone-green-text)]",  border: "border-[var(--tone-green-border)]",  dot: "bg-[var(--tone-green-text)]" },
  warning:  { bg: "bg-[var(--tone-amber-bg)]",  text: "text-[var(--tone-amber-text)]",  border: "border-[var(--tone-amber-border)]",  dot: "bg-[var(--tone-amber-text)]" },
  danger:   { bg: "bg-[var(--tone-orange-bg)]", text: "text-[var(--tone-orange-text)]", border: "border-[var(--tone-orange-border)]", dot: "bg-[var(--tone-orange-text)]" },
  breached: { bg: "bg-[var(--tone-red-bg)]",    text: "text-[var(--tone-red-text)]",    border: "border-[var(--tone-red-border)]",    dot: "bg-[var(--tone-red-text)]" },
  paused:   { bg: "bg-[var(--tone-purple-bg)]", text: "text-[var(--tone-purple-text)]", border: "border-[var(--tone-purple-border)]", dot: "bg-[var(--tone-purple-text)]" },
  none:     { bg: "bg-[var(--tone-gray-bg)]",   text: "text-[var(--tone-gray-text)]",   border: "border-[var(--tone-gray-border)]",   dot: "bg-[var(--tone-gray-text)]" },
};
