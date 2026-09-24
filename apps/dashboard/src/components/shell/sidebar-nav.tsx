"use client";

import { useEffect, useId, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { currentScreenHref, isWithin, navScreens, type NavItem } from "@/lib/navigation";
import { NAV_ICON, UiIcon } from "@/lib/icons/ui-icons";
import { navGroupsCookie } from "@/lib/shell/sidebar-preference";

/*
 * Compact means icons only (CMP-SIDEBAR-001 `Collapsed`), and it is decided in
 * CSS rather than state, from where this list is drawn:
 *
 * - inside the `<aside>` between md and lg, always — that width is the
 *   Navigation Rail (Chapter 12 §12.4), not a preference;
 * - inside the `<aside>` at lg+, when the aside says `data-collapsed="true"`;
 * - never inside the drawer, which is a `<dialog>`, so the same list shows
 *   its full labels there at every width.
 *
 * Held in CSS so the server draws the right width on the first paint: a
 * breakpoint read in JavaScript only exists after hydration.
 *
 * Tailwind reads class names from source, so each variant is written out.
 */
const LABEL =
  "truncate md:max-lg:[aside_&]:sr-only lg:[aside[data-collapsed=true]_&]:sr-only";

const LINK_LAYOUT =
  "flex min-h-11 items-center gap-3 overflow-hidden rounded-[var(--radius-md)] px-4 py-2.5 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] md:max-lg:[aside_&]:justify-center md:max-lg:[aside_&]:px-0 lg:[aside[data-collapsed=true]_&]:justify-center lg:[aside[data-collapsed=true]_&]:px-0";

/**
 * The active screen.
 *
 * The solid-colour indicator becomes a tricolour edge on the inline start
 * (ADR-0098 D6, Chapter 12 §12.15.2). This changes the indicator's **paint
 * only**: `aria-current="page"` is still what carries the state to a screen
 * reader, so the state never depends on seeing the colour (WCAG 1.4.1), and
 * the collapsed, tablet and mobile behaviour of §12.4 is untouched — the edge
 * sits on the inline start in every one of them.
 *
 * `brand-active-edge` is a class rather than a Tailwind arbitrary value
 * because the edge is a gradient, and a gradient in a `border-inline-start`
 * is not something the utility layer can express.
 */
const LINK_ACTIVE =
  "brand-active-edge bg-[color:var(--color-surface-sunken)] font-medium text-[color:var(--color-text-primary)]";
const LINK_IDLE =
  "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-sunken)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-skeleton)]";

/** Collapsed, a group's name gives way to a rule above its screens. */
const GROUP =
  "flex flex-col gap-1 md:max-lg:[aside_&]:border-t md:max-lg:[aside_&]:border-[color:var(--color-border-default)] md:max-lg:[aside_&]:pt-2 lg:[aside[data-collapsed=true]_&]:border-t lg:[aside[data-collapsed=true]_&]:border-[color:var(--color-border-default)] lg:[aside[data-collapsed=true]_&]:pt-2";
const GROUP_NAME =
  "px-4 pt-2 text-caption font-medium text-[color:var(--color-text-muted)] md:max-lg:[aside_&]:sr-only lg:[aside[data-collapsed=true]_&]:sr-only";
const GROUP_LIST = "flex flex-col gap-1 ps-3 md:max-lg:[aside_&]:ps-0 lg:[aside[data-collapsed=true]_&]:ps-0";

/*
 * Folding groups (ADR-0090). Only where group names are drawn: the aside at
 * lg+ while it is expanded. There the name is a disclosure button and a
 * closed list is hidden; in the rail, the collapsed sidebar and the drawer
 * the button is not drawn and every list stays open, as before.
 */
/** The plain name, kept for every place the button is not drawn. */
const GROUP_NAME_BESIDE_BUTTON = "lg:[aside[data-collapsed=false]_&]:hidden";
const GROUP_LIST_FOLDS = "lg:[aside[data-collapsed=false]_&]:data-[open=false]:hidden";

/** CMP-TOOLTIP-001's delay contract: a pointer passing over waits, focus does not. */
const HOVER_DELAY_MS = 500;

interface Tip {
  label: string;
  top: number;
  inlineStart: number;
}

export const SidebarNav = ({
  items,
  onNavigate,
  foldGroups = false,
  initialGroups = {},
}: {
  items: readonly NavItem[];
  onNavigate?: () => void;
  /** Groups fold where their names are drawn (ADR-0090 D1). The sidebar
   *  passes it; the drawer does not. */
  foldGroups?: boolean;
  /** The groups the administrator has opened or closed, from the cookie. */
  initialGroups?: Record<string, boolean>;
}) => {
  const t = useTranslations("Nav");
  const shell = useTranslations("Shell");
  const pathname = usePathname();
  const listIdPrefix = useId();
  const [chosenGroups, setChosenGroups] = useState<Record<string, boolean>>(initialGroups);
  const [tip, setTip] = useState<Tip | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  // usePathname() from next-intl has the locale prefix already stripped, so
  // this compares against plain "/users"-style hrefs. One screen is current,
  // never two (§N.3).
  const current = currentScreenHref(
    pathname,
    navScreens(items).map((screen) => screen.href),
  );

  /**
   * The name beside an icon, only when the icon is all that is drawn.
   *
   * Asked of the page rather than of a prop: whether the label is hidden
   * depends on the width and on the preference together, and the label's own
   * box is the one place both have already been applied. Positioned `fixed`
   * from the link's box because the sidebar scrolls, and a tooltip inside a
   * scrolling box is clipped by it.
   */
  const place = (link: HTMLAnchorElement, label: string) => {
    const text = link.querySelector("[data-nav-label]");
    if (!text || text.getBoundingClientRect().width > 1) {
      setTip(null);
      return;
    }
    const box = link.getBoundingClientRect();
    const rtl = getComputedStyle(link).direction === "rtl";
    setTip({
      label,
      top: box.top + box.height / 2,
      inlineStart: rtl ? window.innerWidth - box.left : box.right,
    });
  };

  const onPointerEnter = (event: MouseEvent<HTMLAnchorElement>, label: string) => {
    const link = event.currentTarget;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => place(link, label), HOVER_DELAY_MS);
  };

  const onFocus = (event: FocusEvent<HTMLAnchorElement>, label: string) => place(event.currentTarget, label);

  const hide = () => {
    window.clearTimeout(hoverTimer.current);
    setTip(null);
  };

  const renderLink = (item: NavItem, active: boolean) => {
    const label = t(item.key);
    const icon = NAV_ICON[item.key];
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`${LINK_LAYOUT} ${active ? LINK_ACTIVE : LINK_IDLE}`}
        onClick={() => {
          hide();
          onNavigate?.();
        }}
        onMouseEnter={(event) => onPointerEnter(event, label)}
        onMouseLeave={hide}
        onFocus={(event) => onFocus(event, label)}
        onBlur={hide}
      >
        {icon ? <UiIcon name={icon} /> : null}
        <span data-nav-label className={LABEL}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      aria-label={shell("mainNav")}
      className="flex flex-col gap-1"
      // WCAG 1.4.13: content that appears on hover or focus can be dismissed
      // without moving either, and Escape is how.
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      {items.map((item) => {
        // A flat entry is drawn as one link even though it carries children:
        // the children decide whether it is shown and where it points, and the
        // rail inside its screens is the navigation between them.
        if (!item.flat && item.children && item.children.length > 0) {
          // A group: its name, then its screens indented beneath it. The name is
          // not a link of its own, so the page the reader is on is marked once,
          // on the screen itself.
          const holdsCurrent = item.children.some((child) => child.href === current);
          // A stored choice wins; with none, the group holding the current
          // screen is the one open (ADR-0090 D3).
          const open = !foldGroups || (chosenGroups[item.key] ?? holdsCurrent);
          const listId = `${listIdPrefix}-${item.key}`;
          const toggle = () => {
            const next = { ...chosenGroups, [item.key]: !open };
            setChosenGroups(next);
            document.cookie = navGroupsCookie(next);
          };

          return (
            <div key={item.key} className={GROUP}>
              {foldGroups ? (
                // Disclosure, not a menu (ADR-0062 D3): a button that shows or
                // hides a plain list of links, and never a link itself.
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={listId}
                  onClick={toggle}
                  // Written out rather than held in a constant, so the focus ring is
                  // on the element where the design-system guard can read it.
                  className="hidden min-h-11 w-full items-center gap-2 rounded-[var(--radius-md)] px-4 text-start text-caption font-medium text-[color:var(--color-text-muted)] transition-colors hover:bg-[color:var(--color-surface-sunken)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-skeleton)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] lg:[aside[data-collapsed=false]_&]:flex"
                >
                  <span>{t(item.key)}</span>
                  {!open && holdsCurrent ? (
                    // Said in words too, so the mark is never the only signal.
                    <>
                      <span
                        aria-hidden="true"
                        className="size-1.5 shrink-0 rounded-[var(--radius-full)] bg-[color:var(--color-brand-primary)]"
                      />
                      {/* A separate space: one inside the hidden span is trimmed
                          when the name is computed, and the two words run
                          together when read aloud. */}
                      {" "}
                      <span className="sr-only">{shell("groupHasCurrent")}</span>
                    </>
                  ) : null}
                  <UiIcon
                    name="chevron-down"
                    className={`ms-auto size-[var(--icon-size-xs)] shrink-0 transition-transform duration-[var(--motion-duration-fast)] motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                  />
                </button>
              ) : null}
              <p className={foldGroups ? `${GROUP_NAME} ${GROUP_NAME_BESIDE_BUTTON}` : GROUP_NAME}>{t(item.key)}</p>
              <ul id={listId} data-open={open} className={foldGroups ? `${GROUP_LIST} ${GROUP_LIST_FOLDS}` : GROUP_LIST}>
                {item.children.map((child) => (
                  <li key={child.key} className="flex flex-col">
                    {renderLink(child, child.href === current)}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <div key={item.key} className="flex flex-col">
            {/* A flat entry owning a family of addresses stays current across
                all of them: the homepage entry must not stop looking current
                when the rail moves the reader to another section. */}
            {renderLink(item, item.href === current || (item.activePrefix !== undefined && isWithin(item.activePrefix, pathname)))}
          </div>
        );
      })}

      {tip ? (
        // Hidden from assistive technology: the link already carries this
        // name as its text, and saying it twice reads as two things.
        <span
          aria-hidden="true"
          style={{ top: tip.top, insetInlineStart: tip.inlineStart }}
          className="pointer-events-none fixed z-50 ms-2 -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-2 py-1 text-caption text-[color:var(--color-text-primary)] shadow-dropdown"
        >
          {tip.label}
        </span>
      ) : null}
    </nav>
  );
};
