import { describe, expect, it } from "vitest";
import {
  addSlide,
  adoptCreated,
  duplicateSlide,
  fromApi,
  heroPosition,
  isDirty,
  moveSlide,
  moveSlideTo,
  planSave,
  refusalToErrors,
  removeSlide,
  slideChanged,
  slideStatus,
  temporaryImageCount,
  toPreviewSlide,
  updateSlide,
  validateDraft,
} from "./homepage-hero";
import type { HeroDraft, MediaLookup } from "./homepage-hero";

const section = {
  _id: "sec1",
  sectionType: "HERO",
  configuration: {
    nextEvent: {
      isVisible: true,
      label: { ar: "البطولة القادمة", en: "Next championship" },
      name: { ar: "بطولة الإمارات", en: "UAE Championship" },
      venue: { ar: "أبوظبي", en: "Abu Dhabi" },
      startsAt: "2026-10-16T14:00:00.000Z",
      endsAt: "2026-10-18T18:00:00.000Z",
    },
    playback: { autoplay: true, intervalMs: 7000 },
  },
};

const slideRecord = (id: string, displayOrder: number, overrides: Record<string, unknown> = {}) => ({
  _id: id,
  mediaType: "IMAGE",
  imageAssetId: "img1",
  desktopFocalPoint: { x: 30, y: 62 },
  useMobileImage: false,
  mobileImageAssetId: null,
  mobileFocalPoint: { x: 50, y: 50 },
  ltrImageMode: "mirror",
  ltrImageAssetId: null,
  ltrFocalPoint: null,
  eyebrow: null,
  title: { ar: "المضمار يبدأ من هنا", en: "The track starts here" },
  subtitle: { ar: "اتحاد يقود ألعاب القوى", en: "The federation" },
  primaryCta: { isVisible: true, label: { ar: "البطولات", en: "Championships" }, url: "/championships" },
  secondaryCta: { isVisible: false, label: null, url: null },
  displayOrder,
  active: true,
  scheduledFrom: null,
  scheduledTo: null,
  ...overrides,
});

const loaded = (): HeroDraft => fromApi(section, [slideRecord("s2", 1), slideRecord("s1", 0)]);

describe("reading what is stored", () => {
  it("orders the slides and fills every optional field an editor can touch", () => {
    const draft = loaded();
    expect(draft.slides.map((slide) => slide.id)).toEqual(["s1", "s2"]);
    expect(draft.slides[0].eyebrow).toEqual({ ar: "", en: "" });
    expect(draft.slides[0].secondaryCta).toEqual({ isVisible: false, label: { ar: "", en: "" }, url: "" });
    expect(draft.playback).toEqual({ autoplay: true, intervalMs: 7000 });
    expect(draft.nextEvent.name.en).toBe("UAE Championship");
  });

  it("starts from a hidden, empty bar and the default playback when the section has neither", () => {
    const draft = fromApi({ _id: "sec1", sectionType: "HERO", configuration: null }, []);
    expect(draft.nextEvent).toMatchObject({ isVisible: false, startsAt: "", endsAt: "" });
    expect(draft.playback).toEqual({ autoplay: true, intervalMs: 7000 });
  });
});

describe("editing the list", () => {
  it("adds a hidden slide, and refuses a sixth", () => {
    let draft = loaded();
    draft = addSlide(draft);
    expect(draft.slides).toHaveLength(3);
    expect(draft.slides[2]).toMatchObject({ id: null, active: false, ltrImageMode: "mirror" });
    draft = addSlide(addSlide(addSlide(draft)));
    expect(draft.slides).toHaveLength(5);
    expect(addSlide(draft)).toBe(draft);
  });

  it("duplicates a slide hidden, beside the original, without its id", () => {
    const draft = duplicateSlide(loaded(), loaded().slides[0].key);
    expect(draft.slides).toHaveLength(3);
    expect(draft.slides[1]).toMatchObject({ id: null, active: false, title: loaded().slides[0].title });
  });

  it("moves a slide by one place and stops at either end", () => {
    const draft = loaded();
    const [first, second] = draft.slides;
    expect(moveSlide(draft, second.key, -1).slides.map((slide) => slide.key)).toEqual([second.key, first.key]);
    expect(moveSlide(draft, first.key, -1)).toBe(draft);
    expect(moveSlide(draft, second.key, 1)).toBe(draft);
  });

  it("knows when the draft differs from what is stored", () => {
    const saved = loaded();
    expect(isDirty(saved, saved)).toBe(false);
    expect(isDirty(saved, moveSlide(saved, saved.slides[1].key, -1))).toBe(true);
  });

  it("moves a dragged slide to any place, and leaves the draft alone for a drop where it was", () => {
    let draft = addSlide(loaded());
    const keys = draft.slides.map((slide) => slide.key);
    expect(moveSlideTo(draft, keys[2], 0).slides.map((slide) => slide.key)).toEqual([keys[2], keys[0], keys[1]]);
    expect(moveSlideTo(draft, keys[0], 2).slides.map((slide) => slide.key)).toEqual([keys[1], keys[2], keys[0]]);
    expect(moveSlideTo(draft, keys[1], 1)).toBe(draft);
    expect(moveSlideTo(draft, keys[1], 9)).toBe(draft);
    draft = loaded();
    expect(moveSlideTo(draft, "missing", 0)).toBe(draft);
  });

  it("marks only the slides whose own fields changed, and every new one", () => {
    const saved = loaded();
    const draft = addSlide(updateSlide(saved, saved.slides[1].key, { title: { ar: "جديد", en: "New" } }));
    expect(draft.slides.map((slide) => slideChanged(saved, slide))).toEqual([false, true, true]);
    // A move alone is the list's change, not the slide's.
    const moved = moveSlide(saved, saved.slides[1].key, -1);
    expect(moved.slides.map((slide) => slideChanged(saved, slide))).toEqual([false, false]);
  });
});

