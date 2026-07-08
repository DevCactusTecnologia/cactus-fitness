import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertTriangle, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/academia/convite/$token")({
  head: () => ({ meta: [{ title: "Convite · cactusfitness" }] }),
  component: AceitarConvitePage,
});

function AceitarConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("accept_org_invite", { _token: token });
      if (error) {
        setStatus("error");
        const m = error.message || "";
        if (m.includes("invite_not_found")) setMsg("Convite não encontrado.");
        else if (m.includes("invite_already_used")) setMsg("Este convite já foi utilizado.");
        else if (m.includes("invite_expired")) setMsg("Convite expirado. Peça outro ao dono da academia.");
        else setMsg(m || "Não foi possível aceitar o convite.");
        return;
      }
      setStatus("ok");
      setMsg(String(data ?? ""));
      setTimeout(() => navigate({ to: "/dashboard/personal/academia" }), 1500);
    })();
  }, [token, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        {status === "loading" && (
          <>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando convite…
            </p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="mx-auto mt-4 h-8 w-8 text-primary" />
            <h1 className="mt-2 font-display text-lg font-bold">Bem-vindo à academia!</h1>
            <p className="mt-1 text-xs text-muted-foreground">Redirecionando…</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertTriangle className="mx-auto mt-4 h-8 w-8 text-destructive" />
            <h1 className="mt-2 font-display text-lg font-bold">Ops</h1>
            <p className="mt-1 text-sm text-muted-foreground">{msg}</p>
          </>
        )}
      </div>
    </div>
  );
}
