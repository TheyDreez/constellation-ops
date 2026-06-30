"use client";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--brand-light)" }}
      >
        <Icon className="w-6 h-6" style={{ color: "var(--brand)" }} />
      </div>
      <h3 className="font-semibold text-sm mb-1.5" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p className="text-sm max-w-sm mb-5" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
      {action}
    </motion.div>
  );
}
