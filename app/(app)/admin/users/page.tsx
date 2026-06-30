"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/lib/auth-context";
import { User, UserRole } from "@/types";
import {
  UserPlus, Pencil, Trash2, Shield, Headphones,
  User as UserIcon, Search, X, CheckCircle, AlertCircle,
} from "lucide-react";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin:   { label: "Admin",   icon: <Shield    className="w-3 h-3" />, color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30" },
  support: { label: "Suporte", icon: <Headphones className="w-3 h-3" />, color: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30" },
  user:    { label: "Usuário", icon: <UserIcon  className="w-3 h-3" />, color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600" },
};

interface UserForm {
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

const EMPTY_FORM: UserForm = { name: "", email: "", role: "user", department: "" };

function validateForm(form: UserForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim())                          errors.name = "Nome é obrigatório";
  else if (form.name.trim().length < 3)           errors.name = "Mínimo 3 caracteres";
  if (!form.email.trim())                         errors.email = "E-mail é obrigatório";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "E-mail inválido";
  return errors;
}

function FormField({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1 text-xs flex items-center gap-1" style={{ color: "var(--danger)" }}
          >
            <AlertCircle className="w-3 h-3" />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors";
const inputStyle = { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" };

export default function UsersPage() {
  const { users: rawUsers, loading } = useUsers();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [synced, setSynced] = useState(false);
  const [search, setSearch] = useState("");

  // Sync once from hook
  if (!synced && rawUsers.length > 0) {
    setUsers(rawUsers);
    setSynced(true);
  }

  // Modal state
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingUser, setEditingUser]   = useState<User | null>(null);
  const [form, setForm]                 = useState<UserForm>(EMPTY_FORM);
  const [formErrors, setFormErrors]     = useState<Record<string, string>>({});
  const [touched, setTouched]           = useState<Record<string, boolean>>({});
  const [saving, setSaving]             = useState(false);
  const [savedId, setSavedId]           = useState<string | null>(null);

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setTouched({});
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, department: u.department ?? "" });
    setFormErrors({});
    setTouched({});
    setModalOpen(true);
  };

  const setField = (field: keyof UserForm, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) {
      const errs = validateForm(next);
      setFormErrors(prev => ({ ...prev, [field]: errs[field] }));
    }
  };

  const blur = (field: keyof UserForm) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errs = validateForm(form);
    setFormErrors(prev => ({ ...prev, [field]: errs[field] }));
  };

  const handleSave = async () => {
    const errs = validateForm(form);
    setFormErrors(errs);
    setTouched({ name: true, email: true, role: true, department: true });
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    await new Promise(r => setTimeout(r, 600));

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...form } : u));
      setSavedId(editingUser.id);
    } else {
      const newUser: User = {
        id: `u${Date.now()}`,
        ...form,
        created_at: new Date().toISOString(),
      };
      setUsers(prev => [newUser, ...prev]);
      setSavedId(newUser.id);
    }

    setSaving(false);
    setModalOpen(false);
    setTimeout(() => setSavedId(null), 2500);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await new Promise(r => setTimeout(r, 600));
    setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.department ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const displayUsers = loading && users.length === 0
    ? Array.from({ length: 4 }, (_, i) => ({ id: `skel-${i}`, skeleton: true }))
    : filtered;

  return (
    <>
      <Header title="Usuários" />
      <div className="p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou departamento…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{filtered.length}</span> usuários
          </p>
          <div className="ml-auto">
            <Button size="sm" onClick={openCreate}><UserPlus className="w-3.5 h-3.5" /> Novo usuário</Button>
          </div>
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--background-subtle)" }}>
                {["Usuário", "Departamento", "Perfil", "Cadastrado em", ""].map((h, i) => (
                  <th key={i} className="text-left text-xs font-medium px-5 py-3" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              <AnimatePresence initial={false}>
                {displayUsers.map((row: any) => {
                  if (row.skeleton) return (
                    <tr key={row.id}>
                      {[1,2,3,4,5].map(i => (
                        <td key={i} className="px-5 py-4">
                          <div className="h-3 rounded animate-pulse" style={{ background: "var(--surface-hover)", width: i === 1 ? "60%" : i === 5 ? "48px" : "40%" }} />
                        </td>
                      ))}
                    </tr>
                  );

                  const user = row as User;
                  const role = ROLE_CONFIG[user.role];
                  const justSaved = savedId === user.id;

                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      style={justSaved ? { background: "rgba(99,102,241,0.05)" } : undefined}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{user.name}</p>
                              {justSaved && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                              {currentUser?.id === user.id && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,0.1)", color: "var(--brand)" }}>Você</span>
                              )}
                            </div>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{user.department || "—"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${role.color}`}>
                          {role.icon} {role.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Intl.DateTimeFormat("pt-BR").format(new Date(user.created_at))}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                            style={{ color: "var(--text-muted)" }}
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            disabled={currentUser?.id === user.id}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: "var(--text-muted)" }}
                            title={currentUser?.id === user.id ? "Não pode excluir o próprio usuário" : "Excluir"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhum usuário encontrado</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? "Editar usuário" : "Novo usuário"}
        description={editingUser ? `Editando ${editingUser.name}` : "Preencha os dados para criar um novo usuário."}
      >
        <div className="space-y-4">
          <FormField label="Nome completo *" error={touched.name ? formErrors.name : undefined}>
            <input
              type="text"
              value={form.name}
              onChange={e => setField("name", e.target.value)}
              onBlur={() => blur("name")}
              placeholder="Ex: Maria Silva"
              className={inputCls}
              style={{ ...inputStyle, borderColor: touched.name && formErrors.name ? "var(--danger)" : "var(--border)" }}
            />
          </FormField>

          <FormField label="E-mail *" error={touched.email ? formErrors.email : undefined}>
            <input
              type="email"
              value={form.email}
              onChange={e => setField("email", e.target.value)}
              onBlur={() => blur("email")}
              placeholder="maria@empresa.com"
              disabled={!!editingUser}
              className={inputCls}
              style={{ ...inputStyle, borderColor: touched.email && formErrors.email ? "var(--danger)" : "var(--border)", opacity: editingUser ? 0.6 : 1 }}
            />
            {editingUser && <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>E-mail não pode ser alterado</p>}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Perfil *">
              <select
                value={form.role}
                onChange={e => setField("role", e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`}
                style={inputStyle}
              >
                <option value="user">Usuário</option>
                <option value="support">Suporte</option>
                <option value="admin">Administrador</option>
              </select>
            </FormField>

            <FormField label="Departamento">
              <input
                type="text"
                value={form.department}
                onChange={e => setField("department", e.target.value)}
                placeholder="Ex: Financeiro"
                className={inputCls}
                style={inputStyle}
              />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "transparent" }}
            >
              Cancelar
            </button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              {editingUser ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        danger
        title="Excluir usuário"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, excluir"
      />
    </>
  );
}
