"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { processLocally, makeBotMessage, makeUserMessage } from "@/lib/chatbot/engine";
import { ChatMessage, ChatQuickAction } from "@/lib/chatbot/types";
import { MOCK_TICKETS } from "@/lib/mock-data";

const WELCOME_MESSAGE = (): ChatMessage =>
  makeBotMessage(
    "Olá! Eu sou o assistente de TI. Posso ajudar a abrir um ticket, consultar o status de um chamado, verificar prazos de SLA ou tirar dúvidas comuns. Como posso ajudar?",
    "system"
  );

export function ChatWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE()]);
  const [loadingAI, setLoadingAI] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loadingAI]);

  const appendMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async (text: string) => {
    appendMessage(makeUserMessage(text));

    // 1) Tenta resolver com base de conhecimento + intents locais, sem IA
    const local = processLocally(text);

    if (!local.needsAI) {
      appendMessage(local.message);
      return;
    }

    // 2) Só aqui, quando nada local resolveu, chamamos a IA
    setLoadingAI(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        appendMessage(
          makeBotMessage(
            "Não consegui processar sua pergunta agora. Posso abrir um ticket para o time de suporte te ajudar diretamente?",
            "system",
            [
              {
                id: "open-form-error",
                label: "Abrir ticket",
                action: { type: "open_ticket_form" },
              },
            ]
          )
        );
        return;
      }

      const quickActions: ChatQuickAction[] | undefined =
        data.source === "ai"
          ? [
              {
                id: "open-form-ai",
                label: "Abrir ticket sobre isso",
                action: {
                  type: "open_ticket_form",
                  category: data.suggestedCategory,
                  priority: data.suggestedPriority,
                },
              },
            ]
          : undefined;

      appendMessage(makeBotMessage(data.reply, data.source === "ai" ? "ai" : "system", quickActions));
    } catch {
      appendMessage(
        makeBotMessage(
          "Tive um problema de conexão ao consultar o assistente. Tente novamente em instantes.",
          "system"
        )
      );
    } finally {
      setLoadingAI(false);
    }
  };

  const handleQuickAction = (action: ChatQuickAction["action"]) => {
    if (action.type === "open_ticket_form") {
      const params = new URLSearchParams();
      if (action.category) params.set("category", action.category);
      if (action.priority) params.set("priority", action.priority);
      const qs = params.toString();
      router.push(`/tickets/new${qs ? `?${qs}` : ""}`);
      setOpen(false);
      return;
    }
    if (action.type === "view_ticket") {
      const ticket = MOCK_TICKETS.find((t) => t.ticket_number === action.ticketNumber);
      if (ticket) {
        router.push(`/tickets/${ticket.id}`);
        setOpen(false);
      }
      return;
    }
    if (action.type === "send_message") {
      handleSend(action.message);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-50 rounded-full text-white shadow-lg flex items-center justify-center"
        style={{ width: 52, height: 52, background: "var(--brand)", boxShadow: "var(--shadow-glow)" }}
        aria-label="Abrir chat de suporte"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>

      {/* Painel do chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-9rem)] rounded-2xl flex flex-col overflow-hidden border"
            style={{ background: "var(--background)", borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}
          >
            {/* Header */}
            <div
              className="px-4 py-3.5 flex items-center gap-2.5 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--brand), #7c3aed)" }}
            >
              <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">Assistente de TI</p>
                <p className="text-white/70 text-xs">Base de conhecimento + IA</p>
              </div>
            </div>

            {/* Mensagens */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((m) => (
                <ChatMessageComponent key={m.id} message={m} onQuickAction={(qa) => handleQuickAction(qa.action)} />
              ))}
              {loadingAI && (
                <div className="flex gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--brand), #7c3aed)" }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                  </div>
                  <div
                    className="px-3.5 py-2.5 rounded-2xl border text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)", borderTopLeftRadius: 4 }}
                  >
                    Consultando IA...
                  </div>
                </div>
              )}
            </div>

            <ChatInput onSend={handleSend} disabled={loadingAI} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
