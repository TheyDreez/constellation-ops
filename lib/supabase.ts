import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verdadeiro somente quando as variáveis de ambiente reais do Supabase
// foram configuradas. Enquanto isso não acontecer, o app roda inteiramente
// com os dados mock de lib/mock-data.ts, sem nenhuma chamada de rede.
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("placeholder") &&
  !supabaseUrl.includes("SEU_PROJECT_ID")
);

// URL e chave válidas (mesmo que falsas) para o createClient nunca lançar
// erro de "supabaseUrl is required" quando o .env.local não existe ainda.
const safeUrl = "https://placeholder.supabase.co";
const safeKey = "placeholder_key_0000000000000000000000000000000000000000000";

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : safeUrl,
  isSupabaseConfigured ? supabaseAnonKey! : safeKey
);
