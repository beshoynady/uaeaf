"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { UaeafLogo } from "@/components/brand/uaeaf-logo";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { HeaderToolsCapsule } from "./header-tools-capsule";
import { PrimaryNav, useRowLayout } from "./primary-nav";
import { useFocusTrap } from "./use-focus-trap";
import { BrandAccentBar } from "@uaeaf/brand-ui";
import { panelFeature, panelMiddle } from "@/components/layout/cards";
import { SearchDialog } from "@/components/search/search-dialog";
import type { HeaderFeatures } from "@/lib/header/features";

/** Every field absent. Used when a caller (a test, or a route that renders
 *  the header before any data source exists) has no server read to pass —
 *  every panel then shows its standing fallback card, exactly as before this
 *  data was wired in. */
const EMPTY_FEATURES: HeaderFeatures = {
  presidentExcerpt: null,
  nextChampionship: null,
  nextEvent: null,
  currentSeasonSummary: null,
  latestArticle: null,
  latestVideo: null,
  activeLiveStream: null,
};

/**
 * The header's state and row: open panel, drawer, search, and everything the
 * scroll position changes.
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
 * ── Scrolling ──────────────────────────────────────────────────────────────
 *
 * The bar is sticky and gains elevation once the page leaves the top. It does
 * NOT shrink. Animating a sticky header's height re-lays-out every pixel of
 * the document beneath it on every frame, which is precisely what the brief's
 * own performance rule — transform and opacity only — exists to prevent, and
 * it makes the text the reader is following jump. Elevation carries the same
 * message (you have left the top of the page) and composites.
 */
