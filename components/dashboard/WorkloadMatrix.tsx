"use client";
import { motion } from "framer-motion";
import { Ticket, TicketCategory, TicketPriority, CATEGORY_LABELS } from "@/types";

interface WorkloadMatrixProps {
  tickets: Ticket[];
}

const CATEGORIES: TicketCategory[] = ["hardware", "software", "network", "access", "other"];
const PRIORITIES: TicketPriority[] = ["critical", "high", "medium", "low"];

const PRIORITY_SHORT: Record<TicketPriority, string> = {
  critical: "Crít.",
  high: "Alta",
  medium: "Méd.",
  low: "Baixa",
};

export function WorkloadMatrix({ tickets }: WorkloadMatrixProps) {
  const active = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");

  const matrix = CATEGORIES.map((cat) => ({
    category: cat,
    cells: PRIORITIES.map((pri) => active.filter((t) => t.category === cat && t.priority === pri).length),
  }));

  const max = Math.max(1, ...matrix.flatMap((r) => r.cells));

  function intensity(value: number) {
    if (value === 0) return "var(--surface-hover)";
    const ratio = value / max;
    // base brand color com opacidade crescente
    return `rgba(124, 58, 237, ${0.12 + ratio * 0.55})`;
  }

  return (
    <div className="surface-card ops-noise rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Workload Matrix
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{active.length} ativos</span>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="grid mb-2" style={{ gridTemplateColumns: "76px repeat(4, 1fr)" }}>
          <div />
          {PRIORITIES.map((p) => (
            <span key={p} className="text-[10px] text-center font-medium" style={{ color: "var(--text-muted)" }}>
              {PRIORITY_SHORT[p]}
            </span>
          ))}
        </div>

        <div className="space-y-2 flex-1">
          {matrix.map((row, ri) => (
            <div key={row.category} className="grid items-center" style={{ gridTemplateColumns: "76px repeat(4, 1fr)" }}>
              <span className="text-[11px] truncate pr-1" style={{ color: "var(--text-secondary)" }}>
                {CATEGORY_LABELS[row.category]}
              </span>
              {row.cells.map((value, ci) => (
                <motion.div
                  key={ci}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: (ri * 4 + ci) * 0.015 }}
                  className="h-10 mx-0.5 rounded-md flex items-center justify-center text-sm font-semibold transition-transform hover:scale-105"
                  style={{
                    background: intensity(value),
                    color: value > 0 ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                  title={`${CATEGORY_LABELS[row.category]} · ${PRIORITY_SHORT[PRIORITIES[ci]]}: ${value}`}
                >
                  {value > 0 ? value : ""}
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
