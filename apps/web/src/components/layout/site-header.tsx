"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { UaeafLogo } from "@/components/brand/uaeaf-logo";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { PRIMARY_NAV } from "@/lib/navigation";
import { isBuilt } from "@/lib/pages/built-routes";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

/**
 * Global site header.
 *
 * Visual source: Figma `Header (Approved Master Component)`, node 2374:1175,
 * inside `Homepage - AR / RTL (APPROVED BASELINE v1)` (2374:1174).
 *
 * Dimensions use the design system's own master values, not the numbers Figma
 * exports. Every exported figure in that node is the documented R7 artefact —
 * a uniform ×0.99385 scaling of the real value (CLAUDE.md §4): 23.852→24,
 * 15.9→16, 12.92→13, 11.926→12, 1.99→2, 0.994→1, 95.407→96.
 *
 * DOM order is Logo → Nav → Utilities, the reverse of the Figma export's
 * order. The export is LTR-flattened; under the AR document's `dir="rtl"` a
 * `justify-between` row places its FIRST child on the right, reproducing the
 * approved layout (logo right, utilities left). Under `dir="ltr"` (English)
 * this same order places the logo left, utilities right — i.e. it is
 * direction-symmetric and needed no change for the i18n foundation
 * (verified visually, see deviation log D-i18n-1).
 *
 * ── The navigation below the row's own width ───────────────────────────────
 *
 * The nav was `hidden lg:block` and nothing replaced it, so every viewport
 * under 1024px had **no navigation at all** — not a reduced one, none. IA
 * §8.1's behaviour note is explicit that "below 1024px the whole bar collapses
 * into a drawer with the same tree", and PR-006 makes the public layer
 * mobile-priority, so the missing half was the priority half.
 *
 * The threshold is `xl` (1280px), not the documented 1024. That is a
 * deviation and it is measured, not preferred: at a 1024px viewport the nine
 * Arabic labels need **1066px** of intrinsic width on their own, before the
 * 120px logo and the 158px utility cluster — so the row overflowed the
 * document by 360px, which the browser reported and no test could.
 *
 * The reconciliation is that §8.1's 1024 predates §8.1 itself. The threshold
 * was written against the header as built, which carried **seven** items; the
 * Product Owner ruling in that same section then raised it to **nine** and
 * nobody re-derived the width. `xl` is the first §5.2 band where the row
 * measurably fits — a documented breakpoint, not an invented one (CLAUDE.md
 * §1a.2). Recorded as DESIGN DECISION REQUIRED: nine items in a 96px bar need
 * either this threshold or a shorter label set, and that is the owner's call.
 *
 * It is one list, not two. A second copy of the nine links for small screens
 * would double the tab order, double the accessible names a screen reader
 * announces, and give the same defect two places to be fixed — which is the
 * shape that put one WCAG failure into five copies of a search field on the
 * dashboard. The same `<ul>` lays out as a row at `lg` and as a stack below
 * it; when collapsed it is `hidden`, so its links leave the tab order
 * entirely rather than staying reachable behind a closed panel.
 *
 * Disclosure, not a modal: the panel is a sibling that opens under the bar,
 * so there is no focus to trap, no scroll to lock, and no way to be left
 * stranded inside it. `aria-expanded` and `aria-controls` are on the button
 * (WAI-ARIA APG disclosure pattern).
 */

