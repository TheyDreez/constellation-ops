/**
 * Detecta a intenção da mensagem do usuário usando regras locais
 * (sem IA). Isso cobre as ações estruturadas do chatbot: abrir ticket,
 * consultar ticket, consultar SLA. Tudo que não bater aqui e não tiver
 * match na base de conhecimento vai para a IA.
 */
export type ChatIntent =
  | { type: "open_ticket" }
  | { type: "check_ticket"; ticketNumber: string | null }
  | { type: "check_sla" }
  | { type: "faq_or_unknown" };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const OPEN_TICKET_PATTERNS = [
  "abrir ticket",
  "abrir um ticket",
  "criar ticket",
  "novo ticket",
  "abrir chamado",
  "abrir um chamado",
  "registrar chamado",
  "preciso de ajuda com",
  "quero abrir",
];

const CHECK_TICKET_PATTERNS = [
  "consultar ticket",
  "status do ticket",
  "status do meu ticket",
  "andamento do ticket",
  "andamento do chamado",
  "ver ticket",
  "meu chamado",
];

const CHECK_SLA_PATTERNS = [
  "qual o sla",
  "qual é o sla",
  "consultar sla",
  "prazo de sla",
  "prazo de resolução",
  "prazo de resposta",
  "quanto tempo para resolver",
  "tempo de atendimento",
];

const TICKET_NUMBER_REGEX = /TKT-\d{3,}/i;

export function detectIntent(rawMessage: string): ChatIntent {
  const message = norm(rawMessage);

  const ticketMatch = rawMessage.match(TICKET_NUMBER_REGEX);

  if (CHECK_SLA_PATTERNS.some((p) => message.includes(p))) {
    return { type: "check_sla" };
  }

  if (
    ticketMatch ||
    CHECK_TICKET_PATTERNS.some((p) => message.includes(p))
  ) {
    return {
      type: "check_ticket",
      ticketNumber: ticketMatch ? ticketMatch[0].toUpperCase() : null,
    };
  }

  if (OPEN_TICKET_PATTERNS.some((p) => message.includes(p))) {
    return { type: "open_ticket" };
  }

  return { type: "faq_or_unknown" };
}