describe("after a save", () => {
  it("gives each created slide its new id as both id and key, and leaves every other slide alone", () => {
    const draft = addSlide(loaded());
    const localKey = draft.slides[2].key;
    const next = adoptCreated(draft, { [localKey]: "64b0000000000000000000c1" });
    expect(next.slides.map((slide) => [slide.key, slide.id])).toEqual([
      ["s1", "s1"],
      ["s2", "s2"],
      ["64b0000000000000000000c1", "64b0000000000000000000c1"],
    ]);
    expect(adoptCreated(draft, {})).toBe(draft);
  });
});

describe("the preview's place among the slides visitors see", () => {
  const now = new Date("2026-09-17T08:00:00.000Z");
  const three = () => {
    const draft = addSlide(loaded());
    return draft.slides.map((slide, at) => (at === 1 ? { ...slide, active: false } : { ...slide, active: true }));
  };

  it("counts only the slides a visitor gets, and numbers a visible slide among them", () => {
    const slides = three();
    expect(heroPosition(slides, slides[2].key, now)).toEqual({ index: 1, count: 2 });
  });

  it("shows a hidden slide where it would appear once shown", () => {
    const slides = three();
    expect(heroPosition(slides, slides[1].key, now)).toEqual({ index: 1, count: 3 });
  });

  it("draws one mark when nothing is selected or nothing is visible", () => {
    expect(heroPosition([], null, now)).toEqual({ index: 0, count: 1 });
  });
});

describe("what the strip says about a slide", () => {
  const now = new Date("2026-09-17T08:00:00.000Z");
  const base = loaded().slides[0];

  it("is hidden when switched off, whatever its schedule", () => {
    expect(slideStatus({ ...base, active: false, scheduledFrom: "2026-10-01T00:00:00.000Z" }, now)).toBe("hidden");
  });

  it("is scheduled while its window has not opened, or after it has closed", () => {
    expect(slideStatus({ ...base, scheduledFrom: "2026-10-01T00:00:00.000Z" }, now)).toBe("scheduled");
    expect(slideStatus({ ...base, scheduledTo: "2026-09-01T00:00:00.000Z" }, now)).toBe("scheduled");
  });

  it("is visible when on and inside its window", () => {
    expect(slideStatus(base, now)).toBe("visible");
    // Both bounds inclusive, as the API's `selectVisibleInWindow`.
    expect(slideStatus({ ...base, scheduledFrom: now.toISOString(), scheduledTo: now.toISOString() }, now)).toBe("visible");
    expect(slideStatus({ ...base, scheduledFrom: "2026-09-01T00:00:00.000Z", scheduledTo: "2026-10-01T00:00:00.000Z" }, now)).toBe("visible");
  });

  it("counts the generated pictures the draft still uses, once each", () => {
    const media: MediaLookup = new Map([
      ["img1", { url: "/a.png", width: 3840, height: 2160, altText: { ar: "", en: "" }, isAiGenerated: true }],
      ["img2", { url: "/b.png", width: 1170, height: 2532, altText: { ar: "", en: "" }, isAiGenerated: false }],
      ["img3", { url: "/c.png", width: 1170, height: 2532, altText: { ar: "", en: "" }, isAiGenerated: true }],
    ]);
    let draft = loaded();
    expect(temporaryImageCount(draft, media)).toBe(1);
    draft = updateSlide(draft, draft.slides[0].key, { useMobileImage: true, mobileImageAssetId: "img3" });
    expect(temporaryImageCount(draft, media)).toBe(2);
    // A picture left behind by a switched-off option is not on the site.
    draft = updateSlide(draft, draft.slides[0].key, { useMobileImage: false });
    draft = updateSlide(draft, draft.slides[1].key, { ltrImageMode: "same", ltrImageAssetId: "img3" });
    expect(temporaryImageCount(draft, media)).toBe(1);
  });
});

