"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Shield, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { name: form.name, role: "user" } },
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(
        msg.includes("Invalid login") ? "Email ou senha incorretos" :
        msg.includes("already registered") ? "Este email já está cadastrado" :
        msg.includes("Password") ? "Senha deve ter pelo menos 6 caracteres" :
        msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Atmosfera com a identidade de marca (índigo → violeta), igual ao resto do app */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: "var(--brand)", opacity: 0.18 }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: "#7c3aed", opacity: 0.16 }}
      />

      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, var(--brand), #7c3aed)", boxShadow: "var(--shadow-glow)" }}
          >
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>HelpDesk</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Sistema de Tickets</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div>
            <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
              {mode === "login" ? "Entrar na conta" : "Criar conta"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {mode === "login" ? "Bem-vindo de volta" : "Preencha seus dados para acessar"}
            </p>
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nome completo</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="João Silva"
                className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 transition-all border"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="joao@empresa.com"
              className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 transition-all border"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg focus:outline-none focus:ring-2 transition-all border"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2" style={{ background: "var(--danger-light)", border: "1px solid var(--danger)" }}>
              <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
            </div>
          )}

          <Button onClick={handleSubmit} loading={loading} className="w-full">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>

          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className="font-medium hover:underline"
              style={{ color: "var(--brand)" }}
            >
              {mode === "login" ? "Criar agora" : "Entrar"}
            </button>
          </p>
        </div>

        {/* Demo hint */}
        <div className="glass mt-4 rounded-xl p-4">
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Contas de demonstração:</p>
          <div className="space-y-1">
            {[
              { email: "admin@empresa.com", role: "Admin" },
              { email: "suporte@empresa.com", role: "Suporte" },
              { email: "joao@empresa.com", role: "Usuário" },
            ].map((c) => (
              <button
                key={c.email}
                onClick={() => setForm({ ...form, email: c.email, password: "senha123" })}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors text-left"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span className="text-xs">{c.email}</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.role}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>Senha: senha123</p>
        </div>
      </div>
    </div>
  );
}
