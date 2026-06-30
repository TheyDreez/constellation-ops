"use client";
import { motion } from "framer-motion";
import { Ticket } from "@/types";
import { calculateSLAStatus, SLA_RISK_STYLES } from "@/lib/sla-engine";
import { AlertTriangle, Clock, PauseCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  safe: Clock,
  warning: Clock,
  danger: AlertTriangle,
  breached: AlertTriangle,
  paused: PauseCircle,
  none: CheckCircle2,
};

export function SLABadge({ ticket, size = "md" }: { ticket: Ticket; size?: "sm" | "md" }) {
  const status = calculateSLAStatus(ticket);
  if (status.level === "none") return null;

  const style = SLA_RISK_STYLES[status.level];
  const Icon = ICONS[status.level];
  const isUrgent = status.level === "breached" || status.level === "danger";

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        style.bg, style.text, style.border,
        size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        isUrgent && status.level === "breached" && "pulse-danger"
      )}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {status.label}
    </motion.span>
  );
}

export function SLAProgressBar({ ticket }: { ticket: Ticket }) {
  const status = calculateSLAStatus(ticket);
  if (status.level === "none" || status.level === "paused") return null;

  const style = SLA_RISK_STYLES[status.level];

  return (
    <div className="w-full">
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${status.percentUsed}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", style.dot)}
        />
      </div>
    </div>
  );
}
