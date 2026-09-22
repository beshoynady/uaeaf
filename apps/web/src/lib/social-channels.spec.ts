import { describe, expect, it } from "vitest";
import { socialChannels } from "./social-channels";
import type { MediaAssetPublic } from "@/lib/api/types";

/**
 * The federation's channels as the contact page's record stores them, turned
 * into what a page can draw. Shared by the contact page and the footer
 * (ADR-0092), so the two cannot disagree on which channels are safe to link,
 * what a channel is called, or which picture it wears.
 */

const image = (id: string, url: string) =>
  ({
    id,
    file: { url, mimeType: "image/png", width: 128, height: 128, size: 1, photographer: null, captureDate: null },
    caption: { ar: "", en: "" },
    altText: { ar: "", en: "" },
    displayOrder: 0,
    isFeatured: false,
  }) as MediaAssetPublic;

const nameOf = (key: string) => `name:${key}`;

describe("socialChannels", () => {
  it("drops a destination that is not a web address", () => {
    // `javascript:` in an href is a script the page runs on click.
    const channels = socialChannels(
      [
        { platform: "X", url: "javascript:alert(1)" },
        { platform: "X", url: "ftp://x.test" },
        { platform: "Instagram", url: "https://www.instagram.com/uaeaf" },
      ],
      undefined,
      nameOf,
    );

    expect(channels.map((channel) => channel.href)).toEqual(["https://www.instagram.com/uaeaf"]);
  });

  it("matches a platform however the editor cased or spaced it, and names it from the catalogue", () => {
    const [channel] = socialChannels([{ platform: " Insta gram ", url: "https://ok.test" }], undefined, nameOf);

    expect(channel.known?.key).toBe("instagram");
    expect(channel.name).toBe("name:instagram");
  });

  it("names a platform it has no artwork for by the editor's own word", () => {
    const [channel] = socialChannels([{ platform: " LinkedIn ", url: "https://li.test" }], undefined, nameOf);

    expect(channel.known).toBeUndefined();
    expect(channel.name).toBe("LinkedIn");
  });

  it("carries the uploaded icon when it resolved to a published image, and none when it did not", () => {
    const icons = new Map([["i1", image("i1", "https://cdn.test/custom.png")]]);
    const [resolved, missing] = socialChannels(
      [
        { platform: "Instagram", url: "https://a.test", iconId: "i1" },
        { platform: "Instagram", url: "https://b.test", iconId: "gone" },
      ],
      icons,
      nameOf,
    );

    expect(resolved.icon?.file.url).toBe("https://cdn.test/custom.png");
    expect(missing.icon).toBeUndefined();
  });
});
