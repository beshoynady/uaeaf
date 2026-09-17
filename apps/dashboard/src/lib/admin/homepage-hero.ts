import {
  HERO_CTA_LABEL_MAX,
  HERO_PLAYBACK,
  HERO_TEXT_LIMITS,
  graphemeLength,
  isUsableHeroUrl,
  resolveLtrPicture,
} from "@uaeaf/content/hero";
import type { HeroImageLike, HeroSlideLike, PointLike } from "@uaeaf/content/hero";

/**
 * The homepage hero editor's model: what an editor is changing, what the API
 * would refuse, and the fewest writes that make the stored hero match.
 *
 * Pure, with no React, so every rule the screen relies on is asserted here.
 *
 * ── Save is publish (owner decision 2026-09-17) ───────────────────────────
 *
 * There is no draft store: the hero the editor saves is the hero visitors get.
 * So the screen holds one draft, compares it with what is stored, and on Save
 * sends only the difference, in an order the API accepts. The API still checks
 * everything; `validateDraft` exists so the refusal appears beside its field
 * before the round trip rather than after it.
 */

export type LtrImageMode = "same" | "mirror" | "separate";

export interface Bilingual {
  ar: string;
  en: string;
}

export interface CtaDraft {
  isVisible: boolean;
  label: Bilingual;
  url: string;
}

export interface SlideDraft {
  /** Stable across edits: the id for a stored slide, a local key for a new one. */
  key: string;
  id: string | null;
  active: boolean;
  scheduledFrom: string | null;
  scheduledTo: string | null;
  eyebrow: Bilingual;
  title: Bilingual;
  subtitle: Bilingual;
  primaryCta: CtaDraft;
  secondaryCta: CtaDraft;
  imageAssetId: string | null;
  desktopFocalPoint: PointLike;
  useMobileImage: boolean;
  mobileImageAssetId: string | null;
  mobileFocalPoint: PointLike;
  ltrImageMode: LtrImageMode;
  ltrImageAssetId: string | null;
  ltrFocalPoint: PointLike | null;
}

export interface NextEventDraft {
  isVisible: boolean;
  label: Bilingual;
  name: Bilingual;
  venue: Bilingual;
  /** ISO instants, or "" while not chosen. */
  startsAt: string;
  endsAt: string;
}

export interface PlaybackDraft {
  autoplay: boolean;
  intervalMs: number;
}

export interface HeroDraft {
  sectionId: string;
  /** The section's other settings, written back untouched. */
  otherSettings: Record<string, unknown>;
  slides: SlideDraft[];
  nextEvent: NextEventDraft;
  playback: PlaybackDraft;
}

export const HERO_SLIDE_MAX = 5;

const CENTRE: PointLike = { x: 50, y: 50 };
const EMPTY: Bilingual = { ar: "", en: "" };

let localKeys = 0;
const newKey = () => `new-${(localKeys += 1)}`;

const bilingual = (value: unknown): Bilingual => {
  const text = value as Partial<Bilingual> | null | undefined;
  return { ar: typeof text?.ar === "string" ? text.ar : "", en: typeof text?.en === "string" ? text.en : "" };
};

const point = (value: unknown, fallback: PointLike): PointLike => {
  const p = value as Partial<PointLike> | null | undefined;
  return typeof p?.x === "number" && typeof p?.y === "number" ? { x: p.x, y: p.y } : { ...fallback };
};

const idOf = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

const cta = (value: unknown): CtaDraft => {
  const stored = value as { isVisible?: unknown; label?: unknown; url?: unknown } | null | undefined;
  return {
    isVisible: stored?.isVisible === true,
    label: bilingual(stored?.label),
    url: typeof stored?.url === "string" ? stored.url : "",
  };
};

/** A slide as the dashboard's route handlers return it: the stored document. */
export type SlideRecord = Record<string, unknown> & { _id: string; displayOrder?: number };

export interface SectionRecord {
  _id: string;
  sectionType: string;
  configuration: Record<string, unknown> | null;
}

