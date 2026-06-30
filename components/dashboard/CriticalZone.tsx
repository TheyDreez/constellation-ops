"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { Ticket } from "@/types";
import { calculateSLAStatus } from "@/lib/sla-engine";

interface CriticalZoneProps {
  tickets: Ticket[];
}

export function CriticalZone({ tickets }: CriticalZoneProps) {
  const critical = tickets
    .filter((t) => t.status !== "resolved" && t.status !== "closed")
    .map((t) => ({ ticket: t, sla: calculateSLAStatus(t) }))
    .filter((x) => x.sla.level === "danger" || x.sla.level === "breached")
    .sort((a, b) => (a.sla.hoursRemaining ?? 0) - (b.sla.hoursRemaining ?? 0));

  if (critical.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border ops-noise overflow-hidden"
      style={{ borderColor: "rgba(220,38,38,0.3)", background: "var(--danger-light)" }}
    >
      <div className="flex items-center gap-2.5 px-5 py-3 border-b" style={{ borderColor: "rgba(220,38,38,0.2)" }}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--danger)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
          Zona de Atenção Crítica
        </h2>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "var(--danger)", color: "white" }}
        >
          {critical.length}
        </span>
        <span className="ml-auto" />
      </div>

      <div className="divide-y" style={{ borderColor: "rgba(220,38,38,0.15)" }}>
        {critical.slice(0, 5).map(({ ticket, sla }) => (
          <Link
            key={ticket.id}
            href={`/tickets/${ticket.id}`}
            className="flex items-center gap-3 px-5 py-3 group transition-colors hover:bg-red-500/5"
          >
            <span
              className="ops-live-dot flex-shrink-0"
              style={{ color: sla.level === "breached" ? "var(--danger)" : "#f97316" }}
            />
            <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              {ticket.ticket_number}
            </span>
            <p className="text-sm font-medium truncate flex-1" style={{ color: "var(--text-primary)" }}>
              {ticket.title}
            </p>
            <span
              className="text-xs font-semibold flex-shrink-0"
              style={{ color: sla.level === "breached" ? "var(--danger)" : "#f97316" }}
            >
              {sla.label}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }} />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
