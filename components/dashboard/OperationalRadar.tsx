"use client";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import { Ticket, TicketCategory, CATEGORY_LABELS } from "@/types";

interface OperationalRadarProps {
  tickets: Ticket[];
}

const CATEGORIES: TicketCategory[] = ["hardware", "software", "network", "access", "other"];

export function OperationalRadar({ tickets }: OperationalRadarProps) {
  const active = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");

  const data = CATEGORIES.map((cat) => ({
    category: CATEGORY_LABELS[cat],
    value: active.filter((t) => t.category === cat).length,
  }));

  const max = Math.max(4, ...data.map((d) => d.value));

  return (
    <div className="surface-card ops-noise rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Radar Operacional
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>por categoria</span>
      </div>

      <div className="flex-1 -mx-2 -my-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            />
            <PolarRadiusAxis domain={[0, max]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="var(--ops-violet)"
              fill="var(--ops-violet)"
              fillOpacity={0.32}
              strokeWidth={2}
              isAnimationActive
              animationDuration={700}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
