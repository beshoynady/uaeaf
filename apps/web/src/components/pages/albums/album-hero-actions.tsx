"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BRAND_VISUALLY_HIDDEN, Button } from "@uaeaf/brand-ui";
import { requestAlbumSlideshow } from "@/components/shared/albums/album-viewer";
import { LinkIcon } from "@/components/shared/albums/link-icon";

/**
 * The album hero's two buttons: «تشغيل العرض» and «نسخ رابط الألبوم».
 *
 * -- Play -----------------------------------------------------------------------
 *
 * A link to the viewer's anchor that also asks the viewer to start. The link
 * is what scrolls — natively, with no script, so it still takes the reader to
 * the photos before hydration — and the click dispatches the viewer's play
 * event. The viewer decides whether anything moves: under reduced motion it
 * does not, and the reader simply arrives at the photos.
 *
 * -- Copy -----------------------------------------------------------------------
 *
 * The album's own address, without `?photo=`: this button shares the album,
 * and the viewer's own "photo link" is the one that shares a photo. The
 * confirmation lasts as long as the viewer's, so the page's two confirmations
 * agree.
 */

const CONFIRMATION_MS = 2600;

const PlayIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className="size-4 rtl:-scale-x-100"
    fill="currentColor"
  >
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
);

export const AlbumHeroActions = ({
  viewerId,
  hasPhotos,
}: {
  viewerId: string;
  /** An album with no photos yet has no viewer to scroll to or start, so it
   *  offers no play button rather than one that points at nothing. */
  hasPhotos: boolean;
}) => {
  const t = useTranslations("albums.page.album");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CONFIRMATION_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("photo");
    url.hash = "";
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
    } catch {
      // No clipboard permission. The address bar already carries the album's
      // address, so nothing the reader needs is lost.
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {hasPhotos ? (
        <Button
          href={`#${viewerId}`}
          linkComponent="a"
          onClick={() => requestAlbumSlideshow()}
          className="max-sm:flex-1 max-sm:justify-center"
        >
          <PlayIcon />
          {t("play")}
        </Button>
      ) : null}
      <Button
        variant="secondary"
        onClick={copyLink}
        className="max-sm:flex-1 max-sm:justify-center"
      >
        <LinkIcon className="size-4" />
        {copied ? t("linkCopied") : t("copyLink")}
      </Button>
      <span className={BRAND_VISUALLY_HIDDEN} role="status">
        {copied ? t("linkCopied") : ""}
      </span>
    </div>
  );
};
