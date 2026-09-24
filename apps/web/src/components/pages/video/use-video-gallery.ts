"use client";

import { useCallback, useRef, useState } from "react";
import type { VideoPublic } from "@/lib/video/types";

/**
 * Which video the player is showing, and where it sits in the list it was
 * opened from.
 *
 * A hook rather than a component because both surfaces that use it -- the
 * homepage section and the library page -- draw completely different things
 * around the same one decision. A shared wrapper component would have to take
 * the whole page as a render prop to be useful.
 *
 * -- The element to give focus back to -------------------------------------
 *
 * Captured at the moment of the press, from `document.activeElement`, and NOT
 * looked up when the dialog closes. By then the grid may have re-rendered
 * ("show more" appended a page, a filter changed) and the card that opened the
 * dialog may no longer exist -- focus would land on `<body>` and the reader
 * would be back at the top of the document.
 *
 * `activeElement` rather than the event's target: a press with the keyboard
 * and a press with a mouse both leave the focused element correct, whereas the
 * mouse target can be a `<span>` inside the button.
 */
export const useVideoGallery = (videos: readonly VideoPublic[]) => {
  const [index, setIndex] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((at: number) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIndex(at);
  }, []);

  const close = useCallback(() => setIndex(null), []);

  // Clamped rather than wrapped: reaching the last video should say so, and a
  // silent return to the first is a reader losing their place.
  const step = useCallback(
    (delta: 1 | -1) =>
      setIndex((current) =>
        current === null ? null : Math.min(videos.length - 1, Math.max(0, current + delta)),
      ),
    [videos.length],
  );

  return {
    index,
    // A list that shrank under an open dialog (a filter applied while it was
    // up) reads as closed rather than as a crash.
    video: index === null ? null : (videos[index] ?? null),
    openerElement: opener.current,
    open,
    close,
    previous: () => step(-1),
    next: () => step(1),
    hasPrevious: index !== null && index > 0,
    hasNext: index !== null && index < videos.length - 1,
  };
};
