import { describe, expect, it } from "vitest";
import { readNextEvent, readPlayback } from "./homepage";
import type { PageSectionPublic } from "@/lib/api/types";

const section = (configuration: Record<string, unknown>) =>
  ({ id: "s", sectionType: "HERO", configuration }) as unknown as PageSectionPublic;

const nextEvent = {
  isVisible: true,
  label: { ar: "البطولة القادمة", en: "Next championship" },
  name: { ar: "بطولة الإمارات", en: "UAE Championship" },
  venue: { ar: "أبوظبي", en: "Abu Dhabi" },
  startsAt: "2026-10-16T14:00:00.000Z",
  endsAt: "2026-10-18T18:00:00.000Z",
};

const now = new Date("2026-09-17T10:00:00+04:00");

describe("the next event, read from the HERO section's hand-entered settings", () => {
  it("reads the label, name and venue in the page's language, with both instants", () => {
    expect(readNextEvent(section({ nextEvent }), "en", now)).toEqual({
      label: "Next championship",
      name: "UAE Championship",
      venue: "Abu Dhabi",
      startsAt: "2026-10-16T14:00:00.000Z",
      endsAt: "2026-10-18T18:00:00.000Z",
      event: nextEvent,
    });
  });

  it("draws no bar when it is switched off, incomplete or over", () => {
    expect(readNextEvent(section({ nextEvent: { ...nextEvent, isVisible: false } }), "ar", now)).toBeNull();
    expect(readNextEvent(section({ nextEvent: { ...nextEvent, name: { ar: "", en: "" } } }), "ar", now)).toBeNull();
    expect(readNextEvent(section({ nextEvent }), "ar", new Date("2026-10-18T18:00:00.000Z"))).toBeNull();
    expect(readNextEvent(null, "ar", now)).toBeNull();
  });

  it("still draws a bar while the event runs", () => {
    expect(readNextEvent(section({ nextEvent }), "ar", new Date("2026-10-17T10:00:00.000Z"))?.name).toBe("بطولة الإمارات");
  });
});

describe("the slides' playback", () => {
  it("reads what the editor chose", () => {
    expect(readPlayback(section({ playback: { autoplay: false, intervalMs: 9000 } }))).toEqual({ autoplay: false, intervalMs: 9000 });
  });

  it("falls back to autoplay at the default duration for anything it cannot use", () => {
    expect(readPlayback(section({}))).toEqual({ autoplay: true, intervalMs: 7000 });
    expect(readPlayback(section({ playback: { autoplay: true, intervalMs: 1234 } }))).toEqual({ autoplay: true, intervalMs: 7000 });
    expect(readPlayback(null)).toEqual({ autoplay: true, intervalMs: 7000 });
  });
});
