"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UaeafLogo } from "@/components/brand/uaeaf-logo";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { LanguageToggle } from "./language-toggle";
import { PrimaryNav } from "./primary-nav";
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
 * approved layout (logo right, utilities left). Under `dir="ltr"` this same
 * order places the logo left and utilities right — direction-symmetric, so it
 * needed no change for the i18n foundation.
 *
 * ── Why the row fits again (2026-09-09) ────────────────────────────────────
 *
 * ADR-0061 §D6 had to push the row out to `2xl` because nine flat English
 * labels wanted 1098px and 1440px offers 1070px. The owner's answer was not to
 * shorten the labels but to regroup: eight top-level items, three of them
 * disclosure panels (ADR-0062). The row's cost falls with the grouping, and
 * the threshold is re-derived from measurement in `primary-nav.tsx` rather
 * than inherited from either previous calculation.
 *
 * ── Scrolling ──────────────────────────────────────────────────────────────
 *
 * The bar is sticky and gains elevation once the page leaves the top. It does
 * NOT shrink. Animating a sticky header's height re-lays-out every pixel of
 * the document beneath it on every frame, which is precisely what the brief's
 * own performance rule — transform and opacity only — exists to prevent, and
 * it makes the text the reader is following jump. Elevation carries the same
 * message (you have left the top of the page) and composites.
 */

export function SiteHeader({ activePath }: { activePath?: string }) {
  const tHeader = useTranslations("Header");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // `passive` because this listener never calls preventDefault, and a
    // non-passive scroll listener blocks the compositor on touch.
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The drawer is a disclosure, not a modal — no focus trap, no scroll lock,
  // no way to be stranded inside it. Escape still closes it from anywhere in
  // the header, which is the one modal affordance a disclosure should borrow.
  const onHeaderKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && drawerOpen) setDrawerOpen(false);
  };

  return (
    <>
      <header
        onKeyDown={onHeaderKeyDown}
        data-scrolled={scrolled}
        className={`site-header sticky top-0 z-50 flex h-24 w-full items-center justify-between gap-2 border-b bg-[color:var(--color-surface-base)] px-4 sm:px-6 ${
          scrolled
            ? "border-[color:var(--color-border-strong)] shadow-dropdown"
            : "border-[color:var(--color-border-default)]"
        }`}
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
              stretch — the first prohibition in guide §9.1. Its inks follow
              ADR-0002 on dark grounds (ADR-0061 §D4). */}
          <UaeafLogo className="h-11 w-auto sm:h-16" />
        </Link>

        <PrimaryNav
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          activePath={activePath}
        />

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
            aria-expanded={drawerOpen}
            aria-controls="primary-nav"
            aria-label={tHeader("menu")}
            onClick={() => setDrawerOpen((wasOpen) => !wasOpen)}
            // 44px minimum touch target — IA §12's stated KPI for every small
            // screen, and the only control here that exists solely below the
            // row breakpoint.
            className={`flex size-11 items-center justify-center rounded-xs xl:hidden ${TRANSITION} ${FOCUS} hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-secondary)]`}
          >
            <MenuIcon open={drawerOpen} />
          </button>
        </div>
      </header>

      {/*
        The drawer's scrim.
        Kept outside the header so it can cover the page without covering the
        bar the reader closes it from. `aria-hidden` and not focusable: it
        duplicates the close button rather than adding a control, and a
        keyboard already has Escape.
      */}
      <div
        aria-hidden="true"
        data-open={drawerOpen}
        onClick={() => setDrawerOpen(false)}
        className={`nav-scrim fixed inset-0 top-24 z-30 bg-[color:var(--color-brand-black)] xl:hidden ${
          drawerOpen ? "" : "pointer-events-none"
        }`}
      />
    </>
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
