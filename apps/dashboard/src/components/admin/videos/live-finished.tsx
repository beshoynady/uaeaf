"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/ui/interactive";
import { StatusRow } from "./video-preview-card";
import { dubaiClock, formatShortDate } from "@/lib/admin/videos/dubai-time";
import type { AdminLiveStream } from "@/lib/admin/videos/types";

/**
 * A broadcast that is over, opened for editing.
 *
 * -- Why this is not "not found" --------------------------------------------
 *
 * The site stops showing a broadcast the moment its stated end time passes,
 * with nobody pressing anything — that is the whole mechanism, and it is what
 * removes the need for a scheduled job. So the moment arrives on its own,
 * often while the event is still being held: a championship runs long, the
 * banner goes dark, and the editor opens the record to fix it.
 *
 * Told "not found", that editor goes looking for something nothing deleted.
 * Told the truth — it ran past its time — the useful thing to offer is the one
 * action that actually helps: start another with these details. An id that
 * genuinely names nothing still reports as missing; the two are different
 * situations and this screen exists so they read differently.
 *
 * -- Two ways to be over, worded apart --------------------------------------
 *
 * The clock passed on its own, or somebody ended it. Both lead to the same
 * offer, and saying which one happened is the difference between a screen that
 * explains itself and a screen that states a conclusion.
 *
 * The second case deliberately does not say WHO. `end()` and the sweep a newly
 * started broadcast runs write the same two fields, so "an editor ended this"
 * would be a claim the record cannot support — and would be wrong every time a
 * newer broadcast was the cause.
 */
export const LiveFinished = ({
  record,
  canStart,
  locale,
}: {
  record: AdminLiveStream;
  /** Without `videos:Create` the offer to start another is not shown — it
   *  would be a button whose only outcome is a refusal. */
  canStart: boolean;
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Videos");

  // The API's verdict, not a guess from `endedAt`. Reading that field and
  // concluding "an editor ended this" was wrong every time a newer broadcast
  // had replaced it: ending one and being replaced write the same two fields,
  // so the record does not hold the difference and this screen must not claim
  // it does.
  const ended = record.state === "ended";
  const finishedAt = new Date(ended ? (record.endedAt ?? record.expectedEndAt) : record.expectedEndAt);
  const dateLabel = formatShortDate(finishedAt, locale) ?? "";

  return (
    <section
      aria-labelledby="live-finished-title"
      className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-6"
    >
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-label font-bold text-[color:var(--color-text-secondary)]">
          {/* A hollow dot, deliberately not the banner's filled red one: this
              broadcast is the opposite of live, and reusing the live mark here
              is the one thing that could make an editor think it still is. */}
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full border border-[color:var(--color-text-secondary)]"
          />
          {ended ? t("liveFinishedEndedLabel") : t("liveFinishedExpiredLabel")}
        </p>

        <h2 id="live-finished-title" className="text-h3 text-[color:var(--color-text-primary)]">
          {ended ? t("liveFinishedEndedTitle") : t("liveFinishedExpiredTitle")}
        </h2>

        <p className="text-body-sm text-[color:var(--color-text-secondary)]">
          {ended ? t("liveFinishedEndedBody") : t("liveFinishedExpiredBody")}
        </p>
      </div>

      <div className="flex flex-col divide-y divide-[color:var(--color-border-default)] rounded-[var(--radius-sm)] bg-[color:var(--color-surface-sunken)] px-4 py-1">
        <StatusRow label={t("titleArLabel")}>{record.title[locale] || record.title.ar}</StatusRow>
        {record.venue ? (
          <StatusRow label={t("liveVenueLabel")}>{record.venue[locale] || record.venue.ar}</StatusRow>
        ) : null}
        <StatusRow label={ended ? t("liveFinishedEndedAt") : t("liveFinishedExpiredAt")}>
          {/* Two facts in one row, each readable on its own: the day, and the
              clock the editor set it by. */}
          <span>{dateLabel}</span>
          <span aria-hidden="true">·</span>
          <span dir="ltr">{dubaiClock(finishedAt)}</span>
        </StatusRow>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canStart ? (
          // The details travel by id, not in the address: a bilingual title and
          // a venue in a query string is a URL nobody can read and a length
          // nobody has bounded. The new-broadcast screen reads the record.
          <Link href={{ pathname: "/videos/live/new", query: { from: record.id } }} className={BUTTON_PRIMARY}>
            {t("liveStartLikeThis")}
          </Link>
        ) : null}

        <Link href="/videos" className={BUTTON_SECONDARY}>
          {t("backToVideos")}
        </Link>
      </div>
    </section>
  );
};
