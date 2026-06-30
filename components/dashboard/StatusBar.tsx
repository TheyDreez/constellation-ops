"use client";
import { motion } from "framer-motion";

interface StatusBarProps {
  firstName: string;
  totalActive: number;
  breached: number;
  atRisk: number;
}

function getOverallStatus(breached: number, atRisk: number) {
  if (breached > 0) return { label: "Crítico", color: "var(--danger)" };
  if (atRisk > 0) return { label: "Degradado", color: "var(--ops-amber)" };
  return { label: "Saudável", color: "var(--ops-emerald)" };
}

export function StatusBar({ firstName, totalActive, breached, atRisk }: StatusBarProps) {
  const status = getOverallStatus(breached, atRisk);
  const now = new Date();
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="ops-grid-bg rounded-xl px-5 py-4 flex items-center gap-5 surface-card"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
            Service Operations Center
          </span>
        </div>
        <h1 className="text-lg font-semibold mt-0.5 capitalize" style={{ color: "var(--text-primary)" }}>
          Bom dia{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-xs mt-0.5 capitalize" style={{ color: "var(--text-muted)" }}>{dateLabel}</p>
      </div>

      <div className="ml-auto flex items-center gap-6 flex-shrink-0">
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{totalActive}</p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>operações ativas</p>
        </div>

        <div className="w-px h-9" style={{ background: "var(--border)" }} />

        <div className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full" style={{ background: "var(--surface-hover)" }}>
          <span className="ops-live-dot" style={{ color: status.color }} aria-hidden />
          <span className="text-xs font-semibold" style={{ color: status.color }}>{status.label}</span>
        </div>
      </div>
    </motion.div>
  );
}
