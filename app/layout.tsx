import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Constellation OPS — Sistema de Tickets",
  description: "Interface operacional espacial para gestão de tickets de suporte",
};

const themeInitScript = `
(function () {
  try {
    // Constellation is always dark
    document.documentElement.classList.add('dark');
    var collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (collapsed) {
      document.documentElement.style.setProperty('--sidebar-width', 'var(--sidebar-width-collapsed)');
      document.documentElement.setAttribute('data-sidebar-collapsed', 'true');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
