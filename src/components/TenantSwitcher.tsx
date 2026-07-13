import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Sparkles, Check, ChevronsUpDown } from "lucide-react";
import { listMyOrgs } from "@/lib/personal-solo.functions";
import { useActiveOrgId, setActiveOrgId } from "@/lib/active-org";

/**
 * Compact tenant switcher — appears only when the user is a member of 2+ orgs
 * (hybrid personal: academia + studio solo, or owner of multiple tenants).
 * Persists selection in localStorage and refetches all queries on change.
 */
export function TenantSwitcher({ collapsed = false }: { collapsed?: boolean } = {}) {
  const qc = useQueryClient();
  const { data: orgs } = useQuery({
    queryKey: ["my-orgs"],
    queryFn: () => listMyOrgs(),
    staleTime: 60_000,
  });

  const activeId = useActiveOrgId();
  const [open, setOpen] = useState(false);

  const list = orgs ?? [];
  const active = useMemo(
    () => list.find((o) => o.id === activeId) ?? list[0] ?? null,
    [list, activeId],
  );

  // Ensure the store has a value once orgs load, so header is always sent.
  useEffect(() => {
    if (list.length && !activeId) setActiveOrgId(list[0].id);
  }, [list, activeId]);

  if (list.length < 2 || !active) return null;

  function pick(id: string) {
    if (id === active?.id) { setOpen(false); return; }
    setActiveOrgId(id);
    setOpen(false);
    // Invalidate everything: server fns will now scope to the new org.
    qc.invalidateQueries();
  }

  const isSolo = active.type === "personal_solo";
  const Icon = isSolo ? Sparkles : Building2;
  const iconClass = isSolo ? "text-violet-400" : "text-primary";

  if (collapsed) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          title={`Contexto: ${active.name}`}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card hover:border-primary/40"
        >
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </button>
        {open && <SwitcherPopover list={list} active={active} onPick={pick} onClose={() => setOpen(false)} align="left" />}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left hover:border-primary/40"
      >
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-background ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Contexto</span>
          <span className="block truncate text-sm font-semibold">{active.name}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && <SwitcherPopover list={list} active={active} onPick={pick} onClose={() => setOpen(false)} align="right" />}
    </div>
  );
}

function SwitcherPopover({
  list,
  active,
  onPick,
  onClose,
  align,
}: {
  list: Array<{ id: string; name: string; type: "academia" | "personal_solo"; role: string }>;
  active: { id: string };
  onPick: (id: string) => void;
  onClose: () => void;
  align: "left" | "right";
}) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-tenant-switcher]")) onClose();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  return (
    <div
      data-tenant-switcher
      className={`absolute z-[70] mt-1.5 w-64 rounded-xl border border-border bg-popover p-1 shadow-lg ${align === "left" ? "left-0" : "right-0"}`}
    >
      <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Alternar contexto
      </div>
      {list.map((o) => {
        const isSolo = o.type === "personal_solo";
        const Icon = isSolo ? Sparkles : Building2;
        const on = o.id === active.id;
        return (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-accent ${on ? "bg-accent/60" : ""}`}
          >
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${isSolo ? "bg-violet-500/15 text-violet-400" : "bg-primary/15 text-primary"}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{o.name}</span>
              <span className="block text-[10px] text-muted-foreground">
                {isSolo ? "Studio pessoal" : "Academia"} · {roleLabel(o.role)}
              </span>
            </span>
            {on && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}

function roleLabel(r: string) {
  switch (r) {
    case "owner": return "Dono";
    case "personal": return "Personal";
    case "staff": return "Equipe";
    case "aluno": return "Aluno";
    default: return r;
  }
}
