"use client";

import { useEffect, useRef, useState } from "react";
import { isFallback } from "./types";
import type { ResolvedVideo, VideoKind, VideoPlatform } from "./types";

/**
 * What a pasted link turns out to be.
 *
 * Two screens ask the same question — adding a video, and any future screen
 * that takes a link — and the debounce and the staleness rule are the parts
 * that are easy to get subtly wrong twice.
 *
 * -- The answer carries the URL it answers ----------------------------------
 *
 * A slow reply for an old URL must not overwrite a fast reply for the one in
 * the field. The first version of this counted attempts and dropped any reply
 * whose number was no longer the latest; this stores the URL alongside the
 * answer instead and simply ignores an answer that does not describe the
 * current field. The guarantee stops depending on a counter being incremented
 * in the right order, which is the part a refactor breaks silently.
 *
 * It also makes every reported value *derived*: an answer for another URL is
 * indistinguishable from no answer, so clearing the field cannot leave a stale
 * platform or title behind. There is no state to reset, so nothing can forget
 * to reset it.
 *
 * -- Still debounced ---------------------------------------------------------
 *
 * A YouTube URL is forty characters, and each one would otherwise open an
 * outbound request from the API.
 */

const RESOLVE_DEBOUNCE_MS = 400;

export type ResolveState = "idle" | "resolving" | "unsupported" | "ready";

export interface ResolvedShape {
  resolved: ResolvedVideo;
  state: ResolveState;
  platform: VideoPlatform | null;
  kind: VideoKind;
  thumbnailUrl: string | null;
  /** True once the link is something this platform can address at all. */
  identified: boolean;
}

export const useResolvedVideo = (
  url: string,
  resolveUrl: (url: string) => Promise<ResolvedVideo>,
  /** Called once per successful resolve that carried a title, so the form can
   *  seed both language fields. Not applied here: the fields belong to the
   *  form, and a hook that wrote into them would own its caller's state. */
  onTitle?: (title: string) => void,
): ResolvedShape => {
  const [answer, setAnswer] = useState<{ url: string; value: ResolvedVideo } | null>(null);

  // The newest callback, read by a timer that fires at least a debounce later
  // — so an effect is early enough to keep it current, and writing a ref
  // during render is not.
  const seed = useRef(onTitle);
  useEffect(() => {
    seed.current = onTitle;
  });

  const trimmed = url.trim();

  useEffect(() => {
    if (trimmed === "") return;

    const timer = setTimeout(async () => {
      const value = await resolveUrl(trimmed);
      setAnswer({ url: trimmed, value });

      if (value && !isFallback(value)) {
        seed.current?.(value.title);
      }
    }, RESOLVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, resolveUrl]);

  // An answer about a different URL is not an answer about this one.
  const current = answer !== null && answer.url === trimmed ? answer.value : null;
  const state: ResolveState =
    trimmed === ""
      ? "idle"
      : answer === null || answer.url !== trimmed
        ? "resolving"
        : current === null
          ? "unsupported"
          : "ready";

  return {
    resolved: current,
    state,
    platform: current && "platform" in current ? current.platform : null,
    kind: current && "kind" in current ? current.kind : "video",
    thumbnailUrl: current && !isFallback(current) ? current.thumbnailUrl : null,
    identified: current !== null,
  };
};
