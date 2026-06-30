import { AuditEvent, Attachment, AppNotification } from "@/types";
import { MOCK_USERS } from "@/lib/mock-data";

const now = new Date();
const h = (hours: number) => new Date(now.getTime() - hours * 3600_000).toISOString();

export const MOCK_AUDIT: AuditEvent[] = [
  {
    id: "a1", ticket_id: "t1", actor_id: "u4", actor: MOCK_USERS[3],
    action: "ticket_created", meta: {}, created_at: h(8),
  },
  {
    id: "a2", ticket_id: "t1", actor_id: "u1", actor: MOCK_USERS[0],
    action: "assigned", meta: { to_name: "Carlos Suporte" }, created_at: h(7),
  },
  {
    id: "a3", ticket_id: "t1", actor_id: "u2", actor: MOCK_USERS[1],
    action: "status_changed", meta: { from: "Aberto", to: "Em Atendimento" }, created_at: h(6),
  },
  {
    id: "a4", ticket_id: "t1", actor_id: "u2", actor: MOCK_USERS[1],
    action: "comment_added", meta: { preview: "Analisando o problema..." }, created_at: h(3),
  },
  {
    id: "a5", ticket_id: "t1", actor_id: "u2", actor: MOCK_USERS[1],
    action: "internal_note_added", meta: { preview: "IP duplicado na rede..." }, created_at: h(2),
  },
  {
    id: "a6", ticket_id: "t1", actor_id: "u2", actor: MOCK_USERS[1],
    action: "attachment_added", meta: { filename: "diagnostico.pdf" }, created_at: h(1),
  },
];

export const MOCK_ATTACHMENTS: Attachment[] = [
  {
    id: "att1", ticket_id: "t1", uploaded_by: "u2", uploader: MOCK_USERS[1],
    filename: "diagnostico-rede.pdf", size_bytes: 284_500,
    mime_type: "application/pdf", url: "#", created_at: h(1),
  },
  {
    id: "att2", ticket_id: "t1", uploaded_by: "u4", uploader: MOCK_USERS[3],
    filename: "screenshot-erro.png", size_bytes: 89_000,
    mime_type: "image/png", url: "#", created_at: h(7.5),
  },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1", user_id: "u1", ticket_id: "t2", ticket_number: "TKT-002",
    ticket_title: "Sem acesso ao ERP", type: "sla_breached",
    message: "SLA violado: Sem acesso ao ERP", read: false, created_at: h(0.5),
  },
  {
    id: "n2", user_id: "u1", ticket_id: "t1", ticket_number: "TKT-001",
    ticket_title: "Sem internet no 3º andar", type: "comment_added",
    message: "Novo comentário em TKT-001", read: false, created_at: h(2),
  },
  {
    id: "n3", user_id: "u1", ticket_id: "t3", ticket_number: "TKT-003",
    ticket_title: "Impressora offline", type: "ticket_assigned",
    message: "TKT-003 foi atribuído a você", read: true, created_at: h(5),
  },
  {
    id: "n4", user_id: "u1", ticket_id: "t4", ticket_number: "TKT-004",
    ticket_title: "VPN lenta", type: "status_changed",
    message: "TKT-004 mudou para Resolvido", read: true, created_at: h(24),
  },
];
