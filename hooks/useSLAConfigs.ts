"use client";
import { useEffect, useState } from "react";
import { SLAConfig } from "@/types";
import { MOCK_SLA } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase";

interface UseSLAConfigsResult {
  slaConfigs: SLAConfig[];
  loading: boolean;
}

export function useSLAConfigs(): UseSLAConfigsResult {
  const [slaConfigs, setSlaConfigs] = useState<SLAConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured) {
        if (!cancelled) {
          setSlaConfigs(MOCK_SLA);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/sla");
        if (!res.ok) throw new Error("Falha ao carregar SLA");
        const data: SLAConfig[] = await res.json();
        if (!cancelled) setSlaConfigs(data);
      } catch {
        if (!cancelled) setSlaConfigs(MOCK_SLA);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { slaConfigs, loading };
}
