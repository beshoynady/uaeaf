import type { JSONContent } from "@tiptap/react";
import type { LocalizedText } from "@/lib/api/types";
import { VALUE_ICON_KEYS } from "@/lib/icons/value-icons";

/**
 * The president's message as this screen edits it.
 *
 * Two shapes, deliberately: what the API returns, and what the form holds.
 * They differ in one way that matters — every optional field the API may
 * return as `null` is an empty value here, because a React input whose value
 * is `null` is an uncontrolled input, and an uncontrolled input silently
 * stops recording what the author types.
 *
 * Turning the draft back into a request is `toPatchBody`, which sends only
 * what changed. That is not an optimisation: two people may hold this screen
 * open on different sections, and a save that posted every field would have
 * the second one overwrite the first's work with the values their form was
 * loaded with.
 */

export interface ValueBlock {
  title: LocalizedText;
  description: LocalizedText;
  iconKey: string;
  displayOrder: number;
}

export interface PageSeo {
  metaTitle: LocalizedText | null;
  metaDescription: LocalizedText | null;
  ogImageId: string | null;
}

export interface PresidentMessageResponse {
  _id: string;
  heroImageId: string | null;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  featuredImageId: string | null;
  pullQuote: LocalizedText | null;
  messageBody: { ar: JSONContent | null; en: JSONContent | null };
  valuesTitle: LocalizedText | null;
  values: ValueBlock[];
  signatoryName: LocalizedText;
  signatoryTitle: LocalizedText;
  seo: PageSeo | null;
  publicationState: string;
  updatedAt: string;
}

export interface SeoDraft {
  metaTitle: LocalizedText;
  metaDescription: LocalizedText;
  ogImageId: string;
}

export interface PresidentMessageDraft {
  heroImageId: string;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  featuredImageId: string;
  pullQuote: LocalizedText;
  messageBody: { ar: JSONContent | null; en: JSONContent | null };
  valuesTitle: LocalizedText;
  values: ValueBlock[];
  signatoryName: LocalizedText;
  signatoryTitle: LocalizedText;
  seo: SeoDraft;
}

/** The fields this screen edits. Anything not here is never sent, however
 *  the draft is mutated — `publicationState` changes by publishing, not by
 *  saving, and the appointment link is the record's identity. */
