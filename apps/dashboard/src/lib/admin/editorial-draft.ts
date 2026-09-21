import type { LocalizedText } from "@/lib/api/types";
import { sortBlocks, type BlockDraft } from "@/lib/admin/content-blocks";

/**
 * The draft every editorial screen holds (ADR-0070): what the API returns,
 * what the form edits, and the save body built from the two.
 *
 * Two shapes, deliberately. Every field the API may return as `null` is an
 * empty value in the form, because a React input whose value is `null` is an
 * uncontrolled input, and an uncontrolled input silently stops recording what
 * the author types.
 *
 * A save sends only what changed. That is not an optimisation: two people may
 * hold one screen open on different sections, and a save that posted every
 * field would have the second overwrite the first's work with the values
 * their form was loaded with.
 *
 * A screen names each field's kind once, and the kind decides both
 * directions.
 */

export interface PageSeo {
  metaTitle: LocalizedText | null;
  metaDescription: LocalizedText | null;
  ogImageId: string | null;
}

export interface SeoDraft {
  metaTitle: LocalizedText;
  metaDescription: LocalizedText;
  ogImageId: string;
}

/** An entry of a list that carries one of the twelve value icons. */
export interface ValueBlock {
  title: LocalizedText;
  description: LocalizedText;
  iconKey: string;
  displayOrder: number;
}

/**
 * How much of each SEO field a search result shows.
 *
 * Guidance, not a limit: the API enforces no maximum on either field, so the
 * counter says what will be visible and leaves the decision with the author.
 * A control that refused a longer title would be inventing a rule the
 * platform does not have.
 */
export const SEO_GUIDANCE = { metaTitle: 60, metaDescription: 160 } as const;

/** How much of a field the author has written, in one language. */
export const seoLength = (value: LocalizedText | null, locale: "ar" | "en"): number =>
  (value?.[locale] ?? "").length;

/**
 * - `text`: required upstream, so an emptied one is sent for the API to
 *   refuse and the author to see, not cleared.
 * - `optionalText`: an emptied one is sent as `null`, which is how the API
 *   clears it.
 * - `image`: a media id; `""` in the form and `null` upstream when none.
 * - `seo`: the three search fields; `null` upstream when all three are empty.
 * - `blocks`: an ordered list, drawn in the order it declares and sent whole,
 *   because order is part of its meaning.
 * - `document`: bilingual rich text, sent whole.
 * - `plain`: a single-language string that is not a media id — a URL segment,
 *   a category name. Sent as typed, including empty, because "" is a value a
 *   required string field can hold and having it silently become `null` would
 *   turn a missing-field error into a type error.
 */
export type FieldKind = "text" | "optionalText" | "image" | "seo" | "blocks" | "document" | "plain";

/** A kind for every field of the draft, and only a kind that fits the
 *  field's type, so a map that forgets a field or misnames one fails to
 *  compile rather than failing to save. */
export type DraftFields<D> = {
  readonly [K in keyof D]: D[K] extends LocalizedText
    ? "text" | "optionalText"
    : D[K] extends string
      ? "image" | "plain"
      : D[K] extends SeoDraft
        ? "seo"
        : D[K] extends readonly BlockDraft[]
          ? "blocks"
          : "document";
};

const EMPTY_TEXT: LocalizedText = { ar: "", en: "" };

const textOr = (value: LocalizedText | null | undefined): LocalizedText =>
  value ? { ar: value.ar ?? "", en: value.en ?? "" } : { ...EMPTY_TEXT };

const isBlank = (value: LocalizedText): boolean => value.ar.trim() === "" && value.en.trim() === "";

const toInput = (kind: FieldKind, stored: unknown): unknown => {
  switch (kind) {
    case "text":
    case "optionalText":
      return textOr(stored as LocalizedText | null | undefined);
    case "image":
    case "plain":
      return (stored as string | null | undefined) ?? "";
    case "seo": {
      const seo = stored as PageSeo | null | undefined;
      return {
        metaTitle: textOr(seo?.metaTitle),
        metaDescription: textOr(seo?.metaDescription),
        ogImageId: seo?.ogImageId ?? "",
      };
    }
    case "blocks":
      // Sorted by the order the entries declare rather than the order they
      // arrived in: a list drawn in arrival order would renumber itself the
      // first time anything moved.
      return sortBlocks((stored as BlockDraft[] | null | undefined) ?? []);
    case "document": {
      const document = stored as { ar?: unknown; en?: unknown } | null | undefined;
      return { ar: document?.ar ?? null, en: document?.en ?? null };
    }
  }
};

const toStored = (kind: FieldKind, input: unknown): unknown => {
  switch (kind) {
    case "optionalText":
      return isBlank(input as LocalizedText) ? null : input;
    case "image":
      return input === "" ? null : input;
    case "seo": {
      const { metaTitle, metaDescription, ogImageId } = input as SeoDraft;
      if (isBlank(metaTitle) && isBlank(metaDescription) && ogImageId === "") {
        return null;
      }
      return {
        metaTitle: isBlank(metaTitle) ? null : metaTitle,
        metaDescription: isBlank(metaDescription) ? null : metaDescription,
        ogImageId: ogImageId === "" ? null : ogImageId,
      };
    }
    case "text":
    case "blocks":
    case "document":
    case "plain":
      return input;
  }
};

/**
 * Reference equality first, deep comparison only if that fails.
 *
 * This runs on every keystroke, over every field, and a rich-text document is
 * large. A field the author has not touched keeps its identity, so the cheap
 * answer is the usual one.
 */
const same = (left: unknown, right: unknown): boolean =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

/**
 * One screen's draft operations, bound to its field kinds.
 *
 * The kinds are the fields the screen edits. Anything else on the record — its
 * id, its publication state, the link that is its identity — is not a field of
 * the draft, so it is never sent however the draft is mutated.
 *
 * - `toDraft`: the record as the form holds it.
 * - `changedFrom`: what the draft changed, by field name, against a baseline
 *   the caller built once; rebuilt per keystroke, it would share no identity
 *   and defeat the fast path above. An emptied optional field and an absent
 *   one compare equal, so a freshly loaded record is never dirty.
 * - `toPatchBody`: the request body for a save, only the fields that changed.
 */
export const editorialDraft = <R extends Record<keyof D, unknown>, D>(kinds: DraftFields<D>) => {
  const fields = Object.keys(kinds) as (keyof D & string)[];
  const kindOf = (field: keyof D & string): FieldKind => (kinds as Record<string, FieldKind>)[field];

  const toDraft = (record: R): D =>
    Object.fromEntries(fields.map((field) => [field, toInput(kindOf(field), record[field])])) as D;

  const changedFrom = (original: D, draft: D): (keyof D & string)[] =>
    fields.filter((field) => !same(original[field], draft[field]));

  const toPatchBody = (original: D, draft: D): Record<string, unknown> =>
    Object.fromEntries(
      changedFrom(original, draft).map((field) => [field, toStored(kindOf(field), draft[field])]),
    );

  return { toDraft, changedFrom, toPatchBody };
};
