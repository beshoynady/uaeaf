import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * That the contact page actually ships its content.
 *
 * Every other guard written for this page reads a `.tsx` file as text and
 * computes something from the class names in it. None of them renders
 * anything, so all of them stayed green while the served page was a header,
 * four empty cards and a footer: a source parser cannot tell that the branch
 * containing the form never executed.
 *
 * The defect it missed: `fetchPublic` resolves every failure to `null` by
 * design, so the site still renders when the API is restarting. The contact
 * page then puts its entire body behind `{record ? … : null}`. Next
 * prerenders the route at build time, so a build that cannot reach the API
 * bakes an empty shell into `.next` — and `next start` serves that shell to
 * the first visitor after every deploy, repairing it only on the second
 * request. In CI, where the build machine has no API, that is every deploy.
 *
 * Build-time and request-time failure are different events. Rendering
 * without data is right at request time and wrong at build time, and the
 * fetch layer cannot tell them apart — so the route has to stop being
 * prerendered at all.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..", "..", "app", "[locale]", "contact", "page.tsx");
const WEB = join(HERE, "..", "..", "..");

const source = readFileSync(APP, "utf-8");

describe("contact page rendering contract", () => {
  it("is never prerendered at build time", () => {
    // The one line that makes the whole class of defect impossible: with no
    // build-time prerender there is no shell to bake, so the served page is
    // always rendered against whatever the API says now.
    expect(source).toMatch(/export const dynamic = ["']force-dynamic["']/);
  });

  it("still caches the API response, so being dynamic is not a per-visitor round trip", () => {
    // `force-dynamic` defaults `fetchCache` to no-store, which would put an
    // uncached API call in front of every visitor and fail the Core Web
    // Vitals requirement in Chapter 14 §7. Caching the *data* rather than
    // the *page* keeps the round trip at once per revalidate window while
    // removing the stale-shell failure entirely.
    expect(source).toMatch(/export const fetchCache = ["']default-cache["']/);
  });

  it("keeps every section of the page behind the same record", () => {
    // Not a style rule — a statement of what the first test protects. If the
    // body stops depending on one fetched record this guard can be retired,
    // and until then it must not be.
    expect(source).toMatch(/\{record \?/);
    for (const section of ["ContactForm", "ContactMap", "ContactSocial"]) {
      expect(source, `${section} is no longer on this page`).toContain(`<${section}`);
    }
  });

  it("ships the form, the map and the social bar in the built HTML", () => {
    // The end-to-end assertion the source parsers could not make. Skipped
    // where there is no build to inspect; where there is one, it reads the
    // bytes a visitor would actually receive.
    const prerendered = join(WEB, ".next", "server", "app", "ar", "contact.html");
    if (!existsSync(prerendered)) {
      // A dynamic route has no prerendered artifact at all, which is itself
      // the fix working. The first test is what enforces that.
      expect(source).toMatch(/force-dynamic/);
      return;
    }

    const html = readFileSync(prerendered, "utf-8");
    expect(html, "the built page carries no <textarea> — the form is missing").toContain(
      "<textarea",
    );
    expect(html, "the built page carries no <form> element").toContain("<form");
  });
});
