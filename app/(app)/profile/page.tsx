"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import { MOCK_TICKETS } from "@/lib/mock-data";
import { STATUS_LABELS, STATUS_TONES } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatRelativeDate } from "@/lib/utils";
import {
  User, Mail, Building2, Shield, Bell, Moon, Globe,
  CheckCircle, Save, KeyRound, Eye, EyeOff, AlertCircle, Ticket,
} from "lucide-react";
import Link from "next/link";

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="surface-card rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        {description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────
function Field({
  label, icon, value, onChange, type = "text", placeholder, readOnly, error,
}: {
  label: string; icon: React.ReactNode; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; readOnly?: boolean; error?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
          {icon}
        </span>
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          readOnly={readOnly}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          style={{
            background: readOnly ? "var(--background-subtle)" : "var(--surface)",
            borderColor: error ? "var(--danger)" : "var(--border)",
            color: "var(--text-primary)",
            cursor: readOnly ? "default" : "text",
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs flex items-center gap-1" style={{ color: "var(--danger)" }}>
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  );
}

// ─── Toggle setting ────────────────────────────────────────────────────────────
function Toggle({
  label, description, value, onChange,
}: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
        {description && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors"
        style={{ background: value ? "var(--brand)" : "var(--border)" }}
        aria-pressed={value}
        role="switch"
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ transform: value ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { notifications } = useNotifications();
  const unread = notifications.filter(n => !n.read).length;

  const displayUser = user ?? {
    id: "u1", name: "André Silva", email: "admin@acme.com",
    role: "admin" as const, department: "TI", created_at: "2024-01-10T09:00:00Z",
  };

  // Profile form
  const [name, setName] = useState(displayUser.name);
  const [department, setDepartment] = useState(displayUser.department ?? "");
  const [profileSaved, setProfileSaved] = useState(false);

  // Password form
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [pwdSaved, setPwdSaved] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Preferences
  const [notifTicketAssigned, setNotifTicketAssigned] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifSLA, setNotifSLA] = useState(true);
  const [notifStatusChange, setNotifStatusChange] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  const myTickets = MOCK_TICKETS.filter(t => t.created_by === displayUser.id).slice(0, 5);

  const ROLE_LABEL: Record<string, string> = {
    admin: "Administrador",
    support: "Suporte",
    user: "Usuário",
  };

  const saveProfile = async () => {
    await new Promise(r => setTimeout(r, 600));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const savePassword = async () => {
    const errs: Record<string, string> = {};
    if (!currentPwd) errs.currentPwd = "Informe a senha atual";
    if (newPwd.length < 8) errs.newPwd = "Mínimo 8 caracteres";
    if (newPwd !== confirmPwd) errs.confirmPwd = "Senhas não coincidem";
    setPwdErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingPwd(true);
    await new Promise(r => setTimeout(r, 700));
    setSavingPwd(false);
    setPwdSaved(true);
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setTimeout(() => setPwdSaved(false), 3000);
  };

  const savePreferences = async () => {
    await new Promise(r => setTimeout(r, 400));
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  const SavedBadge = ({ show }: { show: boolean }) => (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
          className="flex items-center gap-1 text-xs"
          style={{ color: "var(--success)" }}
        >
          <CheckCircle size={13} /> Salvo
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <Header title="Meu Perfil" />
      <div className="p-6 max-w-3xl space-y-5">

        {/* ── Avatar + stats ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="surface-card rounded-xl p-6 flex items-center gap-5"
        >
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-2xl font-bold text-indigo-600 dark:text-indigo-300 flex-shrink-0">
              {displayUser.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-white dark:border-slate-900" title="Online" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{displayUser.name}</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{displayUser.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(99,102,241,0.12)", color: "var(--brand)" }}>
                {ROLE_LABEL[displayUser.role]}
              </span>
              {displayUser.department && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {displayUser.department}</span>
              )}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                · Membro desde {new Date(displayUser.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden sm:flex gap-4 flex-shrink-0">
            {[
              { label: "Tickets abertos", value: MOCK_TICKETS.filter(t => t.created_by === displayUser.id && t.status === "open").length },
              { label: "Resolvidos", value: MOCK_TICKETS.filter(t => t.created_by === displayUser.id && (t.status === "resolved" || t.status === "closed")).length },
              { label: "Notificações", value: unread },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-5">

          {/* ── Profile info ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Section title="Informações pessoais" description="Seus dados de perfil no sistema.">
              <div className="space-y-4">
                <Field label="Nome completo" icon={<User size={14} />} value={name} onChange={setName} placeholder="Seu nome" />
                <Field label="E-mail" icon={<Mail size={14} />} value={displayUser.email} readOnly />
                <Field label="Departamento" icon={<Building2 size={14} />} value={department} onChange={setDepartment} placeholder="Ex: Tecnologia" />
                <Field label="Perfil de acesso" icon={<Shield size={14} />} value={ROLE_LABEL[displayUser.role]} readOnly />
                <div className="flex items-center justify-between pt-1">
                  <SavedBadge show={profileSaved} />
                  <Button size="sm" onClick={saveProfile} className="ml-auto">
                    <Save size={13} /> Salvar perfil
                  </Button>
                </div>
              </div>
            </Section>
          </motion.div>

          {/* ── Password ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Section title="Alterar senha" description="Use uma senha forte com pelo menos 8 caracteres.">
              <div className="space-y-4">
                <Field label="Senha atual" icon={<KeyRound size={14} />} type="password"
                  value={currentPwd} onChange={setCurrentPwd} placeholder="••••••••"
                  error={pwdErrors.currentPwd}
                />
                <Field label="Nova senha" icon={<KeyRound size={14} />} type="password"
                  value={newPwd} onChange={setNewPwd} placeholder="Mínimo 8 caracteres"
                  error={pwdErrors.newPwd}
                />
                <Field label="Confirmar senha" icon={<KeyRound size={14} />} type="password"
                  value={confirmPwd} onChange={setConfirmPwd} placeholder="Repita a nova senha"
                  error={pwdErrors.confirmPwd}
                />

                {/* Strength bar */}
                {newPwd.length > 0 && (
                  <div>
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full"
                          style={{
                            background: newPwd.length >= i * 2
                              ? i <= 1 ? "#ef4444" : i <= 2 ? "#f59e0b" : i <= 3 ? "#22c55e" : "#10b981"
                              : "var(--border)",
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                      {newPwd.length < 4 ? "Muito fraca" : newPwd.length < 6 ? "Fraca" : newPwd.length < 8 ? "Razoável" : "Forte"}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <SavedBadge show={pwdSaved} />
                  <Button size="sm" onClick={savePassword} loading={savingPwd} className="ml-auto">
                    <KeyRound size={13} /> Alterar senha
                  </Button>
                </div>
              </div>
            </Section>
          </motion.div>
        </div>

        {/* ── Notification preferences ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Section title="Preferências de notificação" description="Controle quais eventos geram notificações no sistema.">
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              <Toggle label="Ticket atribuído a mim" description="Quando um ticket é atribuído ao seu usuário"
                value={notifTicketAssigned} onChange={setNotifTicketAssigned} />
              <Toggle label="Novos comentários" description="Quando alguém comenta em um ticket seu"
                value={notifComments} onChange={setNotifComments} />
              <Toggle label="Alertas de SLA" description="Avisos de violação ou risco de SLA"
                value={notifSLA} onChange={setNotifSLA} />
              <Toggle label="Mudanças de status" description="Quando o status de um ticket é alterado"
                value={notifStatusChange} onChange={setNotifStatusChange} />
            </div>
            <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <SavedBadge show={prefSaved} />
              <Button size="sm" onClick={savePreferences} className="ml-auto">
                <Bell size={13} /> Salvar preferências
              </Button>
            </div>
          </Section>
        </motion.div>

        {/* ── Recent tickets ── */}
        {myTickets.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Section title="Meus tickets recentes">
              <div className="space-y-2">
                {myTickets.map(t => (
                  <Link key={t.id} href={`/tickets/${t.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg transition-colors group"
                    style={{ background: "var(--background-subtle)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--background-subtle)")}
                  >
                    <Ticket size={14} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate group-hover:text-indigo-500 transition-colors" style={{ color: "var(--text-primary)" }}>
                        {t.title}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {t.ticket_number} · {formatRelativeDate(t.created_at)}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONES[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                  </Link>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ── Danger zone ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="surface-card rounded-xl overflow-hidden border" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.03)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Zona de perigo</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Ações irreversíveis</p>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Encerrar sessão</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sair de todos os dispositivos</p>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 text-xs font-medium rounded-lg border transition-colors"
                style={{
                  color: "var(--danger)",
                  borderColor: "rgba(239,68,68,0.3)",
                  background: "transparent",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--danger-light)";
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </motion.div>

      </div>
    </>
  );
}
