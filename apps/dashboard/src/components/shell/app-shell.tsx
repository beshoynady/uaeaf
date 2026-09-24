"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { NavItem } from "@/lib/navigation";
import { sidebarCookie } from "@/lib/shell/sidebar-preference";
import { UiIcon } from "@/lib/icons/ui-icons";
import { BUTTON_ICON } from "@/components/ui/interactive";
import { SidebarNav } from "./sidebar-nav";
import { CommandPalette } from "./command-palette";
import { BrandAccentBar } from "@uaeaf/brand-ui";

/**
 * The signed-in frame: header, sidebar and the page between them.
 *
 * ── Three widths, one list (Chapter 12 §12.4, Chapter 8 L3 §N.6) ──────────
 *
 * - lg+ : the sidebar, expanded or collapsed to icons by the administrator's
 *   choice, which a cookie carries to the next page (CMP-SIDEBAR-001, §N.9).
 * - md  : the Navigation Rail — icons only, always. It is its own state, not
 *   a collapsed sidebar (CMP-NAVRAIL-001), so the preference does not apply.
 * - <md : no sidebar; the menu button opens the Navigation Drawer.
 *
 * The rail and the drawer both hide the labels somewhere, so the menu button
 * is offered from lg down: at md it is how the full names are reached.
 *
 * ── Why two buttons in one place ───────────────────────────────────────────
 *
 * Collapsing a visible sidebar and opening a drawer are different controls
 * with different ARIA — one expands a region in place, one opens a dialog.
 * Each is drawn only at the widths where it means something, in CSS, so the
 * server renders the right one and no breakpoint is read in JavaScript.
 *
 * ── Why the header does not stick ──────────────────────────────────────────
 *
 * Several editors pin their own save bar to `top-0` of the page, and a sticky
 * header would sit on top of it. The sidebar sticks instead, full height, and
 * scrolls itself when the list is longer than the screen.
 */
export const AppShell = ({
  items,
  initialCollapsed,
  initialGroups,
  brand,
  identity,
  controls,
  children,
}: {
  items: readonly NavItem[];
  initialCollapsed: boolean;
  /** The navigation groups the administrator has folded or unfolded, read
   *  from the cookie on the server (ADR-0090 D4). */
  initialGroups: Record<string, boolean>;
  brand: ReactNode;
  identity: ReactNode;
  controls: ReactNode;
  children: ReactNode;
}) => {
  const t = useTranslations("Shell");
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const sidebarId = useId();
  const drawerId = useId();

  // The native modal gives the drawer its focus trap, its inert page behind
  // and Escape, which CMP-NAVDRAWER-001 requires and a positioned div would
  // have to rebuild.
  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    else if (!drawerOpen && dialog.open) dialog.close();
  }, [drawerOpen]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = sidebarCookie(next);
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    // The identity edge at the top of the screen, 3px rather than the public
    // site's 4px: an operator sees it on every screen all day, so the
    // Operational dose is the smaller one (Chapter 12 §12.15, ADR-0098 D6).
    <div className="flex min-h-screen flex-col bg-[color:var(--color-surface-sunken)]">
      <BrandAccentBar dose="operational" />
      <div className="flex min-h-0 flex-1">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-4 focus:rounded-[var(--radius-md)] focus:bg-[color:var(--color-surface-raised)] focus:px-4 focus:py-2"
      >
        {t("skipLink")}
      </a>

      {/*
        Width: 264px expanded, as before. Collapsed and at md it is `w-19`,
        76px: the 44px touch target every link keeps (Chapter 6 §6.7,
        ADR-0068 D2.2) plus the `p-4` padding on each side.
        The width moves over `--motion-duration-fast` (N.8), and not at all
        under reduced motion.
      */}
      <aside
        id={sidebarId}
        data-collapsed={collapsed}
        className="sticky top-0 hidden h-screen shrink-0 flex-col gap-6 overflow-y-auto overflow-x-hidden border-e border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4 transition-[width,padding] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] motion-reduce:transition-none md:flex md:w-19 lg:w-[264px] lg:p-6 lg:data-[collapsed=true]:w-19 lg:data-[collapsed=true]:p-4"
      >
        {/* The federation's mark where the shell used to say "Dashboard":
            nothing else on the signed-in screens said whose they were. */}
        <div className="flex justify-center lg:justify-start lg:px-4 lg:[aside[data-collapsed=true]_&]:justify-center lg:[aside[data-collapsed=true]_&]:px-0">
          {brand}
        </div>
        {/* Groups fold here, where their names are drawn; never in the
            drawer below (ADR-0090 D1). */}
        <SidebarNav items={items} foldGroups initialGroups={initialGroups} />
      </aside>

      <dialog
        ref={drawer}
        id={drawerId}
        data-drawer
        aria-label={t("mainNav")}
        // Escape fires `cancel`; routed through state so `drawerOpen` stays
        // the one source of whether it is open.
        onCancel={(event) => {
          event.preventDefault();
          closeDrawer();
        }}
        // The backdrop is the dialog's own box outside its content, so a click
        // on the element itself is a click outside (CMP-NAVDRAWER-001).
        onClick={(event) => {
          if (event.target === drawer.current) closeDrawer();
        }}
        // The browser may close a modal by itself, without `cancel`. Heard
        // here, `drawerOpen` follows, and the menu button can open it again.
        onClose={closeDrawer}
        className="my-0 ms-0 me-auto h-full max-h-full w-[264px] max-w-full border-e border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-0 text-[color:var(--color-text-primary)] opacity-100 transition-[opacity,display,overlay] transition-discrete duration-[var(--motion-duration-base)] ease-[var(--motion-easing-standard)] backdrop:bg-[color:var(--color-surface-overlay)]/50 starting:open:opacity-0 motion-reduce:transition-none"
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
          <div className="flex items-center justify-between gap-2 ps-4">
            {brand}
            <button type="button" onClick={closeDrawer} aria-label={t("closeNavigation")} className={BUTTON_ICON}>
              <UiIcon name="x" />
            </button>
          </div>
          <SidebarNav items={items} onNavigate={closeDrawer} />
        </div>
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-6 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* The width switch sits on a wrapper: `hidden` beside the
                button's own `inline-flex` would leave the winner to the
                order Tailwind happens to emit them in. */}
            <div className="hidden lg:block">
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-controls={sidebarId}
                aria-expanded={!collapsed}
                aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
                className={BUTTON_ICON}
              >
                {/* Drawn for a left-hand sidebar; mirrored in Arabic, where
                    the sidebar is on the right (CMP-ICON-001). */}
                <UiIcon
                  name={collapsed ? "panel-left-open" : "panel-left-close"}
                  className="size-[var(--icon-size-sm)] shrink-0 rtl:-scale-x-100"
                />
              </button>
            </div>
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-haspopup="dialog"
                aria-controls={drawerId}
                aria-expanded={drawerOpen}
                aria-label={t("openNavigation")}
                className={BUTTON_ICON}
              >
                <UiIcon name="menu" />
              </button>
            </div>
            <CommandPalette items={items} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {identity}
            {controls}
          </div>
        </header>

        <main id="main-content" className="flex-1 px-6 py-8">
          {/*
            Fluid, not capped. Chapter 5 §Maximum Container is explicit and
            applies to exactly this surface: "1440px for the Public
            Experience … Fluid (100%) for the Dashboard with a fixed Sidebar
            (Operational Experience) — uses the full available space for
            dense data presentation (PR-006).
          */}
          <div className="flex flex-col gap-8">{children}</div>
        </main>
      </div>
      </div>
    </div>
  );
};
