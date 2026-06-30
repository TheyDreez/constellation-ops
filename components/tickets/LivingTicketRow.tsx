"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, CircleDot, Clock3, PauseCircle, CheckCircle2, XCircle } from "lucide-react";
import { Ticket, TicketStatus, TicketPriority, CATEGORY_LABELS } from "@/types";
import { calculateSLAStatus, SLA_RISK_STYLES } from "@/lib/sla-engine";
import { formatRelativeDate } from "@/lib/utils";

interface LivingTicketRowProps {
  ticket: Ticket;
  index: number;
}

const STATUS_META: Record<TicketStatus, { icon: React.ElementType; color: string; verb: string }> = {
  open: { icon: CircleDot, color: "var(--ops-cyan)", verb: "Aberto" },
  in_progress: { icon: Clock3, color: "var(--ops-amber)", verb: "Em atendimento" },
  waiting_user: { icon: PauseCircle, color: "var(--ops-violet)", verb: "Aguardando usuário" },
  resolved: { icon: CheckCircle2, color: "var(--ops-emerald)", verb: "Resolvido" },
  closed: { icon: XCircle, color: "var(--text-muted)", verb: "Fechado" },
};

const PRIORITY_ACCENT: Record<TicketPriority, string> = {
  critical: "var(--danger)",
  high: "#f97316",
  medium: "var(--ops-amber)",
  low: "var(--text-muted)",
};

export function LivingTicketRow({ ticket, index }: LivingTicketRowProps) {
  const meta = STATUS_META[ticket.status];
  const Icon = meta.icon;
  const sla = calculateSLAStatus(ticket);
  const slaStyle = SLA_RISK_STYLES[sla.level];
  const showSlaBar = sla.level !== "none" && sla.level !== "paused";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 12) * 0.025 }}
    >
      <Link
        href={`/tickets/${ticket.id}`}
        className="group relative flex items-center gap-4 pl-4 pr-4 py-3.5 transition-colors hover:bg-[var(--surface-hover)]"
      >
        {/* Accent de prioridade */}
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
          style={{ background: PRIORITY_ACCENT[ticket.priority], opacity: ticket.priority === "low" ? 0.3 : 0.85 }}
        />

        {/* Estado */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--surface)", border: `1.5px solid ${meta.color}` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
        </div>

        {/* Contexto principal */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{ticket.ticket_number}</span>
            <span className="text-[11px]" style={{ color: meta.color }}>{meta.verb}</span>
            <span className="text-[11px] hidden sm:inline" style={{ color: "var(--text-muted)" }}>
              · {CATEGORY_LABELS[ticket.category]}
            </span>
          </div>
          <p
            className="text-sm font-medium truncate mt-0.5 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors"
            style={{ color: "var(--text-primary)" }}
          >
            {ticket.title}
          </p>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
            {ticket.created_by_user?.name} · atualizado {formatRelativeDate(ticket.updated_at)}
          </p>
        </div>

        {/* SLA — barra viva em vez de badge solta */}
        <div className="hidden md:flex flex-col items-end w-32 flex-shrink-0 gap-1">
          {showSlaBar ? (
            <>
              <span className={`text-[11px] font-medium ${slaStyle.text}`}>{sla.label}</span>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${sla.percentUsed}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${slaStyle.dot}`}
                />
              </div>
            </>
          ) : (
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {sla.level === "paused" ? "SLA pausado" : "Sem SLA"}
            </span>
          )}
        </div>

        {/* Responsável */}
        <div className="hidden lg:flex items-center gap-2 w-28 flex-shrink-0">
          {ticket.assigned_to_user ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: "rgba(99,102,241,0.12)", color: "var(--brand)" }}
              >
                {ticket.assigned_to_user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                {ticket.assigned_to_user.name.split(" ")[0]}
              </span>
            </>
          ) : (
            <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>Não atribuído</span>
          )}
        </div>

        <ChevronRight
          className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        />
      </Link>
    </motion.div>
  );
}
