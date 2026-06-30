import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  /** Semantic color tone — maps to a dark-mode-aware CSS class in globals.css */
  tone?: string;
  /** @deprecated kept for backward compatibility, unused with the tone system */
  variant?: "default" | "outline";
}

export function Badge({ children, className, tone = "gray" }: BadgeProps) {
  return (
    <span className={cn("badge", `tone-${tone}`, className)}>
      {children}
    </span>
  );
}
