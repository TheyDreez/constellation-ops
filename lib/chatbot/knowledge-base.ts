import { TicketCategory, TicketPriority } from "@/types";

/**
 * Base de conhecimento local. Toda pergunta do usuário é testada contra
 * esta lista ANTES de qualquer chamada de IA. Se houver match com score
 * suficiente, respondemos direto daqui, sem gastar tokens de IA.
 */
export interface FAQEntry {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
}

export const FAQ_ENTRIES: FAQEntry[] = [
  {
    id: "faq-senha",
    keywords: ["senha", "bloqueada", "resetar senha", "esqueci a senha", "trocar senha", "desbloquear"],
    question: "Como resetar minha senha?",
    answer:
      "Para redefinir sua senha, acesse o portal em account.empresa.com/reset e siga as instruções enviadas por email. Se sua conta estiver bloqueada após várias tentativas, o desbloqueio costuma levar até 15 minutos automaticamente. Se preferir, posso abrir um ticket de Acesso para o time de suporte cuidar disso.",
  },
  {
    id: "faq-vpn",
    keywords: ["vpn", "conectar de casa", "acesso remoto", "authentication failed", "trabalho remoto"],
    question: "VPN não conecta",
    answer:
      "Problemas de VPN geralmente são resolvidos assim: 1) confira se o usuário e senha estão corretos, 2) verifique se o cliente VPN está atualizado, 3) reinicie o serviço de rede do computador. Se o erro persistir, principalmente 'Authentication failed', pode ser um certificado expirado. Posso abrir um ticket de Rede para investigação mais a fundo.",
  },
  {
    id: "faq-impressora",
    keywords: ["impressora", "imprimir", "offline", "scanner", "fila de impressão"],
    question: "Impressora não funciona",
    answer:
      "Para impressoras offline, tente: 1) reiniciar a impressora, 2) verificar se ela está na mesma rede que o computador, 3) remover e reinstalar a impressora no painel de dispositivos. Se ela some das outras estações também, pode ser problema de rede ou do servidor de impressão. Posso abrir um ticket de Hardware se quiser que o suporte vá até o local.",
  },
  {
    id: "faq-email",
    keywords: ["email não chega", "outlook", "caixa de entrada cheia", "email travado", "não recebo email"],
    question: "Problemas com email",
    answer:
      "Se o email não está chegando, verifique primeiro a pasta de spam/lixo eletrônico e o espaço de armazenamento da caixa. No Outlook, problemas de sincronização geralmente se resolvem reiniciando o aplicativo ou recriando o perfil. Caso o problema continue, posso abrir um ticket de Software para o time investigar.",
  },
  {
    id: "faq-excel-travando",
    keywords: ["excel travando", "planilha grande", "office travando", "word não abre", "powerpoint trava"],
    question: "Office travando ao abrir arquivos grandes",
    answer:
      "Arquivos grandes do Office podem travar por falta de memória RAM disponível ou por add-ins conflitantes. Tente abrir o arquivo com os add-ins desativados (Office em modo de segurança) e feche outros programas pesados. Se o problema for recorrente, vale abrir um ticket de Software para avaliarmos upgrade de memória ou correção da instalação.",
  },
  {
    id: "faq-acesso-sistema",
    keywords: ["acesso negado", "permissão negada", "não consigo acessar", "drive negado", "erp bloqueado"],
    question: "Acesso negado a sistema ou pasta",
    answer:
      "Erros de permissão negada normalmente significam que seu usuário ainda não tem o grupo de acesso correto liberado para aquele sistema ou pasta. Confirme com seu gestor se a liberação foi solicitada. Posso abrir um ticket de Acesso para o time de TI conceder a permissão necessária.",
  },
  {
    id: "faq-monitor-tela",
    keywords: ["monitor", "tela com linhas", "tela piscando", "tela preta", "sem imagem"],
    question: "Problemas de monitor ou tela",
    answer:
      "Linhas na tela, piscadas ou falta de imagem geralmente indicam problema no cabo de vídeo ou no próprio monitor. Tente trocar o cabo e testar em outra porta de vídeo antes de mais nada. Se o defeito persistir, posso abrir um ticket de Hardware para avaliação ou troca do equipamento.",
  },
  {
    id: "faq-internet",
    keywords: ["sem internet", "sem acesso à internet", "rede lenta", "wifi não conecta", "cabo de rede"],
    question: "Sem acesso à internet",
    answer:
      "Para perda de conexão, tente: 1) verificar se o cabo de rede está bem conectado, 2) reiniciar o adaptador de rede do Windows, 3) testar se outros dispositivos na mesma sala têm internet. Se só a sua estação está sem acesso, pode ser IP duplicado ou porta de switch com problema. Posso abrir um ticket de Rede para o time verificar.",
  },
  {
    id: "faq-horario-suporte",
    keywords: ["horário de atendimento", "horário do suporte", "quando o suporte atende", "atendimento funciona"],
    question: "Horário de atendimento do suporte",
    answer:
      "O suporte de TI atende de segunda a sexta, das 8h às 18h. Chamados críticos abertos fora desse horário são tratados assim que o time retorna, respeitando o SLA configurado para a prioridade do ticket.",
  },
  {
    id: "faq-status-ticket",
    keywords: ["status do meu ticket", "andamento do chamado", "atualização do ticket"],
    question: "Como acompanhar o status de um ticket",
    answer:
      "Você pode consultar o status de qualquer ticket me informando o número (formato TKT-000) ou acessando a aba Tickets no menu lateral. Lá é possível ver status, responsável e prazo de SLA em tempo real.",
  },
];

