import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  ArrowLeft, ArrowRight, Dumbbell, GraduationCap, Loader2, Mail, Lock, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · cactusfitness" },
      { name: "description", content: "Entre na sua conta cactusfitness. Personal Trainers e alunos." },
    ],
  }),
  validateSearch: searchSchema,
  component: LoginPage,
});

type Role = "personal" | "aluno";
type Mode = "signin" | "signup";

function LoginPage() {
  const search = useSearch({ from: "/login" });
  const [role, setRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary/15 via-background to-background p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
            </svg>
            <span className="text-xl font-bold tracking-tight">
              cactus<span className="italic font-light text-muted-foreground">fitness</span>
            </span>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Transforme sua forma de treinar
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              A plataforma completa para personal trainers gerenciarem seus alunos
              e evoluírem seus negócios.
            </p>
          </div>
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
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
        </main>
      </div>
    </div>
  );
}

function RoleSelect({ onSelect }: { onSelect: (r: Role) => void }) {
  return (
    <div className="space-y-6">
      <div className="lg:hidden flex items-center gap-2">
        <svg viewBox="0 0 32 32" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8 L10 24 L16 14 L22 24 L28 8" />
        </svg>
        <span className="text-xl font-bold tracking-tight">
          cactus<span className="italic font-light text-muted-foreground">fitness</span>
        </span>
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Como você quer entrar?</h2>
        <p className="text-sm text-muted-foreground">Selecione seu perfil para continuar.</p>
      </div>
      <div className="grid gap-3">
        <RoleCard icon={Dumbbell} title="Personal Trainer" description="Gerencie seus alunos e treinos" onClick={() => onSelect("personal")} />
        <RoleCard icon={GraduationCap} title="Aluno" description="Acesse seus treinos e progresso" onClick={() => onSelect("aluno")} />
      </div>
    </div>
  );
}

function RoleCard({
  icon: Icon, title, description, onClick,
}: { icon: React.ElementType; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:bg-card/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <span className="flex-1">
        <span className="block text-base font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
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
  const Icon = role === "personal" ? Dumbbell : GraduationCap;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      const parsed = signupSchema.safeParse({ fullName, email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
        return;
      }
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
      if (err) {
        setError(mapAuthError(err.message));
        return;
      }
      navigateAfterAuth();
    } else {
      const parsed = credentialsSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
        return;
      }
      setLoading(true);
      const { error: err } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      setLoading(false);
      if (err) {
        setError(mapAuthError(err.message));
        return;
      }
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
    if (!parsed.success) {
      setError("Informe seu e-mail para recuperar a senha.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    setLoading(false);
    if (err) {
      setError(mapAuthError(err.message));
      return;
    }
    setNotice("Enviamos um link de recuperação para seu e-mail.");
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Trocar de perfil
      </button>

      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? `Entrar como ${label}` : `Criar conta de ${label}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Acesse com seu e-mail e senha." : "Preencha seus dados para começar."}
          </p>
        </div>
      </div>

      <div className="inline-flex w-full rounded-lg bg-muted p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-md py-1.5 font-semibold transition ${mode === "signin" ? "bg-card shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-1.5 font-semibold transition ${mode === "signup" ? "bg-card shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">Nome completo</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Como você quer ser chamado"
              className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">E-mail</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">Senha</label>
            {mode === "signin" && (
              <button type="button" onClick={handleForgotPassword} className="text-xs text-muted-foreground hover:text-foreground">
                Esqueci minha senha
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "••••••••"}
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
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
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.25)] hover:brightness-110 disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      {mode === "signin" ? (
        <p className="text-center text-xs text-muted-foreground">
          Não tem uma conta?{" "}
          <button type="button" onClick={() => setMode("signup")} className="font-semibold text-primary hover:underline">
            Cadastre-se
          </button>
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <button type="button" onClick={() => setMode("signin")} className="font-semibold text-primary hover:underline">
            Entrar
          </button>
        </p>
      )}
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
