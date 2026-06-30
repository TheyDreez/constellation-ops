"use client";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Ticket, TicketCategory, TicketPriority, CATEGORY_LABELS } from "@/types";
import { calculateSLAStatus, calculateSLAMetrics, SLARiskLevel } from "@/lib/sla-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OperationalConstellationProps {
  tickets: Ticket[];
  onSelectCategory: (category: TicketCategory) => void;
}

type ViewMode = "operational" | "executive";

interface LayerState {
  sla: boolean;
  load: boolean;
  trend: boolean;
}

interface SatelliteData {
  ticket: Ticket;
  sla: ReturnType<typeof calculateSLAStatus>;
  orbitR: number;
  speed: number;
  size: number;
  color: string;
}

interface PlanetData {
  category: TicketCategory;
  angle: number;
  px: number;
  py: number;
  count: number;
  prad: number;
  breached: boolean;
  danger: boolean;
  overflow: number;
  sats: SatelliteData[];
  trend: number;
}

interface ConstellationData {
  planets: PlanetData[];
  maxCount: number;
  health: number;
  breachedTotal: number;
  dangerTotal: number;
  active: Ticket[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: TicketCategory[] = ["hardware", "software", "network", "access", "other"];
const SIZE = 580;
const CENTER = SIZE / 2;
const PLANET_ORBIT_RADIUS = 190;
const MAX_VISIBLE_MOONS = 8;

const STATUS_COLOR: Record<string, string> = {
  open: "var(--ops-cyan)",
  in_progress: "var(--ops-amber)",
  waiting_user: "var(--ops-violet)",
};

const PRIORITY_RADIUS: Record<TicketPriority, number> = {
  critical: 7,
  high: 5.5,
  medium: 4.5,
  low: 3.5,
};

const URGENCY_SPEED: Record<SLARiskLevel, number> = {
  breached: 2.5,
  danger: 4,
  warning: 7,
  safe: 13,
  paused: 20,
  none: 20,
};

const URGENCY_ORDER: SLARiskLevel[] = ["breached", "danger", "warning", "safe", "paused", "none"];

// Simulated week trend per category (positive = growing queue)
const CAT_TREND: Record<TicketCategory, number> = {
  hardware: 3,
  software: 1,
  network: 2,
  access: -1,
  other: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function healthColor(score: number, breached: number): string {
  if (breached > 0) return "var(--danger)";
  if (score >= 85) return "var(--ops-emerald)";
  if (score >= 70) return "var(--ops-amber)";
  return "var(--danger)";
}

function slaBarColor(level: SLARiskLevel): string {
  if (level === "breached" || level === "danger") return "var(--danger)";
  if (level === "warning") return "var(--ops-amber)";
  return "var(--ops-emerald)";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface QuickViewProps {
  ticket: Ticket;
  x: number;
  y: number;
  onClose: () => void;
}

function QuickView({ ticket, x, y, onClose }: QuickViewProps) {
  const router = useRouter();
  const sla = calculateSLAStatus(ticket);
  const updatedAgo = ((Date.now() - new Date(ticket.updated_at).getTime()) / 3600000).toFixed(1);

  const STATUS_LABEL: Record<string, string> = {
    open: "Aberto",
    in_progress: "Em atendimento",
    waiting_user: "Ag. usuário",
  };
  const PRIORITY_LABEL: Record<TicketPriority, string> = {
    critical: "Crítica",
    high: "Alta",
    medium: "Média",
    low: "Baixa",
  };
  const PRIORITY_BG: Record<TicketPriority, string> = {
    critical: "rgba(226,75,74,0.12)",
    high: "rgba(239,159,39,0.14)",
    medium: "rgba(29,158,117,0.12)",
    low: "rgba(136,135,128,0.12)",
  };
  const PRIORITY_COLOR: Record<TicketPriority, string> = {
    critical: "var(--danger)",
    high: "var(--ops-amber)",
    medium: "var(--ops-emerald)",
    low: "var(--text-muted)",
  };

  // Clamp position so panel stays inside SVG area
  const left = Math.min(x + 8, SIZE - 232);
  const top = Math.max(y - 160, 4);

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: 224,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px",
        zIndex: 20,
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>
            {ticket.ticket_number}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
            {ticket.title.length > 52 ? ticket.title.slice(0, 52) + "…" : ticket.title}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0 0 0 6px", flexShrink: 0 }}
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: "rgba(59,139,212,0.12)", color: "var(--ops-cyan)" }}>
          {STATUS_LABEL[ticket.status] ?? ticket.status}
        </span>
        <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: PRIORITY_BG[ticket.priority], color: PRIORITY_COLOR[ticket.priority] }}>
          {PRIORITY_LABEL[ticket.priority]}
        </span>
      </div>

