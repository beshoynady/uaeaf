"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CinematicHeading } from "@/components/pages/video/cinematic-heading";
import { ShareButton } from "@/components/pages/video/share-button";
import { VideoCard } from "@/components/pages/video/video-card";
import { VideoCarousel } from "@/components/pages/video/video-carousel";
import { VideoPlayerModal } from "@/components/pages/video/video-player-modal";
import { VideoReveal } from "@/components/pages/video/video-reveal";
import { VideoStage } from "@/components/pages/video/video-stage";
import { useVideoGallery } from "@/components/pages/video/use-video-gallery";
import { titleOf } from "@/lib/video/types";
import type { VideoSectionPublic } from "@/lib/video/types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { FOCUS } from "@/components/ui/interactive";
import { GHOST_PILL } from "../video/chrome";

/**
 * The homepage's video section, in its two states.
 *
 * **At rest** it leads with one featured video over a cinematic backdrop, with
 * a single large play button, and carries a carousel of recent clips beneath.
 *
 * **While a broadcast is running** the same stage shows the broadcast instead,
 * inside a breathing red frame with a pulsing badge, its venue beneath it and
 * a share / open-on-the-platform pair. The featured video returns of its own
 * accord when the broadcast ends: the API stops returning one, and this draws
 * whatever it was given. There is no state machine here and nothing to reset.
 *
 * The whole section is absent when the editor switched it off or when there is
 * nothing to show — a section that renders empty is worse than one that is not
 * there (`docs/plans/homepage-hero-design.md` §6.4).
 */
export const HomeVideoSection = ({
  section,
  thumbnails,
  locale,
}: {
  section: VideoSectionPublic;
  thumbnails: Map<string, MediaAssetPublic>;
  locale: AppLocale;
}) => {
  const t = useTranslations("VideoSystem");
  const carousel = section.carousel.items;
  const gallery = useVideoGallery(carousel);

  const live = section.live;
  const featured = section.featured;
  const stageTitle = live ? titleOf(live, locale) : featured ? titleOf(featured, locale) : "";
  // Falls back to Arabic rather than to nothing, on the same terms as
  // `titleOf`: a venue named only in Arabic is still where the broadcast is.
  const liveVenue = live?.venue ? live.venue[locale] || live.venue.ar : "";

  // Nothing to stage and nothing to scroll: the section has no reason to exist
  // on this render.
  if (!section.enabled || (!live && !featured && carousel.length === 0)) return null;

  const embedLabels = {
    play: t("play"),
    failedTitle: t("failedTitle"),
    failedBody: t("failedBody"),
    retry: t("retry"),
  };

  const heading = section.title?.[locale] || section.title?.ar || "";
  const subtitle = section.subtitle?.[locale] || section.subtitle?.ar || "";

  return (
    // `data-surface="ink"` is what makes every `--surface-*` below resolve:
    // ADR-0098 declares the set on the surface element and descendants read it
    // through the cascade, so no component here needs to know its ground.
    <section data-surface="ink" className="video-system relative overflow-hidden py-16 md:py-24">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2.5 text-caption font-bold" style={{ color: "var(--surface-text)" }}>
              {/* The kit's tricolour, not a green-to-red ramp of its own: ADR-0098
                  D3 forbids blending the two brand colours directly, and the
                  token resolves the middle step per surface (white on ink) and
                  the angle from `dir`. It is also this surface's required cue:
                  ink is fixed at #0B0B0B in every theme, 1.05:1 against the
                  dark page, so without an accent the section has no visible
                  edge at all. */}
              <span
                aria-hidden="true"
                className="inline-block h-[3px] w-6 rounded-full"
                style={{ background: "var(--brand-tricolor)" }}
              />
              {t("eyebrow")}
            </p>
            {heading ? (
              <CinematicHeading
                text={heading}
                className="max-w-2xl text-h1 font-extrabold leading-[1.08]"
              />
            ) : null}
            {subtitle ? (
              <p className="max-w-xl text-body leading-relaxed" style={{ color: "var(--surface-text-muted)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>

          <Link
            href="/media/videos"
            className={`${GHOST_PILL} px-6`}
          >
            {t("libraryCta")}
            {/* Mirrored in Arabic: this one IS a directional arrow — it points
                the way the reader is being sent, which reverses with the text. */}
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5" />
            </svg>
          </Link>
        </header>

        {live ? (
          <div className="flex flex-col gap-5">
            <VideoStage
              platform="youtube"
              externalId={live.videoId}
              url={live.url}
              title={stageTitle}
              locale={locale}
              thumbnail={live.thumbnailId ? thumbnails.get(live.thumbnailId) : undefined}
              labels={{ ...embedLabels, platform: t("platform_youtube"), openOn: t("openOn", { platform: "YouTube" }) }}
              live
              liveLabel={t("liveNow")}
            />

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <h3 className="text-h3 font-bold leading-tight" style={{ color: "var(--surface-text)" }}>
                  {stageTitle}
                </h3>
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

              <div className="flex flex-wrap items-center gap-2">
                <ShareButton url={live.url} title={stageTitle} label={t("share")} copiedLabel={t("shareCopied")} />
                <a
                  href={live.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${GHOST_PILL} px-5`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                  </svg>
                  {t("openOn", { platform: "YouTube" })}
                </a>
              </div>
            </div>
          </div>
        ) : featured ? (
          <div className="flex flex-col gap-5">
            <VideoStage
              platform={featured.platform}
              externalId={featured.externalId}
              url={featured.url}
              title={stageTitle}
              thumbnail={featured.thumbnailId ? thumbnails.get(featured.thumbnailId) : undefined}
              locale={locale}
              labels={{
                ...embedLabels,
                platform: t(`platform_${featured.platform}`),
                openOn: t("openOn", { platform: t(`platform_${featured.platform}`) }),
              }}
              kenBurns
            />
            <div className="flex flex-col gap-2">
              <h3 className="max-w-3xl text-h3 font-bold leading-tight" style={{ color: "var(--surface-text)" }}>
                {stageTitle}
              </h3>
            </div>
          </div>
        ) : null}

        {carousel.length > 0 ? (
          <VideoCarousel
            heading={
              <h3 className="text-h4 font-bold" style={{ color: "var(--surface-text)" }}>
                {live ? t("alsoWatchHeading") : t("latestHeading")}
              </h3>
            }
            labels={{
              previous: t("previous"),
              next: t("next"),
              goTo: t("goToSlide"),
              rail: t("railLabel"),
            }}
          >
            {carousel.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                thumbnail={video.thumbnailId ? thumbnails.get(video.thumbnailId) : undefined}
                locale={locale}
                labels={{ platform: t(`platform_${video.platform}`), category: t(`category_${video.category}`) }}
                onPlay={() => gallery.open(index)}
                revealIndex={index}
              />
            ))}
          </VideoCarousel>
        ) : null}
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
              total: carousel.length,
              list: live ? t("alsoWatchHeading") : t("latestHeading"),
            }),
            platform: t(`platform_${gallery.video.platform}`),
            category: t(`category_${gallery.video.category}`),
            share: t("share"),
            shareCopied: t("shareCopied"),
            openOn: t("openOn", { platform: t(`platform_${gallery.video.platform}`) }),
          }}
          onClose={gallery.close}
          onPrevious={gallery.previous}
          onNext={gallery.next}
          hasPrevious={gallery.hasPrevious}
          hasNext={gallery.hasNext}
          returnFocusTo={gallery.openerElement}
        />
      ) : null}

      <VideoReveal />
    </section>
  );
};
