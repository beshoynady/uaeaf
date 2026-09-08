import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware drop-in replacements for `next/link` / `next/navigation`.
 * `Link` auto-prefixes hrefs with the current locale; `usePathname` strips
 * the locale prefix back off.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
