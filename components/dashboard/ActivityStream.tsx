"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, CircleDot, PauseCircle, XCircle } from "lucide-react";
import { Ticket, TicketStatus, PRIORITY_TONES, PRIORITY_LABELS } from "@/types";
import { formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { SLABadge } from "@/components/tickets/SLABadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Inbox } from "lucide-react";

interface ActivityStreamProps {
  tickets: Ticket[];
  limit?: number;
}

const STATUS_META: Record<TicketStatus, { icon: React.ElementType; color: string; verb: string }> = {
  open: { icon: CircleDot, color: "var(--ops-cyan)", verb: "aberto" },
  in_progress: { icon: Clock3, color: "var(--ops-amber)", verb: "em atendimento" },
  waiting_user: { icon: PauseCircle, color: "var(--ops-violet)", verb: "aguardando usuário" },
  resolved: { icon: CheckCircle2, color: "var(--ops-emerald)", verb: "resolvido" },
  closed: { icon: XCircle, color: "var(--text-muted)", verb: "fechado" },
};

export function ActivityStream({ tickets, limit = 8 }: ActivityStreamProps) {
  const feed = [...tickets]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);

  return (
    <div className="surface-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <span className="ops-live-dot" style={{ color: "var(--ops-emerald)" }} aria-hidden />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Live Operations</h2>
        </div>
        <Link href="/tickets" className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: "var(--brand)" }}>
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {feed.length === 0 ? (
        <EmptyState icon={Inbox} title="Nenhuma atividade ainda" description="Quando houver movimentação nos chamados, ela aparece aqui em tempo real." />
      ) : (
        <div className="relative px-5 py-2">
          {/* linha vertical da timeline */}
          <div className="absolute left-[27px] top-2 bottom-2 w-px" style={{ background: "var(--border)" }} />

          {feed.map((ticket, i) => {
            const meta = STATUS_META[ticket.status];
            const Icon = meta.icon;
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="relative flex items-start gap-3 py-2.5 group"
                >
                  <div
                    className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--surface)", border: `1.5px solid ${meta.color}` }}
                  >
                    <Icon className="w-3 h-3" style={{ color: meta.color }} />
                  </div>

                  <div className="flex-1 min-w-0 pb-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{ticket.ticket_number}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                      <span className="text-xs" style={{ color: meta.color }}>{meta.verb}</span>
                      <SLABadge ticket={ticket} size="sm" />
                    </div>
                    <p className="text-sm font-medium truncate mt-0.5 group-hover:text-indigo-500 transition-colors" style={{ color: "var(--text-primary)" }}>
                      {ticket.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge tone={PRIORITY_TONES[ticket.priority]}>{PRIORITY_LABELS[ticket.priority]}</Badge>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {ticket.assigned_to_user?.name ?? ticket.created_by_user?.name} · {formatRelativeDate(ticket.updated_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
