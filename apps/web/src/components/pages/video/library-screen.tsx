"use client";

import { useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FollowStrip } from "./follow-strip";
import { LibraryFilters } from "./library-filters";
import { ReelCard } from "./reel-card";
import { ShareButton } from "./share-button";
import { VideoCard } from "./video-card";
import { VideoGridSkeleton, VideoEmptyState } from "./video-states";
import { VideoPlayerModal } from "./video-player-modal";
import { VideoReveal } from "./video-reveal";
import { VideoStage } from "./video-stage";
import { useVideoGallery } from "./use-video-gallery";
import { activeFilterCount, libraryHref, videoHref } from "@/lib/video/library-query";
import { titleOf } from "@/lib/video/types";
import type { LibraryQuery } from "@/lib/video/library-query";
import type { AssociationOption } from "@/lib/video/association-options";
import type { LiveStreamPublic, VideoPublic } from "@/lib/video/types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { FOCUS } from "@/components/ui/interactive";
import { GHOST_PILL } from "./chrome";

/**
 * The video library.
 *
 * -- Where the state lives -------------------------------------------------
 *
 * In the URL, entirely. The server reads the address, fetches the page and
 * hands it down; every control here navigates rather than setting state. So
 * the back button undoes a filter, a link carries a filtered view to someone
 * else, and there is no second copy of "what is being shown" that could
 * disagree with the address bar.
 *
 * `useTransition` is what keeps that from feeling like a page load: the
 * current list stays on screen, dimmed and `aria-busy`, while the next one is
 * fetched. Without it every filter change would blank the page.
 *
 * -- Show more, not pagination --------------------------------------------
 *
 * The approved design draws one button, not a pager. It raises `page`, and the
 * server returns everything up to and including it -- so the address still
 * describes the whole view and a reader who shares it after pressing twice
 * sends the same three pages they are looking at.
 *
 * -- Reels ------------------------------------------------------------------
 *
 * A shelf of their own, above the grid, 9:16 and never cropped into a
 * landscape card. On the `reels` tab the shelf IS the page and the grid is
 * empty; on `videos` there is no shelf. The server decides which rows are
 * which, so this does not filter twice.
 */

/** Everything `activeFilterCount` counts, undone in one move. The panel's
 *  "clear all" and the empty state's "clear filters" are the same act, so they
 *  are the same object: two lists that drift leave one control clearing less
 *  than the badge beside it claims. The tab and the page are deliberately not
 *  here -- neither is a filter. */
const CLEARED_FILTERS: Partial<LibraryQuery> = {
  platform: undefined,
  category: undefined,
  season: undefined,
  association: undefined,
  search: undefined,
  period: "any",
  range: {},
};

