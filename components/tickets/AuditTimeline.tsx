"use client";
import { AuditEvent, AuditAction } from "@/types";
import { formatRelativeDate } from "@/lib/utils";
import {
  PlusCircle, UserCheck, RefreshCw, MessageSquare,
  Lock, Paperclip, AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";

const ACTION_CONFIG: Record<AuditAction, {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: (meta: Record<string, string | number | boolean | null>) => string;
}> = {
  ticket_created:      { icon: PlusCircle,    color: "var(--brand)",   bg: "rgba(99,102,241,0.1)", label: () => "Ticket criado" },
  status_changed:      { icon: RefreshCw,     color: "var(--text-secondary)", bg: "rgba(148,163,184,0.1)", label: (m) => `Status: ${m.from} → ${m.to}` },
  priority_changed:    { icon: AlertTriangle, color: "var(--warning)", bg: "var(--warning-light)", label: (m) => `Prioridade alterada para ${m.to}` },
  assigned:            { icon: UserCheck,     color: "var(--success)", bg: "var(--success-light)", label: (m) => `Atribuído para ${m.to_name}` },
  unassigned:          { icon: UserCheck,     color: "var(--text-muted)", bg: "rgba(148,163,184,0.1)", label: () => "Responsável removido" },
  comment_added:       { icon: MessageSquare, color: "var(--brand)",   bg: "rgba(99,102,241,0.1)", label: (m) => `Comentário: "${m.preview}"` },
  internal_note_added: { icon: Lock,          color: "var(--warning)", bg: "var(--warning-light)", label: (m) => `Nota interna: "${m.preview}"` },
  attachment_added:    { icon: Paperclip,     color: "var(--text-secondary)", bg: "rgba(148,163,184,0.1)", label: (m) => `Arquivo anexado: ${m.filename}` },
  sla_breached:        { icon: AlertTriangle, color: "var(--danger)",  bg: "var(--danger-light)",  label: () => "SLA violado" },
  resolved:            { icon: CheckCircle,   color: "var(--success)", bg: "var(--success-light)", label: () => "Ticket resolvido" },
  closed:              { icon: XCircle,       color: "var(--text-muted)", bg: "rgba(148,163,184,0.1)", label: () => "Ticket encerrado" },
};

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  if (!events.length) return (
    <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Nenhum evento registrado</p>
  );

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />

      <div className="space-y-4">
        {events.map((ev, idx) => {
          const cfg = ACTION_CONFIG[ev.action];
          const Icon = cfg.icon;
          return (
            <div key={ev.id} className="flex gap-3 relative">
              {/* Icon dot */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
              >
                <Icon size={13} style={{ color: cfg.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {ev.actor?.name ?? "Sistema"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {cfg.label(ev.meta)}
                  </span>
                  <span className="text-xs ml-auto whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {formatRelativeDate(ev.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
