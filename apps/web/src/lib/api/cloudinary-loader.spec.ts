import { describe, expect, it } from "vitest";
import { cloudinaryLoader, isCloudinaryUrl } from "./cloudinary-loader";

/**
 * Turning one stored URL into the size and format each viewport needs.
 *
 * Without this the platform stores images on a transforming CDN and then
 * serves every one of them at full size in its original format: the contact
 * hero measured 1.6 MB as a PNG and 10 KB as a 384px-wide WebP, and the
 * difference is entirely in the URL. `next/image` cannot produce that on its
 * own — it has no idea the host can resize — so the loader has to say so.
 */

const BASE = "https://res.cloudinary.com/demo/image/upload";
const STORED = `${BASE}/v1788987228/uaeaf/pages/contact-hero-a7189ab3.png`;

describe("cloudinaryLoader", () => {
  it("asks for the width the layout actually needs", () => {
    expect(cloudinaryLoader({ src: STORED, width: 768 })).toBe(
      `${BASE}/f_auto,q_auto,w_768/v1788987228/uaeaf/pages/contact-hero-a7189ab3.png`,
    );
  });

  it("lets the CDN choose the format from the request's own Accept header", () => {
    // `f_auto` is what turns a 1.6 MB PNG into a 150 KB WebP for a browser
    // that accepts one, and leaves it a PNG for a browser that does not.
    expect(cloudinaryLoader({ src: STORED, width: 1536 })).toContain("f_auto");
  });

  it("passes an explicit quality through instead of the automatic one", () => {
    expect(cloudinaryLoader({ src: STORED, width: 640, quality: 90 })).toContain("q_90");
  });

  it("leaves a URL that is not on the transforming host completely alone", () => {
    // A stored reference may predate Cloudinary, or point at something else
    // entirely. Rewriting it would produce a 404 rather than a smaller file.
    const local = "/design-assets/contact/hero.png";
    expect(cloudinaryLoader({ src: local, width: 768 })).toBe(local);

    const elsewhere = "https://cdn.example.com/image/upload/a.png";
    expect(cloudinaryLoader({ src: elsewhere, width: 768 })).toBe(elsewhere);
  });

  it("does not stack a second transformation onto a URL that already has one", () => {
    // Two transformation segments are not additive — the second is read as
    // part of the public id, and the request 404s.
    const already = `${BASE}/f_auto,q_auto,w_400/v1/uaeaf/pages/a.png`;
    expect(cloudinaryLoader({ src: already, width: 800 })).toBe(
      `${BASE}/f_auto,q_auto,w_800/v1/uaeaf/pages/a.png`,
    );
  });

  it("handles a URL with no version segment", () => {
    const versionless = `${BASE}/uaeaf/pages/a.png`;
    expect(cloudinaryLoader({ src: versionless, width: 320 })).toBe(
      `${BASE}/f_auto,q_auto,w_320/uaeaf/pages/a.png`,
    );
  });

  it("recognises only the transforming host", () => {
    expect(isCloudinaryUrl(STORED)).toBe(true);
    expect(isCloudinaryUrl("https://cdn.example.com/image/upload/a.png")).toBe(false);
    expect(isCloudinaryUrl("/local.png")).toBe(false);
    // A lookalike hostname is not the host: `res.cloudinary.com.evil.test`
    // ends with the same characters and is somewhere else entirely.
    expect(isCloudinaryUrl("https://res.cloudinary.com.evil.test/image/upload/a.png")).toBe(false);
  });
});
