"use client";
import { useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div
      className="flex items-end gap-2 p-3 border-t flex-shrink-0"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Digite sua dúvida..."}
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none max-h-24 px-3.5 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 border disabled:opacity-50"
        style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors disabled:cursor-not-allowed"
        style={{
          background: canSend ? "var(--brand)" : "var(--surface-hover)",
          color: canSend ? "#fff" : "var(--text-muted)",
        }}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
