import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { readCurrentUser, requireSession } from "@/lib/auth/session";
import { localized } from "@/lib/api/types";
import { visibleNavItems } from "@/lib/navigation";
import { THEME_COOKIE } from "@/lib/auth/cookies";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { SignOutButton } from "@/components/shell/sign-out-button";
import type { AppLocale } from "@/i18n/routing";
import { resolveLocale } from "@/i18n/params";

/**
 * The signed-in shell. Login lives outside this route group precisely so it
 * does not inherit a navigation the visitor has no session for.
 *
 * `requireSession` is the second gate, behind the proxy's redirect. Next's
 * own documentation warns that a matcher change can silently remove proxy
 * coverage, so the layout does not assume it ran.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  await requireSession(locale);
  const t = await getTranslations("Shell");
  const storedTheme = (await cookies()).get(THEME_COOKIE)?.value;

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
    <div className="flex min-h-screen flex-col bg-[color:var(--color-surface-sunken)] lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-4 focus:rounded-[var(--radius-md)] focus:bg-[color:var(--color-surface-raised)] focus:px-4 focus:py-2"
      >
        {t("skipLink")}
      </a>

      <aside className="shrink-0 border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4 lg:min-h-screen lg:w-[264px] lg:border-b-0 lg:border-e lg:p-6">
        <p className="mb-6 px-4 text-label font-bold text-[color:var(--color-text-primary)]">
          {t("brand")}
        </p>
        <SidebarNav items={items} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-6 py-4">
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-label font-medium text-[color:var(--color-text-primary)]">
              {me ? localized(me.name, locale) : ""}
            </p>
            <p dir="ltr" className="truncate text-start text-caption text-[color:var(--color-text-muted)]">
              {me?.email ?? ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle locale={locale} />
            <ThemeToggle initialTheme={storedTheme === "dark" ? "dark" : "light"} />
            <SignOutButton locale={locale} />
          </div>
        </header>

        <main id="main-content" className="flex-1 px-6 py-8">
          {/*
            Fluid, not capped. Chapter 5 §Maximum Container is explicit and
            applies to exactly this surface: "1440px for the Public
            Experience … Fluid (100%) for the Dashboard with a fixed Sidebar
            (Operational Experience) — uses the full available space for
            dense data presentation (PR-006)."

            This read `max-w-[1100px]` until 2026-09-08, which is the public
            site's rule applied to the operational one. The cost was visible
            on the roles screen: a 63-row permission matrix eight columns
            wide had to scroll sideways inside a container with several
            hundred unused pixels beside it.
          */}
          <div className="flex flex-col gap-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
