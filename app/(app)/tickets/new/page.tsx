"use client";
import { Suspense, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { AttachmentZone } from "@/components/tickets/AttachmentZone";
import { CATEGORY_LABELS, PRIORITY_LABELS, DEFAULT_SLA, TicketCategory, TicketPriority, Attachment } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ArrowLeft, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Validation ────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) {
    errors.title = "Título é obrigatório";
  } else if (form.title.trim().length < 10) {
    errors.title = "Título deve ter pelo menos 10 caracteres";
  } else if (form.title.trim().length > 120) {
    errors.title = "Título deve ter no máximo 120 caracteres";
  }
  if (!form.description.trim()) {
    errors.description = "Descrição é obrigatória";
  } else if (form.description.trim().length < 20) {
    errors.description = "Descreva o problema com pelo menos 20 caracteres";
  }
  return errors;
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label, error, hint, required, children,
}: {
  label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
        {required && <span className="ml-0.5" style={{ color: "var(--danger)" }}>*</span>}
      </label>
      {children}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 text-xs flex items-center gap-1"
            style={{ color: "var(--danger)" }}
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS) as TicketCategory[];
const VALID_PRIORITIES = Object.keys(PRIORITY_LABELS) as TicketPriority[];

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category") as TicketCategory | null;
  const priorityParam = searchParams.get("priority") as TicketPriority | null;

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    category: VALID_CATEGORIES.includes(categoryParam as TicketCategory) ? categoryParam! : "software",
    priority: VALID_PRIORITIES.includes(priorityParam as TicketPriority) ? priorityParam! : "medium",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Antes do ticket existir no banco não há ticket_id para associar um
  // upload real — guardamos os arquivos crus e só sobem de fato depois
  // que o POST de criação retornar com sucesso (ver handleSubmit).
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.value as any;
    const next = { ...form, [field]: val };
    setForm(next);
    if (touched[field]) {
      const errs = validate(next);
      setErrors(prev => ({ ...prev, [field]: errs[field] }));
    }
  };

  const blur = (field: keyof FormState) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errs = validate(form);
    setErrors(prev => ({ ...prev, [field]: errs[field] }));
  };

  const handleSubmit = async () => {
    const errs = validate(form);
    setErrors(errs);
    setTouched({ title: true, description: true, category: true, priority: true });
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    setAttachmentWarning(null);

    if (!isSupabaseConfigured) {
      // Modo demo: não há onde persistir de fato; mantém a simulação
      // anterior só para a UX de sucesso continuar funcionando sem backend.
      await new Promise((r) => setTimeout(r, 800));
      setSubmitted(true);
      setSubmitting(false);
      setTimeout(() => router.push("/tickets"), 1500);
      return;
    }

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao criar o ticket");
      }
      const ticket = await res.json();

      // Só agora o ticket tem um id real no banco — sobe os arquivos que
      // ficaram pendentes na tela. Se algum falhar, o ticket já existe e
      // fica visível mesmo assim; só avisamos que o anexo não foi salvo,
      // em vez de bloquear a criação inteira por causa de um upload.
      if (pendingFiles.length > 0) {
        const results = await Promise.allSettled(
          pendingFiles.map((file) => {
            const formData = new FormData();
            formData.append("file", file);
            return fetch(`/api/tickets/${ticket.id}/attachments`, {
              method: "POST",
              body: formData,
            }).then((r) => {
              if (!r.ok) throw new Error(file.name);
            });
          })
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          setAttachmentWarning(
            `Ticket criado, mas ${failed} de ${pendingFiles.length} anexo(s) não foram enviados. Você pode tentar novamente na página do ticket.`
          );
        }
      }

      setSubmitted(true);
      setTimeout(() => router.push(`/tickets/${ticket.id}`), 1500);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erro ao criar ticket");
    } finally {
      setSubmitting(false);
    }
  };

  // O ticket ainda não existe no banco neste ponto, então não há upload
  // real possível ainda — só acumula o arquivo para enviar depois que o
  // POST de criação retornar com um id (ver handleSubmit acima).
  const handleAttachment = useCallback(async (file: File) => {
    setPendingFiles((prev) => [...prev, file]);
  }, []);

  const handleRemovePending = useCallback(async (fileName: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.name !== fileName));
  }, []);

  // AttachmentZone espera Attachment[] para renderizar a lista (nome,
  // tamanho, tipo) — aqui criamos objetos "de exibição" só com esses
  // campos, nunca persistidos; o upload real usa pendingFiles (acima).
  const displayAttachments: Attachment[] = pendingFiles.map((file, i) => ({
    id: file.name + i,
    ticket_id: "pending",
    uploaded_by: "",
    filename: file.name,
    size_bytes: file.size,
    mime_type: file.type || "application/octet-stream",
    url: "#",
    created_at: new Date().toISOString(),
  }));

  const sla = DEFAULT_SLA[form.priority];
  const inputClass = (field: keyof FormState) =>
    `w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
      errors[field] && touched[field]
        ? "border-red-400 focus:ring-red-500/20"
        : "focus:ring-indigo-500/20 focus:border-indigo-400"
    }`;

  if (submitted) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--success-light)" }}>
          <CheckCircle2 className="w-7 h-7" style={{ color: "var(--success)" }} />
        </div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Ticket criado!</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Redirecionando para a lista…</p>
      </motion.div>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
        <Link href="/tickets">
          <button className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Abrir novo ticket</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Descreva o problema para que nossa equipe possa ajudar.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface-card rounded-xl p-6 space-y-5">

        {/* Title */}
        <Field label="Título" error={touched.title ? errors.title : undefined} hint={`${form.title.length}/120 caracteres`} required>
          <input
            type="text"
            value={form.title}
            onChange={set("title")}
            onBlur={blur("title")}
            placeholder="Ex: Computador não conecta na rede Wi-Fi"
            maxLength={120}
            className={inputClass("title")}
            style={{ background: "var(--surface)", borderColor: errors.title && touched.title ? undefined : "var(--border)", color: "var(--text-primary)" }}
          />
        </Field>

        {/* Category + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria" required>
            <div className="relative">
              <select
                value={form.category}
                onChange={set("category")}
                className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                {VALID_CATEGORIES.map(k => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
              </select>
              <Info className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
          </Field>

          <Field label="Prioridade" hint={`Resposta em até ${sla.response}h, resolução em ${sla.resolution}h`} required>
            <div className="relative">
              <select
                value={form.priority}
                onChange={set("priority")}
                className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                {VALID_PRIORITIES.map(k => <option key={k} value={k}>{PRIORITY_LABELS[k]}</option>)}
              </select>
              <Info className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
          </Field>
        </div>

        {/* Priority info bar */}
        {form.priority === "critical" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="flex items-start gap-2.5 p-3 rounded-lg text-xs"
            style={{ background: "var(--danger-light)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--danger)" }}
          >
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Prioridade crítica aciona o time imediatamente. Use apenas para situações que impedem o trabalho de múltiplas pessoas.</span>
          </motion.div>
        )}

        {/* Description */}
        <Field label="Descrição" error={touched.description ? errors.description : undefined} hint={`${form.description.length} caracteres (mín. 20)`} required>
          <textarea
            value={form.description}
            onChange={set("description")}
            onBlur={blur("description")}
            placeholder="Descreva o problema com detalhes: quando começou, mensagens de erro, o que já tentou..."
            rows={5}
            className={`${inputClass("description")} resize-none leading-relaxed`}
            style={{ background: "var(--surface)", borderColor: errors.description && touched.description ? undefined : "var(--border)", color: "var(--text-primary)" }}
          />
        </Field>

        {/* Attachments */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Anexos <span style={{ color: "var(--text-muted)" }}>(opcional)</span></p>
          <AttachmentZone
            attachments={displayAttachments}
            onAdd={handleAttachment}
            onRemove={(id) => {
              const file = pendingFiles.find((f, i) => f.name + i === id);
              if (file) return handleRemovePending(file.name);
              return Promise.resolve();
            }}
          />
          <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
            Os arquivos são enviados depois que o ticket for criado.
          </p>
        </div>

        {submitError && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--danger)" }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {submitError}
          </p>
        )}
        {attachmentWarning && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--warning)" }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {attachmentWarning}
          </p>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-1">
          <Link href="/tickets">
            <Button variant="ghost" size="sm">Cancelar</Button>
          </Link>
          <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
            Abrir ticket
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <>
      <Header />
      <Suspense>
        <NewTicketForm />
      </Suspense>
    </>
  );
}
