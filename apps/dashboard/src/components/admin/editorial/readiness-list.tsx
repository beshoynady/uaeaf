"use client";

import { useTranslations } from "next-intl";
import type { PublishBlocker } from "@/lib/admin/editorial-state";

/**
 * What stands between this draft and the public site, above the button it
 * disables.
 *
 * An indicator, not an error (owner decision 2026-09-12). The API refuses the
 * publish either way, but a refusal arrives after the press — so an editor
 * who has spent an hour on a page learns only then that the portrait was
 * never uploaded. This says it while there is still something to do about it.
 *
 * The list is rendered even when empty of blockers, as a sentence: silence
 * where a warning used to be reads as a warning that failed to load.
 *
 * The two kinds are worded apart because the reader's next move differs.
 * `pendingContent` is copy the client has not supplied and nobody on the
 * editorial side can invent; `missingRequired` is something the editor can
 * fix in the form below.
 */
export function ReadinessList({
  id,
  blockers,
  fieldLabels,
}: {
  /** The element the publish button's `aria-describedby` points at. */
  id: string;
  blockers: readonly PublishBlocker[];
  /**
   * Names a field in the reader's words, keyed by the first segment of its
   * path — `featuredImageId`, `pullQuote`, `messageBody`.
   *
   * A plain object rather than a function because the page that knows these
   * names is a server component, and a function cannot cross that boundary.
   * Keyed by segment rather than by whole path because the paths are
   * generated: `messageBody.en.content[4].content[0].text` is one blocker of
   * a shape nobody can enumerate in advance.
   *
   * A field with no entry keeps its path. For a generic panel that is the
   * honest answer — a wrong name would be worse than a technical one.
   */
  fieldLabels?: Readonly<Record<string, string>>;
}) {
  const t = useTranslations("Editorial");

  if (blockers.length === 0) {
    return (
      <div id={id} className="flex flex-col gap-1">
        <h3 className="text-label font-bold text-[color:var(--color-text-primary)]">
          {t("readinessTitle")}
        </h3>
        <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("readinessReady")}</p>
      </div>
    );
  }

  return (
    <div id={id} className="flex flex-col gap-2">
      <h3 className="text-label font-bold text-[color:var(--color-text-primary)]">
        {t("readinessTitle")}
      </h3>
      <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("readinessBlocked")}</p>

      {/* Labelled so it is reachable as a list by name, and so the button's
          description reads as one thing rather than a heading and some rows. */}
      <ul aria-label={t("readinessTitle")} className="flex list-none flex-col gap-2">
        {blockers.map((blocker) => {
          const named = fieldLabels?.[blocker.field.split(/[.[]/)[0]];
          return (
            <li
              key={`${blocker.kind}:${blocker.field}`}
              className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[color:var(--color-surface-sunken)] px-3 py-2"
            >
              <span
                aria-hidden="true"
                className="mt-[3px] size-2 shrink-0 rounded-full bg-[color:var(--color-semantic-warning)]"
              />
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span className="text-body-sm font-medium text-[color:var(--color-text-primary)]">
                  {blocker.kind === "pendingContent"
                    ? t("blockerPendingContent")
                    : t("blockerMissingRequired")}
                </span>
                {/* A named field reads in the page's own direction. A raw path
                    is forced `ltr`: it is an identifier, and bidi reordering
                    turns `messageBody.en.content[4]` into something that no
                    longer matches what the reader would search for. */}
                <span
                  dir={named ? undefined : "ltr"}
                  // The exact path stays reachable on hover even when a
                  // friendly name is shown: it is what an editor pastes to a
                  // developer when the name is not enough.
                  title={blocker.field}
                  className="truncate text-start text-caption text-[color:var(--color-text-muted)]"
                >
                  {named ?? blocker.field}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
