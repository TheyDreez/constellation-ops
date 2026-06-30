"use client";
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { useTickets } from "@/hooks/useTickets";
import { MOCK_USERS } from "@/lib/mock-data";
import {
  PRIORITY_LABELS, CATEGORY_LABELS,
  TicketStatus, TicketPriority, TicketCategory,
} from "@/types";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { LivingTicketRow } from "@/components/tickets/LivingTicketRow";
import { OperationalConstellation } from "@/components/tickets/OperationalConstellation";
import {
  Plus, Search, ChevronDown, Inbox, AlertTriangle, X,
  ChevronLeft, ChevronRight, SlidersHorizontal, ArrowDownAZ, ArrowUpAZ,
  ListTree, Orbit,
} from "lucide-react";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_FILTERS: { label: string; value: TicketStatus | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Abertos", value: "open" },
  { label: "Em Atendimento", value: "in_progress" },
  { label: "Aguardando", value: "waiting_user" },
  { label: "Resolvidos", value: "resolved" },
  { label: "Fechados", value: "closed" },
];

type SortField = "created_at" | "updated_at" | "priority" | "status";
type SortDir = "asc" | "desc";

const PRIORITY_WEIGHT: Record<TicketPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const STATUS_WEIGHT: Record<TicketStatus, number> = { open: 5, in_progress: 4, waiting_user: 3, resolved: 2, closed: 1 };

