import { describe, expect, it } from "vitest";
import { readinessOf, submissionBlocked, type AboutDraft } from "./about-readiness";

/**
 * What the screen tells an editor before they send the page for approval.
 *
 * Three levels, and the difference between them is what an editor is expected
 * to do about it:
 *
 * - **required** — the page cannot be published like this, so the submit
 *   button is closed and says why. Only one thing qualifies: a required field
 *   written in one language and not the other, which would publish a page that
 *   is broken for half its readers.
 * - **warning** — publishable, but the editor should know. An empty picture
 *   slot prints an identity-coloured surface, which is a deliberate design,
 *   not a failure — so it never blocks.
 * - **info** — nothing to fix. An undated milestone is being withheld exactly
 *   as intended, and the notice exists so its absence from the page is never a
 *   surprise.
 */

const pair = (ar: string, en: string) => ({ ar, en });
const both = (value: string) => pair(value, value);

const milestone = (extra: Record<string, unknown> = {}) => ({
  _id: "m1",
  datePrecision: "year" as const,
  year: 1974,
  category: "association",
  title: both("t"),
  description: both("d"),
  featured: false,
  imageId: null,
  isVisible: true,
  ...extra,
});

const draft = (extra: Partial<AboutDraft> = {}): AboutDraft =>
  ({
    hiddenSections: [],
    hero: { eyebrow: both("e"), title: both("t"), description: both("d"), imageId: "img" },
    facts: { items: [{ _id: "f1", value: "1974", badge: both("b"), label: both("l"), tone: "green", isVisible: true }] },
    story: {
      eyebrow: both("e"),
      title: both("t"),
      paragraphs: [both("p")],
      imageId: "img",
      docCard: { label: both("l"), title: both("t"), date: both("d") },
    },
    timeline: { eyebrow: both("e"), title: both("t"), description: both("d"), items: [milestone()] },
    achievements: {
      eyebrow: both("e"),
      title: both("t"),
      description: both("d"),
      items: [
        {
          _id: "a1",
          year: 2014,
          place: both("p"),
          medalKind: "gold",
          medalLabel: null,
          title: both("t"),
          description: both("d"),
          athleteId: null,
          imageId: "img",
          isVisible: true,
        },
      ],
    },
    pioneers: {
      eyebrow: both("e"),
      title: both("t"),
      items: [
        { _id: "p1", name: both("n"), badge: both("b"), description: both("d"), imageId: "img", featured: true, isVisible: true },
      ],
    },
    leadership: { eyebrow: both("e"), title: both("t"), quote: both("q"), priorities: [both("1")] },
    governance: {
      eyebrow: both("e"),
      title: both("t"),
      description: both("d"),
      cards: [{ _id: "c1", title: both("t"), text: both("x"), tone: "green", isVisible: true }],
      link: { label: both("l"), href: "/x" },
    },
    ecosystem: { eyebrow: both("e"), title: both("t") },
    cta: {
      title: both("t"),
      description: both("d"),
      primary: { label: both("l"), href: "/a" },
      secondary: { label: both("l"), href: "/b" },
    },
    seo: { metaTitle: both("t"), metaDescription: both("d"), ogImageId: "img" },
    ...extra,
  }) as AboutDraft;

const sectionNamed = (result: ReturnType<typeof readinessOf>, key: string) =>
  result.sections.find((section) => section.key === key)!;

describe("readinessOf — a page with nothing missing", () => {
  it("reports every section complete", () => {
    const result = readinessOf(draft(), { leaderCount: 7, statCount: 3 });

    expect(result.sections.every((section) => section.status === "complete" || section.status === "auto")).toBe(true);
  });

  it("raises no notices at all", () => {
    expect(readinessOf(draft(), { leaderCount: 7, statCount: 3 }).notices).toEqual([]);
  });

  it("lets the page be submitted", () => {
    expect(submissionBlocked(readinessOf(draft(), { leaderCount: 7, statCount: 3 }))).toBe(false);
  });
});

describe("readinessOf — a half-translated field", () => {
  const halfTranslated = draft({
    story: {
      ...draft().story,
      paragraphs: [pair("فقرة", "")],
    },
  } as Partial<AboutDraft>);

  it("marks the section as missing a translation, and counts how many", () => {
    const section = sectionNamed(readinessOf(halfTranslated, { leaderCount: 1, statCount: 1 }), "story");

    expect(section.status).toBe("translation");
    expect(section.missingTranslations).toBe(1);
  });

  it("raises it at the level that stops the submission", () => {
    const [notice] = readinessOf(halfTranslated, { leaderCount: 1, statCount: 1 }).notices;

    expect(notice.level).toBe("required");
    expect(notice.section).toBe("story");
  });

  it("closes the submit button", () => {
    expect(submissionBlocked(readinessOf(halfTranslated, { leaderCount: 1, statCount: 1 }))).toBe(true);
  });

  /** The notice is a link; without somewhere to send the editor it is just a
   *  complaint. */
  it("names the field to focus", () => {
    const [notice] = readinessOf(halfTranslated, { leaderCount: 1, statCount: 1 }).notices;

    expect(notice.fieldId).toBeTruthy();
  });

  it("counts a missing Arabic half the same as a missing English one", () => {
    const missingArabic = draft({ story: { ...draft().story, paragraphs: [pair("", "para")] } } as Partial<AboutDraft>);

    expect(sectionNamed(readinessOf(missingArabic, { leaderCount: 1, statCount: 1 }), "story").missingTranslations).toBe(1);
  });
});

