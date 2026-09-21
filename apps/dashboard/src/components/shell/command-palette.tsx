"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { navScreens, type NavItem } from "@/lib/navigation";
import { UiIcon } from "@/lib/icons/ui-icons";
import { SearchField } from "@/components/ui/search-field";

/**
 * A reader's words and a label, reduced to the same spelling.
 *
 * Arabic is typed with and without hamza, with and without diacritics, and
 * with ى and ة where the label has ي and ه — none of which a reader thinks of
 * as a different word. Folded here so "الادوار" finds "الأدوار".
 */
export const normalizeForSearch = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();

const noSubscription = () => () => {};
const isApplePlatform = () => /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * CMP-COMMANDPALETTE-001: jump to a screen by typing its name, from anywhere,
 * with Ctrl+K or ⌘K.
 *
 * It searches the screens and nothing else, and says so ("Search for a
 * screen"): the reader's content lives behind the API and there is no search
 * over it yet. The screens are the ones the menu was given, already filtered
 * by the reader's permissions, so it never offers a destination the menu
 * hides.
 *
 * A dialog of links rather than a combobox: every result is a real link the
 * browser can open, and the arrow keys only move focus between them — the
 * part of the combobox pattern a reader actually uses here, without an active
 * descendant to keep in step.
 */
export const CommandPalette = ({ items }: { items: readonly NavItem[] }) => {
  const t = useTranslations("Shell");
  const nav = useTranslations("Nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const titleId = useId();

  // Server and first paint say "Ctrl K"; an Apple device then reads "⌘K".
  // A snapshot rather than an effect, so it is never a render behind.
  const apple = useSyncExternalStore(noSubscription, isApplePlatform, () => false);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        // The browser's own Ctrl+K focuses its address bar.
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    // The modal's own focusing step lands on its first control, the field.
    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  // Empty each time it opens: yesterday's search is not what anybody
  // pressing Ctrl+K today is looking for.
  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const needle = normalizeForSearch(query);
  const screens = navScreens(items)
    .map((screen) => ({
      ...screen,
      label: nav(screen.key),
      group: screen.groupKey ? nav(screen.groupKey) : null,
    }))
    .filter(
      (screen) =>
        needle === "" ||
        normalizeForSearch(screen.label).includes(needle) ||
        (screen.group !== null && normalizeForSearch(screen.group).includes(needle)),
    );

  const links = () => Array.from(list.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);

  const field = () => dialog.current?.querySelector<HTMLInputElement>("input[type=search]");

  // Read on the dialog, from the field's own key presses: the shared
  // `SearchField` is the one text entry this dashboard allows, and it takes
  // no key handler of its own.
  const onFieldKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    // Chrome spends the first Escape in a search field clearing its text and
    // never cancels the dialog, so the reader would press it twice.
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.target !== field()) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      links()[0]?.focus();
    } else if (event.key === "Enter" && screens.length > 0) {
      event.preventDefault();
      router.push(screens[0].href);
      close();
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const all = links();
    const index = all.indexOf(document.activeElement as HTMLAnchorElement);
    const next = index + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0) field()?.focus();
    else all[Math.min(next, all.length - 1)]?.focus();
  };

  return (
    <>
      {/* Icon-only below sm, where the header has no room for a field; the
          name stays the button's text either way. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        className="flex min-h-11 w-11 min-w-0 shrink items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] px-3 text-label text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-skeleton)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)] sm:w-full sm:max-w-sm sm:justify-start"
      >
        <UiIcon name="search" />
        <span className="sr-only truncate sm:not-sr-only">{t("searchScreens")}</span>
        <kbd
          aria-hidden="true"
          dir="ltr"
          className="ms-auto hidden rounded-[var(--radius-xs)] border border-[color:var(--color-border-default)] px-1.5 font-sans text-caption text-[color:var(--color-text-muted)] md:inline"
        >
          {apple ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
        // The browser may close a modal by itself, without `cancel`. Heard
        // here, the state follows, and the button can open it again.
        onClose={close}
        onKeyDown={onFieldKeyDown}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-0 text-[color:var(--color-text-primary)] backdrop:bg-[color:var(--color-surface-overlay)]/50"
      >
        <div className="flex flex-col gap-3 p-4">
          <h2 id={titleId} className="sr-only">
            {t("searchScreensTitle")}
          </h2>

          <SearchField label={t("searchScreens")} value={query} onValueChange={setQuery} />

          {screens.length > 0 ? (
            <ul
              ref={list}
              aria-label={t("searchResults")}
              onKeyDown={onListKeyDown}
              className="flex list-none flex-col gap-1 p-0"
            >
              {screens.map((screen) => (
                <li key={screen.key}>
                  <Link
                    href={screen.href}
                    onClick={close}
                    className="flex min-h-11 flex-col justify-center rounded-[var(--radius-md)] px-3 py-2 text-start transition-colors hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-skeleton)] focus-visible:bg-[color:var(--color-surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)]"
                  >
                    <span className="text-body-sm text-[color:var(--color-text-primary)]">{screen.label}</span>
                    {screen.group ? (
                      <span className="text-caption text-[color:var(--color-text-muted)]">{screen.group}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            // Announced, because the list it replaces vanished silently.
            <p role="status" className="px-3 py-2 text-body-sm text-[color:var(--color-text-secondary)]">
              {t("searchNoResults", { query })}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
};
