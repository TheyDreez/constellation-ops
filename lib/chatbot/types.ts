import { TicketCategory, TicketPriority } from "@/types";

export type ChatSender = "user" | "bot";

/** Ações rápidas que aparecem como botões dentro de uma mensagem do bot. */
export interface ChatQuickAction {
  id: string;
  label: string;
  action:
    | { type: "open_ticket_form"; category?: TicketCategory; priority?: TicketPriority }
    | { type: "view_ticket"; ticketNumber: string }
    | { type: "send_message"; message: string };
}

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  /** "kb" = base de conhecimento local, "ai" = respondido pela IA, "system" = lógica de intent local */
  source?: "kb" | "ai" | "system";
  quickActions?: ChatQuickAction[];
  createdAt: string;
}
