import { describe, expect, it } from "vitest";
import { changedFrom, toDraft, toPatchBody } from "./about-federation";
import type { AboutFederationResponse } from "./about-federation";

/**
 * Turning the stored record into what the screen edits, and back into the
 * smallest body that expresses the change.
 *
 * "Smallest" is not an optimisation. The API merges a section field by field
 * and replaces a list wholesale, so a body naming a section the editor never
 * opened would rewrite it with whatever this screen happened to hold — which
 * is how one editor's save quietly reverts another's.
 */

const pair = (ar: string, en: string) => ({ ar, en });
const both = (value: string) => pair(value, value);

const record = (extra: Partial<AboutFederationResponse> = {}): AboutFederationResponse =>
  ({
    _id: "page1",
    isActive: false,
    hiddenSections: [],
    hero: { eyebrow: both("e"), title: both("t"), description: both("d"), imageId: null },
    facts: { items: [{ _id: "f1", value: "1974", badge: both("b"), label: both("l"), tone: "green", isVisible: true, displayOrder: 1 }] },
    story: {
      eyebrow: both("e"),
      title: both("t"),
      paragraphs: [both("p")],
      imageId: null,
      docCard: { label: both("l"), title: both("t"), date: both("d") },
    },
    timeline: {
      eyebrow: both("e"),
      title: both("t"),
      description: both("d"),
      items: [
        {
          _id: "m1",
          datePrecision: "year",
          year: 1974,
          month: null,
          day: null,
          category: "association",
          title: both("t"),
          description: both("d"),
          featured: false,
          imageId: null,
          isVisible: true,
          displayOrder: 1,
        },
      ],
    },
    achievements: { eyebrow: both("e"), title: both("t"), description: both("d"), items: [] },
    pioneers: { eyebrow: both("e"), title: both("t"), items: [] },
    leadership: { eyebrow: both("e"), title: both("t"), quote: both("q"), priorities: [both("1")] },
    governance: {
      eyebrow: both("e"),
      title: both("t"),
      description: both("d"),
      cards: [],
      link: { label: both("l"), href: "/x" },
    },
    ecosystem: { eyebrow: both("e"), title: both("t") },
    cta: {
      title: both("t"),
      description: both("d"),
      primary: { label: both("l"), href: "/a" },
      secondary: { label: both("l"), href: "/b" },
    },
    seo: { metaTitle: both("t"), metaDescription: both("d"), ogImageId: null },
    publicationState: "Draft",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...extra,
  }) as AboutFederationResponse;

describe("toDraft", () => {
  it("carries every section across", () => {
    const draft = toDraft(record());

    for (const key of ["hero", "facts", "story", "timeline", "achievements", "pioneers", "leadership", "governance", "ecosystem", "cta"]) {
      expect(draft[key as keyof typeof draft]).toBeTruthy();
    }
  });

  /** A record written before a section existed has `null` where the screen
   *  needs an object to put an editor's first keystroke into. */
  it("fills an absent section with empty fields rather than leaving it null", () => {
    const draft = toDraft(record({ pioneers: null } as Partial<AboutFederationResponse>));

    expect(draft.pioneers.items).toEqual([]);
    expect(draft.pioneers.title).toEqual({ ar: "", en: "" });
  });

  it("does not carry the activation switch, which is not part of the draft", () => {
    expect("isActive" in toDraft(record({ isActive: true }))).toBe(false);
  });
});

describe("changedFrom", () => {
  it("sees no change in an untouched draft", () => {
    const original = toDraft(record());

    expect(changedFrom(original, original)).toBe(false);
  });

  it("sees a change to a heading", () => {
    const original = toDraft(record());
    const edited = { ...original, hero: { ...original.hero, title: pair("جديد", "New") } };

    expect(changedFrom(original, edited)).toBe(true);
  });

  it("sees a reordered list, because the order is part of its meaning", () => {
    const two = record({
      timeline: {
        ...record().timeline!,
        items: [
          { ...record().timeline!.items[0], _id: "m1" },
          { ...record().timeline!.items[0], _id: "m2" },
        ],
      },
    } as Partial<AboutFederationResponse>);
    const original = toDraft(two);
    const swapped = {
      ...original,
      timeline: { ...original.timeline, items: [original.timeline.items[1], original.timeline.items[0]] },
    };

    expect(changedFrom(original, swapped)).toBe(true);
  });

  it("sees a section switched off", () => {
    const original = toDraft(record());

    expect(changedFrom(original, { ...original, hiddenSections: ["facts"] })).toBe(true);
  });
});

describe("toPatchBody", () => {
  it("sends nothing at all when nothing changed", () => {
    const original = toDraft(record());

    expect(toPatchBody(original, original)).toEqual({});
  });

  /** The load-bearing case: a body naming a section the editor never opened
   *  would rewrite it with this screen's copy of it, reverting whoever saved
   *  it last. */
  it("names only the section that changed", () => {
    const original = toDraft(record());
    const edited = { ...original, hero: { ...original.hero, title: pair("جديد", "New") } };

    expect(Object.keys(toPatchBody(original, edited))).toEqual(["hero"]);
  });

  it("sends the changed section whole, because the API merges it field by field", () => {
    const original = toDraft(record());
    const edited = { ...original, hero: { ...original.hero, title: pair("جديد", "New") } };
    const body = toPatchBody(original, edited) as { hero: Record<string, unknown> };

    expect(body.hero.title).toEqual(pair("جديد", "New"));
    expect(body.hero.eyebrow).toEqual(both("e"));
  });

  it("sends hiddenSections on its own when only the switches moved", () => {
    const original = toDraft(record());

    expect(toPatchBody(original, { ...original, hiddenSections: ["cta"] })).toEqual({ hiddenSections: ["cta"] });
  });

  /** `displayOrder` is renumbered by the API from the array position, and
   *  `_id` is how it tells a stored item from a new one — so an item keeps its
   *  id and drops its ordering integer. */
  it("keeps each item's id and leaves the ordering to the API", () => {
    const original = toDraft(record());
    const edited = {
      ...original,
      timeline: {
        ...original.timeline,
        items: [{ ...original.timeline.items[0], title: pair("جديد", "New") }],
      },
    };
    const body = toPatchBody(original, edited) as { timeline: { items: Record<string, unknown>[] } };

    expect(body.timeline.items[0]._id).toBe("m1");
    expect("displayOrder" in body.timeline.items[0]).toBe(false);
  });

  it("sends a newly added item with no id, which is how the API knows it is new", () => {
    const original = toDraft(record());
    const edited = {
      ...original,
      timeline: {
        ...original.timeline,
        items: [...original.timeline.items, { ...original.timeline.items[0], _id: undefined }],
      },
    };
    const body = toPatchBody(original, edited) as { timeline: { items: Record<string, unknown>[] } };

    expect(body.timeline.items[1]._id).toBeUndefined();
  });
});
