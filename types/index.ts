export type UserRole = "admin" | "support" | "user";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketCategory =
  | "hardware"
  | "software"
  | "network"
  | "access"
  | "other";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  department?: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  created_by: string;
  assigned_to?: string;
  created_by_user?: User;
  assigned_to_user?: User;
  sla_deadline?: string;
  sla_breached?: boolean;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  ticket_id: string;
  author_id: string;
  author?: User;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface SLAConfig {
  id: string;
  priority: TicketPriority;
  response_hours: number;
  resolution_hours: number;
}

export interface DashboardStats {
  total_open: number;
  total_in_progress: number;
  total_resolved_today: number;
  total_sla_breached: number;
  avg_resolution_hours: number;
  tickets_by_category: { category: string; count: number }[];
  tickets_by_priority: { priority: string; count: number }[];
  resolution_trend: { date: string; count: number }[];
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em Atendimento",
  waiting_user: "Aguardando Usuário",
  resolved: "Resolvido",
  closed: "Fechado",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  hardware: "Hardware",
  software: "Software",
  network: "Rede",
  access: "Acesso",
  other: "Outros",
};

export const STATUS_TONES: Record<TicketStatus, string> = {
  open: "blue",
  in_progress: "amber",
  waiting_user: "purple",
  resolved: "green",
  closed: "gray",
};

export const PRIORITY_TONES: Record<TicketPriority, string> = {
  low: "gray",
  medium: "yellow",
  high: "orange",
  critical: "red",
};

/** @deprecated use STATUS_TONES with <Badge tone={...}> — kept so older imports don't break */
export const STATUS_COLORS = STATUS_TONES;
/** @deprecated use PRIORITY_TONES with <Badge tone={...}> — kept so older imports don't break */
export const PRIORITY_COLORS = PRIORITY_TONES;

export const DEFAULT_SLA: Record<TicketPriority, { response: number; resolution: number }> = {
  low: { response: 24, resolution: 72 },
  medium: { response: 8, resolution: 24 },
  high: { response: 4, resolution: 8 },
  critical: { response: 1, resolution: 4 },
};

// ─── ATTACHMENTS ──────────────────────────────────────────────────────────────

export interface Attachment {
  id: string;
  ticket_id: string;
  comment_id?: string;
  uploaded_by: string;
  uploader?: User;
  filename: string;
  size_bytes: number;
  mime_type: string;
  url: string;
  created_at: string;
}

// ─── AUDIT EVENTS ─────────────────────────────────────────────────────────────

export type AuditAction =
  | "ticket_created"
  | "status_changed"
  | "priority_changed"
  | "assigned"
  | "unassigned"
  | "comment_added"
  | "internal_note_added"
  | "attachment_added"
  | "sla_breached"
  | "resolved"
  | "closed";

export interface AuditEvent {
  id: string;
  ticket_id: string;
  actor_id: string;
  actor?: User;
  action: AuditAction;
  meta: Record<string, string | number | boolean | null>;
  created_at: string;
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export type NotificationType =
  | "ticket_assigned"
  | "comment_added"
  | "status_changed"
  | "sla_warning"
  | "sla_breached";

export interface AppNotification {
  id: string;
  user_id: string;
  ticket_id: string;
  ticket_number?: string;
  ticket_title?: string;
  type: NotificationType;
  message: string;
  read: boolean;
  created_at: string;
}