// ─── Active filter pill ───────────────────────────────────────────────────────

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: "rgba(99,102,241,0.12)", color: "var(--brand)", border: "1px solid rgba(99,102,241,0.25)" }}
    >
      {label}
      <button onClick={onRemove} className="hover:opacity-70 transition-opacity ml-0.5">
        <X size={10} />
      </button>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const { tickets, loading, error } = useTickets();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [slaFilter, setSlaFilter] = useState<"all" | "breached" | "at_risk">("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [view, setView] = useState<"feed" | "constellation">("feed");

  // Reset de página ao trocar filtros — ajuste durante o render, sem efeito
  const filterKey = `${statusFilter}|${priorityFilter}|${categoryFilter}|${assigneeFilter}|${slaFilter}|${search}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const supportUsers = MOCK_USERS.filter(u => u.role === "support" || u.role === "admin");

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }, [sortField]);

  const filtered = useMemo(() => {
    let list = tickets.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned" && t.assigned_to) return false;
        if (assigneeFilter !== "unassigned" && t.assigned_to !== assigneeFilter) return false;
      }
      if (slaFilter === "breached" && !t.sla_breached) return false;
      if (slaFilter === "at_risk" && t.sla_breached) return false; // simplified
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) &&
            !t.ticket_number.toLowerCase().includes(q) &&
            !t.description.toLowerCase().includes(q) &&
            !t.created_by_user?.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === "updated_at") cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      else if (sortField === "priority") cmp = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      else if (sortField === "status") cmp = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [tickets, statusFilter, priorityFilter, categoryFilter, assigneeFilter, slaFilter, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Active filter count (excluding status handled by tabs)
  const activeFilters = [
    priorityFilter !== "all" && `Prioridade: ${PRIORITY_LABELS[priorityFilter]}`,
    categoryFilter !== "all" && `Categoria: ${CATEGORY_LABELS[categoryFilter]}`,
    assigneeFilter !== "all" && (assigneeFilter === "unassigned" ? "Não atribuído" : `Responsável: ${supportUsers.find(u => u.id === assigneeFilter)?.name}`),
    slaFilter !== "all" && (slaFilter === "breached" ? "SLA Violado" : "SLA em Risco"),
  ].filter(Boolean) as string[];

  const SORT_OPTIONS: { field: SortField; label: string }[] = [
    { field: "updated_at", label: "Atividade recente" },
    { field: "created_at", label: "Criação" },
    { field: "priority", label: "Prioridade" },
    { field: "status", label: "Status" },
  ];

  return (
    <>
      <Header title="Tickets" />
      <div className="p-6 space-y-4">

        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm"
            style={{ borderColor: "rgba(220,38,38,0.3)", background: "var(--danger-light)", color: "var(--danger)" }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Buscar por título, número, solicitante…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors"
            style={{
              background: showAdvanced ? "rgba(99,102,241,0.1)" : "var(--surface)",
              borderColor: showAdvanced ? "rgba(99,102,241,0.4)" : "var(--border)",
              color: showAdvanced ? "var(--brand)" : "var(--text-secondary)",
            }}
          >
            <SlidersHorizontal size={13} />
            Filtros
            {activeFilters.length > 0 && (
              <span className="ml-0.5 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex gap-0.5 rounded-lg p-0.5 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <button
                onClick={() => setView("feed")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{ background: view === "feed" ? "var(--brand)" : "transparent", color: view === "feed" ? "white" : "var(--text-secondary)" }}
              >
                <ListTree size={13} /> Feed
              </button>
              <button
                onClick={() => setView("constellation")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{ background: view === "constellation" ? "var(--brand)" : "transparent", color: view === "constellation" ? "white" : "var(--text-secondary)" }}
              >
                <Orbit size={13} /> Constelação
              </button>
            </div>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
            </span>
            <Link href="/tickets/new">
              <Button size="sm"><Plus className="w-3.5 h-3.5" /> Novo Ticket</Button>
            </Link>
          </div>
        </div>

        {/* ── Advanced filters panel ── */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="grid grid-cols-4 gap-3 p-4 rounded-xl border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Prioridade</label>
                  <div className="relative">
                    <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as TicketPriority | "all")}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      style={{ background: "var(--background-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                      <option value="all">Todas</option>
                      <option value="critical">Crítica</option>
                      <option value="high">Alta</option>
                      <option value="medium">Média</option>
                      <option value="low">Baixa</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Categoria</label>
                  <div className="relative">
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as TicketCategory | "all")}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      style={{ background: "var(--background-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                      <option value="all">Todas</option>
                      {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map(k => (
                        <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Responsável</label>
                  <div className="relative">
                    <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      style={{ background: "var(--background-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                      <option value="all">Todos</option>
                      <option value="unassigned">Não atribuído</option>
                      {supportUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>

                {/* SLA */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>SLA</label>
                  <div className="relative">
                    <select value={slaFilter} onChange={e => setSlaFilter(e.target.value as "all" | "breached" | "at_risk")}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      style={{ background: "var(--background-subtle)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
                      <option value="all">Todos</option>
                      <option value="breached">SLA Violado</option>
                      <option value="at_risk">Em Risco</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active filter pills ── */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Filtros ativos:</span>
            {activeFilters.map(f => {
              const clear = () => {
                if (f.startsWith("Prioridade")) setPriorityFilter("all");
                else if (f.startsWith("Categoria")) setCategoryFilter("all");
                else if (f.startsWith("Responsável") || f === "Não atribuído") setAssigneeFilter("all");
                else if (f.startsWith("SLA")) setSlaFilter("all");
              };
              return <FilterPill key={f} label={f} onRemove={clear} />;
            })}
            <button
              onClick={() => { setPriorityFilter("all"); setCategoryFilter("all"); setAssigneeFilter("all"); setSlaFilter("all"); }}
              className="text-xs transition-colors hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              Limpar tudo
            </button>
          </div>
        )}

        {view === "constellation" ? (
          <OperationalConstellation
            tickets={filtered}
            onSelectCategory={(cat) => { setCategoryFilter(cat); setView("feed"); }}
          />
        ) : (
          <>
            {/* ── Status tabs ── */}
            <div className="flex gap-1 rounded-lg p-1 w-fit border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              {STATUS_FILTERS.map((f) => {
                const count = f.value === "all" ? tickets.length : tickets.filter(t => t.status === f.value).length;
                const active = statusFilter === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className="relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{ color: active ? "white" : "var(--text-secondary)" }}
                  >
                    {active && (
                      <motion.div layoutId="tickets-tab-active" className="absolute inset-0 bg-indigo-600 rounded-md -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
                    )}
                    {f.label}
                    <span className="ml-1.5 text-[10px]" style={{ color: active ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Ordenação + contagem viva ── */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] mr-1" style={{ color: "var(--text-muted)" }}>Ordenar por</span>
                {SORT_OPTIONS.map((opt) => {
                  const active = sortField === opt.field;
                  return (
                    <button
                      key={opt.field}
                      onClick={() => toggleSort(opt.field)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                      style={{
                        background: active ? "rgba(99,102,241,0.1)" : "transparent",
                        color: active ? "var(--brand)" : "var(--text-secondary)",
                      }}
                    >
                      {opt.label}
                      {active && (sortDir === "desc" ? <ArrowDownAZ size={11} /> : <ArrowUpAZ size={11} />)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="ops-live-dot" style={{ color: "var(--ops-emerald)" }} aria-hidden />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {filtered.length} operaç{filtered.length !== 1 ? "ões" : "ão"} no fluxo
                </span>
              </div>
            </div>

            {/* ── Operational Feed ── */}
            <div className="surface-card rounded-xl overflow-hidden">
              {loading ? (
                <div>{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Nenhum ticket encontrado"
                  description="Tente ajustar os filtros ou abra um novo chamado."
                  action={<Link href="/tickets/new"><Button size="sm"><Plus className="w-3.5 h-3.5" /> Novo Ticket</Button></Link>}
                />
              ) : (
                <>
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {paginated.map((ticket, i) => (
                      <LivingTicketRow key={ticket.id} ticket={ticket} index={i} />
                    ))}
                  </div>

                  {/* ── Pagination ── */}
                  <div
                    className="flex items-center justify-between px-5 py-3 border-t"
                    style={{ borderColor: "var(--border)", background: "var(--background-subtle)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Linhas por página:</span>
                      <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="text-xs py-1 px-2 rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs mr-2" style={{ color: "var(--text-muted)" }}>
                        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg border disabled:opacity-30 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        <ChevronLeft size={13} />
                      </button>

                      {/* Page pills */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                        .reduce<(number | "…")[]>((acc, p, i, arr) => {
                          if (i > 0 && (arr[i - 1] as number) + 1 < p) acc.push("…");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "…" ? (
                            <span key={`ellipsis-${i}`} className="text-xs px-1" style={{ color: "var(--text-muted)" }}>…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setPage(p as number)}
                              className="w-7 h-7 text-xs rounded-lg border transition-colors"
                              style={{
                                background: page === p ? "var(--brand)" : "transparent",
                                borderColor: page === p ? "transparent" : "var(--border)",
                                color: page === p ? "white" : "var(--text-secondary)",
                                fontWeight: page === p ? 600 : 400,
                              }}
                            >
                              {p}
                            </button>
                          )
                        )
                      }

                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded-lg border disabled:opacity-30 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );

}
