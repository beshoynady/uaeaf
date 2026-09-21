import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { readCurrentUser, requireSession } from "@/lib/auth/session";
import { localized } from "@/lib/api/types";
import { visibleNavItems } from "@/lib/navigation";
import { THEME_COOKIE } from "@/lib/auth/cookies";
import {
  NAV_GROUPS_COOKIE,
  SIDEBAR_COOKIE,
  isSidebarCollapsed,
  parseNavGroups,
} from "@/lib/shell/sidebar-preference";
import { AppShell } from "@/components/shell/app-shell";
import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { ToastProvider } from "@/components/ui/toast";
import { resolveLocale } from "@/i18n/params";

/**
 * The signed-in shell. Login lives outside this route group precisely so it
 * does not inherit a navigation the visitor has no session for.
 *
 * `requireSession` is the second gate, behind the proxy's redirect. Next's
 * own documentation warns that a matcher change can silently remove proxy
 * coverage, so the layout does not assume it ran.
 *
 * What is decided here is what only the server knows — the session, the
 * reader's permissions, and the two presentation cookies. How the frame
 * behaves is `AppShell`'s.
 */
const AppLayout = async ({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  await requireSession(locale);
  const cookieStore = await cookies();
  const storedTheme = cookieStore.get(THEME_COOKIE)?.value;
  const theme = storedTheme === "dark" ? "dark" : "light";

  // One call, two jobs: the header identity and the navigation.
  //
  // The navigation used to be built from the access token's embedded
  // permission set. Since the owner's 2026-09-07 decision the token carries
  // roleIds only, so authority arrives here instead — resolved by the API
  // for this request, which is also what makes a role edit change the menu
  // on the next navigation rather than fifteen minutes later.
  //
  // Every authenticated user may read their own profile (GET /users/me has
  // no @RequirePermission), so this cannot 403 — but it is still read
  // through the session helper so a dead session redirects rather than
  // throwing. It is memoised per render pass, so the page beneath this
  // layout reuses the same response.
  const me = await readCurrentUser(locale);
  const items = visibleNavItems(me?.permissions ?? []);

  return (
    // One toast queue for the whole signed-in shell, not one per screen.
    // Chapter 8 L4 FB.6 caps how many messages are visible at once, and a
    // cap each screen applied only to itself would stack three regions the
    // moment one of them navigated.
    <ToastProvider>
      <AppShell
        items={items}
        // Read here so the first paint is already the chosen width (§N.9).
        initialCollapsed={isSidebarCollapsed(cookieStore.get(SIDEBAR_COOKIE)?.value)}
        initialGroups={parseNavGroups(cookieStore.get(NAV_GROUPS_COOKIE)?.value)}
        brand={<BrandMark initialTheme={theme} />}
        identity={
          // Below sm the header holds the menu, the search and three
          // controls; the name and address give way rather than push them
          // off the screen.
          <div className="hidden min-w-0 flex-col sm:flex">
            <p className="truncate text-label font-medium text-[color:var(--color-text-primary)]">
              {me ? localized(me.name, locale) : ""}
            </p>
            <p dir="ltr" className="truncate text-start text-caption text-[color:var(--color-text-muted)]">
              {me?.email ?? ""}
            </p>
          </div>
        }
        controls={
          <>
            <LanguageToggle locale={locale} />
            <ThemeToggle initialTheme={theme} />
            <SignOutButton locale={locale} />
          </>
        }
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
};

export default AppLayout;