export const EDITABLE_FIELDS = [
  "heroImageId",
  "heroTitle",
  "heroSubtitle",
  "featuredImageId",
  "pullQuote",
  "messageBody",
  "valuesTitle",
  "values",
  "signatoryName",
  "signatoryTitle",
  "seo",
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

/**
 * How much of each field a search result shows.
 *
 * Guidance, not a limit: the API enforces no maximum on either field, so the
 * counter says what will be visible and leaves the decision with the author.
 * A control that refused a longer title would be inventing a rule the
 * platform does not have.
 */
export const SEO_GUIDANCE = { metaTitle: 60, metaDescription: 160 } as const;

const EMPTY: LocalizedText = { ar: "", en: "" };

const textOr = (value: LocalizedText | null): LocalizedText =>
  value ? { ar: value.ar ?? "", en: value.en ?? "" } : { ...EMPTY };

const isBlank = (value: LocalizedText): boolean =>
  value.ar.trim() === "" && value.en.trim() === "";

export function toDraft(record: PresidentMessageResponse): PresidentMessageDraft {
  return {
    heroImageId: record.heroImageId ?? "",
    heroTitle: textOr(record.heroTitle),
    heroSubtitle: textOr(record.heroSubtitle),
    featuredImageId: record.featuredImageId ?? "",
    pullQuote: textOr(record.pullQuote),
    messageBody: { ar: record.messageBody?.ar ?? null, en: record.messageBody?.en ?? null },
    valuesTitle: textOr(record.valuesTitle),
    // Sorted by the order they declare rather than the order they arrived
    // in: `displayOrder` is the field that means something, and a list drawn
    // in arrival order would renumber itself the first time anything moved.
    values: [...record.values]
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((entry, index) => ({ ...entry, displayOrder: index + 1 })),
    signatoryName: textOr(record.signatoryName),
    signatoryTitle: textOr(record.signatoryTitle),
    seo: {
      metaTitle: textOr(record.seo?.metaTitle ?? null),
      metaDescription: textOr(record.seo?.metaDescription ?? null),
      ogImageId: record.seo?.ogImageId ?? "",
    },
  };
}

/** Renumbers a list so its positions and its `displayOrder`s agree. */
const renumber = (values: readonly ValueBlock[]): ValueBlock[] =>
  values.map((entry, index) => ({ ...entry, displayOrder: index + 1 }));

/**
 * Moves one value one place.
 *
 * Returns a new list; the caller's is untouched. Out-of-range moves return
 * the list unchanged rather than throwing — the buttons are disabled at the
 * ends, but a held key can outrun a re-render, and the model is the right
 * place to be sure rather than the disabled attribute.
 */
export function moveValue(
  values: readonly ValueBlock[],
  index: number,
  direction: -1 | 1,
): ValueBlock[] {
  const target = index + direction;
  if (index < 0 || index >= values.length || target < 0 || target >= values.length) {
    return [...values];
  }

  const next = [...values];
  [next[index], next[target]] = [next[target], next[index]];
  return renumber(next);
}

export function addValue(values: readonly ValueBlock[]): ValueBlock[] {
  return renumber([
    ...values,
    {
      title: { ...EMPTY },
      description: { ...EMPTY },
      // The API requires one, so a new row starts with a real icon rather
      // than an empty select the author has to notice before they can save.
      iconKey: VALUE_ICON_KEYS[0],
      displayOrder: values.length + 1,
    },
  ]);
}

export function removeValue(values: readonly ValueBlock[], index: number): ValueBlock[] {
  return renumber(values.filter((_, position) => position !== index));
}

/** How much of a field the author has written, in one language. */
export function seoLength(value: LocalizedText | null, locale: "ar" | "en"): number {
  return (value?.[locale] ?? "").length;
}

/**
 * Reference equality first, deep comparison only if that fails.
 *
 * This runs on every keystroke, over every field, and `messageBody` is a
 * whole document — stringifying it to answer "did the hero title change"
 * made typing measurably slow. A field the author has not touched keeps its
 * identity, so the cheap answer is the usual one.
 */
const same = (left: unknown, right: unknown): boolean =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

/**
 * What the draft changed, by field name.
 *
 * An emptied optional field and an absent one compare equal: to the author
 * they are the same thing, and treating them as different would mark a
 * freshly loaded record dirty before anyone touched it.
 */
export function changedFields(
  record: PresidentMessageResponse,
  draft: PresidentMessageDraft,
): EditableField[] {
  return changedFrom(toDraft(record), draft);
}

/**
 * The same comparison against a baseline the caller already built.
 *
 * The screen holds one baseline for as long as the record does not change,
 * so the identity fast path above actually fires — rebuilding it per
 * keystroke would defeat it, since a fresh `toDraft` shares nothing.
 */
export function changedFrom(
  original: PresidentMessageDraft,
  draft: PresidentMessageDraft,
): EditableField[] {
  return EDITABLE_FIELDS.filter((field) => !same(original[field], draft[field]));
}

export function isDirty(
  record: PresidentMessageResponse,
  draft: PresidentMessageDraft,
): boolean {
  return changedFields(record, draft).length > 0;
}

/**
 * The request body for a draft save: only the fields that changed.
 *
 * An emptied optional field is sent as `null`, which is how the API clears
 * one — and why the service's partial update had to distinguish an absent
 * key from a null value in the first place.
 */
export function toPatchBody(
  record: PresidentMessageResponse,
  draft: PresidentMessageDraft,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  for (const field of changedFields(record, draft)) {
    if (field === "values" || field === "messageBody") {
      body[field] = draft[field];
      continue;
    }

    if (field === "heroImageId" || field === "featuredImageId") {
      body[field] = draft[field] === "" ? null : draft[field];
      continue;
    }

    if (field === "seo") {
      const { metaTitle, metaDescription, ogImageId } = draft.seo;
      const empty = isBlank(metaTitle) && isBlank(metaDescription) && ogImageId === "";
      body.seo = empty
        ? null
        : {
            metaTitle: isBlank(metaTitle) ? null : metaTitle,
            metaDescription: isBlank(metaDescription) ? null : metaDescription,
            ogImageId: ogImageId === "" ? null : ogImageId,
          };
      continue;
    }

    const value = draft[field] as LocalizedText;
    // `heroTitle`, `heroSubtitle`, `signatoryName` and `signatoryTitle` are
    // required upstream, so an empty one is a validation error to be
    // reported — not a clear. Only the genuinely optional pair clears.
    const clearable = field === "pullQuote" || field === "valuesTitle";
    body[field] = clearable && isBlank(value) ? null : value;
  }

  return body;
}
