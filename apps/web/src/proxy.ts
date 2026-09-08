import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Next.js 16 renamed the middleware convention: the file is `proxy.ts` and
 * the exported function must be named `proxy` (verified against Next.js
 * 16.2.9's own upgrade guide, 2026-09-07 — the classic `middleware.ts` /
 * `export default createMiddleware(routing)` pattern still shown in
 * next-intl's own docs predates that rename). Wrapping next-intl's factory
 * in a named `proxy` function satisfies both.
 */
const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return handleI18nRouting(request);
}

export const config = {
  // Match every pathname except API routes, Next internals, and anything
  // containing a dot (static files like favicon.ico).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