/**
 * Regras de categoria por palavra-chave. Usadas para sugerir a categoria
 * de um novo ticket sem precisar de IA.
 */
export const CATEGORY_RULES: { category: TicketCategory; keywords: string[] }[] = [
  {
    category: "network",
    keywords: ["internet", "rede", "vpn", "wifi", "wi-fi", "conexão", "cabo de rede", "ip", "dns"],
  },
  {
    category: "hardware",
    keywords: ["impressora", "monitor", "computador", "notebook", "teclado", "mouse", "scanner", "fone", "tela", "máquina", "equipamento", "bateria"],
  },
  {
    category: "access",
    keywords: ["senha", "acesso", "permissão", "login", "bloqueada", "bloqueado", "usuário", "conta", "drive", "erp"],
  },
  {
    category: "software",
    keywords: ["excel", "word", "outlook", "office", "sistema", "programa", "aplicativo", "travando", "erro", "atualização", "instalar"],
  },
];

/**
 * Regras de prioridade por palavra-chave. Termos de urgência elevam a
 * prioridade sugerida automaticamente.
 */
export const PRIORITY_RULES: { priority: TicketPriority; keywords: string[] }[] = [
  {
    priority: "critical",
    keywords: ["urgente", "crítico", "parado", "não consigo trabalhar", "produção parada", "fechamento", "faturamento", "todos os usuários", "sistema fora do ar"],
  },
  {
    priority: "high",
    keywords: ["importante", "preciso hoje", "vários usuários", "cliente esperando", "perdendo tempo"],
  },
  {
    priority: "low",
    keywords: ["quando possível", "sem pressa", "não é urgente", "dúvida simples", "sugestão"],
  },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Busca na base de conhecimento local por score de palavras-chave.
 * Retorna null se nenhum FAQ tiver match suficiente, sinalizando que
 * a pergunta deve ser escalada para a IA.
 */
export function searchKnowledgeBase(query: string): FAQEntry | null {
  const q = norm(query);
  let best: { entry: FAQEntry; score: number } | null = null;

  for (const entry of FAQ_ENTRIES) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(norm(kw))) {
        score += kw.split(" ").length; // termos compostos pesam mais
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  return best ? best.entry : null;
}

export function suggestCategory(text: string): TicketCategory {
  const q = norm(text);
  let best: { category: TicketCategory; score: number } | null = null;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (q.includes(norm(kw))) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { category: rule.category, score };
    }
  }

  return best?.category ?? "other";
}

export function suggestPriority(text: string): TicketPriority {
  const q = norm(text);
  let best: { priority: TicketPriority; score: number } | null = null;

  for (const rule of PRIORITY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (q.includes(norm(kw))) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { priority: rule.priority, score };
    }
  }

  return best?.priority ?? "medium";
}
