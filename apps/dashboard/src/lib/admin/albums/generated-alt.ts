import type { LocalizedText } from "./types";

/**
 * The alternative text and caption an uploaded photo starts with.
 *
 * `POST /media-assets/upload` requires `altText` and `caption` in both
 * languages, so a photo cannot be uploaded without them — and a batch of forty
 * photos from a championship cannot wait for forty descriptions. Each photo
 * therefore starts with a generated fallback, and the screen counts the photos
 * still carrying it, so the gap stays visible instead of being papered over.
 *
 * -- Why these are not next-intl messages -----------------------------------
 *
 * They are stored content, not interface copy: the Arabic half must be Arabic
 * and the English half English whatever language the dashboard is being read
 * in. A message bound to the reader's locale would write the same language
 * into both halves.
 */
export const generatedAltText = (albumTitle: LocalizedText, position: number): LocalizedText => ({
  ar: `${albumTitle.ar} — صورة ${position}`,
  en: `${albumTitle.en} — Photo ${position}`,
});

/** The caption is the album's title: true of every photo in it, and more
 *  useful to a visitor than a second copy of the numbered fallback. */
export const generatedCaption = (albumTitle: LocalizedText): LocalizedText => ({
  ar: albumTitle.ar,
  en: albumTitle.en,
});

const GENERATED_AR = / — صورة \d+$/;
const GENERATED_EN = / — Photo \d+$/;

/**
 * Whether a photo's alternative text is still the generated fallback, in
 * either language. One language rewritten and the other not is still a photo a
 * screen reader describes by number in that other language.
 */
export const isGeneratedAlt = (altText: LocalizedText): boolean =>
  GENERATED_AR.test(altText.ar) || GENERATED_EN.test(altText.en);