const fromSlide = (record: SlideRecord): SlideDraft => ({
  key: record._id,
  id: record._id,
  active: record.active === true,
  scheduledFrom: typeof record.scheduledFrom === "string" ? record.scheduledFrom : null,
  scheduledTo: typeof record.scheduledTo === "string" ? record.scheduledTo : null,
  eyebrow: bilingual(record.eyebrow),
  title: bilingual(record.title),
  subtitle: bilingual(record.subtitle),
  primaryCta: cta(record.primaryCta),
  secondaryCta: cta(record.secondaryCta),
  imageAssetId: idOf(record.imageAssetId),
  desktopFocalPoint: point(record.desktopFocalPoint, CENTRE),
  useMobileImage: record.useMobileImage === true,
  mobileImageAssetId: idOf(record.mobileImageAssetId),
  mobileFocalPoint: point(record.mobileFocalPoint, CENTRE),
  ltrImageMode: record.ltrImageMode === "same" || record.ltrImageMode === "separate" ? record.ltrImageMode : "mirror",
  ltrImageAssetId: idOf(record.ltrImageAssetId),
  ltrFocalPoint: record.ltrFocalPoint ? point(record.ltrFocalPoint, CENTRE) : null,
});

export const fromApi = (section: SectionRecord, slides: readonly SlideRecord[]): HeroDraft => {
  const { nextEvent, playback, ...otherSettings } = section.configuration ?? {};
  const event = (nextEvent ?? {}) as Record<string, unknown>;
  const stored = (playback ?? {}) as Partial<PlaybackDraft>;
  return {
    sectionId: section._id,
    otherSettings,
    slides: [...slides]
      .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0))
      .map(fromSlide),
    nextEvent: {
      isVisible: event.isVisible === true,
      label: bilingual(event.label),
      name: bilingual(event.name),
      venue: bilingual(event.venue),
      startsAt: typeof event.startsAt === "string" ? event.startsAt : "",
      endsAt: typeof event.endsAt === "string" ? event.endsAt : "",
    },
    playback: {
      autoplay: typeof stored.autoplay === "boolean" ? stored.autoplay : true,
      intervalMs:
        typeof stored.intervalMs === "number" && HERO_PLAYBACK.intervals.includes(stored.intervalMs)
          ? stored.intervalMs
          : HERO_PLAYBACK.defaultIntervalMs,
    },
  };
};

// ── The list ────────────────────────────────────────────────────────────────

const blankSlide = (): SlideDraft => ({
  key: newKey(),
  id: null,
  // A new slide is hidden until the editor shows it (owner decision 2026-09-17).
  active: false,
  scheduledFrom: null,
  scheduledTo: null,
  eyebrow: { ...EMPTY },
  title: { ...EMPTY },
  subtitle: { ...EMPTY },
  primaryCta: { isVisible: false, label: { ...EMPTY }, url: "" },
  secondaryCta: { isVisible: false, label: { ...EMPTY }, url: "" },
  imageAssetId: null,
  desktopFocalPoint: { ...CENTRE },
  useMobileImage: false,
  mobileImageAssetId: null,
  mobileFocalPoint: { ...CENTRE },
  ltrImageMode: "mirror",
  ltrImageAssetId: null,
  ltrFocalPoint: null,
});

/** Appends a hidden slide; the same draft back at the limit, so a caller can
 *  tell nothing happened by identity. */
export const addSlide = (draft: HeroDraft): HeroDraft =>
  draft.slides.length >= HERO_SLIDE_MAX ? draft : { ...draft, slides: [...draft.slides, blankSlide()] };

/** A hidden copy beside the original, with no id, so it saves as a new slide. */
export const duplicateSlide = (draft: HeroDraft, key: string): HeroDraft => {
  const at = draft.slides.findIndex((slide) => slide.key === key);
  if (at < 0 || draft.slides.length >= HERO_SLIDE_MAX) return draft;
  const copy: SlideDraft = { ...structuredClone(draft.slides[at]), key: newKey(), id: null, active: false };
  const slides = [...draft.slides];
  slides.splice(at + 1, 0, copy);
  return { ...draft, slides };
};

export const removeSlide = (draft: HeroDraft, key: string): HeroDraft => ({
  ...draft,
  slides: draft.slides.filter((slide) => slide.key !== key),
});

