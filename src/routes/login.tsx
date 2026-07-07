import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { Barbell, User } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import gymBg from "@/assets/gym-background.png.asset.json";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · cactusfitness" },
      { name: "description", content: "Gerencie seus alunos, treinos e avaliações físicas em um só lugar" },
    ],
  }),
  validateSearch: searchSchema,
  component: LoginPage,
});

type Role = "personal" | "aluno";
type Mode = "signin" | "signup";

function BrandMark({ className = "size-14 text-foreground" }: { className?: string }) {
  // Geometric "W-like" mark inspired by the reference logo
  return (
    <svg viewBox="0 0 209 108" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M57.25 6.63C55.15 2.56 50.99 0.02 46.41 0.02H0.06s-.06.04-.06.08C1.42 2.87 43.35 84.53 43.35 84.53l.72 1.4s.02.04.04.06c2.05 3.35 5.77 5.6 10.02 5.6s7.97-2.25 10.02-5.6c.06-.12 16.4-31.89 16.93-32.88 0 0 0-.04 0-.06L57.25 6.63z" fill="currentColor"/>
      <path d="M106.74 16.88c-4.19 0-7.85 2.19-9.91 5.51l-.83 1.61s-14.42 28.13-14.89 29.02v.04l24.82 48.33c2.07 4.05 6.26 6.61 10.82 6.61h43.89v-.04s-43.72-85.11-43.74-85.15c-2.02-3.53-5.8-5.91-10.16-5.91v-.02z" fill="currentColor"/>
      <path d="M196.17 0.02H162.2s-.04 0-.04.02c-.6 1.16-19.27 37.55-19.29 37.57-.83 1.86-1.18 3.97-.91 6.2.7 5.89 5.93 10.2 11.89 10.2h34.51l18.65-36.31C211.16 9.62 205.28 0 196.21 0l-.04.02z" fill="currentColor"/>
    </svg>
  );
}

