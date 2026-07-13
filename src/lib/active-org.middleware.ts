import { createMiddleware } from "@tanstack/react-start";
import { getActiveOrgId } from "./active-org";

/**
 * Client middleware: attaches the currently selected tenant as `X-Active-Org`
 * header on every server-function RPC. Server-side `resolveActiveOrg` reads
 * this header and validates membership before scoping queries.
 *
 * Registered globally in `src/start.ts`.
 */
export const attachActiveOrg = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const orgId = getActiveOrgId();
    return next({
      headers: orgId ? { "X-Active-Org": orgId } : {},
    });
  },
);