/** One place towards the start (-1) or the end (1); the same draft at an edge. */
export const moveSlide = (draft: HeroDraft, key: string, delta: -1 | 1): HeroDraft => {
  const from = draft.slides.findIndex((slide) => slide.key === key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= draft.slides.length) return draft;
  const slides = [...draft.slides];
  [slides[from], slides[to]] = [slides[to], slides[from]];
  return { ...draft, slides };
};

/** To any place, for a drag; the same draft when the slide is unknown, the
 *  place is outside the list, or the slide is already there. */
export const moveSlideTo = (draft: HeroDraft, key: string, to: number): HeroDraft => {
  const from = draft.slides.findIndex((slide) => slide.key === key);
  if (from < 0 || to < 0 || to >= draft.slides.length || to === from) return draft;
  const slides = [...draft.slides];
  const [moved] = slides.splice(from, 1);
  slides.splice(to, 0, moved);
  return { ...draft, slides };
};

export const updateSlide = (draft: HeroDraft, key: string, patch: Partial<SlideDraft>): HeroDraft => ({
  ...draft,
  slides: draft.slides.map((slide) => (slide.key === key ? { ...slide, ...patch } : slide)),
});

export const isDirty = (saved: HeroDraft, draft: HeroDraft): boolean =>
  JSON.stringify(saved) !== JSON.stringify(draft);

/** The draft after the creates in a save landed: each new slide takes its id
 *  as its key too, which is the key `fromApi` gives it on the next read, so the
 *  selection and the unsaved marks survive the re-read. */
export const adoptCreated = (draft: HeroDraft, created: Readonly<Record<string, string>>): HeroDraft =>
  Object.keys(created).length === 0
    ? draft
    : {
        ...draft,
        slides: draft.slides.map((slide) => {
          const id = created[slide.key];
          return id ? { ...slide, key: id, id } : slide;
        }),
      };

/** A slide's own unsaved changes: new, or any field different from the stored
 *  slide. Its place in the list is the list's change, not the slide's. */
export const slideChanged = (saved: HeroDraft, slide: SlideDraft): boolean => {
  const stored = slide.id ? saved.slides.find((candidate) => candidate.id === slide.id) : undefined;
  return !stored || JSON.stringify(stored) !== JSON.stringify(slide);
};

export type SlideStatus = "visible" | "hidden" | "scheduled";

/** What a visitor gets at `now`: the API's own window rule
 *  (`selectVisibleInWindow`, both bounds inclusive), applied only to a slide
 *  switched on. */
export const slideStatus = (slide: SlideDraft, now: Date): SlideStatus => {
  if (!slide.active) return "hidden";
  const at = now.getTime();
  const from = slide.scheduledFrom ? Date.parse(slide.scheduledFrom) : Number.NaN;
  const to = slide.scheduledTo ? Date.parse(slide.scheduledTo) : Number.NaN;
  if (!Number.isNaN(from) && at < from) return "scheduled";
  if (!Number.isNaN(to) && at > to) return "scheduled";
  return "visible";
};

/**
 * The selected slide's number and the count among the slides a visitor gets at
 * `now`, for the preview's progress marks. A slide not shown to visitors is
 * placed where it would appear once shown, so an editor still sees its place.
 */
export const heroPosition = (
  slides: readonly SlideDraft[],
  selectedKey: string | null,
  now: Date,
): { index: number; count: number } => {
  const shown = slides.filter((slide) => slide.key === selectedKey || slideStatus(slide, now) === "visible");
  const index = shown.findIndex((slide) => slide.key === selectedKey);
  return { index: Math.max(index, 0), count: Math.max(shown.length, 1) };
};

/** The pictures a slide would put on the site: a phone or English picture left
 *  behind by a switched-off option is not one of them. */
export const slideImageIds = (slide: SlideDraft): string[] =>
  [
    slide.imageAssetId,
    slide.useMobileImage ? slide.mobileImageAssetId : null,
    slide.ltrImageMode === "separate" ? slide.ltrImageAssetId : null,
  ].filter((id): id is string => Boolean(id));

/** Distinct generated pictures in use: each still needs replacing once. */
export const temporaryImageCount = (draft: HeroDraft, media: MediaLookup): number =>
  new Set(draft.slides.flatMap(slideImageIds).filter((id) => media.get(id)?.isAiGenerated === true)).size;