      {/* SLA bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 3 }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, sla.percentUsed).toFixed(0)}%`,
              background: slaBarColor(sla.level),
              borderRadius: 2,
              transition: "width 0.3s",
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: slaBarColor(sla.level) }}>{sla.label}</div>
      </div>

      {/* Meta */}
      <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.8 }}>
        <div>👤 {ticket.assigned_to_user?.name ?? <em style={{ color: "var(--text-muted)" }}>Sem responsável</em>}</div>
        <div>🕐 Atualizado há {updatedAgo}h</div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 10, display: "flex", gap: 5 }}>
        <button
          onClick={() => router.push(`/tickets/${ticket.id}`)}
          style={{
            flex: 1, padding: "6px 0", fontSize: 11, fontWeight: 500,
            background: "var(--brand)", color: "white", border: "none",
            borderRadius: 7, cursor: "pointer",
          }}
        >
          Abrir ticket →
        </button>
        {!ticket.assigned_to && (
          <button
            style={{
              flex: 1, padding: "6px 0", fontSize: 11, fontWeight: 500,
              background: "transparent", color: "var(--text-secondary)",
              border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer",
            }}
          >
            Assumir
          </button>
        )}
      </div>
    </div>
  );
}

interface PlanetPanelProps {
  planet: PlanetData;
  onClose: () => void;
}

