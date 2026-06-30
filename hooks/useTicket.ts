"use client";
import { useCallback, useEffect, useState } from "react";
import { Ticket } from "@/types";
import { MOCK_TICKETS } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase";

interface UseTicketResult {
  ticket: Ticket | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  refresh: () => void;
}

export function useTicket(id: string): UseTicketResult {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      if (!isSupabaseConfigured) {
        const found = MOCK_TICKETS.find((t) => t.id === id) || null;
        if (!cancelled) {
          setTicket(found);
          setNotFound(!found);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/tickets/${id}`);
        if (res.status === 404) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Falha ao carregar ticket");
        }
        const data: Ticket = await res.json();
        if (!cancelled) setTicket(data);
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
  }, [id, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { ticket, loading, error, notFound, refresh };
}
