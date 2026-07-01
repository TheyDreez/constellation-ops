"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StarField } from "@/components/ui/StarField";
import { OrbitField } from "@/components/ui/OrbitField";
import { Eye, EyeOff, Sparkles } from "lucide-react";

const DEMO_ACCOUNTS = [
  { email: "admin@empresa.com", role: "Admin", body: "Sol", color: "#fbbf24" },
  { email: "suporte@empresa.com", role: "Suporte", body: "Planeta", color: "#22d3ee" },
  { email: "joao@empresa.com", role: "Usuário", body: "Planeta", color: "#34d399" },
];

function Sun() {
  return (
    <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
      <motion.div
        className="absolute inset-[-10px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,0.55) 0%, rgba(251,146,60,0.22) 55%, transparent 75%)",
          filter: "blur(4px)",
        }}
        animate={{ scale: [1, 1.14, 1], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="relative w-12 h-12 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #fef9c3 0%, #fde68a 22%, #fbbf24 48%, #f59e0b 76%, #d97706 100%)",
          boxShadow:
            "0 0 22px 4px rgba(251,191,36,0.55), 0 0 56px 12px rgba(251,146,60,0.28), inset -4px -4px 10px rgba(146,64,14,0.35)",
        }}
      />
    </div>
  );
}

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
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #14102a 0%, #070a12 55%, #05070c 100%)",
      }}
    >
      <StarField className="opacity-90" />
      <OrbitField />

      {/* Nebulosas de fundo, agora douradas/violetas como uma via láctea */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: "#7c3aed", opacity: 0.14 }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: "#f59e0b", opacity: 0.08 }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Sun />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            HelpDesk
          </h1>
          <p
            className="text-[10px] mt-1 flex items-center gap-1.5 font-medium uppercase"
            style={{ color: "var(--brand)", letterSpacing: "2px", fontFamily: "monospace" }}
          >
            <Sparkles size={11} /> Sistema Solar de Tickets
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div>
            <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
              {mode === "login" ? "Entrar na órbita" : "Criar conta"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {mode === "login" ? "Bem-vindo de volta ao sistema" : "Preencha seus dados para acessar"}
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

        {/* Demo hint — agora como corpos celestes do sistema */}
        <div className="glass mt-4 rounded-xl p-4">
          <p
            className="text-[10px] font-semibold mb-2.5 uppercase"
            style={{ color: "var(--text-muted)", letterSpacing: "1.5px", fontFamily: "monospace" }}
          >
            Corpos celestes de demonstração
          </p>
          <div className="space-y-1">
            {DEMO_ACCOUNTS.map((c) => (
              <button
                key={c.email}
                onClick={() => setForm({ ...form, email: c.email, password: "senha123" })}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors text-left"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: c.color, boxShadow: `0 0 8px 1px ${c.color}99` }}
                />
                <span className="text-xs flex-1">{c.email}</span>
                <span className="text-[9px] uppercase" style={{ color: "var(--text-muted)", fontFamily: "monospace", letterSpacing: "1px" }}>
                  {c.body}
                </span>
                <span className="text-[10px]" style={{ color: c.color }}>{c.role}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>Senha: senha123</p>
        </div>
      </div>
    </div>
  );
}