function PlanetPanel({ planet, onClose }: PlanetPanelProps) {
  const breachedCount = planet.sats.filter(s => s.sla.level === "breached").length;
  const dangerCount = planet.sats.filter(s => s.sla.level === "danger").length;
  const criticalCount = planet.sats.filter(s => s.ticket.priority === "critical").length;
  const highCount = planet.sats.filter(s => s.ticket.priority === "high").length;
  const weekData = [planet.count - planet.trend - 2, planet.count - planet.trend, planet.count - 1, planet.count + Math.max(0, planet.trend - 1), planet.count];
  const maxBar = Math.max(...weekData, 1);

  return (
    <div style={{ width: 240, padding: 16, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
          {CATEGORY_LABELS[planet.category]}
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}
          aria-label="Fechar painel"
        >
          ✕
        </button>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
        Categoria · {planet.count} ticket{planet.count !== 1 ? "s" : ""} ativo{planet.count !== 1 ? "s" : ""}
      </div>

      {/* Stats */}
      {[
        { label: "Total ativo", value: planet.count, cls: "" },
        { label: "SLA violado", value: breachedCount > 0 ? breachedCount : "Nenhum", cls: breachedCount > 0 ? "danger" : "ok" },
        { label: "Em risco (SLA)", value: dangerCount, cls: dangerCount > 0 ? "warning" : "ok" },
        { label: "Críticos", value: criticalCount, cls: criticalCount > 0 ? "danger" : "" },
        { label: "Alta prioridade", value: highCount, cls: "" },
        { label: "TM resolução", value: "3.2h", cls: "" },
      ].map(({ label, value, cls }) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--border)", fontSize: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>{label}</span>
          <span style={{
            fontWeight: 600,
            color: cls === "danger" ? "var(--danger)" : cls === "warning" ? "var(--ops-amber)" : cls === "ok" ? "var(--ops-emerald)" : "var(--text-primary)",
          }}>{value}</span>
        </div>
      ))}

      {/* Trend mini-chart */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
          Últimos 5 dias{" "}
          {planet.trend > 0 && <span style={{ color: "var(--ops-amber)", fontWeight: 600 }}>▲{planet.trend} hoje</span>}
          {planet.trend < 0 && <span style={{ color: "var(--ops-emerald)", fontWeight: 600 }}>▼{Math.abs(planet.trend)} hoje</span>}
          {planet.trend === 0 && <span style={{ color: "var(--text-muted)" }}>estável</span>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 36 }}>
          {weekData.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.round((v / maxBar) * 36)}px`,
                background: i === 4 ? "var(--ops-violet)" : "var(--border)",
                borderRadius: "2px 2px 0 0",
                opacity: 0.4 + i * 0.15,
              }}
            />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Ações rápidas</div>
        {[
          { icon: "🕐", label: "Ver riscos de SLA" },
          { icon: "⚠️", label: "Escalar críticos" },
          { icon: "👤", label: "Atribuir sem responsável" },
        ].map(({ icon, label }) => (
          <button
            key={label}
            style={{
              width: "100%", textAlign: "left", padding: "7px 10px", fontSize: 12,
              border: "1px solid var(--border)", borderRadius: 8,
              background: "transparent", color: "var(--text-primary)", cursor: "pointer",
              marginBottom: 5, display: "flex", alignItems: "center", gap: 7,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--background-subtle)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OperationalConstellation({ tickets, onSelectCategory }: OperationalConstellationProps) {
  const [mode, setMode] = useState<ViewMode>("operational");
  const [layers, setLayers] = useState<LayerState>({ sla: true, load: true, trend: false });
  const [activePlanet, setActivePlanet] = useState<TicketCategory | null>(null);
  const [activeQuick, setActiveQuick] = useState<{ ticket: Ticket; x: number; y: number } | null>(null);
  const [satAngles, setSatAngles] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    tickets.forEach(t => { init[t.id] = Math.random() * 360; });
    return init;
  });
  const animRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  // Build derived data
  const data = useMemo<ConstellationData>(() => {
    const active = tickets.filter(t => t.status !== "resolved" && t.status !== "closed");
    const slaMetrics = calculateSLAMetrics(tickets);
    const riskPenalty = active.length > 0 ? (slaMetrics.atRisk / active.length) * 30 : 0;
    const health = Math.max(0, Math.min(100, Math.round(slaMetrics.compliancePercent - riskPenalty)));

    const planets: PlanetData[] = CATEGORIES.map((cat, i) => {
      const angle = -90 + i * (360 / CATEGORIES.length);
      const pos = polar(CENTER, CENTER, PLANET_ORBIT_RADIUS, angle);
      const catTickets = active
        .filter(t => t.category === cat)
        .map(t => ({ ticket: t, sla: calculateSLAStatus(t) }))
        .sort((a, b) => URGENCY_ORDER.indexOf(a.sla.level) - URGENCY_ORDER.indexOf(b.sla.level));

      const count = catTickets.length;
      const prad = Math.min(44, 14 + Math.sqrt(count) * 7);
      const breached = catTickets.some(c => c.sla.level === "breached");
      const danger = catTickets.some(c => c.sla.level === "danger");
      const overflow = Math.max(0, count - MAX_VISIBLE_MOONS);

      const sats: SatelliteData[] = catTickets.slice(0, MAX_VISIBLE_MOONS).map((c, ri) => ({
        ticket: c.ticket,
        sla: c.sla,
        orbitR: prad + 16 + ri * 9,
        speed: URGENCY_SPEED[c.sla.level],
        size: PRIORITY_RADIUS[c.ticket.priority],
        color: STATUS_COLOR[c.ticket.status] ?? "var(--text-muted)",
      }));

      return { category: cat, angle, px: pos.x, py: pos.y, count, prad, breached, danger, overflow, sats, trend: CAT_TREND[cat] };
    });

    const maxCount = Math.max(1, ...planets.map(p => p.count));
    const breachedTotal = planets.reduce((n, p) => n + (p.breached ? 1 : 0), 0);
    const dangerTotal = planets.reduce((n, p) => n + (p.danger ? 1 : 0), 0);

    return { planets, maxCount, health, breachedTotal, dangerTotal, active };
  }, [tickets]);

  // Satellite animation
  const animateSats = useCallback((ts: number) => {
    if (mode !== "operational") return;
    if (ts - lastRef.current > 50) {
      lastRef.current = ts;
      setSatAngles(prev => {
        const next = { ...prev };
        data.planets.forEach(p => {
          p.sats.forEach(s => {
            const spd = 360 / (s.speed * 60);
            next[s.ticket.id] = ((prev[s.ticket.id] ?? 0) + spd) % 360;
          });
        });
        return next;
      });
    }
    animRef.current = requestAnimationFrame(animateSats);
  }, [data, mode]);

  useEffect(() => {
    if (mode === "operational") {
      animRef.current = requestAnimationFrame(animateSats);
    } else {
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [animateSats, mode]);

  const coreColor = healthColor(data.health, data.breachedTotal);

  const toggleLayer = (l: keyof LayerState) => {
    setLayers(prev => ({ ...prev, [l]: !prev[l] }));
  };

  const handlePlanetClick = (cat: TicketCategory) => {
    setActiveQuick(null);
    setActivePlanet(prev => (prev === cat ? null : cat));
  };

  const handleSatClick = (ticket: Ticket, x: number, y: number) => {
    setActivePlanet(null);
    setActiveQuick(prev => (prev?.ticket.id === ticket.id ? null : { ticket, x, y }));
  };

  // Alert chips (SLA violations + overloaded categories)
  const alerts = useMemo(() => {
    const out: { type: "sla" | "load"; ticket?: Ticket; cat?: TicketCategory; label: string; level: string }[] = [];
    data.active.forEach(t => {
      const s = calculateSLAStatus(t);
      if (s.level === "breached") out.push({ type: "sla", ticket: t, label: `${t.ticket_number} violado`, level: "breached" });
      else if (s.level === "danger") out.push({ type: "sla", ticket: t, label: `${t.ticket_number} ${s.label}`, level: "danger" });
    });
    data.planets.filter(p => p.count > 4).forEach(p => {
      out.push({ type: "load", cat: p.category, label: `${CATEGORY_LABELS[p.category]}: ${p.count} tickets`, level: "info" });
    });
    return out.slice(0, 6);
  }, [data]);

  const alertStyle = (level: string) => {
    if (level === "breached") return { bg: "rgba(226,75,74,0.1)", color: "var(--danger)", border: "rgba(226,75,74,0.25)" };
    if (level === "danger") return { bg: "rgba(239,159,39,0.1)", color: "var(--ops-amber)", border: "rgba(239,159,39,0.25)" };
    return { bg: "rgba(127,119,221,0.1)", color: "var(--ops-violet)", border: "rgba(127,119,221,0.25)" };
  };

  const healthPillStyle = () => {
    if (data.breachedTotal > 0) return { bg: "rgba(226,75,74,0.1)", color: "var(--danger)", dot: "var(--danger)" };
    if (data.dangerTotal > 0) return { bg: "rgba(239,159,39,0.1)", color: "var(--ops-amber)", dot: "var(--ops-amber)" };
    return { bg: "rgba(29,158,117,0.1)", color: "var(--ops-emerald)", dot: "var(--ops-emerald)" };
  };
  const hps = healthPillStyle();

  const activePlanetData = data.planets.find(p => p.category === activePlanet);

  return (
    <div className="surface-card ops-noise rounded-xl overflow-hidden" style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Mode + Controls bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "0.5px solid var(--border)" }}>
        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["operational", "executive"] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setActivePlanet(null); setActiveQuick(null); }}
              style={{
                padding: "5px 14px", fontSize: 12, fontWeight: 500,
                border: "0.5px solid var(--border)", borderRadius: 8, cursor: "pointer",
                background: mode === m ? "var(--background-subtle)" : "transparent",
                color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              {m === "operational" ? "⊙ Operacional" : "◈ Executivo"}
            </button>
          ))}
        </div>

        {/* Layer toggles + health pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(Object.keys(layers) as (keyof LayerState)[]).map(l => (
              <button
                key={l}
                onClick={() => toggleLayer(l)}
                style={{
                  padding: "4px 9px", fontSize: 11, fontWeight: 500,
                  border: "0.5px solid var(--border)", borderRadius: 12, cursor: "pointer",
                  background: layers[l] ? "var(--text-primary)" : "transparent",
                  color: layers[l] ? "var(--surface)" : "var(--text-muted)",
                  transition: "all 0.15s",
                }}
              >
                {l === "sla" ? "SLA" : l === "load" ? "Carga" : "Tendência"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 20, background: hps.bg, color: hps.color, border: `0.5px solid ${hps.dot}44` }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: hps.dot, display: "inline-block" }} />
            Saúde {data.health}
          </div>
        </div>
      </div>

      {/* ── Alert strip ── */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", gap: 8, padding: "8px 16px", borderBottom: "0.5px solid var(--border)", overflowX: "auto", flexShrink: 0 }}>
          {alerts.map((a, i) => {
            const s = alertStyle(a.level);
            return (
              <div
                key={i}
                onClick={() => a.ticket && handleSatClick(a.ticket, 80, 80)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                  borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
                  cursor: a.ticket ? "pointer" : "default",
                  background: s.bg, color: s.color, border: `0.5px solid ${s.border}`,
                  flexShrink: 0,
                }}
              >
                {a.level === "breached" ? "⚠" : a.level === "danger" ? "🕐" : "⊛"} {a.label}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Constellation + Side panel ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* SVG area */}
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label="Constelação Operacional — distribuição de tickets por categoria"
            style={{ width: "100%", height: "auto", maxHeight: 540 }}
          >
            <title>Constelação Operacional</title>
            <desc>Visualização dos tickets de suporte organizados em órbita ao redor do núcleo de saúde operacional. Planetas = categorias, satélites = tickets individuais.</desc>

            {/* Orbit rings (background structure) */}
            {mode === "operational" && layers.sla && data.planets.map(p =>
              p.sats.map(s => (
                <circle
                  key={`ring-${s.ticket.id}`}
                  cx={p.px} cy={p.py} r={s.orbitR}
                  fill="none" stroke="var(--border)" strokeWidth={0.5} opacity={0.35}
                />
              ))
            )}

            {/* Load lines: nucleus → planets */}
            {data.planets.map(p => {
              const w = layers.load ? 1 + (p.count / data.maxCount) * 2.5 : 1;
              const op = p.count > 0 ? (layers.load ? 0.55 : 0.2) : 0.1;
              const stroke = p.breached && layers.sla ? "var(--danger)" : p.danger && layers.sla ? "var(--ops-amber)" : "var(--border)";
              return (
                <line key={`link-${p.category}`}
                  x1={CENTER} y1={CENTER} x2={p.px} y2={p.py}
                  stroke={stroke} strokeWidth={w} opacity={op}
                />
              );
            })}

            {/* Satellites */}
            {mode === "operational" && data.planets.map(p =>
              p.sats.map(s => {
                const ang = ((satAngles[s.ticket.id] ?? 0) * Math.PI) / 180;
                const sx = p.px + s.orbitR * Math.cos(ang);
                const sy = p.py + s.orbitR * Math.sin(ang);
                const isBreached = s.sla.level === "breached" && layers.sla;
                const isActive = activeQuick?.ticket.id === s.ticket.id;
                const r = isActive ? s.size * 1.7 : s.size;
                return (
                  <g key={s.ticket.id}>
                    {isBreached && (
                      <circle cx={sx} cy={sy} r={r + 4} fill="none" stroke="var(--danger)" strokeWidth={1} opacity={0.4}>
                        <animate attributeName="r" values={`${r + 2};${r + 7};${r + 2}`} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={sx} cy={sy} r={r}
                      fill={s.color}
                      opacity={isBreached ? 1 : 0.88}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSatClick(s.ticket, sx, sy)}
                    >
                      <title>{`${s.ticket.ticket_number} · ${s.ticket.title} · ${s.sla.label}`}</title>
                    </circle>
                  </g>
                );
              })
            )}

            {/* Planets */}
            {data.planets.map(p => {
              const stroke = p.breached && layers.sla ? "var(--danger)" : p.danger && layers.sla ? "var(--ops-amber)" : "var(--ops-violet)";
              const strokeW = (p.breached || p.danger) && layers.sla ? 2 : 1;
              const isActive = activePlanet === p.category;
              return (
                <g key={p.category} style={{ cursor: "pointer" }} onClick={() => handlePlanetClick(p.category)}>
                  {/* Pulse ring for breached */}
                  {p.breached && layers.sla && (
                    <circle cx={p.px} cy={p.py} r={p.prad + 6} fill="none" stroke="var(--danger)" strokeWidth={1} opacity={0.3}>
                      <animate attributeName="r" values={`${p.prad + 4};${p.prad + 14};${p.prad + 4}`} dur="2.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="2.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Planet body */}
                  <circle
                    cx={p.px} cy={p.py} r={p.prad}
                    fill="var(--ops-violet)"
                    opacity={isActive ? 0.35 : p.count > 0 ? 0.18 : 0.06}
                    stroke={stroke} strokeWidth={strokeW}
                    style={{ transition: "opacity 0.2s" }}
                  />
                  {/* Category label */}
                  <text x={p.px} y={p.py - p.prad - 9} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--text-primary)">
                    {CATEGORY_LABELS[p.category]}
                  </text>
                  {/* Count */}
                  {p.count > 0 && (
                    <text x={p.px} y={p.py + 5} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text-secondary)">
                      {p.count}
                    </text>
                  )}
                  {/* Overflow indicator */}
                  {p.overflow > 0 && (
                    <text x={p.px} y={p.py + p.prad + 15} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
                      +{p.overflow}
                    </text>
                  )}
                  {/* Trend indicator */}
                  {layers.trend && p.trend !== 0 && (
                    <text
                      x={p.px + p.prad + 5}
                      y={p.py - p.prad + 4}
                      fontSize={9}
                      fontWeight={600}
                      fill={p.trend > 0 ? "var(--ops-amber)" : "var(--ops-emerald)"}
                    >
                      {p.trend > 0 ? "▲" : "▼"}{Math.abs(p.trend)}
                    </text>
                  )}
                  {/* Executive mode: health badge */}
                  {mode === "executive" && (
                    <text
                      x={p.px} y={p.py + p.prad + 24}
                      textAnchor="middle" fontSize={9} fontWeight={600}
                      fill={p.breached ? "var(--danger)" : p.danger ? "var(--ops-amber)" : "var(--ops-emerald)"}
                    >
                      {p.breached ? "CRÍTICO" : p.danger ? "RISCO" : "OK"}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Core nucleus */}
            <circle cx={CENTER} cy={CENTER} r={30} fill={coreColor} opacity={0.15}>
              <animate attributeName="r" values="28;38;28" dur="3.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.15;0.04;0.15" dur="3.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={CENTER} cy={CENTER} r={18} fill={coreColor} />
            <text x={CENTER} y={CENTER + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="white">
              {data.health}
            </text>
            <text x={CENTER} y={CENTER + 32} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
              Operação
            </text>
          </svg>

          {/* Quick View overlay */}
          {activeQuick && (
            <QuickView
              ticket={activeQuick.ticket}
              x={activeQuick.x}
              y={activeQuick.y}
              onClose={() => setActiveQuick(null)}
            />
          )}
        </div>

        {/* Side panel for planet detail */}
        <div style={{
          width: activePlanetData ? 240 : 0,
          overflow: "hidden",
          borderLeft: activePlanetData ? "0.5px solid var(--border)" : "none",
          flexShrink: 0,
          transition: "width 0.2s ease",
        }}>
          {activePlanetData && (
            <PlanetPanel planet={activePlanetData} onClose={() => setActivePlanet(null)} />
          )}
        </div>
      </div>

      {/* ── Executive summary cards ── */}
      {mode === "executive" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "14px 16px", borderTop: "0.5px solid var(--border)" }}>
          {[
            { label: "Saúde geral", value: data.health, color: coreColor },
            { label: "SLA violados", value: data.breachedTotal, color: data.breachedTotal > 0 ? "var(--danger)" : "var(--text-primary)" },
            { label: "Tickets ativos", value: data.active.length, color: "var(--text-primary)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--background-subtle)", borderRadius: 8, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 500, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Legend ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "8px 16px", borderTop: "0.5px solid var(--border)" }}>
        {[
          { dot: "var(--ops-cyan)", label: "Aberto" },
          { dot: "var(--ops-amber)", label: "Em atendimento" },
          { dot: "var(--ops-violet)", label: "Ag. usuário" },
        ].map(({ dot, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-muted)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
            {label}
          </div>
        ))}
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>● grande = crítico</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>🕐 SLA violado</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>▲▼ tendência</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>Clique no planeta ou satélite para detalhes</span>
      </div>
    </div>
  );
}
