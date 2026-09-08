import Image from "next/image";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { THEME_COOKIE } from "@/lib/auth/cookies";
import { AuthUtilities } from "./auth-utilities";
import type { AppLocale } from "@/i18n/routing";

/**
 * The frame every signed-out screen shares.
 *
 * Personality: **Service / Trust** (Global Visual Design Protocol §4) —
 * "neutral dominant, high readability, green primarily for CTA, red only for
 * errors/warnings". So the composition is deliberately quiet: a sunken
 * neutral ground, one raised card, and colour spent only where a state
 * needs to be read.
 *
 * Two things this page does NOT do, and why:
 *
 * - **No split-screen brand panel.** The default enterprise answer is a half
 *   page of photography beside the form. UAEAF has no approved photography
 *   for an internal tool, and a decorative half-page would be exactly the
 *   "decoration without purpose" §15 rules out. The card is centred instead,
 *   and the width is set by the form's own measure.
 */
export async function AuthShell({
  locale,
  title,
  description,
  children,
  footer,
}: {
  locale: AppLocale;
  title: string;
  description: string;
  children: ReactNode;
  /** Optional row under the card — the cross-links between the three
   *  screens. Outside the card so it never reads as part of the form. */
  footer?: ReactNode;
}) {
  const t = await getTranslations("Auth");
  const storedTheme = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = storedTheme === "dark" ? "dark" : "light";

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--color-surface-sunken)]">
      <header className="flex items-center justify-between gap-4 border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            // The matched trio in docs/design-system/brand-assets shares one
            // 170x168 viewBox, so the colour and white marks are the same
            // artwork rather than two differently-proportioned lockups. The
            // theme is already known here from the cookie, so the correct
            // file is chosen on the server — no swap flashes on hydration.
            // §9: the mark is never mirrored, recoloured or stretched.
            src={theme === "dark" ? "/brand/uaeaf-logo-white.svg" : "/brand/uaeaf-logo-color.svg"}
            // The federation's own name is the alt text, not "logo": a
            // screen-reader user needs to know whose dashboard this is.
            alt={t("federation")}
            width={170}
            height={168}
            priority
            className="h-10 w-[40.5px] shrink-0"
          />
          <p className="truncate text-label font-bold text-[color:var(--color-text-primary)]">
            {t("platform")}
          </p>
        </div>
        <AuthUtilities locale={locale} theme={theme} />
      </header>

      <main
        id="main-content"
        className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-6 py-12"
      >
        {/*
          The four-diagonal-line motif, at the opacity ADR-0005 authorises:
          "5-10% opacity background layer for general use, full fill for Hero
          sections only". This is the shipped asset from
          docs/design-system/brand-assets, not a redrawing — which matters,
          because that ADR's Risks entry is specifically about recreating the
          pattern at an angle measured from something other than the source.

          Mirrored under LTR. ADR-0005 names RTL mirroring as a reason the
          pattern is an SVG at all, and §9's never-mirror rule protects
          identity marks — the logo, crests, sponsor marks — not the
          decorative pattern. Mirroring keeps the diagonals sweeping away
          from the reading edge in both directions.
        */}
        <Image
          src="/brand/uaeaf-ribbon-motif.svg"
          alt=""
          aria-hidden="true"
          width={170}
          height={168}
          style={{ opacity: 0.1 }}
          className="pointer-events-none absolute -bottom-40 start-[-10%] hidden w-[620px] max-w-[52vw] select-none rtl:scale-x-100 ltr:-scale-x-100 md:block"
        />

        <div className="relative w-full max-w-[440px]">
          <section className="animate-auth-enter flex flex-col gap-6 rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[color:var(--card-background)] p-6 shadow-card md:p-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-h3 text-[color:var(--color-text-primary)]">{title}</h1>
              <p className="text-body-sm text-[color:var(--color-text-secondary)]">{description}</p>
            </div>
            {children}
          </section>

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>

        <p className="relative max-w-[520px] text-balance text-center text-caption text-[color:var(--color-text-muted)]">
          {t("restricted")}
        </p>
      </main>
    </div>
  );
}
