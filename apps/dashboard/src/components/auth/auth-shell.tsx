import Image from "next/image";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { THEME_COOKIE } from "@/lib/auth/cookies";
import { AuthUtilities } from "./auth-utilities";
import { BrandMark } from "@/components/brand/brand-mark";
import type { AppLocale } from "@/i18n/routing";
import { BrandBorder, BrandStreaks, Surface } from "@uaeaf/brand-ui";

/**
 * The frame every signed-out screen shares.
 *
 * Personality: **Service / Trust** (Global Visual Design Protocol §4) —
 * "neutral dominant, high readability, green primarily for CTA, red only for
 * errors/warnings". So the composition is deliberately quiet: a sunken
 * neutral ground, one raised card, and colour spent only where a state
 * needs to be read.
 *
 * **Amended by ADR-0098 D6 (2026-09-24).** The paragraph that stood here
 * argued against any brand panel on the grounds that there was no approved
 * photography for an internal tool and a decorative half-page would be
 * "decoration without purpose". The first half is still true and the second is
 * now answered: the identity ground is a governed surface rather than a
 * decoration, so the form sits on `brand-green` with the diagonal motif
 * behind it — no photography, no half-page split, and the card itself stays
 * exactly as neutral as it was.
 *
 * The card is still centred and still sized by the form's own measure. What
 * changed is what is behind it.
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
          <BrandMark initialTheme={theme} />
          <p className="truncate text-label font-bold text-[color:var(--color-text-primary)]">
            {t("platform")}
          </p>
        </div>
        <AuthUtilities locale={locale} theme={theme} />
      </header>

      <Surface
        kind="brand-green"
        as="main"
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-6 py-12"
      >
        {/*
          The diagonal motif, from the shared library.

          **It no longer mirrors under LTR**, and that reverses what this file
          did before. The previous treatment flipped it with `ltr:-scale-x-100`,
          reasoning that §9's never-mirror rule protects identity marks and not
          the decorative pattern. ADR-0098 D4 settles it the other way on the
          owner's explicit instruction of 2026-09-24: the motif is derived from
          the logo's own take-off angle, so a mirrored angle is a mirrored
          identity mark. Placement still follows reading order — through logical
          properties — and only the angle is now invariant.

          It also takes its colour from the surface, which is why it is white
          here without anything saying so: on a coloured ground every tricolour
          element is monochrome (Guide §6.1).
        */}
        <BrandStreaks placement="behind-photo" />

        <div className="relative w-full max-w-[440px]">
          {/*
            A form never sits on a coloured ground (Chapter 27 §20, Chapter 12
            §12.15.1). `data-surface="raised"` makes that structural rather than
            remembered: everything inside reads the neutral ink, not the green
            section's white.

            It sits **outside** the border, not on the card, and that placement
            is the whole point. On the green ground every tricolour element
            collapses to white (Guide §6.1) — so a border that inherited the
            green context would draw a white edge around a white card and
            disappear. Measured: it did, on the first pass. Inside the raised
            context the same border resolves to the real three-colour ramp.
          */}
          <div data-surface="raised" className="rounded-[var(--card-radius)]">
          <BrandBorder variant="static" className="rounded-[var(--card-radius)]">
          <section className="animate-auth-enter flex flex-col gap-6 rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[color:var(--card-background)] p-6 shadow-card md:p-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-h3 text-[color:var(--color-text-primary)]">{title}</h1>
              <p className="text-body-sm text-[color:var(--color-text-secondary)]">{description}</p>
            </div>
            {children}
          </section>
          </BrandBorder>
          </div>

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>

        {/* On the identity ground this line takes the surface's own ink. With
            the neutral muted token it was dark grey on green and effectively
            unreadable — the exact failure the surface variables exist to stop a
            component from having to think about. */}
        <p className="relative max-w-[520px] text-balance text-center text-caption text-[color:var(--surface-text-muted)]">
          {t("restricted")}
        </p>
      </Surface>
    </div>
  );
}
