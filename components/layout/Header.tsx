"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, X, CheckCheck, AlertTriangle, MessageSquare, UserCheck, Clock, TrendingDown } from "lucide-react";
import { MOCK_TICKETS } from "@/lib/mock-data";
import { formatRelativeDate } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useNotifications } from "@/lib/notifications-context";
import { AppNotification, NotificationType } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const NOTIF_ICON: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  ticket_assigned:  { icon: UserCheck,     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  comment_added:    { icon: MessageSquare, color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  status_changed:   { icon: TrendingDown,  color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  sla_warning:      { icon: Clock,         color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  sla_breached:     { icon: AlertTriangle, color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

function NotifItem({ n, onRead, onDismiss }: {
  n: AppNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const cfg = NOTIF_ICON[n.type];
  const Icon = cfg.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.18 }}
      className="group relative flex items-start gap-3 px-4 py-3 transition-colors"
      style={{
        background: n.read ? "transparent" : "rgba(167,139,250,0.04)",
        borderBottom: "1px solid rgba(167,139,250,0.1)",
      }}
    >
      {!n.read && (
        <span className="absolute left-2 top-4 w-1.5 h-1.5 rounded-full" style={{ background: "#a78bfa" }} />
      )}
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <Link href={`/tickets/${n.ticket_id}`} className="flex-1 min-w-0" onClick={() => onRead(n.id)}>
        <p className="text-xs font-medium leading-snug" style={{ color: "#f1f5f9" }}>{n.message}</p>
        {n.ticket_number && (
          <p className="text-[10px] mt-0.5 font-mono" style={{ color: "#6b7688" }}>{n.ticket_number} · {n.ticket_title}</p>
        )}
        <p className="text-[10px] mt-0.5" style={{ color: "#6b7688" }}>{formatRelativeDate(n.created_at)}</p>
      </Link>
      <button
        onClick={() => onDismiss(n.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
        style={{ color: "#6b7688" }}
      >
        <X size={11} />
      </button>
    </motion.div>
  );
}

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim().length > 1
    ? MOCK_TICKETS.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.ticket_number.toLowerCase().includes(query.toLowerCase()) ||
        t.description.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-text"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: open ? "rgba(167,139,250,0.5)" : "rgba(167,139,250,0.2)",
          width: open ? 280 : 200,
          boxShadow: open ? "0 0 0 3px rgba(167,139,250,0.1)" : "none",
          transition: "width .2s, border-color .15s, box-shadow .15s",
        }}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <Search size={13} style={{ color: "#6b7688", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar tickets…"
          className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
          style={{ color: "#f1f5f9" }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ color: "#6b7688" }}><X size={11} /></button>
        )}
        {!query && (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-mono flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)", color: "#6b7688", border: "1px solid rgba(167,139,250,0.2)" }}>
            ⌘K
          </kbd>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute top-10 left-0 w-80 rounded-xl overflow-hidden z-50"
            style={{
              background: "rgba(13,17,32,0.95)",
              border: "1px solid rgba(167,139,250,0.2)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 16px 32px rgba(0,0,0,0.6)",
              width: 320,
            }}
          >
            {query.trim().length < 2 ? (
              <p className="text-center text-xs py-6" style={{ color: "#6b7688" }}>
                Digite pelo menos 2 caracteres…
              </p>
            ) : results.length === 0 ? (
              <p className="text-center text-xs py-6" style={{ color: "#6b7688" }}>
                Nenhum resultado para <strong style={{ color: "#a78bfa" }}>&ldquo;{query}&rdquo;</strong>
              </p>
            ) : (
              <div>
                <p className="px-4 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-widest" style={{ color: "#6b7688", fontFamily: "monospace" }}>
                  {results.length} RESULTADO{results.length !== 1 ? "S" : ""}
                </p>
                {results.map(t => (
                  <Link
                    key={t.id}
                    href={`/tickets/${t.id}`}
                    onClick={() => { setOpen(false); setQuery(""); }}
                    className="flex items-start gap-2.5 px-4 py-2.5 transition-colors"
                    style={{ borderBottom: "1px solid rgba(167,139,250,0.08)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(167,139,250,0.06)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="text-[10px] font-mono mt-0.5 flex-shrink-0" style={{ color: "#a78bfa" }}>
                      {t.ticket_number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "#f1f5f9" }}>{t.title}</p>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: "#6b7688" }}>
                        {t.created_by_user?.name} · {t.category}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header({ title }: { title?: string }) {
  const { notifications, unreadCount, markRead, markAllRead, dismiss } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className="fixed top-0 right-0 flex items-center px-6 gap-3 z-30 transition-[left] duration-300 ease-out"
      style={{
        left: "var(--sidebar-width)",
        height: "var(--header-height)",
        background: "rgba(7,10,18,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(167,139,250,0.12)",
      }}
    >
      {title && (
        <h1 className="text-sm font-semibold mr-auto" style={{ color: "#f1f5f9", fontFamily: "monospace", letterSpacing: "1px" }}>
          {title.toUpperCase()}
        </h1>
      )}
      <div className={title ? "" : "mr-auto"} />

      <GlobalSearch />
      <ThemeToggle />

      {/* Notification bell */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(v => !v)}
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: "#6b7688" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(167,139,250,0.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <Bell className="w-[18px] h-[18px]" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute top-1 right-1 min-w-[16px] h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
                style={{ background: "#f87171" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 rounded-xl overflow-hidden z-50"
              style={{
                width: 340,
                background: "rgba(13,17,32,0.96)",
                border: "1px solid rgba(167,139,250,0.2)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.08)",
              }}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(167,139,250,0.1)" }}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>Notificações</p>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#f87171", color: "white" }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "#a78bfa" }}>
                    <CheckCheck size={12} /> Marcar todas
                  </button>
                )}
              </div>

              <div className="max-h-[380px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell size={20} className="mx-auto mb-2 opacity-20" style={{ color: "#6b7688" }} />
                    <p className="text-xs" style={{ color: "#6b7688" }}>Nenhuma notificação</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {notifications.map(n => (
                      <NotifItem key={n.id} n={n} onRead={markRead} onDismiss={dismiss} />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-2.5 text-center" style={{ borderTop: "1px solid rgba(167,139,250,0.1)" }}>
                  <Link href="/tickets" onClick={() => setNotifOpen(false)} className="text-xs hover:opacity-70 transition-opacity" style={{ color: "#a78bfa" }}>
                    Ver todos os tickets →
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
