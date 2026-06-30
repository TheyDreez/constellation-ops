"use client";
import { useEffect, useState } from "react";
import { User } from "@/types";
import { MOCK_USERS } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase";

interface UseUsersResult {
  users: User[];
  loading: boolean;
}

export function useUsers(): UseUsersResult {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured) {
        if (!cancelled) {
          setUsers(MOCK_USERS);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Falha ao carregar usuários");
        const data: User[] = await res.json();
        if (!cancelled) setUsers(data);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { users, loading };
}
