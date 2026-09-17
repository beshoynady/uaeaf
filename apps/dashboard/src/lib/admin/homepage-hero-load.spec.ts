import { describe, expect, it } from "vitest";
import { loadHomepageHero, type Read } from "./homepage-hero-load";

const PAGE = "64b000000000000000000010";
const SECTION = "64b000000000000000000020";

const reader = (answers: Record<string, unknown>): Read => async (path) => {
  if (!(path in answers)) throw Object.assign(new Error("not found"), { status: 404 });
  const answer = answers[path];
  if (answer instanceof Error) throw answer;
  return answer;
};

describe("loading the homepage hero", () => {
  it("reads the homepage, its hero section and the section's slides", async () => {
    const result = await loadHomepageHero(
      reader({
        "/pages/public/home": { id: PAGE },
        [`/page-sections/by-page/${PAGE}`]: [
          { _id: "64b000000000000000000021", sectionType: "NEWS", configuration: null },
          { _id: SECTION, sectionType: "HERO", configuration: { playback: { autoplay: false, intervalMs: 9000 } } },
        ],
        [`/hero-slides/by-section/${SECTION}`]: [{ _id: "64b000000000000000000031", displayOrder: 0, active: true }],
      }),
    );
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.draft.sectionId).toBe(SECTION);
    expect(result.draft.playback).toEqual({ autoplay: false, intervalMs: 9000 });
    expect(result.draft.slides.map((slide) => slide.id)).toEqual(["64b000000000000000000031"]);
  });

  it("says there is no homepage when the page or its hero section does not exist", async () => {
    expect(await loadHomepageHero(reader({}))).toEqual({ state: "noHomePage" });
    expect(
      await loadHomepageHero(reader({ "/pages/public/home": { id: PAGE }, [`/page-sections/by-page/${PAGE}`]: [] })),
    ).toEqual({ state: "noHomePage" });
  });

  it("says there is no homepage when the page exists but is not published", async () => {
    // `GET /pages/public/:slug` answers 200 with a null body for a draft page.
    expect(await loadHomepageHero(reader({ "/pages/public/home": null }))).toEqual({ state: "noHomePage" });
  });

  it("says the load failed when a read is refused or the service does not answer", async () => {
    expect(
      await loadHomepageHero(
        reader({ "/pages/public/home": { id: PAGE }, [`/page-sections/by-page/${PAGE}`]: null }),
      ),
    ).toEqual({ state: "loadFailed" });
    expect(await loadHomepageHero(reader({ "/pages/public/home": new Error("offline") }))).toEqual({ state: "loadFailed" });
  });
});