describe("what the API would refuse, said beside the field before the round trip", () => {
  const paths = (draft: HeroDraft) => validateDraft(draft).map((error) => `${error.path}:${error.code}`);

  it("refuses a schedule that ends before it starts, and allows equal or open ends", () => {
    const draft = loaded();
    const key = draft.slides[0].key;
    const reversed = updateSlide(draft, key, { scheduledFrom: "2026-10-10T08:00:00.000Z", scheduledTo: "2026-10-01T08:00:00.000Z" });
    expect(paths(reversed)).toEqual([`slides.${key}.scheduledTo:scheduleEndsBeforeStart`]);
    const equal = updateSlide(draft, key, { scheduledFrom: "2026-10-10T08:00:00.000Z", scheduledTo: "2026-10-10T08:00:00.000Z" });
    expect(paths(equal)).toEqual([]);
    expect(paths(updateSlide(draft, key, { scheduledTo: "2026-10-01T08:00:00.000Z" }))).toEqual([]);
  });

  it("lets a hidden slide be half written", () => {
    const draft = addSlide(loaded());
    expect(paths(draft)).toEqual([]);
  });

  it("names every gap of a visible slide", () => {
    const draft = addSlide(loaded());
    const key = draft.slides[2].key;
    draft.slides[2] = { ...draft.slides[2], active: true, title: { ar: "عنوان", en: "" } };
    expect(paths(draft)).toEqual([
      `slides.${key}.title.en:incompleteSlide`,
      `slides.${key}.subtitle.ar:incompleteSlide`,
      `slides.${key}.subtitle.en:incompleteSlide`,
      `slides.${key}.imageAssetId:incompleteSlide`,
    ]);
  });

  it("holds visible buttons, their labels and links to the hero rule, hidden slide or not", () => {
    const draft = addSlide(loaded());
    const key = draft.slides[2].key;
    draft.slides[2] = {
      ...draft.slides[2],
      primaryCta: { isVisible: true, label: { ar: "استعرض", en: "" }, url: "http://example.com" },
      secondaryCta: { isVisible: true, label: { ar: "ا".repeat(33), en: "Go" }, url: "/news" },
    };
    expect(paths(draft)).toEqual([
      `slides.${key}.primaryCta.label.en:incompleteCta`,
      `slides.${key}.primaryCta.url:invalidCtaUrl`,
      `slides.${key}.secondaryCta.label.ar:ctaLabelTooLong`,
    ]);
  });

  it("counts characters as a reader does and refuses text longer than its field", () => {
    const draft = loaded();
    const key = draft.slides[0].key;
    draft.slides[0] = { ...draft.slides[0], title: { ar: "ع".repeat(45), en: "T" } };
    expect(paths(draft)).toEqual([`slides.${key}.title.ar:heroTextTooLong`]);
  });

  it("requires the phone picture once it is switched on, and a separate English picture with its point", () => {
    const draft = loaded();
    const key = draft.slides[0].key;
    draft.slides[0] = { ...draft.slides[0], useMobileImage: true, ltrImageMode: "separate" };
    expect(paths(draft)).toEqual([
      `slides.${key}.mobileImageAssetId:missingRequiredField`,
      `slides.${key}.ltrImageAssetId:incompleteLtrImage`,
      `slides.${key}.ltrFocalPoint:incompleteLtrImage`,
    ]);
  });

  it("holds the event bar to its rules", () => {
    const draft = loaded();
    draft.nextEvent = { ...draft.nextEvent, venue: { ar: "أبوظبي", en: "" }, endsAt: "2026-10-16T13:00:00.000Z" };
    expect(paths(draft)).toEqual(["nextEvent.venue.en:incompleteNextEvent", "nextEvent.endsAt:nextEventEndsBeforeStart"]);
  });
});

