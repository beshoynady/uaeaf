"use client";

import { useTranslations } from "next-intl";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";

const SearchIcon = () => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className="size-[var(--icon-size-sm)]"
  >
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="M17 17l-4-4" />
  </svg>
);

/**
 * Opens the search dialog (built in a later task). Shape only here: icon,
 * shortcut announcement, tooltip and accessible name.
 */
export const SearchTrigger = ({ onOpen }: { onOpen: () => void }) => {
  const t = useTranslations("Header");
  return (
    <button
      type="button"
      data-tool="search"
      aria-keyshortcuts="Control+K Meta+K"
      title={t("searchShortcut")}
      aria-label={t("search")}
      onClick={onOpen}
      className={`flex size-11 items-center justify-center rounded-full ${TRANSITION} ${FOCUS}`}
    >
      <SearchIcon />
    </button>
  );
};
