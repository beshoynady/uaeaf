import type { LocalizedText } from "@/lib/api/types";
import type { AboutDraft, AboutSectionKey } from "./about-readiness";

/**
 * The About page as its screen edits it.
 *
 * It does not go through `editorialDraft`, and the reason is structural rather
 * than stylistic: that helper is built for a record of flat scalar fields, and
 * this record is ten nested sections, three of which hold lists whose items
 * carry an id and a visibility. Bending it to fit would have cost more than
 * the three functions here, and hidden what a save actually sends.
 *
 * `AboutDraft` itself is declared in `about-readiness.ts`, which is where the
 * shape is checked field by field. Declared twice it would have drifted.
 */

type StoredItem = { _id?: string; isVisible?: boolean; displayOrder?: number };

/** The record as the API returns it to the dashboard. Sections are nullable:
 *  a row written before a section existed carries `null` there. */
export interface AboutFederationResponse {
  _id: string;
  /** Returned only by the editing read, which asks for it by name. */
  isActive: boolean;
  hiddenSections: AboutSectionKey[];
  hero: AboutDraft["hero"] | null;
  facts: (AboutDraft["facts"] & { items: (AboutDraft["facts"]["items"][number] & StoredItem)[] }) | null;
  story: AboutDraft["story"] | null;
  timeline: AboutDraft["timeline"] | null;
  achievements: AboutDraft["achievements"] | null;
  pioneers: AboutDraft["pioneers"] | null;
  leadership: AboutDraft["leadership"] | null;
  governance: AboutDraft["governance"] | null;
  ecosystem: AboutDraft["ecosystem"] | null;
  cta: AboutDraft["cta"] | null;
  seo: { metaTitle: LocalizedText | null; metaDescription: LocalizedText | null; ogImageId: string | null } | null;
  publicationState: string;
  /** Read only to order the collection when the URL names no record. */
  createdAt: string;
  updatedAt: string;
}

const EMPTY: LocalizedText = { ar: "", en: "" };

const text = (value: LocalizedText | null | undefined): LocalizedText =>
  value ? { ar: value.ar ?? "", en: value.en ?? "" } : { ...EMPTY };

const link = (value: { label?: LocalizedText; href?: string } | null | undefined) => ({
  label: text(value?.label),
  href: value?.href ?? "",
});

/** The ten sections, in printed order — the same list the page renders by. */
const SECTIONS: readonly AboutSectionKey[] = [
  "hero",
  "facts",
  "story",
  "timeline",
  "achievements",
  "pioneers",
  "leadership",
  "governance",
  "ecosystem",
  "cta",
];

/**
 * The record as the form holds it.
 *
 * Every absent section becomes an empty one rather than staying `null`: the
 * screen needs somewhere to put an editor's first keystroke, and a form that
 * has to check for null before every field is a form with a null check in
 * every field.
 *
 * `isActive` is deliberately not carried. It has its own control, its own
 * route and its own grant; held in the draft it would be saved by the draft's
 * save button, which is exactly the coupling the API refuses.
 */