export function SiteHeader({ activePath }: { activePath?: string }) {
  const t = useTranslations("Nav");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // `activePath` stays a prop so a test can pin it; the live value is the
  // locale-stripped pathname next-intl gives us.
  const current = activePath ?? pathname ?? "/";

  return (
    <header
      className="relative flex h-24 w-full items-center justify-between gap-2 border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-4 sm:px-6"
      data-node-id="2374:1175"
    >
      {/* WCAG 2.2 SC 2.4.1 Bypass Blocks. Not present in the Figma frame —
          a keyboard affordance the static mockup has no way to express. */}
      <a
        href="#main-content"
        className={`sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:end-6 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-sm focus-visible:bg-[color:var(--color-brand-primary)] focus-visible:px-4 focus-visible:py-2 focus-visible:text-[color:var(--color-text-on-brand)] ${FOCUS}`}
      >
        {tHeader("skipLink")}
      </a>

      <Link
        href="/"
        aria-label={tHeader("homeAriaLabel")}
        className={`flex shrink-0 items-center rounded-xs ${FOCUS}`}
      >
        {/* The inline component rather than `/brand/uaeaf-logo.svg`: the file
            carried three colours that are not the federation's (ADR-0059
            §D7.2) and `preserveAspectRatio="none"`, which lets the mark
            stretch — the first prohibition in guide §9.1. */}
        <UaeafLogo className="h-11 w-auto sm:h-16" />
      </Link>

      <nav
        id="primary-nav"
        aria-label={tHeader("mainNav")}
        className={`${
          open ? "block" : "hidden"
        } absolute inset-x-0 top-full z-40 min-w-0 border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 py-2 shadow-dropdown xl:static xl:z-auto xl:block xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none`}
      >
        <ul className="flex flex-col xl:flex-row xl:items-center xl:gap-3 2xl:gap-5">
          {PRIMARY_NAV.map((item) => {
            const isActive = item.href === current;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={isBuilt(item.href) ? undefined : false}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 flex-row items-center justify-between gap-2 rounded-xs px-1.5 text-body whitespace-nowrap xl:flex-col xl:justify-center xl:gap-2 xl:py-3.5 ${TRANSITION} ${FOCUS} ${
                    isActive
                      ? "font-medium text-[color:var(--color-text-primary)]"
                      : "font-normal text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-secondary)]"
                  }`}
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {item.hasDropdown ? (
                      <Image
                        src="/icons/chevron-down.svg"
                        alt=""
                        width={10}
                        height={10}
                        aria-hidden="true"
                        data-chevron="true"
                        className="size-2.5 shrink-0"
                      />
                    ) : null}
                    {t(item.key)}
                  </span>
                  {/* Active indicator: 2px green underline, Figma node 2544:2595.
                      Always rendered so the row height cannot shift between states.
                      Stacked, it becomes a 2px end-aligned marker rather than a
                      full-width rule — the underline reads as an underline only
                      under a horizontal row. */}
                  <span
                    aria-hidden="true"
                    className={`h-0.5 w-6 xl:w-full ${
                      isActive ? "bg-[color:var(--color-brand-primary)]" : "bg-transparent"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex shrink-0 items-center gap-1 text-[color:var(--color-text-secondary)] sm:gap-3">
        <ThemeToggle />
        <button
          type="button"
          className={`inline-flex min-h-11 items-center rounded-xs px-2 text-label font-medium whitespace-nowrap ${TRANSITION} ${FOCUS} hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-secondary)]`}
        >
          {tHeader("search")}
        </button>
        <LanguageToggle />

        <button
          type="button"
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label={tHeader("menu")}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          // 44px minimum touch target — IA §12's stated KPI for every small
          // screen, and the only control here that exists solely below `lg`.
          className={`flex size-11 items-center justify-center rounded-xs xl:hidden ${TRANSITION} ${FOCUS} hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-secondary)]`}
        >
          <MenuIcon open={open} />
        </button>
      </div>
    </header>
  );
}

/** Two bars that become a cross. Drawn rather than imported because it has a
 *  state the exported chevron asset does not, and because a 20px glyph is
 *  cheaper inline than as a network request on the mobile-priority layer. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className="size-[var(--icon-size-sm)]"
    >
      {open ? (
        <>
          <path d="M5 5l10 10" />
          <path d="M15 5L5 15" />
        </>
      ) : (
        <>
          <path d="M3 6h14" />
          <path d="M3 14h14" />
        </>
      )}
    </svg>
  );
}
