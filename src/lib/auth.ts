import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "personal" | "aluno";

export type CurrentUserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  cref: string | null;
  bio: string | null;
  specialties: string[];
  role: AppRole | null;
};

export function initialsFromName(name: string | null | undefined, email?: string | null): string {
  const source = (name && name.trim()) || (email ? email.split("@")[0] : "") || "";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(fullName: string | null | undefined, email?: string | null): string {
  const source = (fullName && fullName.trim()) || (email ? email.split("@")[0] : "") || "Usuário";
  return source.split(/\s+/)[0];
}

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return { user, loading };
}

export function useCurrentUser() {
  const { user, loading: userLoading } = useSupabaseUser();

  const query = useQuery({
    queryKey: ["current-user-profile", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<CurrentUserProfile | null> => {
      if (!user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const role = (roles?.[0]?.role as AppRole | undefined) ?? null;
      return {
        id: user.id,
        email: user.email ?? null,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        phone: profile?.phone ?? null,
        cref: profile?.cref ?? null,
        bio: profile?.bio ?? null,
        specialties: profile?.specialties ?? [],
        role,
      };
    },
  });

  return {
    user,
    profile: query.data ?? null,
    loading: userLoading || query.isLoading,
  };
}

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }, [navigate, queryClient]);
}
