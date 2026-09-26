"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, IconButton } from "@uaeaf/brand-ui";

import { withPhotoParam } from "@/lib/albums/photo-window";
import { shareLink } from "@/lib/albums/share-link";

import { LinkIcon } from "./link-icon";

import "./viewer.css";

export interface PhotoShareProps {
  /** The photo whose link this shares — the one in front of the reader. */
  photoId: string;
}

/** How long "copied" stays up. The value the video library's share button and
 *  the album hero's copy button use, so every confirmation on the media pages
 *  lasts the same time. */
const CONFIRMATION_MS = 2600;

type Feedback = "copied" | "manual" | null;

/**
 * «رابط الصورة»: the current photo's link, handed to whatever the reader's
 * device shares with, at every width.
 *
 * -- One control, two drawings --------------------------------------------
 *
 * Below `lg` it is the kit's 44x44 `IconButton`, named by the same words the
 * desktop button shows; from `lg` it is the labelled secondary `Button` the
 * canvas draws beside the counter. `viewer.css` displays one at a time.
 *
 * -- What pressing it does --------------------------------------------------
 *
 * The address is rewritten to `?photo=<id>` first, with `replaceState`, so the
 * page's own link opens this photo whatever happens next. Then `shareLink`
 * offers the platform's share sheet where one exists and the clipboard where
 * it does not. A sheet is its own feedback and a dismissed sheet is the
 * reader's decision, so neither says anything here. A copy is confirmed; a
 * clipboard that is missing or refuses the write gets an instruction instead,
 * because the link is still one step away: the page's own address.
 *
 * The confirmation is visible and is the live region, in one element, so
 * nothing is announced twice. "Copied" clears itself after `CONFIRMATION_MS`;
 * the instruction stays until the reader moves to another photo or presses
 * again, because it asks them to do something and must not vanish mid-read.
 */
export const PhotoShare = ({ photoId }: PhotoShareProps) => {
  const t = useTranslations("albums.viewer");
  const [feedback, setFeedback] = useState<Feedback>(null);

  // A confirmation belongs to the photo it was given for. A move clears it
  // during render, so "copied" is never painted beside the next photo.
  const [about, setAbout] = useState(photoId);
  if (about !== photoId) {
    setAbout(photoId);
    setFeedback(null);
  }

  // Read after the share resolves: the reader can move on while the sheet is
  // open, and the answer must be checked against the photo shown then, not the
  // one the press began on (CLAUDE.md §31).
  const shown = useRef(photoId);
  useEffect(() => {
    shown.current = photoId;
  }, [photoId]);

  useEffect(() => {
    if (feedback !== "copied") return;
    const timer = window.setTimeout(() => setFeedback(null), CONFIRMATION_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const share = async () => {
    const url = withPhotoParam(window.location.href, photoId);
    window.history.replaceState(window.history.state, "", url);
    setFeedback(null);
    const outcome = await shareLink(url, navigator);
    if (shown.current !== photoId) return;
    if (outcome === "copied" || outcome === "manual") setFeedback(outcome);
  };

  const message =
    feedback === "copied" ? t("photoLinkCopied") : feedback === "manual" ? t("photoLinkManual") : "";

  return (
    <div className="av-share">
      <span className="av-share__compact">
        <IconButton aria-label={t("photoLink")} onClick={share}>
          <LinkIcon />
        </IconButton>
      </span>
      <span className="av-share__full">
        <Button variant="secondary" onClick={share}>
          <LinkIcon className="size-4" />
          {t("photoLink")}
        </Button>
      </span>
      <p className="av-share__status text-body-sm" role="status">
        {message}
      </p>
    </div>
  );
};
