import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware drop-in replacements for `next/link` / `next/navigation`.
 * `Link` auto-prefixes hrefs with the current locale; `usePathname` strips
 * the locale prefix back off, per next-intl's documented App Router setup
 * (verified against next-intl 4.14.2 docs, 2026-09-07).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
