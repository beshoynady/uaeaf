import type { JSONContent } from "@tiptap/react";
import type { LocalizedText } from "@/lib/api/types";
import { VALUE_ICON_KEYS } from "@/lib/icons/value-icons";
import { editorialDraft, type PageSeo, type SeoDraft, type ValueBlock } from "@/lib/admin/editorial-draft";

/**
 * The president's message as this screen edits it.
 *
 * The draft's two shapes — what the API returns, what the form holds — and the
 * save body that sends only what changed come from `editorialDraft`, shared by
 * every editorial screen (ADR-0070). This file names the fields and keeps what
 * only this screen has: the values list's own operations.
 */

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
  /** When the row was inserted. Read only to order the collection: the screen
   *  edits the oldest record unless the URL names another, and natural order
   *  is not a contract. */
  createdAt: string;
  updatedAt: string;
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
const presidentDraft = editorialDraft<PresidentMessageResponse, PresidentMessageDraft>({
  heroImageId: "image",
  heroTitle: "text",
  heroSubtitle: "text",
  featuredImageId: "image",
  // The only optional pair. `heroTitle`, `heroSubtitle`, `signatoryName` and
  // `signatoryTitle` are required upstream, so an empty one is a validation
  // error to be reported — not a clear.
  pullQuote: "optionalText",
  messageBody: "document",
  valuesTitle: "optionalText",
  values: "blocks",
  signatoryName: "text",
  signatoryTitle: "text",
  seo: "seo",
});

const EMPTY: LocalizedText = { ar: "", en: "" };

export function toDraft(record: PresidentMessageResponse): PresidentMessageDraft {
  return presidentDraft.toDraft(record);
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

/** What the draft changed, by field name, against the record as loaded. */
export function changedFields(
  record: PresidentMessageResponse,
  draft: PresidentMessageDraft,
): (keyof PresidentMessageDraft)[] {
  return changedFrom(toDraft(record), draft);
}

/** The same comparison against a baseline the caller already built and holds
 *  for as long as the record does not change. */
export function changedFrom(
  original: PresidentMessageDraft,
  draft: PresidentMessageDraft,
): (keyof PresidentMessageDraft)[] {
  return presidentDraft.changedFrom(original, draft);
}

export function isDirty(
  record: PresidentMessageResponse,
  draft: PresidentMessageDraft,
): boolean {
  return changedFields(record, draft).length > 0;
}

/** The request body for a draft save: only the fields that changed, an
 *  emptied optional field as `null`. */
export function toPatchBody(
  record: PresidentMessageResponse,
  draft: PresidentMessageDraft,
): Record<string, unknown> {
  return presidentDraft.toPatchBody(toDraft(record), draft);
}