function LoginPage() {
  const search = useSearch({ from: "/login" });
  const [role, setRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");

  return (
    <div className="min-h-screen bg-background flex font-body">
      {/* Left panel - hero */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${gymBg.url})`, filter: "brightness(0.5) contrast(1.1)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between h-full w-full p-10">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(215,242,5,0.12)_0%,transparent_70%)]" />
            <BrandMark className="size-14 text-foreground relative" />
          </div>
          <div className="mb-10">
            <h2 className="text-4xl font-bold font-display text-foreground mb-4 leading-tight">
              Transforme sua forma de treinar
            </h2>
            <p className="text-fg-muted text-lg font-body">
              A plataforma completa para personal trainers gerenciarem seus alunos e evoluírem seus negócios.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - content */}
      <div className="w-full md:w-1/2 flex flex-col bg-background relative">
        <div
          className="absolute inset-0 md:hidden bg-cover bg-center"
          style={{ backgroundImage: `url(${gymBg.url})`, filter: "brightness(0.2) contrast(1.1)" }}
        />
        <div className="absolute inset-0 md:hidden bg-gradient-to-t from-background via-background/80 to-background/40" />

        {/* Mobile brand */}
        <div className="flex md:hidden items-center justify-center pt-16 pb-4 relative z-10">
          <div className="relative">
            <div className="absolute -inset-6 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(215,242,5,0.12)_0%,transparent_70%)]" />
            <BrandMark className="size-12 text-foreground relative" />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 md:px-10 relative z-10">
          <div className="w-full max-w-[420px] bg-surface-1 border border-border rounded-xl p-6 shadow-lg">
            {role ? (
              <AuthForm
                role={role}
                mode={mode}
                setMode={setMode}
                onBack={() => setRole(null)}
                redirectTo={search.redirect}
              />
            ) : (
              <RoleSelect onSelect={setRole} />
            )}
          </div>
        </div>
        <div className="h-8 md:hidden" />
      </div>
    </div>
  );
}

function RoleSelect({ onSelect }: { onSelect: (r: Role) => void }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.75rem] md:text-3xl font-bold font-display text-primary leading-tight">
          Como você quer entrar?
        </h1>
        <p className="text-fg-muted mt-2 text-sm font-body">
          Selecione seu perfil para continuar
        </p>
      </div>
      <div className="space-y-3">
        <RoleCard
          icon={<Barbell weight="fill" className="h-6 w-6 text-primary transition-colors" />}
          title="Personal Trainer"
          description="Gerencie seus alunos e treinos"
          onClick={() => onSelect("personal")}
        />
        <RoleCard
          icon={<User weight="fill" className="h-6 w-6 text-primary transition-colors" />}
          title="Aluno"
          description="Acesse seus treinos e progresso"
          onClick={() => onSelect("aluno")}
        />
      </div>
    </div>
  );
}

function RoleCard({
  icon, title, description, onClick,
}: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full group relative bg-surface-2 border border-border rounded-xl p-5 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] text-left hover:border-primary hover:shadow-glow"
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-semibold text-base font-display">{title}</p>
        <p className="text-fg-muted text-sm mt-0.5 font-body">{description}</p>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1em"
        height="1em"
        fill="currentColor"
        viewBox="0 0 256 256"
        className="h-5 w-5 text-fg-muted/40 rotate-180 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0"
      >
        <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z" />
      </svg>
    </button>
  );
}

const credentialsSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(72),
});

const signupSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2, "Informe seu nome").max(100),
});

function AuthForm({
  role, mode, setMode, onBack, redirectTo,
}: {
  role: Role;
  mode: Mode;
  setMode: (m: Mode) => void;
  onBack: () => void;
  redirectTo?: string;
}) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const label = role === "personal" ? "Personal Trainer" : "Aluno";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      const parsed = signupSchema.safeParse({ fullName, email, password });
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
      setLoading(true);
      const { error: err } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          data: { full_name: parsed.data.fullName, role },
        },
      });
      setLoading(false);
      if (err) { setError(mapAuthError(err.message)); return; }
      navigateAfterAuth();
    } else {
      const parsed = credentialsSchema.safeParse({ email, password });
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
      setLoading(true);
      const { error: err } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      setLoading(false);
      if (err) { setError(mapAuthError(err.message)); return; }
      navigateAfterAuth();
    }
  }

  function navigateAfterAuth() {
    const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";
    navigate({ to: target });
  }

  async function handleForgotPassword() {
    setError(null);
    setNotice(null);
    const parsed = z.string().email().safeParse(email.trim());
    if (!parsed.success) { setError("Informe seu e-mail para recuperar a senha."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    setLoading(false);
    if (err) { setError(mapAuthError(err.message)); return; }
    setNotice("Enviamos um link de recuperação para seu e-mail.");
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-foreground mb-6 font-body"
      >
        <ArrowLeft className="h-4 w-4" />
        Trocar de perfil
      </button>

      <div className="mb-6">
        <h1 className="text-[1.5rem] md:text-2xl font-bold font-display text-primary leading-tight">
          {mode === "signin" ? `Entrar como ${label}` : `Criar conta de ${label}`}
        </h1>
        <p className="text-fg-muted mt-2 text-sm font-body">
          {mode === "signin" ? "Acesse com seu e-mail e senha" : "Preencha seus dados para começar"}
        </p>
      </div>

      <div className="inline-flex w-full rounded-lg bg-surface-2 p-1 text-sm mb-5 font-body">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-md py-1.5 font-semibold transition ${mode === "signin" ? "bg-surface-3 text-foreground shadow" : "text-fg-muted hover:text-foreground"}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-1.5 font-semibold transition ${mode === "signup" ? "bg-surface-3 text-foreground shadow" : "text-fg-muted hover:text-foreground"}`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 font-body">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">Nome completo</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Como você quer ser chamado"
              className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="h-11 w-full rounded-lg border border-border bg-surface-2 pl-10 pr-3 text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
            {mode === "signin" && (
              <button type="button" onClick={handleForgotPassword} className="text-xs text-fg-muted hover:text-primary">
                Esqueci minha senha
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "••••••••"}
              className="h-11 w-full rounded-lg border border-border bg-surface-2 pl-10 pr-10 text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-fg-muted hover:bg-surface-3"
              aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold font-display text-primary-foreground shadow-glow hover:brightness-110 transition disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}

function mapAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Este e-mail já está cadastrado. Tente entrar.";
  if (m.includes("user not found")) return "Usuário não encontrado.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("weak password") || m.includes("password")) return "Senha muito fraca. Use pelo menos 6 caracteres.";
  return msg;
}
