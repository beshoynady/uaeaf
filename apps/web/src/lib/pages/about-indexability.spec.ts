import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Whether `/about` may be indexed, and therefore whether it appears in the
 * sitemap — the two read the same answer, and a page that is `noindex` in its
 * head while present in the sitemap is a contradiction published to search
 * engines.
 *
 * This page has two ways of having nothing to show, and both are §11's case:
 * no Live publication at all, and a Live publication the federation has
 * switched off. The second is the one worth a test, because the read still
 * answers — with `{ isActive: false }` and nothing else.
 */

const fetchPublic = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/public-client", () => ({ fetchPublic }));

const { isIndexable } = await import("./indexability");
const { findPublicPage } = await import("./public-pages");

const PAGE = findPublicPage("about")!;

const hero = { title: { ar: "نبذة عن الاتحاد", en: "About the Federation" } };

afterEach(() => fetchPublic.mockReset());

describe("/about indexability", () => {
  it("is registered as a public page at all, which is what makes this rule reachable", () => {
    expect(PAGE).toBeDefined();
    expect(PAGE.route).toBe("/about");
  });

  it("is indexable once a version is live and the page is switched on", async () => {
    fetchPublic.mockResolvedValue({ isActive: true, hero });

    expect(await isIndexable(PAGE)).toBe(true);
  });

  /** The federation switches the page off and the address keeps working, but
   *  what it serves is a title and one status line. */
  it("is not indexable while the page is switched off", async () => {
    fetchPublic.mockResolvedValue({ isActive: false });

    expect(await isIndexable(PAGE)).toBe(false);
  });

  it("is not indexable when nothing has ever been published", async () => {
    fetchPublic.mockResolvedValue(null);

    expect(await isIndexable(PAGE)).toBe(false);
  });

  /** A live page whose hero somehow carries no title has not met the
   *  threshold either — and would print a header with no heading. */
  it("is not indexable when the hero has no title", async () => {
    fetchPublic.mockResolvedValue({ isActive: true, hero: undefined });

    expect(await isIndexable(PAGE)).toBe(false);
  });

  it("asks the page's own public endpoint, so the answer cannot drift from the page", async () => {
    fetchPublic.mockResolvedValue({ isActive: true, hero });

    await isIndexable(PAGE);

    expect(fetchPublic).toHaveBeenCalledWith(PAGE.apiPath);
  });
});
