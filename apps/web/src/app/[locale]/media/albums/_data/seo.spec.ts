import { describe, expect, it } from "vitest";
import type { MediaAssetPublic } from "@/lib/api/types";
import { ogImageUrl, withShareImage } from "./seo";

const CDN = "https://res.cloudinary.com/uaeaf/image/upload";

const asset = (url: string): MediaAssetPublic => ({
  id: "p1",
  file: {
    url,
    mimeType: "image/jpeg",
    width: 3000,
    height: 2000,
    size: 1,
    photographer: null,
    captureDate: null,
  },
  caption: { ar: "", en: "" },
  altText: { ar: "بديل", en: "Alt" },
  displayOrder: 0,
  isFeatured: false,
});

describe("ogImageUrl", () => {
  it("crops a CDN photo to 1200×630 in one transformation", () => {
    expect(ogImageUrl(`${CDN}/v1/albums/final.jpg`)).toBe(
      `${CDN}/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v1/albums/final.jpg`,
    );
  });

  it("replaces an existing transformation rather than stacking a second", () => {
    expect(ogImageUrl(`${CDN}/f_auto,w_400/v1/albums/final.jpg`)).toBe(
      `${CDN}/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v1/albums/final.jpg`,
    );
  });

  it("claims no size for a file the CDN cannot crop", () => {
    expect(ogImageUrl("/media/final.jpg")).toBeNull();
    expect(
      ogImageUrl("https://res.cloudinary.com.example.test/image/upload/x.jpg"),
    ).toBeNull();
  });
});

describe("withShareImage", () => {
  const base = {
    title: "T",
    openGraph: { title: "T" },
    twitter: { card: "summary_large_image" as const },
  };

  it("adds the cropped photo to Open Graph and to the card, in the reader's language", () => {
    const metadata = withShareImage(base, asset(`${CDN}/v1/a.jpg`), "en");

    expect(metadata.openGraph?.images).toEqual([
      {
        url: `${CDN}/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v1/a.jpg`,
        width: 1200,
        height: 630,
        alt: "Alt",
      },
    ]);
    expect(metadata.twitter?.images).toEqual([
      {
        url: `${CDN}/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v1/a.jpg`,
        alt: "Alt",
      },
    ]);
    expect(metadata.openGraph?.title).toBe("T");
  });

  it("leaves the metadata alone without a photo it can crop", () => {
    expect(withShareImage(base, undefined, "en")).toBe(base);
    expect(withShareImage(base, asset("/media/a.jpg"), "en")).toBe(base);
  });
});
