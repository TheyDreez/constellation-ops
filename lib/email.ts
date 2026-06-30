import { Ticket, Comment, User } from "@/types";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "helpdesk@empresa.com.br";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log("[Email simulado]", { to, subject });
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #1e293b; padding: 24px 32px; display: flex; align-items: center; gap: 12px; }
    .header-icon { width: 36px; height: 36px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .header h1 { color: white; font-size: 16px; margin: 0; font-weight: 600; }
    .header p { color: #94a3b8; font-size: 12px; margin: 2px 0 0; }
    .body { padding: 32px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500; margin-top: 20px; }
    .ticket-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .ticket-box h3 { margin: 0 0 4px; font-size: 15px; color: #0f172a; }
    .ticket-box p { margin: 0; font-size: 13px; color: #64748b; }
    .footer { padding: 16px 32px; border-top: 1px solid #f1f5f9; }
    .footer p { color: #94a3b8; font-size: 11px; margin: 0; }
    h2 { font-size: 18px; color: #0f172a; margin: 0 0 8px; }
    p { color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>HelpDesk</h1>
        <p>Sistema de Tickets</p>
      </div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>Esta é uma mensagem automática do sistema HelpDesk. Não responda este email.</p>
    </div>
  </div>
</body>
</html>`;
}

// Ticket criado — avisa o usuário e a equipe de suporte
export async function emailTicketCreated(ticket: Ticket, userEmail: string, supportEmails: string[]) {
  const ticketUrl = `${APP_URL}/tickets/${ticket.id}`;

  const userHtml = baseTemplate(`
    <h2>Seu ticket foi aberto!</h2>
    <p>Recebemos seu chamado e nossa equipe de suporte está analisando. Você será notificado de qualquer atualização.</p>
    <div class="ticket-box">
      <h3>${ticket.title}</h3>
      <p>${ticket.ticket_number} &bull; ${ticket.description.slice(0, 120)}...</p>
    </div>
    <a href="${ticketUrl}" class="btn">Ver meu ticket</a>
  `);

  const supportHtml = baseTemplate(`
    <h2>Novo ticket aberto</h2>
    <p>Um novo chamado foi aberto e aguarda atendimento.</p>
    <div class="ticket-box">
      <h3>${ticket.title}</h3>
      <p>${ticket.ticket_number} &bull; Prioridade: <strong>${ticket.priority}</strong></p>
    </div>
    <a href="${ticketUrl}" class="btn">Atender ticket</a>
  `);

  await Promise.all([
    sendEmail(userEmail, `[${ticket.ticket_number}] Seu chamado foi aberto`, userHtml),
    ...supportEmails.map(email =>
      sendEmail(email, `[NOVO] ${ticket.ticket_number} - ${ticket.title}`, supportHtml)
    ),
  ]);
}

// Novo comentário — avisa o usuário (se for resposta do suporte)
export async function emailNewComment(ticket: Ticket, comment: Comment, recipientEmail: string) {
  if (comment.is_internal) return; // notas internas não geram email

  const ticketUrl = `${APP_URL}/tickets/${ticket.id}`;
  const html = baseTemplate(`
    <h2>Nova resposta no seu ticket</h2>
    <p>A equipe de suporte respondeu ao seu chamado <strong>${ticket.ticket_number}</strong>.</p>
    <div class="ticket-box">
      <h3>${comment.author?.name || "Suporte"}</h3>
      <p>${comment.content}</p>
    </div>
    <a href="${ticketUrl}" class="btn">Ver ticket completo</a>
  `);

  await sendEmail(recipientEmail, `[${ticket.ticket_number}] Nova resposta`, html);
}

// Ticket resolvido
export async function emailTicketResolved(ticket: Ticket, userEmail: string) {
  const ticketUrl = `${APP_URL}/tickets/${ticket.id}`;
  const html = baseTemplate(`
    <h2>Seu ticket foi resolvido!</h2>
    <p>O chamado <strong>${ticket.ticket_number}</strong> foi marcado como resolvido pela equipe de suporte.</p>
    <div class="ticket-box">
      <h3>${ticket.title}</h3>
      <p>Se o problema persistir, você pode reabrir o ticket pelo link abaixo.</p>
    </div>
    <a href="${ticketUrl}" class="btn">Ver resolução</a>
  `);

  await sendEmail(userEmail, `[${ticket.ticket_number}] Ticket resolvido`, html);
}

// SLA violado — avisa o admin
export async function emailSLABreached(ticket: Ticket, adminEmail: string) {
  const ticketUrl = `${APP_URL}/tickets/${ticket.id}`;
  const html = baseTemplate(`
    <h2 style="color: #dc2626;">SLA Violado</h2>
    <p>O ticket abaixo ultrapassou o prazo de resolução definido pelo SLA.</p>
    <div class="ticket-box" style="border-color: #fca5a5; background: #fef2f2;">
      <h3>${ticket.title}</h3>
      <p>${ticket.ticket_number} &bull; Prioridade: <strong>${ticket.priority}</strong></p>
    </div>
    <a href="${ticketUrl}" class="btn" style="background: #dc2626;">Ver ticket urgente</a>
  `);

  await sendEmail(adminEmail, `[URGENTE] SLA Violado - ${ticket.ticket_number}`, html);
}
