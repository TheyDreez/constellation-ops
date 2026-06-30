import { NextRequest, NextResponse } from "next/server";
import { getTicketById } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAuthUser, E, isRateLimited } from "@/lib/api-helpers";
import { canViewAllTickets, canAddAttachment, canDeleteAttachment } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    const { id } = await params;

    if (!supabase) {
      const { MOCK_ATTACHMENTS } = await import("@/lib/mock-audit");
      return NextResponse.json(MOCK_ATTACHMENTS.filter(a => a.ticket_id === id));
    }

    const ticket = await getTicketById(supabase, id);
    if (!canViewAllTickets(authUser.role) && ticket.created_by !== authUser.id) {
      return E.forbidden("Você não tem acesso a este ticket");
    }

    const { data, error } = await supabase
      .from("attachments")
      .select("*, uploader:users(id, name, email)")
      .eq("ticket_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return E.internal(e);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (isRateLimited(`attach:${ip}`, 10, 60_000)) {
      return E.badRequest("Limite de uploads atingido. Aguarde.");
    }

    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return E.badRequest("Nenhum arquivo enviado");

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      return E.badRequest(`Arquivo muito grande. Máximo: ${MAX_SIZE_BYTES / 1024 / 1024} MB`);
    }

    // Validate MIME type
    if (!ALLOWED_MIME.includes(file.type)) {
      return E.badRequest(`Tipo de arquivo não permitido: ${file.type}`);
    }

    if (!supabase) {
      return NextResponse.json({
        id: `att${Date.now()}`,
        ticket_id: id,
        uploaded_by: authUser.id,
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type,
        url: "#",
        created_at: new Date().toISOString(),
      }, { status: 201 });
    }

    const ticket = await getTicketById(supabase, id);
    const isCreator = ticket.created_by === authUser.id;

    if (!canAddAttachment(authUser.role, isCreator)) {
      return E.forbidden("Sem permissão para adicionar anexos neste ticket");
    }

    // Upload para Supabase Storage
    const fileName = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(fileName, bytes, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("attachments")
      .getPublicUrl(fileName);

    const { data, error } = await supabase
      .from("attachments")
      .insert({
        ticket_id: id,
        uploaded_by: authUser.id,
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type,
        url: publicUrl,
      })
      .select("*, uploader:users(id, name, email)")
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return E.internal(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const supabase = isSupabaseConfigured ? await createSupabaseServerClient() : undefined;
    const authUser = await getAuthUser(supabase);
    if (!authUser) return E.unauthorized();

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get("attachment_id");
    if (!attachmentId) return E.badRequest("attachment_id é obrigatório");

    if (!supabase) {
      return NextResponse.json({ deleted: true });
    }

    const { data: att } = await supabase
      .from("attachments").select("uploaded_by, url").eq("id", attachmentId).single();

    if (!att) return E.notFound("Anexo");

    const isUploader = att.uploaded_by === authUser.id;
    if (!canDeleteAttachment(authUser.role, isUploader)) {
      return E.forbidden("Sem permissão para remover este anexo");
    }

    await supabase.from("attachments").delete().eq("id", attachmentId);

    // Remove file from storage
    const path = att.url.split("/attachments/")[1];
    if (path) await supabase.storage.from("attachments").remove([path]);

    return NextResponse.json({ deleted: true });
  } catch (e) {
    return E.internal(e);
  }
}
