import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPrimaryClientRole, type AppRole } from "@/lib/client-roles";
import gymBg from "@/assets/gym-background.png.asset.json";
import logoUrl from "@/assets/cactus-logo.png";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · cactusfitness" },
      { name: "description", content: "Acesse sua conta cactusfitness — personal, aluno ou academia." },
    ],
  }),
  validateSearch: searchSchema,
  component: LoginPage,
});

type Mode = "signin" | "signup";

function BrandMark({ className = "size-14" }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="cactusfitness"
      className={`${className} object-contain`}
      width={56}
      height={56}
    />
  );
}

function LoginPage() {
  const search = useSearch({ from: "/login" });
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-body">
      {/* Left panel - hero (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${gymBg.url})`, filter: "brightness(0.5) contrast(1.1)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between h-full w-full p-8 xl:p-12">
          <div className="relative w-fit">
            <div className="absolute -inset-4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(215,242,5,0.12)_0%,transparent_70%)]" />
            <BrandMark className="size-14 text-foreground relative" />
          </div>
          <div className="mb-6 xl:mb-10 max-w-xl">
            <h2 className="text-3xl xl:text-5xl font-bold font-display text-foreground mb-4 leading-[1.1] tracking-tight">
              Transforme sua forma de treinar
            </h2>
            <p className="text-fg-muted text-base xl:text-lg font-body">
              A plataforma completa para personais, academias e alunos — tudo em uma única conta.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 w-full lg:w-1/2 xl:w-[45%] flex flex-col bg-background relative">
        <div
          className="absolute inset-0 lg:hidden bg-cover bg-center"
          style={{ backgroundImage: `url(${gymBg.url})`, filter: "brightness(0.2) contrast(1.1)" }}
        />
        <div className="absolute inset-0 lg:hidden bg-gradient-to-t from-background via-background/85 to-background/50" />

        <div className="flex lg:hidden items-center justify-center pt-[max(2rem,env(safe-area-inset-top))] pb-2 sm:pt-12 sm:pb-4 relative z-10">
          <div className="relative">
            <div className="absolute -inset-6 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(215,242,5,0.14)_0%,transparent_70%)]" />
            <BrandMark className="size-12 sm:size-14 text-foreground relative" />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-10 py-6 sm:py-8 relative z-10">
          <div className="w-full max-w-[440px] bg-surface-1/95 backdrop-blur-sm border border-border rounded-2xl p-5 sm:p-7 lg:p-8 shadow-2xl shadow-black/20">
            <AuthForm mode={mode} setMode={setMode} redirectTo={search.redirect} />
          </div>
        </div>
        <div className="h-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden" />
      </div>
    </div>
  );
}

const credentialsSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(72),
});

function AuthForm({
  mode, setMode, redirectTo,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  redirectTo?: string;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      setLoading(false);
      if (err) { setError(mapAuthError(err.message)); return; }
      // Novo cadastro sempre passa pelo onboarding
      navigate({ to: "/onboarding" });
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      setLoading(false);
      if (err) { setError(mapAuthError(err.message)); return; }
      await navigateAfterAuth();
    }
  }

  async function navigateAfterAuth() {
    if (redirectTo && redirectTo.startsWith("/") && redirectTo !== "/") {
      navigate({ to: redirectTo });
      return;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) { navigate({ to: "/" }); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (!roles || roles.length === 0) {
        navigate({ to: "/onboarding" });
        return;
      }
      const role = getPrimaryClientRole(roles.map((r) => r.role as AppRole));
      if (role === "aluno") {
        navigate({ to: "/meu-treino" });
        return;
      }
      if (role === "owner" || role === "staff") {
        navigate({ to: "/dashboard/academia" });
        return;
      }
      if (role === "personal") {
        navigate({ to: "/dashboard/personal" });
        return;
      }
      navigate({ to: "/onboarding" });
    } catch {
      navigate({ to: "/" });
    }
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

  const emailValid = z.string().email().safeParse(email.trim()).success;

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-[1.75rem] lg:text-3xl font-bold font-display text-foreground leading-tight tracking-tight">
          {mode === "signin" ? "Bem-vindo de volta" : "Criar sua conta"}
        </h1>
        <p className="text-fg-muted mt-2 text-sm font-body">
          {mode === "signin"
            ? "Entre para acessar seus treinos e alunos"
            : "Comece grátis — em segundos"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full h-12 bg-surface-2 text-foreground placeholder-fg-muted rounded-md px-4 text-sm font-body outline-none transition-all duration-200 border focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-glow)] border-border hover:border-border-strong"
          />
        </div>

        <div className="space-y-1.5">
          <div className="relative">
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Crie uma senha (mín. 6)" : "Senha"}
              className="w-full h-12 bg-surface-2 text-foreground placeholder-fg-muted rounded-md px-4 pr-12 text-sm font-body outline-none transition-all duration-200 border focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-glow)] normal-case border-border hover:border-border-strong"
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

        {mode === "signin" && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-primary hover:underline transition-colors font-body"
            >
              Esqueceu a senha?
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive font-body">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary font-body">
            {notice}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !emailValid || password.length < 6}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 px-8 py-3.5 w-full h-12 text-sm font-semibold font-body"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        {mode === "signin" ? (
          <p className="text-fg-muted text-sm font-body">
            Não tem uma conta?{" "}
            <button type="button" onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">
              Cadastre-se
            </button>
          </p>
        ) : (
          <p className="text-fg-muted text-sm font-body">
            Já tem conta?{" "}
            <button type="button" onClick={() => setMode("signin")} className="text-primary font-semibold hover:underline">
              Entrar
            </button>
          </p>
        )}
      </div>
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
