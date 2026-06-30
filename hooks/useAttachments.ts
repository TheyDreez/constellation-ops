"use client";
import { useCallback, useEffect, useState } from "react";
import { Attachment } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase";

interface UseAttachmentsResult {
  attachments: Attachment[];
  loading: boolean;
  error: string | null;
  /** Faz upload de fato (POST multipart) e atualiza a lista local em caso de sucesso. */
  upload: (file: File) => Promise<void>;
  remove: (attachmentId: string) => Promise<void>;
}

export function useAttachments(ticketId: string): UseAttachmentsResult {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured) {
        const { MOCK_ATTACHMENTS } = await import("@/lib/mock-audit");
        if (!cancelled) {
          setAttachments(MOCK_ATTACHMENTS.filter((a) => a.ticket_id === ticketId));
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/tickets/${ticketId}/attachments`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Falha ao carregar anexos");
        }
        const data: Attachment[] = await res.json();
        if (!cancelled) setAttachments(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  // Sem Supabase configurado, o POST real não existe — simula o resultado
  // localmente para a demo continuar fluida, igual ao resto do app.
  const upload = useCallback(
    async (file: File) => {
      if (!isSupabaseConfigured) {
        await new Promise((r) => setTimeout(r, 600));
        const { CURRENT_USER } = await import("@/lib/mock-data");
        const fake: Attachment = {
          id: `att${Date.now()}`,
          ticket_id: ticketId,
          uploaded_by: CURRENT_USER.id,
          uploader: CURRENT_USER,
          filename: file.name,
          size_bytes: file.size,
          mime_type: file.type || "application/octet-stream",
          url: "#",
          created_at: new Date().toISOString(),
        };
        setAttachments((prev) => [fake, ...prev]);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao enviar arquivo");
      }
      const created: Attachment = await res.json();
      setAttachments((prev) => [created, ...prev]);
    },
    [ticketId]
  );

  const remove = useCallback(
    async (attachmentId: string) => {
      if (!isSupabaseConfigured) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        return;
      }

      const res = await fetch(
        `/api/tickets/${ticketId}/attachments?attachment_id=${attachmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao remover anexo");
      }
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    },
    [ticketId]
  );

  return { attachments, loading, error, upload, remove };
}
