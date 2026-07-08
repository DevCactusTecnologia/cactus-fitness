import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { Barbell, User } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
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
      { name: "description", content: "Gerencie seus alunos, treinos e avaliações físicas em um só lugar" },
    ],
  }),
  validateSearch: searchSchema,
  component: LoginPage,
});

type Role = "personal" | "aluno";
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

  async function navigateAfterAuth() {
    // Se veio de uma URL bloqueada, respeita
    if (redirectTo && redirectTo.startsWith("/") && redirectTo !== "/") {
      navigate({ to: redirectTo });
      return;
    }
    // Descobre o papel do usuário para escolher a home certa
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        const isAluno = roles?.some((r) => r.role === "aluno");
        navigate({ to: isAluno ? "/meu-treino" : "/" });
        return;
      }
    } catch { /* fallback abaixo */ }
    navigate({ to: "/" });
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

  const roleLabel = role === "personal" ? "Personal Trainer" : "Aluno";
  const roleTitle = role === "personal" ? "Bem-vindo, Personal" : "Bem-vindo, Aluno";
  const roleSubtitle = role === "personal" ? "Entre para gerenciar seus alunos" : "Acesse seus treinos e progresso";
  const RoleIcon =
    role === "personal" ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" className="h-5 w-5 text-primary">
        <path d="M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" className="h-5 w-5 text-primary">
        <path d="M234.38,210a123.36,123.36,0,0,0-60.78-53.23,76,76,0,1,0-91.2,0A123.36,123.36,0,0,0,21.62,210a12,12,0,1,0,20.77,12c18.12-31.32,50.12-50,85.61-50s67.49,18.69,85.61,50a12,12,0,0,0,20.77-12ZM76,96a52,52,0,1,1,52,52A52.06,52.06,0,0,1,76,96Z" />
      </svg>
    );

  const emailValid = z.string().email().safeParse(email.trim()).success;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-fg-muted hover:text-foreground transition-colors mb-6 active:scale-95 bg-surface-2 rounded-full px-3 py-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-body">Trocar perfil</span>
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {RoleIcon}
          </div>
          <span className="text-primary/70 text-sm font-medium uppercase tracking-wider font-body">
            {roleLabel}
          </span>
        </div>
        <h1 className="text-[1.75rem] md:text-3xl font-bold font-display text-foreground leading-tight">
          {mode === "signin" ? roleTitle : `Criar conta de ${roleLabel}`}
        </h1>
        <p className="text-fg-muted mt-2 text-sm font-body">
          {mode === "signin" ? roleSubtitle : "Preencha seus dados para começar"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <div className="relative">
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome completo"
                className="w-full h-12 bg-surface-2 text-foreground placeholder-fg-muted rounded-md px-4 text-sm font-body outline-none transition-all duration-200 border focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-glow)] border-border hover:border-border-strong"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="relative">
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
        </div>

        <div className="space-y-1.5">
          <div className="relative">
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              disabled={!emailValid}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={emailValid ? (mode === "signup" ? "Crie uma senha (mín. 6)" : "Senha") : "Preencha o email primeiro"}
              className={`w-full h-12 bg-surface-2 text-foreground placeholder-fg-muted rounded-md px-4 pr-12 text-sm font-body outline-none transition-all duration-200 border focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-glow)] normal-case border-border hover:border-border-strong ${!emailValid ? "opacity-40 cursor-not-allowed" : ""}`}
            />
            {emailValid && (
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-fg-muted hover:bg-surface-3"
                aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
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
