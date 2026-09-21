"use client";

import { useFormatter, useTranslations } from "next-intl";
import { localized } from "@/lib/api/types";
import type { EditorialActor, EditorialHistoryEntry } from "@/lib/admin/editorial-state";
import type { AppLocale } from "@/i18n/routing";

const ACTION_KEYS = {
  Submitted: "actionSubmitted",
  Resubmitted: "actionResubmitted",
  Approved: "actionApproved",
  Rejected: "actionRejected",
  Returned: "actionReturned",
  Delegated: "actionDelegated",
} as const;

/**
 * What has been decided on this record, newest first.
 *
 * An ordered list rather than a stack of divs: the order carries the meaning,
 * and a screen reader announcing "list, 4 items" before the first entry is
 * the difference between skimming the history and reading all of it to find
 * out how long it is.
 *
 * Whoever acted is named, never the account behind them — the state carries
 * a display name and no email for exactly that reason. An entry whose actor
 * has since been deleted still appears, labelled unknown: dropping it would
 * quietly rewrite the record's history.
 *
 * ── The two things this did not say, and now does ──────────────────────────
 *
 * A refusal and a request for changes were both drawn as "rejected". The
 * engine records them as one action and tells them apart by a flag on the
 * entry — the same flag the newsroom list already reads — so an author was
 * shown "your article was rejected" for a reviewer asking for one correction.
 *
 * And the publication was absent entirely. It is recorded in `publications`
 * rather than in the review's own history, so a record that went live showed a
 * timeline ending at the approval — with the one event an editor most wants
 * dated missing from it. It is folded in here from the state the panel already
 * reads, so there is one list and not a history beside a separate fact.
 */
export function EditorialTimeline({
  entries,
  locale,
  published,
  publishedBy,
}: {
  entries: readonly EditorialHistoryEntry[];
  locale: AppLocale;
  /** When this record went live, if it has. Recorded in `publications` rather
   *  than in the review's history, so it arrives separately and is folded in. */
  published?: string | null;
  publishedBy?: EditorialActor | null;
}) {
  const t = useTranslations("Editorial");
  const format = useFormatter();

  const name = (actor: EditorialActor | null | undefined) =>
    actor?.name ? localized(actor.name, locale) : t("unknownActor");

  /**
   * What an entry says happened.
   *
   * `Rejected` is two different decisions in the engine, separated only by the
   * flag: sent back for a correction, or refused. The words for those are not
   * interchangeable to the person who wrote the article.
   */
  const said = (entry: EditorialHistoryEntry) =>
    entry.action === "Rejected" && entry.revisionRequested
      ? t("actionChangesRequested")
      : t(ACTION_KEYS[entry.action]);

  // Newest first, like the review's own entries, so the publication sits at
  // the top where it belongs rather than under the approval that preceded it.
  const rows: { key: string; who: string; what: string; when: string; reason?: string }[] = [
    ...(published
      ? [{ key: "published", who: name(publishedBy), what: t("actionPublished"), when: published }]
      : []),
    ...entries.map((entry) => ({
      key: entry.id,
      who: name(entry.actor),
      what: said(entry),
      when: entry.actionDate,
      reason: entry.reason ?? undefined,
    })),
  ];

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-label font-bold text-[color:var(--color-text-primary)]">
        {t("historyTitle")}
      </h3>

      {rows.length === 0 ? (
        <p className="text-body-sm text-[color:var(--color-text-muted)]">{t("historyEmpty")}</p>
      ) : (
        <ol aria-label={t("historyTitle")} className="flex list-none flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.key}
              // The rule runs along the reading direction, so the timeline
              // reads as a spine in both languages rather than a stray
              // border on the wrong edge in one of them.
              className="flex flex-col gap-[2px] border-s-2 border-[color:var(--color-border-default)] ps-3"
            >
              <p className="text-body-sm text-[color:var(--color-text-primary)]">
                <strong className="font-bold">{row.who}</strong> {row.what}
              </p>
              <p className="text-caption text-[color:var(--color-text-muted)]">
                {format.dateTime(new Date(row.when), { dateStyle: "medium", timeStyle: "short" })}
              </p>
              {/* Only when there is one. A bare "Reason:" with nothing after
                  it reads as a reason that failed to load. */}
              {row.reason ? (
                <p className="text-body-sm text-[color:var(--color-text-secondary)]">
                  {t("historyReason", { reason: row.reason })}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
