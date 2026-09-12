import { describe, expect, it } from "vitest";
import {
  SEO_GUIDANCE,
  addValue,
  changedFields,
  isDirty,
  moveValue,
  removeValue,
  seoLength,
  toDraft,
  toPatchBody,
} from "./president-message";
import type { PresidentMessageDraft, PresidentMessageResponse } from "./president-message";

const text = (value: string) => ({ ar: `${value}-ar`, en: `${value}-en` });

const value = (order: number, name = `v${order}`) => ({
  title: text(name),
  description: text(`${name}-d`),
  iconKey: "star",
  displayOrder: order,
});

const RECORD: PresidentMessageResponse = {
  _id: "abc",
  heroImageId: null,
  heroTitle: text("hero"),
  heroSubtitle: text("sub"),
  featuredImageId: "portrait",
  pullQuote: text("quote"),
  messageBody: { ar: { type: "doc", content: [] }, en: { type: "doc", content: [] } },
  valuesTitle: text("values"),
  values: [value(1), value(2), value(3)],
  signatoryName: text("name"),
  signatoryTitle: text("title"),
  seo: { metaTitle: text("meta"), metaDescription: text("desc"), ogImageId: null },
  publicationState: "Published",
  updatedAt: "2026-09-12T00:00:00.000Z",
};

const draft = () => toDraft(RECORD);

describe("toDraft", () => {
  it("gives every optional field a value to edit, so no input is uncontrolled", () => {
    const bare = toDraft({ ...RECORD, pullQuote: null, valuesTitle: null, seo: null, values: [] });

    expect(bare.pullQuote).toEqual({ ar: "", en: "" });
    expect(bare.valuesTitle).toEqual({ ar: "", en: "" });
    expect(bare.seo.metaTitle).toEqual({ ar: "", en: "" });
    expect(bare.seo.ogImageId).toBe("");
    expect(bare.values).toEqual([]);
  });

  it("orders the values by the order they declare, not the order they arrived in", () => {
    const shuffled = toDraft({ ...RECORD, values: [value(3, "c"), value(1, "a"), value(2, "b")] });

    expect(shuffled.values.map((entry) => entry.title.en)).toEqual(["a-en", "b-en", "c-en"]);
  });
});

describe("reordering a value", () => {
  it("moves one up and renumbers both, so the order is never ambiguous", () => {
    const moved = moveValue(draft().values, 1, -1);

    expect(moved.map((entry) => entry.title.en)).toEqual(["v2-en", "v1-en", "v3-en"]);
    expect(moved.map((entry) => entry.displayOrder)).toEqual([1, 2, 3]);
  });

  it("moves one down", () => {
    const moved = moveValue(draft().values, 0, 1);

    expect(moved.map((entry) => entry.title.en)).toEqual(["v2-en", "v1-en", "v3-en"]);
  });

  /** The buttons are disabled at the ends, but a keyboard repeat can outrun
   *  a re-render — so the model refuses rather than relying on the UI. */
  it.each([
    ["past the top", 0, -1 as const],
    ["past the bottom", 2, 1 as const],
  ])("refuses to move %s, leaving the list alone", (_where, index, direction) => {
    const original = draft().values;
    const moved = moveValue(original, index, direction);

    expect(moved.map((entry) => entry.title.en)).toEqual(
      original.map((entry) => entry.title.en),
    );
  });

  it("leaves the original list untouched, so a rejected edit cannot corrupt state", () => {
    const original = draft().values;
    moveValue(original, 1, -1);

    expect(original.map((entry) => entry.title.en)).toEqual(["v1-en", "v2-en", "v3-en"]);
  });
});

