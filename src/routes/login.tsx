import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Dumbbell, GraduationCap, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · cactusfitness" },
      { name: "description", content: "Entre na sua conta cactusfitness. Personal Trainers e alunos." },
    ],
  }),
  component: LoginPage,
});

type Role = "personal" | "aluno";

function LoginPage() {
  const [role, setRole] = useState<Role | null>(null);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Left: brand / hero */}
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

        {/* Right: auth panel */}
        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {role ? (
              <LoginForm role={role} onBack={() => setRole(null)} />
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
        <RoleCard
          icon={Dumbbell}
          title="Personal Trainer"
          description="Gerencie seus alunos e treinos"
          onClick={() => onSelect("personal")}
        />
        <RoleCard
          icon={GraduationCap}
          title="Aluno"
          description="Acesse seus treinos e progresso"
          onClick={() => onSelect("aluno")}
        />
      </div>
    </div>
  );
}

function RoleCard({
  icon: Icon, title, description, onClick,
}: {
  icon: React.ElementType; title: string; description: string; onClick: () => void;
}) {
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

function LoginForm({ role, onBack }: { role: Role; onBack: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const label = role === "personal" ? "Personal Trainer" : "Aluno";
  const Icon = role === "personal" ? Dumbbell : GraduationCap;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock auth — persist role and redirect
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("user_role", role);
        localStorage.setItem(
          role === "personal" ? "personal_id" : "aluno_id",
          "demo",
        );
      }
      navigate({ to: role === "personal" ? "/dashboard/personal/alunos" : "/" });
    }, 500);
  };

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
          <h2 className="text-2xl font-bold tracking-tight">Entrar como {label}</h2>
          <p className="text-sm text-muted-foreground">Acesse com seu e-mail e senha.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
              Esqueci minha senha
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(76,175,80,0.25)] hover:brightness-110 disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Não tem uma conta? <button type="button" className="font-semibold text-primary hover:underline">Fale com seu personal</button>
        </p>
      </form>
    </div>
  );
}
