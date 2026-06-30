"use client";
import { useState, use, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { useTicket } from "@/hooks/useTicket";
import { useUsers } from "@/hooks/useUsers";
import { useAttachments } from "@/hooks/useAttachments";
import { useAuditEvents } from "@/hooks/useAuditEvents";
import { useAuth } from "@/lib/auth-context";
import { CURRENT_USER } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AuditTimeline } from "@/components/tickets/AuditTimeline";
import { AttachmentZone } from "@/components/tickets/AttachmentZone";
import {
  STATUS_TONES, STATUS_LABELS, PRIORITY_TONES, PRIORITY_LABELS, CATEGORY_LABELS,
  TicketStatus, Comment,
} from "@/types";
import { formatDate, formatRelativeDate } from "@/lib/utils";
import { calculateSLAStatus, SLA_RISK_STYLES } from "@/lib/sla-engine";
import { SLABadge, SLAProgressBar } from "@/components/tickets/SLABadge";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { SkeletonRow } from "@/components/ui/Skeleton";
import {
  ArrowLeft, Clock, User, Tag, AlertTriangle, Send, Lock, ChevronDown,
  CheckCircle, MessageSquare, Paperclip, History,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Tab = "comments" | "attachments" | "history";

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ticket, loading, notFound: ticketNotFound, error, refresh } = useTicket(id);
  const { users } = useUsers();
  const { user: authUser } = useAuth();
  const { attachments, loading: loadingAttachments, error: attachError, upload, remove: removeAttachment } = useAttachments(id);
  const { events: auditEvents, loading: loadingAudit, refresh: refreshAudit } = useAuditEvents(id);

  // Sem Supabase configurado, authUser é null (sem sessão real) — cai no mock.
  const currentUser = authUser ?? CURRENT_USER;

  const [status, setStatus] = useState<TicketStatus | null>(null);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tab, setTab] = useState<Tab>("comments");

  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [savingTicket, setSavingTicket] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [attachError2, setAttachError2] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);

  // Sincroniza estado local sempre que o ticket carregar/atualizar.
  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setAssignedTo(ticket.assigned_to || "");
      setComments(ticket.comments || []);
    }
  }, [ticket]);

  if (ticketNotFound) notFound();

  const supportUsers = users.filter((u) => u.role === "support" || u.role === "admin");
  const isSupport = currentUser.role === "support" || currentUser.role === "admin";

  const handleAddComment = async () => {
    if (!comment.trim() || !ticket) return;
    setSubmittingComment(true);
    setCommentError(null);

    if (!isSupabaseConfigured) {
      await new Promise((r) => setTimeout(r, 400));
      const newComment: Comment = {
        id: `c${Date.now()}`,
        ticket_id: ticket.id,
        author_id: currentUser.id,
        author: currentUser,
        content: comment,
        is_internal: isInternal,
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, newComment]);
      setComment("");
      setSubmittingComment(false);
      return;
    }

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment, is_internal: isInternal }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao enviar comentário");
      }
      const newComment: Comment = await res.json();
      // A rota retorna o comentário com `author` resolvido via join; o
      // fallback abaixo só entra em jogo caso isso mude no futuro.
      setComments((prev) => [...prev, { ...newComment, author: newComment.author ?? currentUser }]);
      setComment("");
      refreshAudit();
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : "Erro ao enviar comentário");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSave = async () => {
    if (!ticket || !status) return;
    setSavingTicket(true);
    setSaveError(null);
    setSaved(false);

    if (!isSupabaseConfigured) {
      await new Promise((r) => setTimeout(r, 500));
      setSavingTicket(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return;
    }

    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assigned_to: assignedTo || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao salvar alterações");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      refresh();
      refreshAudit();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar alterações");
    } finally {
      setSavingTicket(false);
    }
  };

  const handleAttachment = async (file: File) => {
    setAttachError2(null);
    try {
      await upload(file);
      refreshAudit();
    } catch (e) {
      setAttachError2(e instanceof Error ? e.message : "Erro ao enviar arquivo");
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeletingAttachment(true);
    try {
      await removeAttachment(confirmDeleteId);
      setConfirmDeleteId(null);
    } catch (e) {
      setAttachError2(e instanceof Error ? e.message : "Erro ao remover anexo");
    } finally {
      setDeletingAttachment(false);
    }
  };

  if (loading || !ticket || status === null) {
    return (
      <>
        <Header />
        <div className="p-6 max-w-6xl space-y-4">
          {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </>
    );
  }

  const slaStatus = calculateSLAStatus({ ...ticket, status });

  const TABS: { id: Tab; icon: React.ElementType; label: string; count?: number }[] = [
    { id: "comments",    icon: MessageSquare, label: "Comentários", count: comments.length },
    { id: "attachments", icon: Paperclip,     label: "Anexos",      count: attachments.length },
    { id: "history",     icon: History,       label: "Histórico",   count: auditEvents.length },
  ];

  return (
    <>
      <Header />
      <div className="p-6 max-w-6xl">
        {error && (
          <div className="rounded-xl p-4 flex items-center gap-3 border mb-4" style={{ background: "var(--danger-light)", borderColor: "rgba(220,38,38,0.25)" }}>
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Back + Title */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4 mb-6">
          <Link href="/tickets">
            <button className="mt-1 p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{ticket.ticket_number}</span>
              <SLABadge ticket={{ ...ticket, status }} />
            </div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{ticket.title}</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Aberto por <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{ticket.created_by_user?.name}</span>
              {ticket.created_by_user?.department && ` · ${ticket.created_by_user.department}`}
              {" · "}{formatRelativeDate(ticket.created_at)}
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-5">
          {/* Main */}
          <div className="col-span-2 space-y-4">
            {/* Description */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface-card rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Descrição</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                {ticket.description}
              </p>
            </motion.div>

            {/* SLA */}
            {slaStatus.level !== "none" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="surface-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                    <Clock className="w-4 h-4" style={{ color: "var(--brand)" }} />
                    Progresso do SLA
                  </h3>
                  <span className="text-xs font-medium" style={{ color: SLA_RISK_STYLES[slaStatus.level].dot.includes("red") ? "var(--danger)" : "var(--text-secondary)" }}>
                    {Math.round(slaStatus.percentUsed)}% do prazo utilizado
                  </span>
                </div>
                <SLAProgressBar ticket={{ ...ticket, status }} />
              </motion.div>
            )}

            {/* Tabs container */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface-card rounded-xl overflow-hidden">
              <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative"
                      style={{ color: active ? "var(--brand)" : "var(--text-muted)" }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                      {typeof t.count === "number" && t.count > 0 && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: active ? "var(--brand-light)" : "var(--background-subtle)", color: active ? "var(--brand)" : "var(--text-muted)" }}
                        >
                          {t.count}
                        </span>
                      )}
                      {active && (
                        <motion.div
                          layoutId="ticket-tab-underline"
                          className="absolute bottom-0 left-0 right-0 h-0.5"
                          style={{ background: "var(--brand)" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Comments tab */}
              {tab === "comments" && (
                <>
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {comments.length === 0 && (
                      <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Nenhum comentário ainda</p>
                    )}
                    <AnimatePresence>
                      {comments.map((c) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-5"
                          style={c.is_internal ? { background: "var(--warning-light)" } : undefined}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                              {c.author?.name?.split(" ").map(n => n[0]).slice(0, 2).join("") ?? "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.author?.name ?? "Usuário"}</span>
                                {c.is_internal && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 border" style={{ color: "var(--warning)", borderColor: "rgba(217,119,6,0.3)" }}>
                                    <Lock className="w-2.5 h-2.5" /> Nota interna
                                  </span>
                                )}
                                <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>{formatRelativeDate(c.created_at)}</span>
                              </div>
                              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{c.content}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="p-5 border-t" style={{ borderColor: "var(--border)", background: "var(--background-subtle)" }}>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Adicionar comentário..."
                      rows={3}
                      className="w-full px-4 py-3 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 border"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                    <div className="flex items-center justify-between mt-3">
                      {isSupport && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="w-3.5 h-3.5 accent-amber-500" />
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Nota interna (visível só para suporte)</span>
                        </label>
                      )}
                      <Button size="sm" onClick={handleAddComment} loading={submittingComment} disabled={!comment.trim()} className="ml-auto">
                        <Send className="w-3.5 h-3.5" /> Enviar
                      </Button>
                    </div>
                    {commentError && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{commentError}</p>}
                  </div>
                </>
              )}

              {/* Attachments tab */}
              {tab === "attachments" && (
                <div className="p-5">
                  {attachError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mb-3">{attachError}</p>
                  )}
                  {attachError2 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mb-3">{attachError2}</p>
                  )}
                  {loadingAttachments ? (
                    <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 rounded-lg skeleton" />)}</div>
                  ) : (
                    <AttachmentZone
                      attachments={attachments}
                      onAdd={handleAttachment}
                      onRemove={async (attId) => setConfirmDeleteId(attId)}
                      readOnly={!isSupport && currentUser.id !== ticket.created_by}
                    />
                  )}
                </div>
              )}

              {/* History tab */}
              {tab === "history" && (
                <div className="p-5">
                  {loadingAudit ? (
                    <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-8 rounded-lg skeleton" />)}</div>
                  ) : (
                    <AuditTimeline events={[...auditEvents].reverse()} />
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface-card rounded-xl p-5 space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Status</label>
                {isSupport ? (
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TicketStatus)}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer border"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                ) : (
                  <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
                )}
              </div>

              {isSupport && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Responsável</label>
                  <div className="relative">
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer border"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    >
                      <option value="">Não atribuído</option>
                      {supportUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              )}

              {isSupport && (
                <>
                  <Button className="w-full" size="sm" onClick={handleSave} loading={savingTicket}>
                    <CheckCircle className="w-3.5 h-3.5" /> Salvar alterações
                  </Button>
                  {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}
                  {saved && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs flex items-center gap-1.5" style={{ color: "var(--success)" }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Alterações salvas
                    </motion.p>
                  )}
                </>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="surface-card rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Detalhes</h3>
              <InfoRow icon={<Tag className="w-3.5 h-3.5" />} label="Categoria" value={CATEGORY_LABELS[ticket.category]} />
              <InfoRow icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Prioridade">
                <Badge tone={PRIORITY_TONES[ticket.priority]}>{PRIORITY_LABELS[ticket.priority]}</Badge>
              </InfoRow>
              <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Solicitante" value={ticket.created_by_user?.name} />
              {ticket.created_by_user?.department && (
                <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Departamento" value={ticket.created_by_user.department} />
              )}
              <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Criado em" value={formatDate(ticket.created_at)} />
              {ticket.sla_deadline && (
                <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Prazo SLA" value={formatDate(ticket.sla_deadline)} />
              )}
              {ticket.resolved_at && (
                <InfoRow icon={<CheckCircle className="w-3.5 h-3.5" />} label="Resolvido em" value={formatDate(ticket.resolved_at)} />
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Remover anexo"
        description="Esse arquivo será apagado permanentemente do ticket. Essa ação não pode ser desfeita."
        confirmLabel="Remover"
        danger
        loading={deletingAttachment}
      />
    </>
  );
}

function InfoRow({ icon, label, value, children }: {
  icon: React.ReactNode; label: string; value?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide leading-none mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
        {children || <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{value || "—"}</p>}
      </div>
    </div>
  );
}
