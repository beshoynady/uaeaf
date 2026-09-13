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
 */
export function EditorialTimeline({
  entries,
  locale,
}: {
  entries: readonly EditorialHistoryEntry[];
  locale: AppLocale;
}) {
  const t = useTranslations("Editorial");
  const format = useFormatter();

  const name = (actor: EditorialActor) =>
    actor.name ? localized(actor.name, locale) : t("unknownActor");

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-label font-bold text-[color:var(--color-text-primary)]">
        {t("historyTitle")}
      </h3>

      {entries.length === 0 ? (
        <p className="text-body-sm text-[color:var(--color-text-muted)]">{t("historyEmpty")}</p>
      ) : (
        <ol aria-label={t("historyTitle")} className="flex list-none flex-col gap-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              // The rule runs along the reading direction, so the timeline
              // reads as a spine in both languages rather than a stray
              // border on the wrong edge in one of them.
              className="flex flex-col gap-[2px] border-s-2 border-[color:var(--color-border-default)] ps-3"
            >
              <p className="text-body-sm text-[color:var(--color-text-primary)]">
                <strong className="font-bold">{name(entry.actor)}</strong>{" "}
                {t(ACTION_KEYS[entry.action])}
              </p>
              <p className="text-caption text-[color:var(--color-text-muted)]">
                {format.dateTime(new Date(entry.actionDate), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {/* Only when there is one. A bare "Reason:" with nothing after
                  it reads as a reason that failed to load. */}
              {entry.reason ? (
                <p className="text-body-sm text-[color:var(--color-text-secondary)]">
                  {t("historyReason", { reason: entry.reason })}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