// ── What the API refuses ────────────────────────────────────────────────────

export interface FieldError {
  /** `slides.<key>.title.en`, `nextEvent.venue.ar`, `playback.intervalMs`. */
  path: string;
  code: string;
  limit?: number;
}

const blank = (text: string) => text.trim().length === 0;
const LANGUAGES = ["ar", "en"] as const;

const slideErrors = (slide: SlideDraft): FieldError[] => {
  const at = (field: string) => `slides.${slide.key}.${field}`;
  const errors: FieldError[] = [];

  for (const field of ["eyebrow", "title", "subtitle"] as const) {
    for (const language of LANGUAGES) {
      if (graphemeLength(slide[field][language]) > HERO_TEXT_LIMITS[field]) {
        errors.push({ path: at(`${field}.${language}`), code: "heroTextTooLong", limit: HERO_TEXT_LIMITS[field] });
      }
    }
  }

  if (slide.active) {
    for (const field of ["title", "subtitle"] as const) {
      for (const language of LANGUAGES) {
        if (blank(slide[field][language])) errors.push({ path: at(`${field}.${language}`), code: "incompleteSlide" });
      }
    }
    if (!slide.imageAssetId) errors.push({ path: at("imageAssetId"), code: "incompleteSlide" });
  }

  for (const slot of ["primaryCta", "secondaryCta"] as const) {
    const button = slide[slot];
    if (!button.isVisible) continue;
    for (const language of LANGUAGES) {
      const label = button.label[language];
      if (blank(label)) errors.push({ path: at(`${slot}.label.${language}`), code: "incompleteCta" });
      else if (graphemeLength(label) > HERO_CTA_LABEL_MAX) {
        errors.push({ path: at(`${slot}.label.${language}`), code: "ctaLabelTooLong", limit: HERO_CTA_LABEL_MAX });
      }
    }
    if (blank(button.url)) errors.push({ path: at(`${slot}.url`), code: "incompleteCta" });
    else if (!isUsableHeroUrl(button.url.trim())) errors.push({ path: at(`${slot}.url`), code: "invalidCtaUrl" });
  }

  // A window that closes before it opens never shows (the API's
  // `scheduleEndsBeforeStart`); closing at the moment it opens, or an open end, is fine.
  if (slide.scheduledFrom && slide.scheduledTo && Date.parse(slide.scheduledTo) < Date.parse(slide.scheduledFrom)) {
    errors.push({ path: at("scheduledTo"), code: "scheduleEndsBeforeStart" });
  }

  if (slide.useMobileImage && !slide.mobileImageAssetId) {
    errors.push({ path: at("mobileImageAssetId"), code: "missingRequiredField" });
  }
  if (slide.ltrImageMode === "separate") {
    if (!slide.ltrImageAssetId) errors.push({ path: at("ltrImageAssetId"), code: "incompleteLtrImage" });
    if (!slide.ltrFocalPoint) errors.push({ path: at("ltrFocalPoint"), code: "incompleteLtrImage" });
  }
  return errors;
};

const eventErrors = (event: NextEventDraft): FieldError[] => {
  const errors: FieldError[] = [];
  const limits = { label: HERO_TEXT_LIMITS.eventLabel, name: HERO_TEXT_LIMITS.eventName, venue: HERO_TEXT_LIMITS.eventVenue };
  for (const [field, limit] of Object.entries(limits) as [keyof typeof limits, number][]) {
    for (const language of LANGUAGES) {
      if (graphemeLength(event[field][language]) > limit) {
        errors.push({ path: `nextEvent.${field}.${language}`, code: "heroTextTooLong", limit });
      }
    }
  }
  if (event.isVisible) {
    for (const field of ["label", "name", "venue"] as const) {
      for (const language of LANGUAGES) {
        if (blank(event[field][language])) errors.push({ path: `nextEvent.${field}.${language}`, code: "incompleteNextEvent" });
      }
    }
    for (const field of ["startsAt", "endsAt"] as const) {
      if (Number.isNaN(Date.parse(event[field]))) errors.push({ path: `nextEvent.${field}`, code: "incompleteNextEvent" });
    }
  }
  const starts = Date.parse(event.startsAt);
  const ends = Date.parse(event.endsAt);
  if (!Number.isNaN(starts) && !Number.isNaN(ends) && ends < starts) {
    errors.push({ path: "nextEvent.endsAt", code: "nextEventEndsBeforeStart" });
  }
  return errors;
};

