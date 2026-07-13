import { useSyncExternalStore } from "react";

/**
 * Client-side "active tenant" selection persisted in localStorage.
 * The value is attached to every server-function call via a client middleware
 * (see `active-org.middleware.ts`) as `X-Active-Org`. Server-side resolvers
 * validate that the current user is actually a member of that org.
 */

const KEY = "cactus.active_org_id";

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getActiveOrgId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveOrgId(orgId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (orgId) window.localStorage.setItem(KEY, orgId);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore quota / private mode */
  }
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) fn();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useActiveOrgId() {
  return useSyncExternalStore(subscribe, getActiveOrgId, () => null);
}
