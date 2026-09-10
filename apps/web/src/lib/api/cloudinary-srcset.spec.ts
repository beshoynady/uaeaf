import { describe, expect, it } from "vitest";
import { cloudinarySrcSet, CDN_WIDTHS } from "./cloudinary-srcset";

/**
 * The candidate widths a Cloudinary-hosted picture is offered at.
 *
 * `next/image` would normally build this, but its `loader` prop is a
 * function, and a function cannot cross from a server component into the
 * client one `next/image` renders — the build refuses it outright. The
 * srcset is therefore built here, as a string, which crosses that boundary
 * without complaint and produces the same result.
 */

const BASE = "https://res.cloudinary.com/demo/image/upload";
const STORED = `${BASE}/v1788987228/uaeaf/pages/hero-a7189ab3.png`;

describe("cloudinarySrcSet", () => {
  it("offers every candidate width, each with its own descriptor", () => {
    const srcset = cloudinarySrcSet(STORED);
    const entries = srcset.split(", ");

    expect(entries).toHaveLength(CDN_WIDTHS.length);
    for (const [index, width] of CDN_WIDTHS.entries()) {
      expect(entries[index]).toBe(
        `${BASE}/f_auto,q_auto,w_${width}/v1788987228/uaeaf/pages/hero-a7189ab3.png ${width}w`,
      );
    }
  });

  it("never offers a width larger than the stored picture", () => {
    // Upscaling costs bytes and adds no detail. A 400px-wide original has
    // exactly one useful candidate.
    const srcset = cloudinarySrcSet(STORED, 400);
    const widths = [...srcset.matchAll(/ (\d+)w/g)].map(([, w]) => Number(w));

    expect(widths.every((width) => width <= 400)).toBe(true);
    expect(widths.length).toBeGreaterThan(0);
  });

  it("still offers the smallest step for a picture narrower than all of them", () => {
    // An intrinsic width below the first candidate must not produce an empty
    // srcset, which would leave the browser with nothing to choose.
    const srcset = cloudinarySrcSet(STORED, 100);
    expect(srcset).toContain(`w_${CDN_WIDTHS[0]}`);
  });

  it("returns nothing for a URL the host cannot transform", () => {
    // The caller renders a plain `src` in that case; an invented srcset would
    // be a list of 404s.
    expect(cloudinarySrcSet("/design-assets/contact/hero.png")).toBe("");
    expect(cloudinarySrcSet("https://cdn.example.com/image/upload/a.png")).toBe("");
  });

  it("keeps the candidate widths ascending, as the attribute requires", () => {
    expect([...CDN_WIDTHS]).toEqual([...CDN_WIDTHS].sort((a, b) => a - b));
  });
});
