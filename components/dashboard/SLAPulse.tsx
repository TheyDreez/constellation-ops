"use client";
import { motion } from "framer-motion";
import { Ticket } from "@/types";
import { calculateSLAStatus, SLARiskLevel } from "@/lib/sla-engine";

interface SLAPulseProps {
  tickets: Ticket[];
}

const LEVEL_META: Record<SLARiskLevel, { label: string; color: string }> = {
  safe: { label: "Tranquilo", color: "var(--ops-emerald)" },
  warning: { label: "Atenção", color: "var(--ops-amber)" },
  danger: { label: "Risco alto", color: "#f97316" },
  breached: { label: "Violado", color: "var(--danger)" },
  paused: { label: "Pausado", color: "var(--ops-violet)" },
  none: { label: "Sem SLA", color: "var(--text-muted)" },
};

const ORDER: SLARiskLevel[] = ["breached", "danger", "warning", "safe", "paused", "none"];

export function SLAPulse({ tickets }: SLAPulseProps) {
  const active = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const counts = active.reduce((acc, t) => {
    const level = calculateSLAStatus(t).level;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<SLARiskLevel, number>);

  const total = active.length || 1;
  const mostCritical = ORDER.find((l) => (counts[l] || 0) > 0) || "none";

  return (
    <div className="surface-card ops-noise rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          SLA Pulse
        </span>
        <span className="ops-live-dot" style={{ color: LEVEL_META[mostCritical].color }} aria-hidden />
      </div>

      {/* Heartbeat bar — segmentos proporcionais por nível de risco */}
      <div className="flex h-9 rounded-lg overflow-hidden mb-4" style={{ background: "var(--surface-hover)" }}>
        {ORDER.filter((l) => (counts[l] || 0) > 0).map((level) => {
          const pct = ((counts[level] || 0) / total) * 100;
          return (
            <motion.div
              key={level}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full relative"
              style={{ background: LEVEL_META[level].color, opacity: 0.85 }}
              title={`${LEVEL_META[level].label}: ${counts[level]}`}
            />
          );
        })}
      </div>

      <div className="space-y-2 flex-1">
        {ORDER.filter((l) => l !== "none").map((level) => {
          const count = counts[level] || 0;
          return (
            <div key={level} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: LEVEL_META[level].color }} />
                <span style={{ color: "var(--text-secondary)" }}>{LEVEL_META[level].label}</span>
              </div>
              <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{count}</span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] mt-3 pt-3 border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        {active.length} ticket{active.length !== 1 ? "s" : ""} ativo{active.length !== 1 ? "s" : ""} monitorado{active.length !== 1 ? "s" : ""} em tempo real
      </p>
    </div>
  );
}
