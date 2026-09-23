/**
 * The homepage hero's presentation rules, shared by the public site and the
 * dashboard's live preview (ADR-0083): what the site draws and what an editor
 * previews come from one set of functions, not from two copies that drift.
 */
export { HEADER_HEIGHT_PX, heroHeight } from "./height";
export { HERO_MOBILE_MAX_WIDTH, heroDevice, objectPosition, resolveImage } from "./image";
export type { HeroDevice, HeroImageLike, HeroSlideLike, PointLike, PublicImageLike, ResolvedImage } from "./image";
export { dubaiLocalToIso, eventBarState, formatEventDateTime, isoToDubaiLocal } from "./event-bar";
export type { EventBarState, NextEventLike } from "./event-bar";
export {
  HERO_CTA_LABEL_MAX,
  HERO_PLAYBACK,
  HERO_TEXT_LIMITS,
  graphemeLength,
  isInternalHeroUrl,
  isUsableHeroUrl,
} from "./limits";
export { HERO_IMAGE_MIN_WIDTH, isSmallImage, resolveLtrPicture } from "./draft";
export { COVER_SCRIM_MIN, coverScrim, coverScrimFade, heroFrameLayout, heroScrim, heroType } from "./presentation";
export type { HeroFrameLayout } from "./presentation";
