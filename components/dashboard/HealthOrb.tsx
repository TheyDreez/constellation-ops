"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface HealthOrbProps {
  score: number; // 0-100
  breachedCount: number;
  atRiskCount: number;
}

function getHealthState(score: number, breached: number) {
  if (breached > 0) return { label: "Crítico", color: "var(--danger)", desc: "SLA violado em curso" };
  if (score >= 90) return { label: "Saudável", color: "var(--ops-emerald)", desc: "Operação dentro do esperado" };
  if (score >= 70) return { label: "Atenção", color: "var(--ops-amber)", desc: "Acompanhar de perto" };
  return { label: "Degradado", color: "var(--danger)", desc: "Requer intervenção" };
}

export function HealthOrb({ score, breachedCount, atRiskCount }: HealthOrbProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const state = getHealthState(score, breachedCount);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedScore(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div
      className="surface-card ops-noise rounded-xl p-6 h-full flex flex-col relative overflow-hidden"
      style={{
        background: `radial-gradient(circle at 50% 0%, ${state.color}0d, var(--surface) 65%)`,
      }}
    >
      <div className="flex items-center justify-between mb-2 relative z-10">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Saúde da Operação
        </span>
        <span className="flex items-center gap-1.5">
          <span className="ops-live-dot" style={{ color: state.color }} aria-hidden />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>tempo real</span>
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center py-2 relative z-10">
        <div className="relative w-[180px] h-[180px]">
          <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
            <circle
              cx="90" cy="90" r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="10"
            />
            <motion.circle
              cx="90" cy="90" r={radius}
              fill="none"
              stroke={state.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 10px ${state.color}66)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={Math.round(animatedScore)}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              className="text-5xl font-bold tabular-nums tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {Math.round(animatedScore)}
            </motion.span>
            <span className="text-[10px] tracking-wide" style={{ color: "var(--text-muted)" }}>SCORE OPERACIONAL</span>
          </div>
        </div>
      </div>

      <div className="text-center relative z-10">
        <p className="text-base font-semibold" style={{ color: state.color }}>{state.label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{state.desc}</p>
      </div>

      <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t relative z-10" style={{ borderColor: "var(--border)" }}>
        <div className="text-center">
          <p className="text-base font-bold" style={{ color: breachedCount > 0 ? "var(--danger)" : "var(--text-primary)" }}>{breachedCount}</p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>violados</p>
        </div>
        <div className="w-px h-7" style={{ background: "var(--border)" }} />
        <div className="text-center">
          <p className="text-base font-bold" style={{ color: atRiskCount > 0 ? "var(--ops-amber)" : "var(--text-primary)" }}>{atRiskCount}</p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>em risco</p>
        </div>
      </div>
    </div>
  );
}
