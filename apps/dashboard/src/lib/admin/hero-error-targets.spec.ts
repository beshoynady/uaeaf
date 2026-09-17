import { describe, expect, it } from "vitest";
import { errorTarget } from "./hero-error-targets";

describe("where an error's summary link goes", () => {
  it("names a slide text's own half, and the slide to open first", () => {
    expect(errorTarget("slides.new-2.title.en")).toEqual({
      group: "slide",
      slideKey: "new-2",
      elementId: "slide-new-2-title-en",
      field: "headline",
      language: "en",
    });
    expect(errorTarget("slides.abc.eyebrow.ar")).toMatchObject({ elementId: "slide-abc-eyebrow-ar", field: "eyebrow", language: "ar" });
    expect(errorTarget("slides.abc.subtitle.ar")).toMatchObject({ elementId: "slide-abc-subtitle-ar", field: "body" });
  });

  it("names a button's label half or its link, with the button it belongs to", () => {
    expect(errorTarget("slides.abc.primaryCta.label.ar")).toEqual({
      group: "slide",
      slideKey: "abc",
      elementId: "slide-abc-primary-label-ar",
      field: "buttonLabel",
      slot: "buttonPrimary",
      language: "ar",
    });
    expect(errorTarget("slides.abc.secondaryCta.url")).toEqual({
      group: "slide",
      slideKey: "abc",
      elementId: "slide-abc-secondary-url",
      field: "buttonUrl",
      slot: "buttonSecondary",
      language: null,
    });
  });

  it("names the schedule's end, on its slide", () => {
    expect(errorTarget("slides.abc.scheduledTo")).toEqual({ group: "slide", slideKey: "abc", elementId: "slide-abc-until", field: "hidesAfter", language: null });
  });

  it("names the picture field for each picture, including the English one's focal point", () => {
    expect(errorTarget("slides.abc.imageAssetId")).toMatchObject({ elementId: "slide-abc-desktop", field: "desktopImage" });
    expect(errorTarget("slides.abc.mobileImageAssetId")).toMatchObject({ elementId: "slide-abc-mobile", field: "mobileImage" });
    expect(errorTarget("slides.abc.ltrImageAssetId")).toMatchObject({ elementId: "slide-abc-ltr", field: "englishImage" });
    expect(errorTarget("slides.abc.ltrFocalPoint")).toMatchObject({ elementId: "slide-abc-ltr", field: "englishImage" });
  });

  it("names the event bar's fields and the playback duration, which open no slide", () => {
    expect(errorTarget("nextEvent.venue.en")).toEqual({
      group: "event",
      slideKey: null,
      elementId: "hero-event-venue-en",
      field: "eventVenue",
      language: "en",
    });
    expect(errorTarget("nextEvent.endsAt")).toMatchObject({ elementId: "hero-event-ends", field: "endsAt", language: null });
    expect(errorTarget("nextEvent.startsAt")).toMatchObject({ elementId: "hero-event-starts", field: "startsAt" });
    expect(errorTarget("playback.intervalMs")).toEqual({
      group: "playback",
      slideKey: null,
      elementId: "hero-interval",
      field: "interval",
      language: null,
    });
  });

  it("falls back to the part of the screen when the API names a field the screen has no control for", () => {
    expect(errorTarget("slides.abc.mediaType")).toMatchObject({ group: "slide", slideKey: "abc", elementId: "slide-abc-text", field: "sectionText" });
    expect(errorTarget("nextEvent")).toMatchObject({ group: "event", elementId: "hero-event-heading", field: "eventHeading" });
  });
});
