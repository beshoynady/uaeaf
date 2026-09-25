import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { stripComments } from "@uaeaf/design-tokens/testing";

import { sourceFiles } from "./source-files";

/**
 * An internal link never reaches the router without its locale.
 *
 * `@uaeaf/brand-ui` defaults `Button` and `LinkTile` to `next/link`, which is
 * right for an absolute external URL and wrong for a route in this project.
 * `routing.ts` sets `localePrefix: "always"`, so `/media/videos` carries no
 * locale; next-intl's middleware then supplies one from a cookie or an
 * `Accept-Language` header. The failure that produces is not a 404 — it is a
 * reader on the English page following a link and landing on Arabic content,
 * which nothing in the page reports and no type catches.
 *
 * Two forms are correct, and this rule accepts both:
 *
 * 1. `linkComponent={Link}` — the application's locale-aware `Link` renders it.
 * 2. An href that already carries the locale, e.g. `` `/${locale}/news` ``.
 *
 * Anything else is a literal internal path through `next/link`.
 */

/** `<Button …>` / `<LinkTile …>` with their attributes, opening tag only. */
const KIT_LINKS = /<(Button|LinkTile)\b((?:[^<>]|\n)*?)\/?>/g;

const HREF = /href=(?:"([^"]*)"|\{([^}]*)\})/;

/** An href that resolves the locale itself, in any of the spellings used here. */
const CARRIES_LOCALE = /\$\{\s*locale\s*\}|\blocale\b|^Routes\./;

const scanned = sourceFiles()
  .filter((path) => path.endsWith(".tsx"))
  .map((path) => ({
    label: path.split(/[\\/]uaeaf-project[\\/]/)[1]?.replace(/\\/g, "/") ?? path,
    source: stripComments(readFileSync(path, "utf-8")),
  }));

describe("internal links through the kit carry their locale", () => {
  it("scans a real number of files, so the rule below cannot pass vacuously", () => {
    expect(scanned.length).toBeGreaterThan(30);
  });

  it("finds kit link components at all, so the pattern still matches the code", () => {
    // If `Button` is ever renamed, the regex above would quietly match nothing
    // and this file would report success about a rule it no longer applies.
    const withLinks = scanned.filter(({ source }) => {
      for (const [, , attrs] of source.matchAll(KIT_LINKS)) {
        if (HREF.test(attrs)) return true;
      }
      return false;
    });
    expect(withLinks.length).toBeGreaterThan(0);
  });

  it("passes the locale-aware Link, or an href that already has the locale", () => {
    const offenders: string[] = [];
    for (const { label, source } of scanned) {
      for (const [, tag, attrs] of source.matchAll(KIT_LINKS)) {
        const href = attrs.match(HREF);
        if (!href) continue;
        const value = (href[1] ?? href[2] ?? "").trim();
        // An absolute URL goes to another origin; `next/link` is correct there.
        if (!value.startsWith("/") && !value.startsWith("`/")) continue;
        if (attrs.includes("linkComponent")) continue;
        if (CARRIES_LOCALE.test(value)) continue;
        offenders.push(`${label}: <${tag} href=${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
