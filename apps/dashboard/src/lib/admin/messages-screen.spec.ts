import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The header bell's count. Every signed-in screen draws the header, so what
 * matters here is what a failed count costs: the bell, never the page, and
 * never the redirect a lost session owes the reader.
 */
const fetchAsUser = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  fetchAsUser: (path: string, locale: string) => fetchAsUser(path, locale) as unknown,
  readGrants: async () => [],
}));

const { loadNewMessageCount } = await import("./messages-screen");

const READER = [{ resourceType: "contactMessages", action: "Read" }];

beforeEach(() => {
  fetchAsUser.mockReset();
});

describe("loadNewMessageCount", () => {
  it("reads the count for a reader of the messages", async () => {
    fetchAsUser.mockResolvedValue({ newCount: 4 });

    await expect(loadNewMessageCount(READER, "ar")).resolves.toBe(4);
    expect(fetchAsUser).toHaveBeenCalledWith("/contact-messages/summary", "ar");
  });

  it("draws no bell, and asks for nothing, without the read grant", async () => {
    await expect(loadNewMessageCount([{ resourceType: "contactMessages", action: "Export" }], "ar")).resolves.toBeNull();
    expect(fetchAsUser).not.toHaveBeenCalled();
  });

  it("costs the bell and not the page when the count cannot be read", async () => {
    fetchAsUser.mockRejectedValue(new Error("upstream 500"));

    await expect(loadNewMessageCount(READER, "ar")).resolves.toBeNull();
  });

  it("lets a lost session's redirect through", async () => {
    // `redirect()` throws to do its work; absorbing it here would keep a
    // reader whose session ended on a screen that can no longer load.
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/ar/login;307;" });
    fetchAsUser.mockRejectedValue(redirect);

    await expect(loadNewMessageCount(READER, "ar")).rejects.toBe(redirect);
  });
});
