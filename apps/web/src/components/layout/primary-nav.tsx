"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { PRIMARY_NAV, containsPath, type NavItem } from "@/lib/navigation";
import { isBuilt } from "@/lib/pages/built-routes";
import { TricolorIndicator } from "@/components/layout/mega/tricolor-indicator";
import { MegaPanel } from "@/components/layout/mega/mega-panel";
import type { ReactNode } from "react";

/**
 * The primary navigation: one tree, two layouts, one set of behaviours.
 *
 * ── Why disclosure and not a menu ──────────────────────────────────────────
 *
 * These are links to pages, so this is WAI-ARIA APG's **Disclosure Navigation**
 * pattern: a `<button>` with `aria-expanded` revealing a plain `<ul>` of links.
 * It is deliberately NOT `role="menu"` / `role="menuitem"`, which the APG
 * reserves for application menus of commands. Applying it here would strip the
 * links of their link semantics — a screen reader would stop counting them as
 * links, stop offering them in its links list, and announce "menu item" for
 * something that navigates. IA §8.1 asks for "the WAI-ARIA APG nested-menu
 * pattern"; this is that pattern's navigation variant, which is the one the
 * APG itself points site navigation at.
 *
 * ── Why one list and not two ───────────────────────────────────────────────
 *
 * The same `<ul>` is a row at the breakpoint and a stack below it. A second
 * copy for small screens would double the tab order and the accessible names,
 * and give every future defect two places to live — the shape that put one
 * WCAG failure into five copies of a search field on the dashboard.
 *
 * ── One disclosure level ────────────────────────────────────────────────────
 *
 * A top-level item opens exactly one panel. What used to be a second,
 * floating level (a group nested inside a group) is now a COLUMN inside that
 * same panel — `MegaPanel` lays its columns out side by side on the row and
 * stacked in the drawer, and a column's own children are plain links
 * (`MegaColumn`/`MegaLink`), never another disclosure button. `openKey` is
 * therefore a single value, not a chain.
 */

/**
 * The width at which the row appears, in px.
 *
 * It exists twice by necessity — as this number for `matchMedia`, and as the
 * `xl:` variant on the classes below — so `nav-structure-contract.spec.ts`
 * asserts the two agree and that this equals the `--breakpoint-xl` token.
 * Chosen by measurement after the regrouping, not inherited: see ADR-0062 §V.
 */
export const NAV_ROW_BREAKPOINT = 1280;

const MEDIA_QUERY = `(min-width: ${NAV_ROW_BREAKPOINT}px)`;

/** Grace period before a hover-opened panel closes, so a diagonal mouse path
 *  from trigger to panel does not dismiss it mid-travel. One token, not a
 *  hand-picked number. */
const HOVER_CLOSE_DELAY = "var(--motion-duration-fast)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(MEDIA_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/**
 * True once the row layout is active.
 *
 * `useSyncExternalStore` rather than an effect: the server snapshot is `false`
 * (stack), which is also the correct first-paint answer for every viewport
 * that has no row, and React reconciles the rest without a state write during
 * render. Exported so `HeaderShell` — the one owner of this value — can read
 * it once and hand it down, exactly as it hands down `activePath` from
 * `usePathname()`.
 */
export const useRowLayout = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MEDIA_QUERY).matches,
    () => false,
  );

type Props = {
  /** Drawer state, owned by `HeaderShell` so the trigger button can live in
   *  the utility cluster where the design puts it. */
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  /** The open panel's key, or none. Owned by `HeaderShell`, which also renders
   *  the backdrop that this same value drives. */
  openKey: string | null;
  onTogglePanel: (key: string) => void;
  onOpenPanel: (key: string) => void;
  onClosePanel: () => void;
  /** True once the row layout is active; owned and read by `HeaderShell`. */
  isRow: boolean;
  /** The featured card for a panel's key, or `null` to leave that slot empty
   *  (a panel with no live promotion, e.g. the media panel today). */
  featureFor: (key: string) => ReactNode;
  /** Pinned by tests; the live value comes from `usePathname`. */
  activePath?: string;
};

