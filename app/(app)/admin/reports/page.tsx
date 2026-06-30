"use client";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { MOCK_TICKETS } from "@/lib/mock-data";
import { calculateSLAMetrics } from "@/lib/sla-engine";
import { BarChart3, Clock, CheckCircle, TrendingUp } from "lucide-react";

export default function ReportsPage() {
  const metrics = calculateSLAMetrics(MOCK_TICKETS);
  const resolved = MOCK_TICKETS.filter(t => t.status === "resolved" || t.status === "closed");

  const priorityBreakdown = Object.entries(
    MOCK_TICKETS.reduce((acc, t) => {
      const label = { critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa" }[t.priority];
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([priority, count]) => ({ priority, count }));

  const categoryBreakdown = Object.entries(
    MOCK_TICKETS.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, count]) => ({ category, count }));

  const trend = [
    { date: "06/06", count: 2 }, { date: "07/06", count: 4 }, { date: "08/06", count: 1 },
    { date: "09/06", count: 5 }, { date: "10/06", count: 3 }, { date: "11/06", count: 6 },
    { date: "12/06", count: 3 },
  ];

  const colorMap: Record<string, string> = {
    "Crítica": "bg-red-500", "Alta": "bg-orange-500", "Média": "bg-yellow-500", "Baixa": "bg-slate-400",
  };

  return (
    <>
      <Header title="Relatórios" />
      <div className="p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-4">
          <KPICard icon={<BarChart3 className="w-5 h-5" />} accent="indigo" label="Total de tickets" value={MOCK_TICKETS.length} />
          <KPICard icon={<CheckCircle className="w-5 h-5" />} accent="emerald" label="Resolvidos" value={resolved.length} />
          <KPICard icon={<Clock className="w-5 h-5" />} accent="amber" label="Tempo médio (h)" value={metrics.avgResolutionHours} />
          <KPICard icon={<TrendingUp className="w-5 h-5" />} accent="violet" label="SLA cumprido" value={`${metrics.compliancePercent}%`} />
        </motion.div>

        <div className="grid grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="surface-card rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Tickets por Prioridade</h3>
            <div className="space-y-3">
              {priorityBreakdown.map((item) => {
                const total = priorityBreakdown.reduce((a, b) => a + b.count, 0);
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.priority}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-secondary)" }}>{item.priority}</span>
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className={`h-full ${colorMap[item.priority] || "bg-indigo-500"} rounded-full`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface-card rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Tickets por Categoria</h3>
            <div className="space-y-3">
              {categoryBreakdown.map((item) => {
                const total = categoryBreakdown.reduce((a, b) => a + b.count, 0);
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize" style={{ color: "var(--text-secondary)" }}>{item.category}</span>
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-full bg-indigo-500 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="surface-card rounded-xl p-5 col-span-2">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Resoluções por dia (últimos 7 dias)</h3>
            <div className="flex items-end gap-3 h-28">
              {trend.map((item) => {
                const max = Math.max(...trend.map(t => t.count));
                const height = max > 0 ? (item.count / max) * 100 : 0;
                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{item.count}</span>
                    <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                      <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: 0.6 }} className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-colors" />
                    </div>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.date}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

const ACCENTS: Record<string, { bg: string; text: string }> = {
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  violet: { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
};

function KPICard({ icon, accent, label, value }: { icon: React.ReactNode; accent: string; label: string; value: string | number }) {
  const a = ACCENTS[accent] ?? ACCENTS.indigo;
  return (
    <div className="surface-card surface-card-hover rounded-xl p-5">
      <div className={`w-9 h-9 ${a.bg} ${a.text} rounded-lg flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
      <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}
