/**
 * Where an error on the homepage hero screen lives: which part of the screen,
 * which slide has to be open for its field to exist, the element a summary link
 * moves focus to, and the words (`HomepageHero` message keys) that name it.
 *
 * The element ids are the ones the editor components give their fields
 * (`slide-editor.tsx`, `cta-card.tsx`, `hero-settings-editor.tsx`), so a link in
 * the summary lands on the field that needs fixing.
 */

export interface ErrorTarget {
  group: "slide" | "event" | "playback";
  slideKey: string | null;
  elementId: string;
  /** The field's label key. */
  field: string;
  /** The button a label or link belongs to. */
  slot?: "buttonPrimary" | "buttonSecondary";
  language: "ar" | "en" | null;
}

const SLIDE_TEXT: Record<string, string> = { eyebrow: "eyebrow", title: "headline", subtitle: "body" };

const SLIDE_PICTURE: Record<string, { element: string; field: string }> = {
  imageAssetId: { element: "desktop", field: "desktopImage" },
  mobileImageAssetId: { element: "mobile", field: "mobileImage" },
  ltrImageAssetId: { element: "ltr", field: "englishImage" },
  ltrFocalPoint: { element: "ltr", field: "englishImage" },
};

const EVENT_TEXT: Record<string, string> = { label: "eventLabel", name: "eventName", venue: "eventVenue" };
const EVENT_TIME: Record<string, { element: string; field: string }> = {
  startsAt: { element: "hero-event-starts", field: "startsAt" },
  endsAt: { element: "hero-event-ends", field: "endsAt" },
};

const language = (part: string | undefined): "ar" | "en" | null => (part === "ar" || part === "en" ? part : null);

const slideTarget = (key: string, rest: string[]): ErrorTarget => {
  const base = `slide-${key}`;
  const [field, second, third] = rest;
  const target = (elementId: string, label: string, lang: "ar" | "en" | null, slot?: ErrorTarget["slot"]): ErrorTarget => ({
    group: "slide",
    slideKey: key,
    elementId,
    field: label,
    ...(slot ? { slot } : {}),
    language: lang,
  });

  if (SLIDE_TEXT[field] && language(second)) {
    return target(`${base}-${field}-${second}`, SLIDE_TEXT[field], language(second));
  }
  if (field === "primaryCta" || field === "secondaryCta") {
    const slot = field === "primaryCta" ? "buttonPrimary" : "buttonSecondary";
    const card = `${base}-${field === "primaryCta" ? "primary" : "secondary"}`;
    if (second === "label" && language(third)) return target(`${card}-label-${third}`, "buttonLabel", language(third), slot);
    if (second === "url") return target(`${card}-url`, "buttonUrl", null, slot);
    return target(card, slot, null);
  }
  if (field === "scheduledTo") return target(`${base}-until`, "hidesAfter", null);
  if (field === "scheduledFrom") return target(`${base}-from`, "showsFrom", null);
  if (SLIDE_PICTURE[field]) return target(`${base}-${SLIDE_PICTURE[field].element}`, SLIDE_PICTURE[field].field, null);
  return target(`${base}-text`, "sectionText", null);
};

export const errorTarget = (path: string): ErrorTarget => {
  const [head, ...rest] = path.split(".");

  if (head === "slides" && rest.length > 0) return slideTarget(rest[0], rest.slice(1));

  if (head === "playback") {
    return { group: "playback", slideKey: null, elementId: "hero-interval", field: "interval", language: null };
  }

  const [field, second] = rest;
  if (EVENT_TEXT[field] && language(second)) {
    return { group: "event", slideKey: null, elementId: `hero-event-${field}-${second}`, field: EVENT_TEXT[field], language: language(second) };
  }
  if (EVENT_TIME[field]) {
    return { group: "event", slideKey: null, elementId: EVENT_TIME[field].element, field: EVENT_TIME[field].field, language: null };
  }
  return { group: "event", slideKey: null, elementId: "hero-event-heading", field: "eventHeading", language: null };
};
