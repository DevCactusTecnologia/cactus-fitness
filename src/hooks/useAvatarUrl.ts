import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a profile.avatar_url value into a displayable URL.
 * - If the value looks like a full URL, returns it as-is.
 * - Otherwise treats it as a path inside the private "avatars" bucket
 *   and creates a signed URL (valid for 1h).
 */
export function useAvatarUrl(avatarRef: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarRef) { setUrl(null); return; }
    if (/^https?:\/\//i.test(avatarRef) || avatarRef.startsWith("data:") || avatarRef.startsWith("blob:")) {
      setUrl(avatarRef);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("avatars").createSignedUrl(avatarRef, 60 * 60);
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [avatarRef]);

  return url;
}
