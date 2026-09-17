"use client";

import dynamic from "next/dynamic";
import type { HeroControlsProps } from "./hero-controls";

/**
 * The seam that keeps the hero's controls out of the server's HTML.
 *
 * Without JavaScript the track does not advance by itself, so there is
 * nothing to pause and no arrow that would do anything: a reader with a
 * blocked script would tab onto four dead buttons. `ssr: false` is what makes
 * their absence structural — the bar is not rendered on the server at all,
 * rather than rendered and then hidden by a flag, which is the version that
 * quietly breaks when the flag does.
 *
 * It shifts nothing when it arrives: the bar is positioned over the track,
 * not in the flow, so CLS stays at zero across hydration.
 */
const HeroControls = dynamic(() => import("./hero-controls").then((module) => module.HeroControls), {
  ssr: false,
});

export const HeroControlsSlot = (props: HeroControlsProps) => <HeroControls {...props} />;
