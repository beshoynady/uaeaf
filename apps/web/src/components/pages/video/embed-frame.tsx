"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoPlatform } from "@/lib/video/types";

/**
 * The player, and the promise that nothing loads until a reader asks for it.
 *
 * -- Zero iframes before a press ------------------------------------------
 *
 * This component renders no `<iframe>` at all until `playing` is true. That is
 * the whole point of the facade: an embed is third-party JavaScript, cookies
 * and a network waterfall, and a homepage carrying eight of them at rest pays
 * all of that for a video most visitors will never start. The card's own
 * thumbnail stands in until then, and the press is what buys the embed.
 *
 * `embed-frame.spec.tsx` asserts the iframe count is 0 before the press and 1
 * after, which is the guard that keeps this true through future edits.
 *
 * -- Which origin ----------------------------------------------------------
 *
 * A library video goes to `youtube-nocookie.com`, which does not write a
 * tracking cookie until playback starts. A live broadcast cannot: the nocookie
 * host does not serve live streams reliably, so a broadcast uses
 * `youtube.com/embed` and that difference is `live`.
 *
 * -- Failure -------------------------------------------------------------
 *
 * There is no way to ask an iframe whether it loaded something useful; a
 * deleted or private video renders the platform's own message inside a frame
 * that reports `load` perfectly happily. So this waits: if `load` has not
 * fired at all within `LOAD_TIMEOUT_MS`, the platform is unreachable, and the
 * reader gets a way out rather than a black rectangle. Anything the platform
 * does render is the platform's to explain.
 */

const LOAD_TIMEOUT_MS = 8000;

const embedSrc = (platform: VideoPlatform, externalId: string, url: string, live: boolean): string | null => {
  switch (platform) {
    case "youtube": {
      // The only difference is the host -- see "Which origin" in the header.
      const host = live ? "www.youtube.com" : "www.youtube-nocookie.com";
      return `https://${host}/embed/${encodeURIComponent(externalId)}?autoplay=1&rel=0`;
    }
    case "instagram":
      return `https://www.instagram.com/p/${encodeURIComponent(externalId)}/embed/`;
    case "tiktok":
      return `https://www.tiktok.com/embed/v2/${encodeURIComponent(externalId)}`;
    case "facebook":
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true`;
    case "x":
      // X has no clean frameable player: `platform.twitter.com` needs its own
      // script, which would be a third-party script on every page that draws a
      // card. The reader is sent to X instead, which is honest about where the
      // video actually is.
      return null;
  }
};

export interface EmbedLabels {
  play: string;
  failedTitle: string;
  failedBody: string;
  openOn: string;
  retry: string;
}

export const EmbedFrame = ({
  platform,
  externalId,
  url,
  title,
  live = false,
  labels,
  /** The facade: the thumbnail, the play button, the badges. Replaced entirely
   *  once the embed is in. */
  children,
  /** Started already -- the modal opens straight into playback, because the
   *  press that opened it IS the press. */
  autoStart = false,
}: {
  platform: VideoPlatform;
  externalId: string;
  url: string;
  title: string;
  live?: boolean;
  labels: EmbedLabels;
  children: React.ReactNode;
  autoStart?: boolean;
}) => {
  const src = embedSrc(platform, externalId, url, live);
  const [playing, setPlaying] = useState(autoStart && src !== null);
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!playing || failed) return;
    loaded.current = false;
    const timer = setTimeout(() => {
      if (!loaded.current) setFailed(true);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [playing, failed]);

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: "rgba(10,12,11,0.82)" }}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-8" fill="none" stroke="#F8A5AB" strokeWidth="1.7">
          <path d="M12 4.8 2.6 20h18.8L12 4.8Z" strokeLinejoin="round" />
          <path d="M12 10.4v3.4M12 16.6v.1" strokeLinecap="round" />
        </svg>
        <p className="text-h5 font-bold" style={{ color: "var(--vs-text)" }}>
          {labels.failedTitle}
        </p>
        <p className="text-body-sm" style={{ color: "var(--vs-text-secondary)" }}>
          {labels.failedBody}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-[var(--vs-radius-pill)] px-5 text-body-sm font-semibold"
            style={{ boxShadow: "inset 0 0 0 1px var(--vs-hairline)", color: "var(--vs-text)" }}
          >
            {labels.openOn}
          </a>
          <button
            type="button"
            onClick={() => setFailed(false)}
            className="inline-flex min-h-11 items-center rounded-[var(--vs-radius-pill)] px-4 text-body-sm"
            style={{ color: "var(--vs-text-secondary)" }}
          >
            {labels.retry}
          </button>
        </div>
      </div>
    );
  }

  if (playing && src) {
    return (
      <iframe
        src={src}
        title={title}
        onLoad={() => {
          loaded.current = true;
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 size-full border-0"
      />
    );
  }

  // No player for this platform: the facade becomes a link out rather than a
  // button that would open an empty frame.
  if (src === null) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${labels.openOn} — ${title}`} className="absolute inset-0 block">
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={() => setPlaying(true)} aria-label={`${labels.play} — ${title}`} className="absolute inset-0 block cursor-pointer">
      {children}
    </button>
  );
};
