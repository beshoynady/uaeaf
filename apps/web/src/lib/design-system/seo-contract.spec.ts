import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "@uaeaf/design-tokens/testing";
import { PUBLIC_PAGES } from "@/lib/pages/public-pages";

/**
 * Chapter 14, enforced mechanically.
 *
 * Chapter 20's Shared Rule is absolute — every public template "MUST fully
 * implement Chapter 14 — SEO", with "no exceptions for any public-facing
 * page". A rule stated that strongly and checked by nobody is a rule that
 * holds until the twelfth page, which is written in a hurry and forgets the
 * canonical.
 *
 * These check the mechanical half. Whether a description is *good* is a
 * judgement; whether one exists at all is not.
 */

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app");
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return entry === "page.tsx" ? [full] : [];
  });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx$/.test(entry) && !/\.(spec|test)\.tsx$/.test(entry) ? [full] : [];
  });
}

/** The catch-all is the absence of a page, not a page: it calls `notFound()`
 *  and renders nothing. Exempted by name rather than by pattern so a real
 *  route can never be excluded by accident. */
const NOT_A_PAGE = ["src/app/[locale]/[...rest]/page.tsx"];

const ROUTES = routeFiles(APP)
  .map((file) => ({
    file: file.replace(APP, "src/app").split("\\").join("/"),
    source: stripComments(readFileSync(file, "utf-8")),
  }))
  .filter(({ file }) => !NOT_A_PAGE.includes(file));

describe("every public page implements Chapter 14", () => {
  it("finds route files to check, so the rules below cannot pass vacuously", () => {
    // Twelve registered pages plus the homepage.
    expect(ROUTES.length).toBeGreaterThanOrEqual(PUBLIC_PAGES.length);
  });

  it("declares metadata on every route", () => {
    // §3: Meta Title, Meta Description and a Social Sharing Image "MUST exist
    // for every page without exception". A route with no `generateMetadata`
    // and no `metadata` export inherits the layout's, which names the site
    // rather than the page — so every page would share one title.
    const offenders = ROUTES.filter(
      ({ source }) => !/export (async )?(function generateMetadata|const metadata)/.test(source),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("routes every page's metadata through the shared builder", () => {
    // §5 canonical and §10 hreflang are emitted by `buildMetadata` and
    // nowhere else. A route that hand-rolls a `Metadata` object gets a title
    // and silently loses both — which is invisible in review and invisible in
    // the browser, and shows up months later as duplicate-content dilution.
    const offenders = ROUTES.filter(
      ({ source }) =>
        /generateMetadata/.test(source) &&
        !/buildStaticPageMetadata|buildMetadata/.test(source),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("has a route file for every registered page, and a registry entry for every route", () => {
    // The two drift in opposite directions and both are silent: a registered
    // page with no file is a 404 in the sitemap, and a file with no registry
    // entry has no register, no schema type and no indexability rule.
    const missingFiles = PUBLIC_PAGES.filter(
      (page) => !existsSync(join(APP, "[locale]", ...page.route.split("/").filter(Boolean), "page.tsx")),
    ).map((page) => page.route);
    expect(missingFiles).toEqual([]);

    const registered = new Set(PUBLIC_PAGES.map((page) => page.route));
    const unregistered = ROUTES.map(({ file }) => file)
      .map((file) => file.replace("src/app/[locale]", "").replace("/page.tsx", ""))
      .filter((route) => route !== "" && !registered.has(route));
    expect(unregistered).toEqual([]);
  });
});

describe("document structure", () => {
  const SOURCES = sourceFiles(SRC).map((file) => ({
    file: file.replace(SRC, "src").split("\\").join("/"),
    source: stripComments(readFileSync(file, "utf-8")),
  }));

  it("keeps the page heading in one component", () => {
    // §2: "exactly one `<h1>`". The way that breaks is not a page with two
    // headings — it is a section component that grows one. Keeping every
    // `<h1>` inside the hero makes the count structural rather than a thing
    // to remember.
    // The hero owns the heading for every listing page. The homepage and the
    // 404 each carry their own because neither takes a hero — the homepage is
    // a placeholder pending its approved sections, and a 404 has no record to
    // draw a title from.
    const ALLOWED = [
      "src/components/ui/page-hero.tsx",
      "src/app/[locale]/page.tsx",
      "src/app/[locale]/not-found.tsx",
    ];
    const offenders = SOURCES.filter(
      ({ file, source }) => /<h1[\s>]/.test(source) && !ALLOWED.includes(file),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("gives every image an alt or hides it", () => {
    // §6 consumes Chapter 8 L6 §M.7. An image with neither is announced by
    // its filename, which is the worst of both outcomes.
    const offenders: string[] = [];
    for (const { file, source } of SOURCES) {
      for (const [tag] of source.matchAll(/<(?:Image|img)\s[^>]*\/?>/g)) {
        if (!/\salt=/.test(tag) && !/aria-hidden/.test(tag)) {
          offenders.push(`${file}: ${tag.slice(0, 60)}…`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never makes a div clickable", () => {
    // A `<div onClick>` is not focusable, not keyboard-operable, and not a
    // link to a crawler. Chapter 14 §5's internal-linking requirement and
    // WCAG 2.1.1 both fail on the same element.
    const offenders: string[] = [];
    for (const { file, source } of SOURCES) {
      for (const [tag] of source.matchAll(/<(?:div|span)\s[^>]*onClick[^>]*>/g)) {
        offenders.push(`${file}: ${tag.slice(0, 60)}…`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
