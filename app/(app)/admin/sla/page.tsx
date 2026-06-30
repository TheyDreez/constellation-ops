"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { MOCK_SLA, MOCK_TICKETS } from "@/lib/mock-data";
import { PRIORITY_LABELS, SLAConfig, TicketPriority } from "@/types";
import { calculateSLAMetrics } from "@/lib/sla-engine";
import { Clock, CheckCircle, Info, Gauge } from "lucide-react";

const PRIORITY_DOT: Record<TicketPriority, string> = {
  low: "bg-slate-400", medium: "bg-yellow-500", high: "bg-orange-500", critical: "bg-red-500",
};

export default function SLAPage() {
  const [configs, setConfigs] = useState<SLAConfig[]>(MOCK_SLA);
  const [saved, setSaved] = useState(false);
  const metrics = calculateSLAMetrics(MOCK_TICKETS);

  const update = (id: string, field: "response_hours" | "resolution_hours", value: number) => {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    setSaved(false);
  };

  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 500));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <Header title="Configuração de SLA" />
      <div className="p-6 max-w-3xl space-y-6">
        {/* Live metrics preview */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-4">
          <MiniStat icon={<CheckCircle className="w-4 h-4" />} accent="emerald" label="Cumprido" value={`${metrics.compliancePercent}%`} />
          <MiniStat icon={<Clock className="w-4 h-4" />} accent="orange" label="Em risco" value={metrics.atRisk} />
          <MiniStat icon={<Gauge className="w-4 h-4" />} accent="red" label="Violado" value={metrics.breached} />
          <MiniStat icon={<Clock className="w-4 h-4" />} accent="indigo" label="Média (h)" value={metrics.avgResolutionHours} />
        </motion.div>

        <div className="flex items-start gap-2.5 rounded-lg px-4 py-3 border" style={{ background: "var(--brand-light)", borderColor: "rgba(79,70,229,0.2)" }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--brand)" }} />
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            O prazo de <strong>resolução</strong> é o que define o deadline do SLA exibido nos tickets.
            Tickets com status &quot;Aguardando Usuário&quot; têm o contador pausado automaticamente.
          </p>
        </div>

        <div className="space-y-3">
          {configs.map((config, i) => (
            <motion.div
              key={config.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="surface-card surface-card-hover rounded-xl p-5"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[config.priority]}`} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {PRIORITY_LABELS[config.priority]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <Clock className="w-3.5 h-3.5" /> Primeira resposta (horas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={config.response_hours}
                    onChange={(e) => update(config.id, "response_hours", Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <CheckCircle className="w-3.5 h-3.5" /> Resolução (horas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={config.resolution_hours}
                    onChange={(e) => update(config.id, "resolution_hours", Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave}>Salvar configurações</Button>
          {saved && (
            <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="text-sm flex items-center gap-1.5" style={{ color: "var(--success)" }}>
              <CheckCircle className="w-4 h-4" /> Salvo com sucesso!
            </motion.span>
          )}
        </div>
      </div>
    </>
  );
}

const ACCENTS: Record<string, { bg: string; text: string }> = {
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  red: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600 dark:text-red-400" },
  orange: { bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
};

function MiniStat({ icon, accent, label, value }: { icon: React.ReactNode; accent: string; label: string; value: string | number }) {
  const a = ACCENTS[accent] ?? ACCENTS.indigo;
  return (
    <div className="surface-card rounded-xl p-4">
      <div className={`w-7 h-7 ${a.bg} ${a.text} rounded-lg flex items-center justify-center mb-2`}>{icon}</div>
      <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}