describe("saving as the fewest writes, in an order the API accepts", () => {
  it("does nothing when nothing changed", () => {
    const saved = loaded();
    expect(planSave(saved, saved)).toEqual([]);
  });

  it("deletes first, then creates, then patches only what changed, then reorders, then the settings", () => {
    const saved = loaded();
    let draft = removeSlide(saved, saved.slides[1].key);
    draft = addSlide(draft);
    draft.slides[0] = { ...draft.slides[0], title: { ...draft.slides[0].title, en: "New" } };
    draft = moveSlide(draft, draft.slides[1].key, -1);
    draft = { ...draft, playback: { autoplay: false, intervalMs: 9000 } };

    const steps = planSave(saved, draft);
    expect(steps.map((step) => step.kind)).toEqual(["delete", "create", "update", "reorder", "section"]);
    expect(steps[0]).toMatchObject({ kind: "delete", id: "s2" });
    expect(steps[1]).toMatchObject({ kind: "create", body: { active: false, displayOrder: 0, pageSectionId: "sec1" } });
    expect(steps[2]).toEqual({ kind: "update", id: "s1", key: saved.slides[0].key, body: { title: { ar: "المضمار يبدأ من هنا", en: "New" } } });
    expect(steps[3]).toMatchObject({ kind: "reorder", keys: [draft.slides[0].key, draft.slides[1].key] });
    expect(steps[4]).toMatchObject({ kind: "section", body: { configuration: { playback: { autoplay: false, intervalMs: 9000 } } } });
  });

  it("does not reorder when only fields changed", () => {
    const saved = loaded();
    const draft = { ...saved, slides: saved.slides.map((slide, index) => (index === 0 ? { ...slide, active: false } : slide)) };
    expect(planSave(saved, draft).map((step) => step.kind)).toEqual(["update"]);
  });
});

describe("previewing a slide nobody has saved", () => {
  const media: MediaLookup = new Map([
    ["img1", { url: "a.jpg", width: 3840, height: 2160, altText: { ar: "ع", en: "E" }, isAiGenerated: true }],
    ["img2", { url: "b.jpg", width: 1080, height: 1920, altText: { ar: "ع", en: "E" }, isAiGenerated: false }],
  ]);

  it("gives the shared resolver the slide as the site will receive it", () => {
    const slide = loaded().slides[0];
    const preview = toPreviewSlide({ ...slide, useMobileImage: true, mobileImageAssetId: "img2" }, media);
    expect(preview.desktop?.image.url).toBe("a.jpg");
    expect(preview.desktopLtr).toMatchObject({ mirrored: true, focalPoint: { x: 70, y: 62 } });
    expect(preview.mobile?.image.url).toBe("b.jpg");
  });

  it("offers no phone picture while the switch is off, even when one is chosen", () => {
    const slide = { ...loaded().slides[0], useMobileImage: false, mobileImageAssetId: "img2" };
    expect(toPreviewSlide(slide, media).mobile).toBeNull();
  });
});

describe("placing an API refusal beside its field", () => {
  it("puts a slide's missing fields on that slide", () => {
    const step = { kind: "update", id: "s1", key: "s1", body: {} } as const;
    expect(refusalToErrors(step, { code: "incompleteSlide", missing: ["title.en", "imageAssetId"] })).toEqual([
      { path: "slides.s1.title.en", code: "incompleteSlide" },
      { path: "slides.s1.imageAssetId", code: "incompleteSlide" },
    ]);
  });

  it("puts a button's missing parts on that button, when the refusal names the button and its gaps", () => {
    const step = { kind: "update", id: "s1", key: "s1", body: {} } as const;
    expect(refusalToErrors(step, { code: "incompleteCta", field: "primaryCta", missing: ["label.ar", "url"] })).toEqual([
      { path: "slides.s1.primaryCta.label.ar", code: "incompleteCta" },
      { path: "slides.s1.primaryCta.url", code: "incompleteCta" },
    ]);
  });

  it("puts a named field and its limit on that slide", () => {
    const step = { kind: "create", key: "new-7", body: {} } as const;
    expect(refusalToErrors(step, { code: "heroTextTooLong", field: "title.ar", limit: 44 })).toEqual([
      { path: "slides.new-7.title.ar", code: "heroTextTooLong", limit: 44 },
    ]);
  });

  it("puts the settings' refusals under the bar and the playback", () => {
    const step = { kind: "section", sectionId: "sec1", body: { configuration: {} } } as const;
    expect(refusalToErrors(step, { code: "incompleteNextEvent", missing: ["venue.en", "startsAt"] })).toEqual([
      { path: "nextEvent.venue.en", code: "incompleteNextEvent" },
      { path: "nextEvent.startsAt", code: "incompleteNextEvent" },
    ]);
    expect(refusalToErrors(step, { code: "invalidPlayback", field: "playback" })).toEqual([
      { path: "playback.intervalMs", code: "invalidPlayback" },
    ]);
    expect(refusalToErrors(step, { code: "heroTextTooLong", field: "nextEvent.name.en", limit: 52 })).toEqual([
      { path: "nextEvent.name.en", code: "heroTextTooLong", limit: 52 },
    ]);
  });

  it("names no field when the refusal names none", () => {
    const step = { kind: "reorder", sectionId: "sec1", keys: [] } as const;
    expect(refusalToErrors(step, { code: "invalidListOrder" })).toEqual([]);
  });
});
