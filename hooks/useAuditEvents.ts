"use client";
import { useCallback, useEffect, useState } from "react";
import { AuditEvent } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase";

interface UseAuditEventsResult {
  events: AuditEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Em Supabase real, a timeline é alimentada inteiramente por triggers no
 * banco (ver supabase/schema.sql) — este hook só lê, nunca escreve. Em modo
 * mock, expõe os mesmos dados estáticos de lib/mock-audit.ts.
 */
export function useAuditEvents(ticketId: string): UseAuditEventsResult {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured) {
        const { MOCK_AUDIT } = await import("@/lib/mock-audit");
        if (!cancelled) {
          setEvents(MOCK_AUDIT.filter((a) => a.ticket_id === ticketId));
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/tickets/${ticketId}/audit`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Falha ao carregar histórico");
        }
        const data: AuditEvent[] = await res.json();
        if (!cancelled) setEvents(data);
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
  }, [ticketId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { events, loading, error, refresh };
}
