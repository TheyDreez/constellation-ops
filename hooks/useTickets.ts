"use client";
import { useCallback, useEffect, useState } from "react";
import { Ticket } from "@/types";
import { MOCK_TICKETS } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase";

interface UseTicketsResult {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Busca a lista completa de tickets do usuário (via RLS, o backend já
 * decide o que ele pode ver). Sem Supabase configurado, cai para os dados
 * mock — modo demo, para o app funcionar out-of-the-box num clone novo
 * antes de configurar o banco.
 *
 * A filtragem por status/prioridade/busca continua sendo feita no cliente
 * (useMemo nas páginas), igual já era com os dados mock — só a origem dos
 * dados mudou.
 */
export function useTickets(): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured) {
        if (!cancelled) {
          setTickets(MOCK_TICKETS);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/tickets");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Falha ao carregar tickets");
        }
        const data: Ticket[] = await res.json();
        if (!cancelled) setTickets(data);
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
  }, [version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { tickets, loading, error, refresh };
}
