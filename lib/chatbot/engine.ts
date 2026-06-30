import { MOCK_TICKETS, MOCK_SLA } from "@/lib/mock-data";
import { calculateSLAStatus } from "@/lib/sla-engine";
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/types";
import { searchKnowledgeBase, suggestCategory, suggestPriority } from "./knowledge-base";
import { detectIntent } from "./intent";
import { ChatMessage, ChatQuickAction } from "./types";

let counter = 0;
function nextId() {
  counter += 1;
  return `msg-${Date.now()}-${counter}`;
}

export function makeBotMessage(
  text: string,
  source: ChatMessage["source"],
  quickActions?: ChatQuickAction[]
): ChatMessage {
  return {
    id: nextId(),
    sender: "bot",
    text,
    source,
    quickActions,
    createdAt: new Date().toISOString(),
  };
}

export function makeUserMessage(text: string): ChatMessage {
  return {
    id: nextId(),
    sender: "user",
    text,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Resultado do processamento local (sem IA). Se `needsAI` for true,
 * o chamador deve acionar o endpoint /api/chat para obter uma resposta
 * gerada por IA, enviando `aiContext` como mensagem do usuário.
 */
export interface LocalResolution {
  message: ChatMessage;
  needsAI: boolean;
}

function findTicketByNumber(ticketNumber: string) {
  return MOCK_TICKETS.find(
    (t) => t.ticket_number.toUpperCase() === ticketNumber.toUpperCase()
  );
}

function formatSlaSummary() {
  const lines = MOCK_SLA.map(
    (s) =>
      `• ${PRIORITY_LABELS[s.priority]}: primeira resposta em ${s.response_hours}h, resolução em ${s.resolution_hours}h`
  );
  return `Estes são os prazos de SLA configurados:\n\n${lines.join("\n")}`;
}

/**
 * Processa a mensagem do usuário inteiramente em regras locais.
 * Cobre: abrir ticket, consultar ticket, consultar SLA, e FAQ.
 * Só retorna needsAI=true quando nada local resolveu a dúvida.
 */
export function processLocally(rawMessage: string): LocalResolution {
  const intent = detectIntent(rawMessage);

  if (intent.type === "check_sla") {
    return {
      message: makeBotMessage(formatSlaSummary(), "system"),
      needsAI: false,
    };
  }

  if (intent.type === "check_ticket") {
    if (!intent.ticketNumber) {
      return {
        message: makeBotMessage(
          "Claro, me informe o número do ticket (formato TKT-000) para eu consultar o status.",
          "system"
        ),
        needsAI: false,
      };
    }
    const ticket = findTicketByNumber(intent.ticketNumber);
    if (!ticket) {
      return {
        message: makeBotMessage(
          `Não encontrei nenhum ticket com o número ${intent.ticketNumber}. Confira se digitou corretamente.`,
          "system"
        ),
        needsAI: false,
      };
    }

    const sla = calculateSLAStatus(ticket);
    const slaText =
      sla.level === "breached"
        ? `⚠️ SLA violado (${sla.label})`
        : sla.level === "paused"
        ? "SLA pausado (aguardando usuário)"
        : sla.level === "none"
        ? sla.label
        : `${sla.label} (${sla.level === "danger" ? "risco alto" : sla.level === "warning" ? "atenção" : "dentro do prazo"})`;

    return {
      message: makeBotMessage(
        `Ticket ${ticket.ticket_number} — ${ticket.title}\n\nStatus: ${STATUS_LABELS[ticket.status]}\nPrioridade: ${PRIORITY_LABELS[ticket.priority]}\nCategoria: ${CATEGORY_LABELS[ticket.category]}\nResponsável: ${ticket.assigned_to_user?.name ?? "não atribuído"}\nSLA: ${slaText}`,
        "system",
        [
          {
            id: "view-ticket",
            label: "Ver ticket completo",
            action: { type: "view_ticket", ticketNumber: ticket.ticket_number },
          },
        ]
      ),
      needsAI: false,
    };
  }

  if (intent.type === "open_ticket") {
    const category = suggestCategory(rawMessage);
    const priority = suggestPriority(rawMessage);
    return {
      message: makeBotMessage(
        `Posso te ajudar a abrir um ticket. Com base no que você descreveu, sugiro:\n\nCategoria: ${CATEGORY_LABELS[category]}\nPrioridade: ${PRIORITY_LABELS[priority]}\n\nVocê pode ajustar esses valores no formulário antes de enviar.`,
        "system",
        [
          {
            id: "open-form",
            label: "Abrir formulário de ticket",
            action: { type: "open_ticket_form", category, priority },
          },
        ]
      ),
      needsAI: false,
    };
  }

  // FAQ ou desconhecido
  const faq = searchKnowledgeBase(rawMessage);
  if (faq) {
    return {
      message: makeBotMessage(faq.answer, "kb", [
        {
          id: "open-form-faq",
          label: "Mesmo assim, abrir um ticket",
          action: {
            type: "open_ticket_form",
            category: suggestCategory(rawMessage),
            priority: suggestPriority(rawMessage),
          },
        },
      ]),
      needsAI: false,
    };
  }

  // Nada local resolveu, precisa de IA
  return {
    message: makeBotMessage("", "ai"),
    needsAI: true,
  };
}