export const HeaderShell = ({
  features,
  activePath,
  isRow: isRowOverride,
}: {
  /** The server's one cached read, or `null` for a caller with none to give
   *  (falls back to every panel's standing card). */
  features: HeaderFeatures | null;
  activePath?: string;
  /** Pinned by tests; the live value comes from `useRowLayout()`, exactly as
   *  `activePath` falls back to `usePathname()`. */
  isRow?: boolean;
}) => {
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const liveIsRow = useRowLayout();
  const isRow = isRowOverride ?? liveIsRow;
  const data = features ?? EMPTY_FEATURES;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const current = activePath ?? pathname ?? "/";

  const togglePanel = useCallback(
    (key: string) => setOpenKey((existing) => (existing === key ? null : key)),
    [],
  );
  const openPanel = useCallback((key: string) => setOpenKey(key), []);
  const closePanel = useCallback(() => setOpenKey(null), []);

  // A route change closes the open panel and the drawer. Adjusted during
  // render rather than in an effect: an effect would paint the new page once
  // with the old panel still open, and `react-hooks/set-state-in-effect`
  // rejects it for exactly that reason. This is React's documented "adjust
  // state when a prop changes" pattern — the extra render happens before the
  // browser sees anything.
  const [renderedPath, setRenderedPath] = useState(current);
  if (current !== renderedPath) {
    setRenderedPath(current);
    setOpenKey(null);
    setDrawerOpen(false);
  }

  // The row appearing mid-session closes the drawer. Adjusted during render,
  // the same "state derived from a prop" pattern as `renderedPath` above: an
  // effect would paint one frame with the row visible and the drawer (and
  // its scroll lock) still open, with nothing on screen to explain why the
  // page will not scroll.
  const [wasRow, setWasRow] = useState(isRow);
  if (isRow !== wasRow) {
    setWasRow(isRow);
    if (isRow && drawerOpen) setDrawerOpen(false);
  }

  useEffect(() => {
    // `passive` because this listener never calls preventDefault, and a
    // non-passive scroll listener blocks the compositor on touch.
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Ctrl+K is "delete to end of line" inside a text field on several
    // platforms — taking it there would break editing to open a search box
    // the reader can still reach from the header's own button.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey)) return;
      const active = document.activeElement;
      const inTextField =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement | null)?.isContentEditable;
      if (inTextField) return;
      event.preventDefault();
      setSearchOpen(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    // Both restored to the prior value, not blanked (the search dialog will
    // hold this same lock later), and both set in the same pass so no frame
    // shows the scrollbar gone before its gutter is reserved.
    const previousOverflow = document.body.style.overflow;
    const previousGutter = document.documentElement.style.scrollbarGutter;
    document.body.style.overflow = "hidden";
    document.documentElement.style.scrollbarGutter = "stable";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.scrollbarGutter = previousGutter;
    };
  }, [drawerOpen]);

  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, drawerOpen);

  // The drawer is a modal now: focus is trapped inside it and the page
  // behind it cannot scroll (ADR-0122 D3, amending ADR-0062 D4). Escape still
  // closes it from anywhere in the header. A panel's own Escape handler
  // stops the event before it reaches here, so the first Escape closes the
  // panel and a second closes the drawer.
  const onHeaderKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && drawerOpen) setDrawerOpen(false);
  };

  const featureFor = (key: string) => panelFeature(key, data);
  const middleFor = (key: string) => panelMiddle(key, data);

  return (
    <>
      <header
        onKeyDown={onHeaderKeyDown}
        data-scrolled={scrolled}
        data-search-open={searchOpen}
        className={`site-header sticky top-0 z-50 flex h-[var(--header-height)] w-full items-center justify-between gap-2 border-b bg-[color:var(--color-surface-base)] px-4 sm:px-6 xl:px-[var(--space-10)] 2xl:px-[var(--grid-margin-xl)] ${
          scrolled
            ? "border-[color:var(--color-border-strong)] shadow-dropdown"
            : "border-[color:var(--color-border-default)]"
        }`}
        data-node-id="2374:1175"
      >
        {/*
          The identity edge (ADR-0098 D6, Expressive dose).

          Inside the sticky header rather than above it, and absolutely
          positioned rather than in the flow: above it the bar would scroll
          away on the first gesture, which is the opposite of what a permanent
          identity mark is for; in the flow it would either eat 4px of
          `--header-height` or change it, and changing it moves every page's
          first screen. Overlaying the top edge costs no layout and no CLS.
        */}
        <BrandAccentBar className="absolute inset-x-0 top-0" />
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

        <div
          ref={drawerRef}
          role={drawerOpen ? "dialog" : undefined}
          aria-modal={drawerOpen ? true : undefined}
          aria-label={drawerOpen ? tHeader("menu") : undefined}
        >
          <PrimaryNav
            drawerOpen={drawerOpen}
            onCloseDrawer={() => setDrawerOpen(false)}
            openKey={openKey}
            onTogglePanel={togglePanel}
            onOpenPanel={openPanel}
            onClosePanel={closePanel}
            isRow={isRow}
            featureFor={featureFor}
            middleFor={middleFor}
            live={data.activeLiveStream}
            activePath={activePath}
            // Only while open: the drawer's own copy of the tools capsule
            // must not exist in the document at all while closed, or reachable
            // while the row layout is active — a stylesheet rule cannot be
            // trusted alone for either (§ focus-trap `isReachable` doc).
            toolsRow={
              drawerOpen ? (
                <HeaderToolsCapsule
                  layout="drawer"
                  // Closes the drawer rather than stacking it behind the
                  // dialog: two modal traps active at once would each cycle
                  // Tab through its own subtree, and a reader could never
                  // reach the other's controls from either.
                  onOpenSearch={() => {
                    setDrawerOpen(false);
                    setSearchOpen(true);
                  }}
                />
              ) : undefined
            }
          />
        </div>

        <div className="flex shrink-0 items-center gap-1 text-[color:var(--color-text-secondary)] sm:gap-3">
          {/* Row's own copy: real CSS breakpoint hiding, not a JS condition —
              this one must be visible instantly on first paint at xl+, with
              no hydration wait. */}
          <div className="hidden xl:flex">
            <HeaderToolsCapsule layout="row" onOpenSearch={() => setSearchOpen(true)} />
          </div>

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

      {/* Covers the page under the header while a mega panel is open.
          `aria-hidden` and not focusable: it duplicates Escape rather than
          adding a control. */}
      <div
        aria-hidden="true"
        data-open={openKey !== null}
        onClick={closePanel}
        className={`nav-scrim fixed inset-0 top-[var(--header-height)] z-30 hidden bg-[color:var(--color-brand-black)] xl:block ${
          openKey ? "" : "pointer-events-none"
        }`}
      />

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

/** Two bars that become a cross. Drawn rather than imported because it has a
 *  state the exported chevron asset does not, and because a 20px glyph is
 *  cheaper inline than as a network request on the mobile-priority layer. */
const MenuIcon = ({ open }: { open: boolean }) => {
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
};
