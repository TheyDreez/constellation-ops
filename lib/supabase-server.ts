import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase";

/**
 * Cliente Supabase para uso em Server Components, Route Handlers e Server
 * Actions. Lê/escreve a sessão a partir dos cookies da requisição, então
 * (diferente do client singleton em lib/supabase.ts) ele SABE quem é o
 * usuário autenticado — é o único client que deve ser usado para qualquer
 * query que dependa das policies de RLS (auth.uid()).
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase não está configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local para usar as rotas de API."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component (sem permissão de
            // escrever cookies) — o middleware já cuida de renovar a sessão.
          }
        },
      },
    }
  );
}
