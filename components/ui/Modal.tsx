"use client";
import { useEffect, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${widths[size]} rounded-2xl shadow-2xl`}
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
                {description && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 -mt-1 -mr-1"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Confirm dialog ─────────────────────────────────────────────────────────────

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = "Confirmar", danger = false, loading = false,
}: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{description}</p>
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border transition-colors"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            background: "transparent",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--background-subtle)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity disabled:opacity-50"
          style={{ background: danger ? "var(--danger)" : "var(--brand)" }}
        >
          {loading ? "Aguarde…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
