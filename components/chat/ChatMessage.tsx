"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType } from "@/lib/chatbot/types";
import { Bot, User, Sparkles, BookOpen } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
  onQuickAction: (action: ChatMessageType["quickActions"] extends (infer A)[] | undefined ? A : never) => void;
}

const SOURCE_BADGE: Record<NonNullable<ChatMessageType["source"]>, { label: string; icon: React.ElementType }> = {
  kb: { label: "Base de conhecimento", icon: BookOpen },
  system: { label: "Consulta automática", icon: Bot },
  ai: { label: "Resposta por IA", icon: Sparkles },
};

export function ChatMessage({ message, onQuickAction }: ChatMessageProps) {
  const isUser = message.sender === "user";
  const badge = message.source ? SOURCE_BADGE[message.source] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isUser
            ? "var(--brand)"
            : "linear-gradient(135deg, var(--brand), #7c3aed)",
        }}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-white" />
        )}
      </div>

      <div className={cn("flex flex-col gap-1.5 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        {!isUser && badge && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              background: message.source === "ai" ? "var(--brand-light)" : "var(--surface-hover)",
              color: message.source === "ai" ? "var(--brand)" : "var(--text-muted)",
            }}
          >
            <badge.icon className="w-2.5 h-2.5" />
            {badge.label}
          </span>
        )}

        <div
          className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line border"
          style={
            isUser
              ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)", borderTopRightRadius: 4 }
              : { background: "var(--surface)", color: "var(--text-primary)", borderColor: "var(--border)", borderTopLeftRadius: 4 }
          }
        >
          {message.text}
        </div>

        {!isUser && message.quickActions && message.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {message.quickActions.map((qa) => (
              <button
                key={qa.id}
                onClick={() => onQuickAction(qa)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: "var(--border-strong)", color: "var(--brand)", background: "var(--brand-light)" }}
              >
                {qa.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