export const validateDraft = (draft: HeroDraft): FieldError[] => [
  ...draft.slides.flatMap(slideErrors),
  ...eventErrors(draft.nextEvent),
  ...(HERO_PLAYBACK.intervals.includes(draft.playback.intervalMs)
    ? []
    : [{ path: "playback.intervalMs", code: "invalidPlayback" }]),
];

// ── Saving ──────────────────────────────────────────────────────────────────

export type SaveStep =
  | { kind: "delete"; id: string; key: string }
  | { kind: "create"; key: string; body: Record<string, unknown> }
  | { kind: "update"; id: string; key: string; body: Record<string, unknown> }
  /** Keys in their final order; resolved to ids once the creates have run. */
  | { kind: "reorder"; sectionId: string; keys: readonly string[] }
  | { kind: "section"; sectionId: string; body: { configuration: Record<string, unknown> } };

const bothBlank = (text: Bilingual) => blank(text.ar) && blank(text.en);

/** A slide's fields as the API stores them. */
const slideBody = (slide: SlideDraft): Record<string, unknown> => ({
  mediaType: "IMAGE",
  active: slide.active,
  scheduledFrom: slide.scheduledFrom,
  scheduledTo: slide.scheduledTo,
  eyebrow: bothBlank(slide.eyebrow) ? null : slide.eyebrow,
  title: slide.title,
  subtitle: slide.subtitle,
  primaryCta: ctaBody(slide.primaryCta),
  secondaryCta: ctaBody(slide.secondaryCta),
  imageAssetId: slide.imageAssetId,
  desktopFocalPoint: slide.desktopFocalPoint,
  useMobileImage: slide.useMobileImage,
  mobileImageAssetId: slide.mobileImageAssetId,
  mobileFocalPoint: slide.mobileFocalPoint,
  ltrImageMode: slide.ltrImageMode,
  ltrImageAssetId: slide.ltrImageAssetId,
  ltrFocalPoint: slide.ltrFocalPoint,
});

const ctaBody = (button: CtaDraft) => ({
  isVisible: button.isVisible,
  label: bothBlank(button.label) ? null : button.label,
  url: blank(button.url) ? null : button.url.trim(),
});

/** Fields the create body leaves out rather than sending as null, because the
 *  create DTO has no null for them. */
const OMIT_WHEN_NULL = ["scheduledFrom", "scheduledTo", "imageAssetId", "mobileImageAssetId", "ltrImageAssetId", "ltrFocalPoint", "eyebrow"];

const createBody = (slide: SlideDraft, sectionId: string, displayOrder: number) => {
  const body: Record<string, unknown> = { pageSectionId: sectionId, displayOrder, ...slideBody(slide) };
  for (const field of OMIT_WHEN_NULL) if (body[field] === null) delete body[field];
  return body;
};

const eventBody = (event: NextEventDraft) => ({
  isVisible: event.isVisible,
  label: event.label,
  name: event.name,
  venue: event.venue,
  startsAt: event.startsAt || null,
  endsAt: event.endsAt || null,
});