export const LibraryScreen = ({
  query,
  videos,
  reels,
  total,
  live,
  thumbnails,
  seasons,
  associations,
  locale,
  pageSize,
  openVideoId,
}: {
  query: LibraryQuery;
  videos: readonly VideoPublic[];
  reels: readonly VideoPublic[];
  total: number;
  live: LiveStreamPublic | null;
  thumbnails: Map<string, MediaAssetPublic>;
  seasons: readonly string[];
  associations: readonly AssociationOption[];
  locale: AppLocale;
  pageSize: number;
  /** From `?video=` — the one this page was linked to, if any. Already
   *  shape-checked; whether it is IN the list is decided below. */
  openVideoId?: string;
}) => {
  const t = useTranslations("VideoSystem");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // One gallery over everything on the page, in the order it is drawn, so the
  // modal's arrows walk the reels and then the grid exactly as the eye does.
  const playable = [...reels, ...videos];
  const gallery = useVideoGallery(playable);

  /**
   * The player and the address, kept in step.
   *
   * ── Opened from a link ───────────────────────────────────────────────────
   *
   * Once, on arrival, and only for an id that is actually in the list this
   * page rendered. A deleted video, a draft, or an id from a filtered link
   * whose filters have since changed simply does not open the player — the
   * library is there, which is the useful outcome, and nothing errors.
   * `openedFromLink` makes it once: without it, closing the player would
   * immediately reopen it.
   */
  const openedFromLink = useRef(false);
  useEffect(() => {
    if (openedFromLink.current || !openVideoId) return;
    openedFromLink.current = true;
    const index = playable.findIndex((video) => video.id === openVideoId);
    if (index >= 0) gallery.open(index);
  }, [openVideoId, playable, gallery]);

  /**
   * ── Writing it back ──────────────────────────────────────────────────────
   *
   * `replaceState`, not `push` and not the router. The player is a state of
   * this page, not a page of its own: pushing would make the back button walk
   * out of the player one video at a time instead of leaving the library, and
   * routing would refetch the whole list to show a dialog that is already on
   * screen. `videoHref` rebuilds the address from the same query the filters
   * write, so the filters survive being linked to.
   */
  useEffect(() => {
    const open = gallery.index === null ? null : (gallery.video?.id ?? null);
    const next = videoHref(query, open);
    if (`${window.location.pathname}${window.location.search}`.endsWith(next)) return;
    window.history.replaceState(window.history.state, "", `/${locale}${next}`);
  }, [gallery.index, gallery.video, query, locale]);

  const go = (change: Partial<LibraryQuery>) => {
    startTransition(() => router.push(libraryHref(query, change)));
  };

  // One definition, shared with the filter panel's badge: two counts that
  // disagree put a "0" beside a "clear filters" button.
  const filters = activeFilterCount(query);
  const hasMore = playable.length < total;

  const embedLabels = {
    play: t("play"),
    failedTitle: t("failedTitle"),
    failedBody: t("failedBody"),
    retry: t("retry"),
  };

  const tabs = [
    { value: "all", label: t("tabAll") },
    { value: "video", label: t("tabVideos") },
    { value: "reel", label: t("tabReels") },
  ] as const;

  const liveTitle = live ? titleOf(live, locale) : "";
  // Falls back to Arabic rather than to nothing, on the same terms as
  // `titleOf`: a venue named only in Arabic is still where the broadcast is.
  const liveVenue = live?.venue ? live.venue[locale] || live.venue.ar : "";

  return (
    <div data-surface="ink" className="video-system">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-4 py-10 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="text-h1 font-extrabold leading-[1.1]" style={{ color: "var(--surface-text)" }}>
            {t("libraryTitle")}
          </h1>
          <p className="mx-auto max-w-2xl text-body leading-relaxed" style={{ color: "var(--surface-text-muted)" }}>
            {t("libraryIntro")}
          </p>
        </header>

        {/* The broadcast takes the top of the library too, on the same terms as
            the homepage: while one is running it IS the lead. */}
        {live ? (
          <section className="flex flex-col gap-4">
            <VideoStage
              platform="youtube"
              externalId={live.videoId}
              url={live.url}
              title={liveTitle}
              locale={locale}
              thumbnail={live.thumbnailId ? thumbnails.get(live.thumbnailId) : undefined}
              labels={{ ...embedLabels, platform: t("platform_youtube"), openOn: t("openOn", { platform: "YouTube" }) }}
              live
              liveLabel={t("liveNow")}
            />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-h3 font-bold leading-tight" style={{ color: "var(--surface-text)" }}>
                  {liveTitle}
                </h2>
                <p className="text-body-sm" style={{ color: "var(--surface-text-muted)" }}>
                  {liveVenue ? (
                    <>
                      {liveVenue}
                      <span aria-hidden="true"> · </span>
                    </>
                  ) : null}
                  {t("liveVia", { platform: "YouTube" })}
                </p>
              </div>
              <ShareButton url={live.url} title={liveTitle} label={t("share")} copiedLabel={t("shareCopied")} />
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* A group of buttons, NOT a tablist. `role="tab"` promises a
              tabpanel, `aria-controls`, and arrow-key movement with a roving
              tabindex; none of that exists here and none of it should — these
              navigate, they do not switch a panel in place. Announced as
              "tab 1 of 3" a screen-reader user would press arrow keys and get
              nothing. `aria-pressed` says what is actually true. */}
          <div role="group" aria-label={t("libraryTitle")} className="vs-fill flex gap-1 rounded-[var(--radius-full)] p-1">
            {tabs.map((tab) => {
              const selected = query.kind === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => go({ kind: tab.value })}
                  className={`min-h-11 rounded-[var(--radius-full)] px-5 text-body-sm font-semibold transition-colors duration-[var(--motion-duration-fast)] ${FOCUS}`}
                  style={
                    selected
                      ? { background: "var(--surface-text)", color: "var(--surface-bg)" }
                      : { color: "var(--surface-text-muted)" }
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get("search");
                go({ search: typeof value === "string" && value.trim() ? value.trim() : undefined });
              }}
              className="vs-fill vs-edge flex min-w-48 flex-1 items-center gap-2 rounded-[var(--radius-full)] px-4 sm:max-w-sm"
            >
              {/* A plain text input, not `type="search"`: in Chromium the
                  browser's own clear-on-Escape swallows the key before any
                  dialog above it sees a cancel, and jsdom's shim hides the
                  difference from tests (`reference_dialog_search_escape`). */}
              <input
                type="text"
                name="search"
                defaultValue={query.search ?? ""}
                aria-label={t("searchLabel")}
                placeholder={t("searchLabel")}
                className="min-h-11 flex-1 bg-transparent text-body-sm focus-visible:outline-none"
                style={{ color: "var(--surface-text)" }}
              />
              {/* 44px, not the 36px the glyph needs: WCAG 2.5.8 and IA §12 set
                  the floor on the TARGET, and the icon is drawn inside it. */}
              <button type="submit" aria-label={t("searchLabel")} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full ${FOCUS}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-4" fill="none" stroke="var(--surface-text-muted)" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="11" cy="11" r="6.2" />
                  <path d="m15.6 15.6 3.6 3.6" />
                </svg>
              </button>
            </form>

            <LibraryFilters
              query={query}
              seasons={seasons}
              associations={associations}
              onApply={go}
              onClear={() => go(CLEARED_FILTERS)}
            />
          </div>
        </div>

        {/* The list stays on screen while the next one is fetched, dimmed and
            marked busy -- a reader who changes a filter should see their list
            narrow, not the page disappear. */}
        <div
          aria-busy={pending || undefined}
          className={`flex flex-col gap-14 transition-opacity duration-[var(--motion-duration-fast)] ${pending ? "opacity-55" : ""}`}
        >
          {reels.length > 0 ? (
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-h3 font-bold" style={{ color: "var(--surface-text)" }}>
                  {t("reelsHeading")}
                </h2>
                <p className="text-body-sm" style={{ color: "var(--surface-text-muted)" }}>
                  {t("reelsIntro")}
                </p>
              </div>
              {/* `vs-rail-reels` carries its own per-breakpoint count: a 9:16
                  card at the landscape rail's width stands 995px tall at 1440,
                  which is taller than the viewport. */}
              <ul className="vs-rail vs-rail-reels gap-4 pb-1">
                {reels.map((reel, index) => (
                  <li key={reel.id}>
                    <ReelCard
                      video={reel}
                      thumbnail={reel.thumbnailId ? thumbnails.get(reel.thumbnailId) : undefined}
                      locale={locale}
                      labels={{ platform: t(`platform_${reel.platform}`) }}
                      onPlay={() => gallery.open(index)}
                      revealIndex={index}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {videos.length > 0 ? (
            <section className="flex flex-col gap-6">
              <h2 className="text-h3 font-bold" style={{ color: "var(--surface-text)" }}>
                {t("latestVideosHeading")}
              </h2>
              <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video, index) => (
                  <li key={video.id}>
                    <VideoCard
                      video={video}
                      thumbnail={video.thumbnailId ? thumbnails.get(video.thumbnailId) : undefined}
                      locale={locale}
                      labels={{ platform: t(`platform_${video.platform}`), category: t(`category_${video.category}`) }}
                      onPlay={() => gallery.open(reels.length + index)}
                      revealIndex={index}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Pending never shows the empty state: a list being fetched has not
              come back empty, it has not come back. */}
          {playable.length === 0 && !pending ? (
            <VideoEmptyState
              title={t("emptyTitle")}
              body={filters > 0 ? t("emptyBody") : t("emptyNoFilterBody")}
              clearLabel={filters > 0 ? t("clearFilters") : undefined}
              onClear={filters > 0 ? () => go(CLEARED_FILTERS) : undefined}
            />
          ) : null}

          {pending && playable.length === 0 ? <VideoGridSkeleton count={pageSize} label={t("loading")} /> : null}
        </div>

        {hasMore ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => go({ page: query.page + 1 })}
              disabled={pending}
              className={`${GHOST_PILL} px-8 disabled:opacity-50`}
            >
              {t("showMore")}
            </button>
          </div>
        ) : null}

        <FollowStrip />
      </div>

      {gallery.video ? (
        <VideoPlayerModal
          video={gallery.video}
          locale={locale}
          labels={{
            ...embedLabels,
            close: t("close"),
            previous: t("previous"),
            next: t("next"),
            position: t("position", {
              index: (gallery.index ?? 0) + 1,
              total: playable.length,
              list: t("libraryTitle"),
            }),
            platform: t(`platform_${gallery.video.platform}`),
            category: t(`category_${gallery.video.category}`),
            share: t("share"),
            shareCopied: t("shareCopied"),
            openOn: t("openOn", { platform: t(`platform_${gallery.video.platform}`) }),
          }}
          /* The library's own address for this video, not the platform's.
             Someone sharing from here is sharing the federation's page, which
             is where the video sits among the rest of them. A PATH, because
             this component first renders on the server, where there is no
             `window` to take an origin from -- `ShareButton` makes it absolute
             at the moment of the press. */
          shareUrl={`/${locale}${videoHref(query, gallery.video.id)}`}
          onClose={gallery.close}
          onPrevious={gallery.previous}
          onNext={gallery.next}
          hasPrevious={gallery.hasPrevious}
          hasNext={gallery.hasNext}
          returnFocusTo={gallery.openerElement}
        />
      ) : null}

      <VideoReveal />
    </div>
  );
};
