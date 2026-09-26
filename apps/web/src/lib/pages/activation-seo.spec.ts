import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A page the federation has switched off must be `noindex` **and** absent from
 * the sitemap (ADR-0102 §D2, Chapter 14 §11 and §13).
 *
 * The two are one rule, and the failure they guard against is a contradiction
 * served to crawlers: a URL in the sitemap whose page says not to index it. They
 * agree here only because both read `isIndexable`, and this file is what keeps
 * that true — a later change that gated the head and forgot the sitemap would
 * pass every other test in the suite.
 *
 * Every switchable page is checked, not one representative: the gate is in one
 * place, but so was the per-page `switch` it sits in front of, and the point of
 * the list is that no page is quietly outside it.
 */
const fetchPublic = vi.fn();

vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (path: string) => fetchPublic(path) as unknown,
}));

const { isIndexable } = await import("./indexability");
const { PUBLIC_PAGES } = await import("./public-pages");
const { default: sitemap } = await import("@/app/sitemap");

/** The pages whose record carries the switch: the twelve hero wrappers and the
 *  four workflow-governed governance pages. `policies` has no record of its own
 *  and the homepage is out of scope (ADR-0102 §D6). */
const SWITCHABLE = PUBLIC_PAGES.filter((page) => page.key !== "policies");

beforeEach(() => {
  fetchPublic.mockReset();
});

describe("a switched-off page", () => {
  for (const page of SWITCHABLE) {
    it(`${page.key} is not indexable`, async () => {
      // Its own record says withheld; every other read answers something
      // complete, so nothing but the switch can be the reason.
      fetchPublic.mockImplementation(async (path: string) =>
        path.startsWith(page.apiPath)
          ? { isActive: false }
          : { items: [{ id: "x" }], total: 1, email: "a@b.c", introText: {}, messageBody: {}, visionText: {} },
      );

      await expect(isIndexable(page)).resolves.toBe(false);
    });
  }

  it("is absent from the sitemap", async () => {
    // Everything switched off: the sitemap must be empty rather than listing
    // URLs whose pages carry `noindex`.
    fetchPublic.mockResolvedValue({ isActive: false });

    await expect(sitemap()).resolves.toEqual([]);
  });
});

describe("a served page", () => {
  it("is indexable once its content threshold is met", async () => {
    const page = PUBLIC_PAGES.find((candidate) => candidate.key === "contact-us")!;
    // Served, and the record carries the email that is this page's content.
    fetchPublic.mockResolvedValue({ isActive: true, email: "info@uaeaf.ae" });

    await expect(isIndexable(page)).resolves.toBe(true);
  });

  it("is still held back when its content threshold is not met", async () => {
    const page = PUBLIC_PAGES.find((candidate) => candidate.key === "contact-us")!;
    // The switch is not a way past §11: a served page with nothing on it stays
    // out of the index for the reason it always did.
    fetchPublic.mockResolvedValue({ isActive: true });

    await expect(isIndexable(page)).resolves.toBe(false);
  });
});
