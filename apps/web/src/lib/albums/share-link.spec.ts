import { describe, expect, it, vi } from "vitest";

import { shareLink } from "./share-link";
import type { SharePlatform } from "./share-link";

/**
 * The share path, one outcome per platform. The platform is passed in, so
 * every combination of present, absent, refusing and dismissed is a plain
 * object here rather than a patched global.
 */

const URL_TO_SHARE = "https://uaeaf.ae/ar/media/albums/x?photo=p7";

const dismissed = () => Promise.reject(new DOMException("Share canceled", "AbortError"));
const refused = (name: string) => () => Promise.reject(new DOMException("Refused", name));

describe("shareLink", () => {
  it("hands the link to the share sheet when the platform has one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);

    expect(await shareLink(URL_TO_SHARE, { share, clipboard: { writeText } })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ url: URL_TO_SHARE });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies nothing when the reader dismisses the sheet: that was their decision", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    expect(await shareLink(URL_TO_SHARE, { share: dismissed, clipboard: { writeText } })).toBe("dismissed");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when the sheet fails for a reason that is not the reader's", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    expect(
      await shareLink(URL_TO_SHARE, { share: refused("NotAllowedError"), clipboard: { writeText } }),
    ).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(URL_TO_SHARE);
  });

  it("skips a sheet that says it cannot take this link", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);

    expect(await shareLink(URL_TO_SHARE, { share, canShare: () => false, clipboard: { writeText } })).toBe(
      "copied",
    );
    expect(share).not.toHaveBeenCalled();
  });

  it("copies when there is no share sheet at all", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    expect(await shareLink(URL_TO_SHARE, { clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(URL_TO_SHARE);
  });

  it("answers `manual` when the clipboard is missing", async () => {
    expect(await shareLink(URL_TO_SHARE, {})).toBe("manual");
    // A clipboard object without the method, as some embedded browsers expose.
    expect(await shareLink(URL_TO_SHARE, { clipboard: {} })).toBe("manual");
  });

  it("answers `manual` when the clipboard refuses the write", async () => {
    const platform: SharePlatform = { clipboard: { writeText: refused("NotAllowedError") } };
    expect(await shareLink(URL_TO_SHARE, platform)).toBe("manual");
  });

  it("calls each method on the object that owns it, as the browser requires", async () => {
    const platform = {
      calls: [] as unknown[],
      share(this: { calls: unknown[] }) {
        this.calls.push(this);
        return Promise.resolve();
      },
    };
    await shareLink(URL_TO_SHARE, platform);
    expect(platform.calls).toEqual([platform]);
  });
});