export const planSave = (saved: HeroDraft, draft: HeroDraft): SaveStep[] => {
  const steps: SaveStep[] = [];
  const kept = new Set(draft.slides.map((slide) => slide.id).filter(Boolean));

  // Deletes first: the API counts every slide against the limit of five, so a
  // slide replaced by a new one must be gone before the new one is created.
  for (const slide of saved.slides) {
    if (slide.id && !kept.has(slide.id)) steps.push({ kind: "delete", id: slide.id, key: slide.key });
  }

  draft.slides.forEach((slide, index) => {
    if (!slide.id) steps.push({ kind: "create", key: slide.key, body: createBody(slide, draft.sectionId, index) });
  });

  const storedById = new Map(saved.slides.map((slide) => [slide.id, slide]));
  for (const slide of draft.slides) {
    const stored = slide.id ? storedById.get(slide.id) : undefined;
    if (!slide.id || !stored) continue;
    const before = slideBody(stored);
    const after = slideBody(slide);
    const body: Record<string, unknown> = {};
    for (const field of Object.keys(after)) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) body[field] = after[field];
    }
    if (Object.keys(body).length > 0) steps.push({ kind: "update", id: slide.id, key: slide.key, body });
  }

  const savedOrder = saved.slides.map((slide) => slide.key).filter((key) => draft.slides.some((slide) => slide.key === key));
  const draftOrder = draft.slides.map((slide) => slide.key);
  const created = steps.some((step) => step.kind === "create");
  const deleted = steps.some((step) => step.kind === "delete");
  // After any delete or create the stored positions have gaps or collisions, so
  // the whole order is written again; otherwise only when it changed.
  if (draft.slides.length > 0 && (created || deleted || savedOrder.join() !== draftOrder.join())) {
    steps.push({ kind: "reorder", sectionId: draft.sectionId, keys: draftOrder });
  }

  if (JSON.stringify(saved.nextEvent) !== JSON.stringify(draft.nextEvent) || JSON.stringify(saved.playback) !== JSON.stringify(draft.playback)) {
    steps.push({
      kind: "section",
      sectionId: draft.sectionId,
      body: { configuration: { ...draft.otherSettings, nextEvent: eventBody(draft.nextEvent), playback: draft.playback } },
    });
  }
  return steps;
};

// ── Preview ─────────────────────────────────────────────────────────────────

export interface MediaEntry {
  url: string;
  width: number;
  height: number;
  altText: Bilingual;
  isAiGenerated: boolean;
}

export type MediaLookup = ReadonlyMap<string, MediaEntry>;

const framed = (id: string | null, focalPoint: PointLike | null, media: MediaLookup): HeroImageLike | null => {
  const entry = id ? media.get(id) : undefined;
  if (!entry || !focalPoint) return null;
  return { image: { url: entry.url, width: entry.width, height: entry.height, altText: entry.altText }, focalPoint };
};

/** A slide still being edited, in the shape the site receives a saved one,
 *  so the shared resolver previews it exactly as the site will draw it. */
export const toPreviewSlide = (slide: SlideDraft, media: MediaLookup): HeroSlideLike => {
  const desktop = framed(slide.imageAssetId, slide.desktopFocalPoint, media);
  return {
    desktop,
    desktopLtr: resolveLtrPicture(slide.ltrImageMode, desktop, framed(slide.ltrImageAssetId, slide.ltrFocalPoint, media)),
    mobile: slide.useMobileImage ? framed(slide.mobileImageAssetId, slide.mobileFocalPoint, media) : null,
  };
};

// ── Refusals ────────────────────────────────────────────────────────────────

/** An API refusal as the route handlers return it (`admin-write.ts`). */
export interface Refusal {
  code: string;
  field?: string;
  missing?: string[];
  limit?: number;
}

/**
 * Where on the screen an API refusal belongs: the fields of the slide the step
 * wrote, or the next-event bar and playback for the settings. A refusal that
 * names no field returns nothing here and is shown in the summary instead.
 */
export const refusalToErrors = (step: SaveStep, refusal: Refusal): FieldError[] => {
  const withLimit = (error: FieldError): FieldError =>
    typeof refusal.limit === "number" ? { ...error, limit: refusal.limit } : error;
  // A refusal can name a part and its gaps together (`incompleteCta`: field
  // "primaryCta", missing ["label.ar"]); the gaps are then inside that part.
  const names = refusal.missing
    ? refusal.missing.map((name) => (refusal.field ? `${refusal.field}.${name}` : name))
    : refusal.field
      ? [refusal.field]
      : [];

  if (step.kind === "section") {
    return names.map((name) => {
      if (name === "playback" || name.startsWith("playback.")) return withLimit({ path: "playback.intervalMs", code: refusal.code });
      const relative = name.startsWith("nextEvent.") ? name.slice("nextEvent.".length) : name;
      return withLimit({ path: `nextEvent.${relative}`, code: refusal.code });
    });
  }
  if (step.kind === "reorder") return [];
  return names.map((name) => withLimit({ path: `slides.${step.key}.${name}`, code: refusal.code }));
};