export const PrimaryNav = ({
  drawerOpen,
  onCloseDrawer,
  openKey,
  onTogglePanel,
  onOpenPanel,
  onClosePanel,
  isRow,
  featureFor,
  activePath,
}: Props) => {
  const t = useTranslations("Nav");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseId = useId();

  const current = activePath ?? pathname ?? "/";

  // A pointer press outside the navigation closes the open panel. This is
  // pointer-only: nothing here yet dismisses the panel when keyboard focus
  // tabs past its last item.
  useEffect(() => {
    if (openKey === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) onClosePanel();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openKey, onClosePanel]);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => cancelClose, []);

  /** Hover only ever opens on the row, and only on a device that really has a
   *  pointer — `(hover: hover)` keeps a tablet's emulated hover from opening a
   *  panel the first tap was meant to open itself. */
  const hoverEnabled = () =>
    isRow && typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

  /** Escape, ArrowDown/Up to a panel, and Left/Right between top-level
   *  triggers — the only movement a trigger itself handles. */
  const onTriggerKeyDown = (event: React.KeyboardEvent, item: NavItem) => {
    if (event.key === "Escape") {
      if (openKey === item.key) {
        event.stopPropagation();
        onClosePanel();
        (event.currentTarget as HTMLElement).focus();
      }
      return;
    }
    if (event.key === "ArrowDown" && item.children) {
      event.preventDefault();
      if (openKey !== item.key) onOpenPanel(item.key);
      // The panel is rendered already; focus its first item once React has
      // made it visible.
      requestAnimationFrame(() => {
        const panel = document.getElementById(`${baseId}-${item.key}`);
        panel?.querySelector<HTMLElement>("[data-nav-focusable]")?.focus();
      });
      return;
    }
    if (event.key === "ArrowUp" && openKey === item.key) {
      event.preventDefault();
      onClosePanel();
      return;
    }
    // Left and right follow the reading direction: in RTL the visual "next"
    // trigger is the one ArrowLeft reaches, and a physical mapping would walk
    // backwards. Read from the DOM rather than the locale string, so it stays
    // correct even if a page is ever rendered with an overridden direction.
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const buttons = [...navRef.current!.querySelectorAll<HTMLElement>("[data-nav-trigger]")];
      const index = buttons.indexOf(event.currentTarget as HTMLElement);
      if (index === -1) return;
      event.preventDefault();
      const rtl = getComputedStyle(navRef.current!).direction === "rtl";
      const forward = rtl ? event.key === "ArrowLeft" : event.key === "ArrowRight";
      buttons[(index + (forward ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  };

  /** Roving movement inside an open panel, plus Escape back to its trigger. */
  const onPanelKeyDown = (event: React.KeyboardEvent, key: string) => {
    const panel = event.currentTarget as HTMLElement;
    const items = [...panel.querySelectorAll<HTMLElement>("[data-nav-focusable]")];
    const index = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClosePanel();
      document.getElementById(`${baseId}-trigger-${key}`)?.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (index === -1) return;
      event.preventDefault();
      const next =
        event.key === "ArrowDown"
          ? (index + 1) % items.length
          : (index - 1 + items.length) % items.length;
      items[next]?.focus();
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      if (index === -1) return;
      event.preventDefault();
      (event.key === "Home" ? items[0] : items[items.length - 1])?.focus();
    }
  };

  const renderLeaf = (item: NavItem) => {
    const active = item.href === current;
    return (
      <Link
        href={item.href!}
        prefetch={isBuilt(item.href!) ? undefined : false}
        aria-current={active ? "page" : undefined}
        data-nav-trigger=""
        data-nav-focusable=""
        onClick={onCloseDrawer}
        onKeyDown={(event) => onTriggerKeyDown(event, item)}
        className={`${topLevelClass(active)} ${TRANSITION} ${FOCUS}`}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap">{t(item.key)}</span>
        <TricolorIndicator active={active} />
      </Link>
    );
  };

  const renderGroup = (item: NavItem) => {
    const isOpen = openKey === item.key;
    const holdsCurrent = containsPath(item, current);
    const panelId = `${baseId}-${item.key}`;

    return (
      <>
        <button
          type="button"
          id={`${baseId}-trigger-${item.key}`}
          aria-expanded={isOpen}
          aria-controls={panelId}
          data-nav-trigger=""
          data-nav-focusable=""
          onClick={() => onTogglePanel(item.key)}
          onKeyDown={(event) => onTriggerKeyDown(event, item)}
          className={`${topLevelClass(holdsCurrent)} ${TRANSITION} ${FOCUS}`}
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            {t(item.key)}
            <Chevron />
          </span>
          <TricolorIndicator active={holdsCurrent} />
        </button>

        <MegaPanel
          id={panelId}
          item={item}
          open={isOpen}
          // See `MegaPanel`'s own `hidden` doc: NOT in the row layout, where
          // the panel floats and `nav-float` hides it with `visibility` so the
          // fade and the rise have something to play on. No stylesheet can
          // override the attribute there: preflight declares it `!important`
          // in the `base` layer, and for important declarations the cascade
          // reverses layer order, so `base` beats `utilities`. Driving the
          // attribute from the layout is the only thing that works — and it
          // is safe before hydration, because `isRow` is false on the server
          // and a closed panel is invisible either way.
          hidden={!isOpen && !isRow}
          columns={item.children!}
          feature={featureFor(item.key)}
          currentPath={current}
          onKeyDown={(event) => onPanelKeyDown(event, item.key)}
        />
      </>
    );
  };

  return (
    <nav
      id="primary-nav"
      ref={navRef}
      aria-label={tHeader("mainNav")}
      data-open={drawerOpen}
      onMouseLeave={() => {
        if (!hoverEnabled()) return;
        cancelClose();
        closeTimer.current = setTimeout(onClosePanel, hoverGraceMs());
      }}
      onMouseEnter={cancelClose}
      // The drawer's visibility stays a CLASS, not the `hidden` attribute: at
      // the row breakpoint this element is visible through CSS alone, and an
      // attribute would have to be driven by a layout query that is only
      // knowable on the client — which would leave every desktop visitor with
      // no navigation until hydration. The panels above can use the attribute
      // precisely because they have no such server/client disagreement.
      className={`${
        drawerOpen ? "block" : "hidden"
      } absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-6rem)] min-w-0 overflow-y-auto border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 py-2 shadow-dropdown xl:static xl:z-auto xl:block xl:max-h-none xl:overflow-visible xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none`}
    >
      <ul className="flex flex-col xl:flex-row xl:items-center xl:gap-[var(--space-6)] 2xl:gap-[var(--grid-gutter-xl)]">
        {PRIMARY_NAV.map((item, index) => (
          <li
            key={item.key}
            className="rise-in relative"
            style={{ "--rise-index": index } as React.CSSProperties}
            onMouseEnter={() => {
              if (!hoverEnabled()) return;
              cancelClose();
              if (item.children) onOpenPanel(item.key);
              else onClosePanel();
            }}
          >
            {item.children ? renderGroup(item) : renderLeaf(item)}
          </li>
        ))}
      </ul>
    </nav>
  );
};

/** Top-level row/stack item. Identical for a link and a disclosure button so
 *  the row's rhythm does not depend on which kind of item it is. */
// Structural and colour classes only — `TRANSITION`/`FOCUS` are appended at
// each call site instead of baked in here, so the interaction-state contract
// (`interaction-state-contract.spec.ts`) can see them where it looks: in the
// `className` attribute's own text, not inside an opaque helper call.
const topLevelClass = (active: boolean) =>
  `nav-item flex min-h-11 w-full flex-row items-center justify-start gap-2 rounded-xs px-2 text-body whitespace-nowrap xl:w-auto xl:flex-col xl:justify-center xl:gap-1.5 xl:px-1 xl:py-3 ${
    active
      ? "font-medium text-[color:var(--color-text-primary)]"
      : "font-normal text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-secondary)]"
  }`;

const Chevron = () => (
  <svg
    viewBox="0 0 10 10"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    data-chevron="true"
    className="nav-chevron size-2.5 shrink-0"
  >
    <path d="M2 4l3 3 3-3" />
  </svg>
);

/** Reads the grace period from the token rather than duplicating its value. */
const hoverGraceMs = () => {
  if (typeof window === "undefined") return 150;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(HOVER_CLOSE_DELAY.slice(4, -1))
    .trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 150;
};