describe("readinessOf — empty picture slots", () => {
  const noPictures = draft({
    achievements: {
      ...draft().achievements,
      items: draft().achievements.items.map((item) => ({ ...item, imageId: null })),
    },
  } as Partial<AboutDraft>);

  it("marks the section as missing pictures, and counts them", () => {
    const section = sectionNamed(readinessOf(noPictures, { leaderCount: 1, statCount: 1 }), "achievements");

    expect(section.status).toBe("images");
    expect(section.missingImages).toBe(1);
  });

  it("raises it as a warning, which does not stop the submission", () => {
    const result = readinessOf(noPictures, { leaderCount: 1, statCount: 1 });

    expect(result.notices[0].level).toBe("warning");
    expect(submissionBlocked(result)).toBe(false);
  });

  /** A missing translation is the worse problem and is the one an editor
   *  should see first. */
  it("orders a required notice ahead of a warning", () => {
    const both = draft({
      story: { ...draft().story, paragraphs: [pair("فقرة", "")] },
      achievements: {
        ...draft().achievements,
        items: draft().achievements.items.map((item) => ({ ...item, imageId: null })),
      },
    } as Partial<AboutDraft>);

    expect(readinessOf(both, { leaderCount: 1, statCount: 1 }).notices.map((notice) => notice.level)).toEqual([
      "required",
      "warning",
    ]);
  });
});

describe("readinessOf — a milestone with no date", () => {
  const undated = draft({
    timeline: {
      ...draft().timeline,
      items: [milestone(), milestone({ _id: "m2", datePrecision: "unknown", year: null })],
    },
  } as Partial<AboutDraft>);

  it("says so at the information level, which changes nothing about submitting", () => {
    const result = readinessOf(undated, { leaderCount: 1, statCount: 1 });
    const notice = result.notices.find((entry) => entry.section === "timeline")!;

    expect(notice.level).toBe("info");
    expect(submissionBlocked(result)).toBe(false);
  });

  it("counts it among the section's hidden items, not its visible ones", () => {
    const section = sectionNamed(readinessOf(undated, { leaderCount: 1, statCount: 1 }), "timeline");

    expect(section.visibleItems).toBe(1);
    expect(section.hiddenItems).toBe(1);
  });

  it("counts an item the editor hid by hand the same way", () => {
    const hiddenByHand = draft({
      timeline: { ...draft().timeline, items: [milestone(), milestone({ _id: "m2", isVisible: false })] },
    } as Partial<AboutDraft>);

    expect(sectionNamed(readinessOf(hiddenByHand, { leaderCount: 1, statCount: 1 }), "timeline").hiddenItems).toBe(1);
  });
});

describe("readinessOf — a section the editor switched off", () => {
  const off = draft({ hiddenSections: ["achievements"] });

  it("reports it as switched off rather than judging its contents", () => {
    expect(sectionNamed(readinessOf(off, { leaderCount: 1, statCount: 1 }), "achievements").status).toBe("hidden");
  });

  /** A field nobody will read cannot be the reason a page will not publish. */
  it("raises none of its problems, and does not block on them", () => {
    const offAndBroken = draft({
      hiddenSections: ["story"],
      story: { ...draft().story, paragraphs: [pair("فقرة", "")] },
    } as Partial<AboutDraft>);

    const result = readinessOf(offAndBroken, { leaderCount: 1, statCount: 1 });

    expect(result.notices.filter((notice) => notice.section === "story")).toEqual([]);
    expect(submissionBlocked(result)).toBe(false);
  });
});

describe("readinessOf — the two automatic sections", () => {
  it("reports the leadership as automatic, with the number its source holds", () => {
    const section = sectionNamed(readinessOf(draft(), { leaderCount: 7, statCount: 3 }), "leadership");

    expect(section.status).toBe("auto");
    expect(section.sourceCount).toBe(7);
  });

  it("reports the ecosystem as automatic, with the number of tiles that have a figure", () => {
    const section = sectionNamed(readinessOf(draft(), { leaderCount: 7, statCount: 3 }), "ecosystem");

    expect(section.status).toBe("auto");
    expect(section.sourceCount).toBe(3);
  });

  /** They still carry editorial words, and half-translated words still stop a
   *  publish — automatic describes the data, not the writing. */
  it("still blocks on a half-translated quote in the leadership section", () => {
    const halfQuote = draft({ leadership: { ...draft().leadership, quote: pair("اقتباس", "") } } as Partial<AboutDraft>);

    expect(submissionBlocked(readinessOf(halfQuote, { leaderCount: 7, statCount: 3 }))).toBe(true);
  });
});

describe("readinessOf — the hero", () => {
  it("is never reported as switched off, because it cannot be", () => {
    expect(sectionNamed(readinessOf(draft(), { leaderCount: 1, statCount: 1 }), "hero").status).not.toBe("hidden");
  });

  it("still blocks the submission when its own title is half-written", () => {
    const halfTitle = draft({ hero: { ...draft().hero, title: pair("عنوان", "") } } as Partial<AboutDraft>);

    expect(submissionBlocked(readinessOf(halfTitle, { leaderCount: 1, statCount: 1 }))).toBe(true);
  });
});
