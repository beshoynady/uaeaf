"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BUTTON_SECONDARY } from "@/components/ui/interactive";
import { StillBox, titleOf } from "./video-row-parts";
import { dubaiClock } from "@/lib/admin/videos/dubai-time";
import { useMinuteClock } from "@/lib/admin/videos/use-minute-clock";
import type { ActiveLiveStream } from "@/lib/admin/videos/types";

/**
 * The broadcast that is on the site right now.
 *
 * An interruption by design — red, above the list, impossible to scroll past —
 * because it is the one thing on this screen that is visible to every visitor
 * at this moment, and the editor may need to stop it.
 *
 * -- Why it can say a live stream is not showing -----------------------------
 *
 * A broadcast whose expected end time has passed is still `isActive` in the
 * database: nobody pressed anything, and no job runs to change that. The
 * public endpoint hides it by comparing the clock, so the site has already
 * stopped showing it. The banner says exactly that rather than claiming a
 * broadcast is live when a visitor would see none — an editor who trusted the
 * first version would end a stream that ended itself an hour ago and believe
 * they had fixed something.
 *
 * -- The countdown is re-read, not painted once ------------------------------
 *
 * "2h 14m left" computed at render is wrong one minute later and wrong by an
 * hour after an editor leaves the tab open through a session. It ticks, and it
 * ticks on the minute because that is the resolution it states.
 *
 * -- Nothing time-dependent is rendered on the server ------------------------
 *
 * The server's clock and the browser's are a request apart, which is enough to
 * make the two renders disagree on the minute and produce a hydration
 * mismatch. `useMinuteClock` answers `null` until the client has read a clock,
 * so the remaining time appears on the render after hydration; the end time
 * itself is an instant and renders in both places identically.
 */

export const LiveBanner = ({ stream, thumbnailUrl, locale = "ar", onEnd, busy }: {
  stream: ActiveLiveStream | null;
  locale?: "ar" | "en";
  /** The broadcast's stored still. Absent draws the placeholder, not a gap. */
  thumbnailUrl?: string | null;
  onEnd: () => void;
  busy?: boolean;
}) => {
  const t = useTranslations("Videos");
  const now = useMinuteClock();

  if (!stream) return null;

  const endsAt = new Date(stream.expectedEndAt);
  const remainingMs = now === null ? null : endsAt.getTime() - now;
  const expired = remainingMs !== null && remainingMs <= 0;

  const hours = remainingMs === null ? 0 : Math.floor(remainingMs / 3_600_000);
  const minutes = remainingMs === null ? 0 : Math.floor((remainingMs % 3_600_000) / 60_000);

  return (
    <section
      aria-label={t("liveBannerTitle")}
      className="flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-semantic-error)] bg-[color-mix(in_srgb,var(--color-semantic-error)_6%,var(--color-surface-raised))] p-4"
    >
      <StillBox url={thumbnailUrl} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex items-center gap-2 text-label font-bold text-[color:var(--color-semantic-error-text)]">
          {/* A dot, not a colour alone: the state is also in the words beside
              it, so a reader who sees neither red nor the pulse still learns
              the broadcast is live (WCAG 1.4.1). */}
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-[color:var(--color-semantic-error)] motion-safe:animate-pulse"
          />
          {expired ? t("liveBannerExpired") : t("liveBannerTitle")}
        </p>

        <p className="text-body-sm font-semibold text-[color:var(--color-text-primary)]">
          {titleOf(stream.title, locale)}
        </p>

        {/* Announced politely: the minute figure changes under a reader who is
            not looking at it, and a silent change is the one they act on
            wrongly. */}
        <p
          aria-live="polite"
          className="flex min-h-5 flex-wrap items-center gap-x-2 text-caption text-[color:var(--color-text-secondary)]"
        >
          {expired ? null : (
            <>
              <span dir="ltr">{t("liveBannerEnds", { time: dubaiClock(endsAt) })}</span>
              {remainingMs === null ? null : (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{t("liveBannerRemaining", { hours, minutes })}</span>
                </>
              )}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* A link, not a button that opens an overlay: correcting a broadcast
            is its own address now, and an editor can be sent to it. */}
        <Link href={`/videos/live/${stream.id}/edit`} className={BUTTON_SECONDARY}>
          {t("liveEdit")}
        </Link>

        <Button variant="destructive" loading={busy} onClick={onEnd}>
          {t("liveEndNow")}
        </Button>
      </div>
    </section>
  );
};
