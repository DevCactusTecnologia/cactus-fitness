import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Barbell, User, Buildings } from "@phosphor-icons/react";
import { Loader2, ArrowLeft, ArrowRight, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { completeOnboarding } from "@/lib/onboarding.functions";
import logoUrl from "@/assets/cactus-logo.png";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "Bem-vindo · cactusfitness" }],
  }),
  component: OnboardingPage,
});

type Role = "owner" | "personal" | "aluno";
type Step = "role" | "details";

function OnboardingPage() {
  const navigate = useNavigate();
  const runOnboarding = useServerFn(completeOnboarding);

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-preenche o nome se já existe no perfil e redireciona se já tem role
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (prof?.full_name) setFullName(prof.full_name);
      if (roles && roles.length > 0) {
        const isAluno = roles.some((r: any) => r.role === "aluno");
        navigate({ to: isAluno ? "/meu-treino" : "/", replace: true });
      }
    })();
  }, [navigate]);

  function pickRole(r: Role) {
    setRole(r);
    setStep("details");
  }

  async function handleFinish() {
    if (!role) return;
    setError(null);
    if (fullName.trim().length < 2) {
      setError("Informe seu nome completo.");
      return;
    }
    if (role === "owner" && academyName.trim().length < 2) {
      setError("Informe o nome da sua academia.");
      return;
    }
    setLoading(true);
    try {
      const result = await runOnboarding({
        data: {
          role,
          fullName: fullName.trim(),
          academyName: role === "owner" ? academyName.trim() : undefined,
        },
      });
      const home =
        result.role === "aluno"
          ? "/meu-treino"
          : result.role === "owner"
            ? "/dashboard/academia"
            : "/dashboard/personal";
      navigate({ to: home, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao concluir cadastro");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 font-body">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={logoUrl} alt="cactusfitness" className="size-12 object-contain" />
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-fg-muted">
            <span className={`grid h-6 w-6 place-items-center rounded-full ${step === "role" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>
              {step === "details" ? <Check className="h-3.5 w-3.5" /> : "1"}
            </span>
            <span className="h-px w-8 bg-border" />
            <span className={`grid h-6 w-6 place-items-center rounded-full ${step === "details" ? "bg-primary text-primary-foreground" : "bg-surface-2 text-fg-muted"}`}>
              2
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-6 sm:p-8 shadow-2xl shadow-black/20">
          {step === "role" && (
            <RoleStep onSelect={pickRole} />
          )}

          {step === "details" && role && (
            <DetailsStep
              role={role}
              fullName={fullName}
              setFullName={setFullName}
              academyName={academyName}
              setAcademyName={setAcademyName}
              onBack={() => setStep("role")}
              onFinish={handleFinish}
              loading={loading}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RoleStep({ onSelect }: { onSelect: (r: Role) => void }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Como você quer usar o cactusfitness?
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Você pode ajustar isso depois nas configurações.
      </p>

      <div className="mt-6 space-y-3">
        <RoleCard
          icon={<Buildings weight="fill" className="h-6 w-6 text-primary" />}
          title="Sou dono de academia"
          description="Gerencie personais, alunos, financeiro e toda a operação da sua academia."
          onClick={() => onSelect("owner")}
        />
        <RoleCard
          icon={<Barbell weight="fill" className="h-6 w-6 text-primary" />}
          title="Sou personal trainer"
          description="Cadastre seus alunos, monte treinos e acompanhe a evolução deles."
          onClick={() => onSelect("personal")}
        />
        <RoleCard
          icon={<User weight="fill" className="h-6 w-6 text-primary" />}
          title="Sou aluno"
          description="Acesse seus treinos, evolução e converse com seu personal."
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
      className="w-full group relative bg-surface-2 border border-border rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all duration-200 active:scale-[0.98] text-left hover:border-primary hover:shadow-glow"
    >
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-semibold text-base font-display">{title}</p>
        <p className="text-fg-muted text-sm mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-fg-muted/60 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
    </button>
  );
}

function DetailsStep({
  role, fullName, setFullName, academyName, setAcademyName,
  onBack, onFinish, loading, error,
}: {
  role: Role;
  fullName: string;
  setFullName: (v: string) => void;
  academyName: string;
  setAcademyName: (v: string) => void;
  onBack: () => void;
  onFinish: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-fg-muted hover:text-foreground transition-colors mb-4 bg-surface-2 rounded-full px-3 py-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {role === "personal" ? "Sobre você e seu trabalho" : "Sobre você"}
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        {role === "personal"
          ? "Vamos criar seu espaço para começar a cadastrar alunos."
          : "Só precisamos do seu nome pra começar."}
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); onFinish(); }}
        className="mt-6 space-y-4"
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-fg-muted">Nome completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome"
            className="mt-1.5 w-full h-12 bg-surface-2 text-foreground placeholder-fg-muted rounded-md px-4 text-sm outline-none border focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-glow)] border-border hover:border-border-strong"
            autoFocus
          />
        </div>

        {role === "personal" && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
              Nome da sua academia <span className="text-fg-muted/60 normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              placeholder={`Ex: Academia de ${fullName.split(" ")[0] || "Você"}`}
              className="mt-1.5 w-full h-12 bg-surface-2 text-foreground placeholder-fg-muted rounded-md px-4 text-sm outline-none border focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-glow)] border-border hover:border-border-strong"
            />
            <p className="mt-1.5 text-[11px] text-fg-muted">
              Se você é autônomo, deixe em branco — usamos seu nome.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || fullName.trim().length < 2}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 px-8 py-3.5 w-full h-12 text-sm font-semibold"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir e entrar"}
        </button>
      </form>
    </div>
  );
}
