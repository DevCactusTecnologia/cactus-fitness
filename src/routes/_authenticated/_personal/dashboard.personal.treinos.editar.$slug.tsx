import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutEditor } from "@/components/workout-editor/WorkoutEditor";

export const Route = createFileRoute(
  "/_authenticated/_personal/dashboard/personal/treinos/editar/$slug",
)({
  head: () => ({
    meta: [
      { title: "Editar modelo · cactusfitness" },
      { name: "description", content: "Edite um modelo de plano ou treino." },
    ],
  }),
  component: EditarModeloPage,
});

function EditarModeloPage() {
  const { slug } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["modelo-kind", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("id, kind")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-fg-muted">
        Carregando…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-8 text-center text-sm text-fg-muted">
        Modelo não encontrado.
      </div>
    );
  }

  const kind = data.kind === "plan" ? "plan" : "template";
  return <WorkoutEditor kind={kind} editSlug={slug} />;
}