describe("adding and removing values", () => {
  it("adds an empty value at the end, numbered after the last", () => {
    const added = addValue(draft().values);

    expect(added).toHaveLength(4);
    expect(added[3].displayOrder).toBe(4);
    expect(added[3].title).toEqual({ ar: "", en: "" });
    // An icon is required upstream, so a new row starts with a real one
    // rather than an empty select the author must notice.
    expect(added[3].iconKey).toBeTruthy();
  });

  it("renumbers what is left after a removal, leaving no gap", () => {
    const left = removeValue(draft().values, 0);

    expect(left.map((entry) => entry.title.en)).toEqual(["v2-en", "v3-en"]);
    expect(left.map((entry) => entry.displayOrder)).toEqual([1, 2]);
  });
});

describe("the SEO counters", () => {
  /**
   * Guidance, not a limit. The API enforces no maximum on these fields, so a
   * counter that refused to accept a longer title would be inventing a rule
   * the platform does not have — it says how long search engines will show,
   * and leaves the decision with the author.
   */
  it("states a length for each field", () => {
    expect(SEO_GUIDANCE.metaTitle).toBeGreaterThan(0);
    expect(SEO_GUIDANCE.metaDescription).toBeGreaterThan(SEO_GUIDANCE.metaTitle);
  });

  it("counts what the author typed, per language", () => {
    expect(seoLength({ ar: "أربعة", en: "four" }, "en")).toBe(4);
    expect(seoLength({ ar: "أربعة", en: "four" }, "ar")).toBe(5);
  });

  it("counts an empty field as zero rather than as missing", () => {
    expect(seoLength(null, "en")).toBe(0);
    expect(seoLength({ ar: "", en: "" }, "ar")).toBe(0);
  });
});

describe("what counts as an unsaved change", () => {
  it("says nothing changed when nothing did", () => {
    expect(isDirty(RECORD, draft())).toBe(false);
    expect(changedFields(RECORD, draft())).toEqual([]);
  });

  it.each([
    ["heroTitle", (next: PresidentMessageDraft) => (next.heroTitle = text("other"))],
    ["pullQuote", (next: PresidentMessageDraft) => (next.pullQuote = text("other"))],
    ["values", (next: PresidentMessageDraft) => (next.values = moveValue(next.values, 0, 1))],
    ["seo", (next: PresidentMessageDraft) => (next.seo.metaTitle = text("other"))],
    [
      "featuredImageId",
      (next: PresidentMessageDraft) => (next.featuredImageId = "someone-else"),
    ],
  ])("notices a change to %s", (field, mutate) => {
    const next = draft();
    mutate(next);

    expect(isDirty(RECORD, next)).toBe(true);
    expect(changedFields(RECORD, next)).toContain(field);
  });

  /** An empty optional field and an absent one are the same thing to the
   *  author; treating them as different would mark a freshly loaded record
   *  dirty before anyone touched it. */
  it("does not call an untouched record with empty optionals dirty", () => {
    const bare = { ...RECORD, pullQuote: null, valuesTitle: null, seo: null };

    expect(isDirty(bare, toDraft(bare))).toBe(false);
  });
});

describe("toPatchBody", () => {
  it("sends only what changed, so a save cannot overwrite a field nobody edited", () => {
    const next = draft();
    next.pullQuote = text("new quote");

    expect(Object.keys(toPatchBody(RECORD, next))).toEqual(["pullQuote"]);
  });

  it("sends an emptied optional field as null, which is how the API clears it", () => {
    const next = draft();
    next.pullQuote = { ar: "", en: "" };

    expect(toPatchBody(RECORD, next)).toEqual({ pullQuote: null });
  });

  it("sends the values list whole, because order is part of its meaning", () => {
    const next = draft();
    next.values = moveValue(next.values, 0, 1);

    const body = toPatchBody(RECORD, next) as { values: { displayOrder: number }[] };
    expect(body.values.map((entry) => entry.displayOrder)).toEqual([1, 2, 3]);
  });

  it("never sends a field the screen does not edit", () => {
    const next = draft();
    next.heroTitle = text("other");

    const body = toPatchBody(RECORD, next);
    for (const forbidden of ["_id", "publicationState", "updatedAt", "federationAppointmentId"]) {
      expect(body).not.toHaveProperty(forbidden);
    }
  });
});
