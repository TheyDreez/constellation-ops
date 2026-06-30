"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CURRENT_USER } from "@/lib/mock-data";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Ticket, Plus, Users, Clock,
  BarChart3, ChevronsLeft, ChevronsRight, UserCircle,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Dashboard"   },
  { href: "/tickets",     icon: Ticket,          label: "Tickets"     },
  { href: "/tickets/new", icon: Plus,            label: "Novo Ticket" },
];

const adminItems = [
  { href: "/admin/users",   icon: Users,    label: "Usuários"    },
  { href: "/admin/sla",     icon: Clock,    label: "Config. SLA" },
  { href: "/admin/reports", icon: BarChart3, label: "Relatórios" },
];

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const isAdmin   = CURRENT_USER.role === "admin";
  const isSupport = CURRENT_USER.role === "support" || isAdmin;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      } else if (window.innerWidth < 1024) {
        setCollapsed(true);
        document.documentElement.style.setProperty("--sidebar-width", "var(--sidebar-width-collapsed)");
        document.documentElement.setAttribute("data-sidebar-collapsed", "true");
      }
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      document.documentElement.style.setProperty(
        "--sidebar-width",
        next ? "var(--sidebar-width-collapsed)" : "240px"
      );
      document.documentElement.setAttribute("data-sidebar-collapsed", String(next));
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  return (
    <aside
      style={{ width: "var(--sidebar-width)" }}
      className="fixed left-0 top-0 h-full flex flex-col z-40 transition-[width] duration-300 ease-out"
    >
      <div
        className="relative h-full flex flex-col border-r"
        style={{
          background: "linear-gradient(180deg, #080c18 0%, #060a13 100%)",
          borderColor: "rgba(167,139,250,0.15)",
        }}
      >
        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full flex items-center justify-center z-50 transition-colors"
          style={{
            background: "#080c18",
            border: "1px solid rgba(167,139,250,0.2)",
            color: "rgba(167,139,250,0.5)",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a78bfa"; e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(167,139,250,0.5)"; e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)"; }}
        >
          {collapsed ? <ChevronsRight className="w-3 h-3" /> : <ChevronsLeft className="w-3 h-3" />}
        </button>

        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 h-14 flex-shrink-0 overflow-hidden"
          style={{ borderBottom: "1px solid rgba(167,139,250,0.12)" }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-base font-bold"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 0 16px rgba(124,58,237,0.4)",
            }}
          >
            ✦
          </div>
          <div className="sidebar-logo-text">
            <p className="text-white font-bold text-sm leading-tight tracking-tight" style={{ fontFamily: "monospace", letterSpacing: "1px" }}>
              CONSTELLATION
            </p>
            <p className="text-[10px]" style={{ color: "#a78bfa", letterSpacing: "2px", fontFamily: "monospace" }}>OPS SYSTEM</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
          <p className="sidebar-section-title text-[9px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: "#6b7688", letterSpacing: "2px", fontFamily: "monospace" }}>
            NAVEGAÇÃO
          </p>
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} collapsed={collapsed} />
          ))}

          {isSupport && (
            <>
              <div className="pt-5 pb-2">
                <p className="sidebar-section-title text-[9px] font-semibold uppercase tracking-widest px-3" style={{ color: "#6b7688", letterSpacing: "2px", fontFamily: "monospace" }}>
                  {isAdmin ? "ADMINISTRAÇÃO" : "SUPORTE"}
                </p>
              </div>
              {adminItems.slice(0, isAdmin ? 3 : 1).map((item) => (
                <NavItem key={item.href} {...item} active={pathname === item.href} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="p-2.5 flex-shrink-0" style={{ borderTop: "1px solid rgba(167,139,250,0.12)" }}>
          <Link href="/profile">
            <div
              className={cn(
                "sidebar-user-row flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors cursor-pointer",
                pathname === "/profile"
                  ? "bg-indigo-600/20"
                  : "hover:bg-white/5"
              )}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold"
                style={{ background: "linear-gradient(135deg, #7c3aed, #22d3ee)" }}
              >
                {CURRENT_USER.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div className="sidebar-user-info flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{CURRENT_USER.name}</p>
                <p className="text-[10px] truncate" style={{ color: "#a78bfa", fontFamily: "monospace", letterSpacing: "1px" }}>
                  {CURRENT_USER.role === "admin" ? "OPERADOR · ADMIN" : CURRENT_USER.role === "support" ? "SUPORTE" : "USUÁRIO"}
                </p>
              </div>
              <UserCircle className="sidebar-user-info w-3.5 h-3.5 flex-shrink-0" style={{ color: "#6b7688" }} />
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href, icon: Icon, label, active, collapsed,
}: {
  href: string; icon: React.ElementType; label: string; active: boolean; collapsed: boolean;
}) {
  return (
    <Link href={href} title={collapsed ? label : undefined} className="relative block">
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg -z-10"
          style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.4)" }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        />
      )}
      <div
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 z-10",
          collapsed && "justify-center px-0",
          active ? "text-white" : "hover:bg-white/5"
        )}
        style={{ color: active ? "#a78bfa" : "#6b7688" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#aab4c5"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#6b7688"; }}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="sidebar-label font-medium text-[11px]" style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}>{label.toUpperCase()}</span>
      </div>
    </Link>
  );
}