export const toDraft = (record: AboutFederationResponse): AboutDraft => ({
  hiddenSections: [...(record.hiddenSections ?? [])],
  hero: {
    eyebrow: text(record.hero?.eyebrow),
    title: text(record.hero?.title),
    description: text(record.hero?.description),
    imageId: record.hero?.imageId ?? null,
  },
  facts: { items: (record.facts?.items ?? []).map((item) => ({ ...item })) },
  story: {
    eyebrow: text(record.story?.eyebrow),
    title: text(record.story?.title),
    paragraphs: (record.story?.paragraphs ?? []).map(text),
    imageId: record.story?.imageId ?? null,
    docCard: {
      label: text(record.story?.docCard?.label),
      title: text(record.story?.docCard?.title),
      date: text(record.story?.docCard?.date),
    },
  },
  timeline: {
    eyebrow: text(record.timeline?.eyebrow),
    title: text(record.timeline?.title),
    description: text(record.timeline?.description),
    items: (record.timeline?.items ?? []).map((item) => ({ ...item })),
  },
  achievements: {
    eyebrow: text(record.achievements?.eyebrow),
    title: text(record.achievements?.title),
    description: text(record.achievements?.description),
    items: (record.achievements?.items ?? []).map((item) => ({ ...item })),
  },
  pioneers: {
    eyebrow: text(record.pioneers?.eyebrow),
    title: text(record.pioneers?.title),
    items: (record.pioneers?.items ?? []).map((item) => ({ ...item })),
  },
  leadership: {
    eyebrow: text(record.leadership?.eyebrow),
    title: text(record.leadership?.title),
    quote: text(record.leadership?.quote),
    priorities: (record.leadership?.priorities ?? []).map(text),
  },
  governance: {
    eyebrow: text(record.governance?.eyebrow),
    title: text(record.governance?.title),
    description: text(record.governance?.description),
    cards: (record.governance?.cards ?? []).map((card) => ({ ...card })),
    link: link(record.governance?.link),
  },
  ecosystem: { eyebrow: text(record.ecosystem?.eyebrow), title: text(record.ecosystem?.title) },
  cta: {
    title: text(record.cta?.title),
    description: text(record.cta?.description),
    primary: link(record.cta?.primary),
    secondary: link(record.cta?.secondary),
  },
  seo: {
    metaTitle: text(record.seo?.metaTitle),
    metaDescription: text(record.seo?.metaDescription),
    ogImageId: record.seo?.ogImageId ?? "",
  },
});

/**
 * The SEO block as the API takes it.
 *
 * Every field of `PageSeoDto` is optional and each half of a bilingual pair
 * must be non-empty, so a field the editor has left blank is left out of the
 * body rather than sent as two empty strings — which the API would refuse,
 * failing the whole save over a field nobody filled in.
 */
const seoForWire = (seo: AboutDraft["seo"]): Record<string, unknown> => {
  const body: Record<string, unknown> = {};
  if (seo.metaTitle.ar.trim() && seo.metaTitle.en.trim()) {
    body.metaTitle = seo.metaTitle;
  }
  if (seo.metaDescription.ar.trim() && seo.metaDescription.en.trim()) {
    body.metaDescription = seo.metaDescription;
  }
  if (seo.ogImageId) {
    body.ogImageId = seo.ogImageId;
  }
  return body;
};

/** Structural comparison. Order matters inside a list, which is why this is a
 *  serialisation rather than a key-by-key diff: a reordered list is a changed
 *  list, and the page prints it in that order. */
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

export const changedFrom = (original: AboutDraft, draft: AboutDraft): boolean => !same(original, draft);

/** `displayOrder` is renumbered by the API from the array position, so sending
 *  it is at best noise and at worst a second opinion about the order. `_id` is
 *  kept: it is how the API tells a stored item from a new one. */
const forWire = <T extends StoredItem>(item: T): Omit<T, "displayOrder"> => {
  const { displayOrder, ...rest } = item;
  void displayOrder;
  return rest;
};

const withItems = (section: Record<string, unknown>, key: "items" | "cards"): Record<string, unknown> => {
  const list = section[key];
  return Array.isArray(list) ? { ...section, [key]: list.map((item) => forWire(item as StoredItem)) } : section;
};

/**
 * The smallest body that expresses the change.
 *
 * Only sections that actually differ are named. This is not an optimisation:
 * the API merges a named section field by field over what is stored, so naming
 * a section the editor never opened would rewrite it with whatever this screen
 * loaded — silently reverting whoever saved it last.
 */
export const toPatchBody = (original: AboutDraft, draft: AboutDraft): Record<string, unknown> => {
  const body: Record<string, unknown> = {};

  if (!same(original.hiddenSections, draft.hiddenSections)) {
    body.hiddenSections = draft.hiddenSections;
  }

  for (const key of SECTIONS) {
    if (same(original[key], draft[key])) {
      continue;
    }
    const section = draft[key] as unknown as Record<string, unknown>;
    body[key] = key === "governance" ? withItems(section, "cards") : withItems(section, "items");
  }

  if (!same(original.seo, draft.seo)) {
    body.seo = seoForWire(draft.seo);
  }

  return body;
};
