"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { PRIMARY_NAV, containsPath, type NavItem } from "@/lib/navigation";
import { isBuilt } from "@/lib/pages/built-routes";

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
 * ── Why the drawer nests inline ────────────────────────────────────────────
 *
 * On the row, a nested group opens as a floating panel beside its parent. In
 * the drawer it opens **in flow**, as an accordion. The hierarchy is identical
 * — the owner's requirement — but a second floating layer on a touch screen
 * has no hover to open it, covers the list it came from, and leaves no visible
 * way back. Same tree, the presentation each input method can actually drive.
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

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MEDIA_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * True once the row layout is active.
 *
 * `useSyncExternalStore` rather than an effect: the server snapshot is `false`
 * (stack), which is also the correct first-paint answer for every viewport
 * that has no row, and React reconciles the rest without a state write during
 * render. Only *behaviour* keys off this — hover opening — never markup, so a
 * wrong first answer can never produce a hydration mismatch.
 */
function useRowLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MEDIA_QUERY).matches,
    () => false,
  );
}

type Props = {
  /** Drawer state, owned by the header so the trigger button can live in the
   *  utility cluster where the design puts it. */
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  /** Pinned by tests; the live value comes from `usePathname`. */
  activePath?: string;
};

export function PrimaryNav({ drawerOpen, onCloseDrawer, activePath }: Props) {
  const t = useTranslations("Nav");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const isRow = useRowLayout();
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseId = useId();

  const current = activePath ?? pathname ?? "/";

  /** The chain of open disclosure keys, outermost first. At most one panel is
   *  open per level, which is what keeps Escape and focus return unambiguous. */
  const [openChain, setOpenChain] = useState<readonly string[]>([]);

  const closeAll = useCallback(() => setOpenChain([]), []);

  const toggle = useCallback((key: string, level: number) => {
    setOpenChain((chain) =>
      chain[level] === key ? chain.slice(0, level) : [...chain.slice(0, level), key],
    );
  }, []);

  const open = useCallback((key: string, level: number) => {
    setOpenChain((chain) => (chain[level] === key ? chain : [...chain.slice(0, level), key]));
  }, []);

  // A route change closes every open panel. Adjusted during render rather than
  // in an effect: an effect would paint the new page once with the old panel
  // still open, and `react-hooks/set-state-in-effect` rejects it for exactly
  // that reason. This is React's documented "adjust state when a prop changes"
  // pattern — the extra render happens before the browser sees anything.
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (pathname !== renderedPath) {
    setRenderedPath(pathname);
    setOpenChain([]);
  }

  // Pointer or focus leaving the navigation closes it. `focusout` covers the
  // keyboard: tabbing past the last item in a panel dismisses it rather than
  // leaving an open panel behind the user.
  useEffect(() => {
    if (openChain.length === 0) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) closeAll();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openChain.length, closeAll]);

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

  const onKeyDown = (event: React.KeyboardEvent, key: string, level: number) => {
    const panelOpen = openChain[level] === key;
    if (event.key === "Escape") {
      if (openChain.length === 0 && drawerOpen) {
        onCloseDrawer();
        return;
      }
      event.stopPropagation();
      setOpenChain((chain) => chain.slice(0, level));
      (event.currentTarget as HTMLElement).focus();
      return;
    }
    if (event.key === "ArrowDown" || (event.key === "ArrowRight" && level > 0)) {
      event.preventDefault();
      open(key, level);
      // The panel is rendered already; focus its first item once React has
      // made it visible.
      requestAnimationFrame(() => {
        const panel = document.getElementById(`${baseId}-${key}`);
        panel?.querySelector<HTMLElement>("[data-nav-focusable]")?.focus();
      });
      return;
    }
    if (event.key === "ArrowUp" && panelOpen) {
      event.preventDefault();
      setOpenChain((chain) => chain.slice(0, level));
    }
  };

  /** Roving movement inside an open panel, plus Escape back to its trigger. */
  const onPanelKeyDown = (event: React.KeyboardEvent, key: string, level: number) => {
    const panel = event.currentTarget as HTMLElement;
    const items = [...panel.querySelectorAll<HTMLElement>(":scope > ul > li > [data-nav-focusable]")];
    const index = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpenChain((chain) => chain.slice(0, level));
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

  const renderLeaf = (item: NavItem, level: number) => {
    const active = item.href === current;
    return (
      <Link
        href={item.href!}
        prefetch={isBuilt(item.href!) ? undefined : false}
        aria-current={active ? "page" : undefined}
        data-nav-focusable=""
        onClick={onCloseDrawer}
        className={
          level === 0
            ? topLevelClass(active)
            : `flex min-h-11 flex-col justify-center rounded-xs px-3 py-2 ${TRANSITION} ${FOCUS} hover:bg-[color:var(--color-surface-sunken)] active:text-[color:var(--color-text-secondary)] ${
                active
                  ? "font-medium text-[color:var(--color-text-primary)]"
                  : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
              }`
        }
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap">{t(item.key)}</span>
        {level === 0 ? <Indicator active={active} /> : null}
        {item.descriptionKey ? (
          <span className="text-caption text-[color:var(--color-text-muted)]">
            {t(item.descriptionKey)}
          </span>
        ) : null}
      </Link>
    );
  };

  const renderGroup = (item: NavItem, level: number) => {
    const isOpen = openChain[level] === item.key;
    const holdsCurrent = containsPath(item, current);
    const panelId = `${baseId}-${item.key}`;

    return (
      <>
        <button
          type="button"
          id={`${baseId}-trigger-${item.key}`}
          aria-expanded={isOpen}
          aria-controls={panelId}
          data-nav-focusable=""
          onClick={() => toggle(item.key, level)}
          onKeyDown={(event) => onKeyDown(event, item.key, level)}
          className={
            level === 0
              ? topLevelClass(holdsCurrent)
              : `flex min-h-11 w-full items-center justify-between gap-2 rounded-xs px-3 py-2 text-start ${TRANSITION} ${FOCUS} hover:bg-[color:var(--color-surface-sunken)] active:text-[color:var(--color-text-secondary)] ${
                  holdsCurrent
                    ? "font-medium text-[color:var(--color-text-primary)]"
                    : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
                }`
          }
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            {t(item.key)}
            <Chevron />
          </span>
          {level === 0 ? <Indicator active={holdsCurrent} /> : null}
        </button>

        <div
          id={panelId}
          data-open={isOpen}
          onKeyDown={(event) => onPanelKeyDown(event, item.key, level)}
          // The `hidden` ATTRIBUTE in the stacked layout: there the panel is
          // in flow, so it must take no space, and the attribute removes it
          // from the accessibility tree and the tab order without depending on
          // any stylesheet.
          //
          // NOT in the row layout, where the panel floats and `nav-float`
          // hides it with `visibility` so the fade and the rise have something
          // to play on. No stylesheet can override the attribute there:
          // preflight declares it `!important` in the `base` layer, and for
          // important declarations the cascade reverses layer order, so `base`
          // beats `utilities`. Driving the attribute from the layout is the
          // only thing that works — and it is safe before hydration, because
          // `isRow` is false on the server and a closed panel is invisible
          // either way.
          hidden={!isOpen && !isRow}
          className={`${
            level === 0
              ? "xl:nav-float xl:absolute xl:top-full xl:start-0 xl:z-40 xl:mt-1 xl:min-w-[16rem] xl:rounded-lg xl:border xl:border-[color:var(--color-border-default)] xl:bg-[color:var(--color-surface-raised)] xl:p-2 xl:shadow-dropdown"
              : "xl:nav-float xl:absolute xl:top-0 xl:start-full xl:z-40 xl:ms-1 xl:min-w-[15rem] xl:rounded-lg xl:border xl:border-[color:var(--color-border-default)] xl:bg-[color:var(--color-surface-raised)] xl:p-2 xl:shadow-dropdown"
          } ps-4 xl:ps-2`}
        >
          <ul className="flex flex-col">
            {item.children!.map((child, index) => (
              <li
                key={child.key}
                className="relative"
                style={{ "--rise-index": index } as React.CSSProperties}
              >
                {child.children ? renderGroup(child, level + 1) : renderLeaf(child, level + 1)}
              </li>
            ))}
          </ul>
        </div>
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
        closeTimer.current = setTimeout(closeAll, hoverGraceMs());
      }}
      onMouseEnter={cancelClose}
      // The drawer's visibility stays a CLASS, not the `hidden` attribute: at
      // the row breakpoint this element is visible through CSS alone, and an
      // attribute would have to be driven by a layout query that is only
      // knowable on the client — which would leave every desktop visitor with
      // no navigation until hydration. The panels below can use the attribute
      // precisely because they have no such server/client disagreement.
      className={`${
        drawerOpen ? "block" : "hidden"
      } absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-6rem)] min-w-0 overflow-y-auto border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 py-2 shadow-dropdown xl:static xl:z-auto xl:block xl:max-h-none xl:overflow-visible xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none`}
    >
      <ul className="flex flex-col xl:flex-row xl:items-center xl:gap-2">
        {PRIMARY_NAV.map((item, index) => (
          <li
            key={item.key}
            className="rise-in relative"
            style={{ "--rise-index": index } as React.CSSProperties}
            onMouseEnter={() => {
              if (!hoverEnabled()) return;
              cancelClose();
              if (item.children) open(item.key, 0);
              else closeAll();
            }}
          >
            {item.children ? renderGroup(item, 0) : renderLeaf(item, 0)}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Top-level row/stack item. Identical for a link and a disclosure button so
 *  the row's rhythm does not depend on which kind of item it is. */
function topLevelClass(active: boolean) {
  return `nav-item flex min-h-11 w-full flex-row items-center justify-start gap-2 rounded-xs px-2 text-body whitespace-nowrap xl:w-auto xl:flex-col xl:justify-center xl:gap-1.5 xl:px-1 xl:py-3 ${TRANSITION} ${FOCUS} ${
    active
      ? "font-medium text-[color:var(--color-text-primary)]"
      : "font-normal text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-secondary)]"
  }`;
}

/**
 * The 2px indicator, Figma node 2544:2595.
 *
 * Always rendered so the row height cannot shift between states. Green and
 * permanent on the current page; on an ancestor of the current page it is the
 * secondary text colour instead — the reader is *under* that group, not on it,
 * and using the same green for both would make two different facts look alike.
 * Otherwise it rises in on hover and on `:focus-visible`, so a keyboard reaches
 * the same affordance a pointer does.
 */
function Indicator({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-state={active ? "on" : "rest"}
      className={`nav-indicator h-0.5 w-6 shrink-0 xl:w-full ${
        active
          ? "bg-[color:var(--color-brand-primary)]"
          : "bg-[color:var(--color-text-secondary)]"
      }`}
    />
  );
}

function Chevron() {
  return (
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
}

/** Reads the grace period from the token rather than duplicating its value. */
function hoverGraceMs() {
  if (typeof window === "undefined") return 150;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(HOVER_CLOSE_DELAY.slice(4, -1))
    .trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 150;
}
