"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

/**
 * The only entry point any screen should use.
 *
 * TipTap and ProseMirror are the largest thing this dashboard loads, and
 * exactly one screen needs them. Imported normally they would join the shared
 * client bundle and be downloaded by everyone who opens the users list.
 *
 * So the import is deferred to the moment the editor is actually rendered.
 * Every other module in this folder is reachable only through this one, and a
 * screen that imports `bilingual-rich-text` directly would quietly undo that
 * — which is why this file exists rather than each caller writing its own
 * `dynamic()` call and one of them forgetting.
 *
 * `ssr: false` because ProseMirror needs a DOM to build its view, and a
 * server render would produce markup the client immediately discards.
 */
export const LazyBilingualRichText = dynamic(
  () => import("./bilingual-rich-text").then((module) => module.BilingualRichText),
  { ssr: false, loading: () => <Placeholder /> },
);

/**
 * Holds the editor's space while its chunk arrives.
 *
 * Two boxes at the editor's own minimum height, not a spinner: the field is
 * part of a long form, and a placeholder shorter than what replaces it moves
 * everything below it the moment the chunk lands.
 */
function Placeholder() {
  const t = useTranslations("RichText");

  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
      {[0, 1].map((half) => (
        <div
          key={half}
          className="flex min-h-56 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] text-body text-[color:var(--color-text-muted)]"
        >
          {t("loading")}
        </div>
      ))}
    </div>
  );
}
