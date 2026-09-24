import { describe, expect, it } from "vitest";
import { clampPage, feedHref, pageCount, pageWindow } from "./feed-query";
import type { FeedQuery } from "./feed-query";

const base: FeedQuery = { range: {}, page: 1 };

describe("feedHref", () => {
  it("writes the bare listing when nothing narrows it", () => {
    expect(feedHref(base)).toBe("/news");
  });

  it("omits page 1 rather than writing it", () => {
    // `?page=1` beside `/news` would be a second address for one view.
    expect(feedHref(base, { page: 1 })).toBe("/news");
    expect(feedHref({ ...base, page: 4 }, { page: 1 })).toBe("/news");
  });

  it("carries every other filter through a page move", () => {
    const current: FeedQuery = { tag: "relay", topic: "records", range: { from: "2026-01-01" }, page: 1 };

    expect(feedHref(current, { page: 3 })).toBe("/news?tag=relay&topic=records&from=2026-01-01&page=3");
  });

  it("returns to the first page whenever a filter changes", () => {
    // Page 4 of an unfiltered feed is usually past the end of one topic, so
    // keeping the number would land the reader on nothing.
    const current: FeedQuery = { range: {}, page: 4 };

    expect(feedHref(current, { topic: "youth" })).toBe("/news?topic=youth");
  });

  it("clears one filter without disturbing the others", () => {
    const current: FeedQuery = { tag: "relay", topic: "records", range: {}, page: 2 };

    expect(feedHref(current, { topic: undefined })).toBe("/news?tag=relay");
  });

  it("keeps the page when asked for the page it is already on", () => {
    expect(feedHref({ ...base, page: 2 }, { page: 2 })).toBe("/news?page=2");
  });

  it("writes the category, and keeps it independent of the topic", () => {
    // Two different questions about one story: `category` is which shelf of
    // the newsroom wrote it, `topic` is what it is about. A reader may narrow
    // by both at once, so neither may stand in for the other.
    const current: FeedQuery = { range: {}, page: 1 };

    expect(feedHref(current, { category: "FederationInMedia" })).toBe("/news?category=FederationInMedia");
    expect(feedHref({ ...current, category: "FederationInMedia" }, { topic: "international" })).toBe(
      "/news?category=FederationInMedia&topic=international",
    );
  });

  it("clears the category without disturbing the other filters", () => {
    // "All" is the absence of the parameter, not a third value for it.
    const current: FeedQuery = { category: "General", topic: "records", range: {}, page: 3 };

    expect(feedHref(current, { category: undefined })).toBe("/news?topic=records");
  });
});

describe("pageCount", () => {
  it("is one for an empty feed, never zero", () => {
    // Page 1 of 0 is not a thing a pager can render.
    expect(pageCount(0, 12)).toBe(1);
  });

  it("counts a partial last page as a page", () => {
    expect(pageCount(13, 12)).toBe(2);
    expect(pageCount(24, 12)).toBe(2);
    expect(pageCount(25, 12)).toBe(3);
  });
});

describe("clampPage", () => {
  it("reads a page number a reader may have typed", () => {
    expect(clampPage("3", 9)).toBe(3);
  });

  it("refuses everything that is not a whole page number", () => {
    for (const asked of [undefined, "", "0", "-2", "1.5", "two", "1e3x"]) {
      expect(clampPage(asked, 9)).toBe(1);
    }
  });

  it("clamps past the end rather than answering nothing", () => {
    // A stale link into a feed that has since shrunk is a filter that moved
    // on, not an address that never existed.
    expect(clampPage("40", 3)).toBe(3);
  });
});

describe("pageWindow", () => {
  it("lists every page while they all fit", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });

  it("keeps both ends reachable from the middle of a long feed", () => {
    expect(pageWindow(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });

  it("draws a single hidden page as itself rather than as an ellipsis", () => {
    // An ellipsis standing for one page is wider than the page it hides.
    expect(pageWindow(4, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
  });

  it("never repeats the first or last page", () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageWindow(20, 20)).toEqual([1, "gap", 19, 20]);
  });

  it("holds together on a feed of one page", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
