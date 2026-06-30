import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/auth"];

/**
 * Roda em quase toda navegação (ver matcher abaixo).
 *  1) Renova o token de sessão do Supabase quando necessário, escrevendo o
 *     cookie atualizado na resposta — sem isso, sessões expiram em silêncio
 *     e cada Server Component teria que lidar com isso por conta própria.
 *  2) Bloqueia acesso não autenticado a tudo que não for /auth (ou rotas
 *     públicas do Next como assets, etc — excluídas pelo matcher).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured = Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl.startsWith("https://") &&
      !supabaseUrl.includes("SEU_PROJECT_ID")
  );

  // Sem Supabase configurado, o app roda em modo demo (dados mock) e não
  // faz sentido travar rota nenhuma — sem isso, ninguém conseguiria nem
  // abrir o /dashboard num ambiente local recém-clonado.
  if (!isConfigured) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, exceto:
     * - arquivos estáticos do Next (_next/static, _next/image)
     * - favicon e demais arquivos com extensão (svg, png, etc)
     * - rotas de API (cada uma faz sua própria checagem de auth.getUser())
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
