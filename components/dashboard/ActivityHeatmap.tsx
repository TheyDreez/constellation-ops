"use client";
import { useMemo, useState } from "react";
import { Ticket } from "@/types";

interface ActivityHeatmapProps {
  tickets: Ticket[];
  days?: number;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function ActivityHeatmap({ tickets, days = 35 }: ActivityHeatmapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { cells, columns, max, totalActivity } = useMemo(() => {
    const today = startOfDay(new Date());
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    const startWeekday = start.getDay();

    const counts = new Map<string, number>();
    for (const t of tickets) {
      for (const raw of [t.created_at, t.updated_at, t.resolved_at]) {
        if (!raw) continue;
        const d = startOfDay(new Date(raw));
        if (d < start || d > today) continue;
        const key = d.toDateString();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    const list = Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toDateString();
      const count = counts.get(key) || 0;
      const slot = i + startWeekday;
      return {
        date: d,
        key,
        count,
        col: Math.floor(slot / 7),
        row: slot % 7,
      };
    });

    const max = Math.max(1, ...list.map((c) => c.count));
    const totalActivity = list.reduce((a, c) => a + c.count, 0);
    const columns = Math.max(...list.map((c) => c.col)) + 1;

    return { cells: list, columns, max, totalActivity };
  }, [tickets, days]);

  function levelColor(count: number) {
    if (count === 0) return "var(--surface-hover)";
    const ratio = count / max;
    if (ratio <= 0.25) return "rgba(34, 211, 238, 0.25)";
    if (ratio <= 0.5) return "rgba(34, 211, 238, 0.45)";
    if (ratio <= 0.75) return "rgba(34, 211, 238, 0.7)";
    return "var(--ops-cyan)";
  }

  return (
    <div className="surface-card ops-noise rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="ops-live-dot" style={{ color: "var(--ops-cyan)" }} aria-hidden />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Pulso Operacional · {days} dias
          </h2>
        </div>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {totalActivity} eventos registrados
        </span>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-[3px] pt-[3px] flex-shrink-0">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={label}
              className="text-[9px] leading-none h-[15px] flex items-center"
              style={{ color: "var(--text-muted)", visibility: i % 2 === 1 ? "visible" : "hidden" }}
            >
              {label}
            </span>
          ))}
        </div>

        <div
          className="grid gap-[3px] flex-1"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: "repeat(7, 15px)", gridAutoFlow: "column" }}
        >
          {cells.map((c) => (
            <div
              key={c.key}
              onMouseEnter={() => setHovered(c.key)}
              onMouseLeave={() => setHovered((h) => (h === c.key ? null : h))}
              className="rounded-[3px] transition-transform hover:scale-125 cursor-default"
              style={{
                gridColumn: c.col + 1,
                gridRow: c.row + 1,
                background: levelColor(c.count),
                outline: hovered === c.key ? "1px solid var(--ops-cyan)" : "none",
              }}
              title={`${c.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · ${c.count} evento${c.count !== 1 ? "s" : ""}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-4">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Menos</span>
        {[0, 0.2, 0.5, 0.8, 1].map((r) => (
          <span key={r} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: levelColor(Math.round(r * max)) }} />
        ))}
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Mais</span>
      </div>
    </div>
  );
}
