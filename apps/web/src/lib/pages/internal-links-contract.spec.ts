import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "@uaeaf/design-tokens/testing";
import { FOOTER_QUICK_LINKS, LEGAL_LINKS, navDestinations } from "@/lib/navigation";

/**
 * Every internal link a visitor can follow resolves to a page (batch brief
 * 2026-09-15 §6.4: a button that leads nowhere gets a basic page, never a 404).
 *
 * The links come from where they are written, not from a list kept here:
 *
 *  - The navigation data, which the header and the footer render.
 *  - Every literal `href` and breadcrumb `route` in the page files and in the
 *    components they import, followed through `@/components` and relative
 *    imports. A component added to one of these pages later is scanned
 *    without anyone remembering to add it.
 *
 * A dynamic `href={…}` is covered by its data instead: the navigation leaves
 * above, a breadcrumb trail's own literal routes, and the language toggle's
 * current path, which is the page being read.
 *
 * A route resolves when `app/[locale]/…/page.tsx` exists for it. The catch-all
 * `[...rest]` does not count: it answers every unmatched path with the 404.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..");
const COMPONENTS = join(SRC, "components");
const LOCALE_APP = join(SRC, "app", "[locale]");

const ENTRIES = {
  "president page": join(LOCALE_APP, "about", "president", "page.tsx"),
  "vision & mission page": join(LOCALE_APP, "about", "governance", "vision-mission", "page.tsx"),
  // The header and footer every page is framed by.
  "site layout": join(LOCALE_APP, "layout.tsx"),
} as const;

const display = (file: string) => relative(SRC, file).split(sep).join("/");

const resolveImport = (from: string, specifier: string): string | null => {
  const base = specifier.startsWith("@/")
    ? join(SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? join(dirname(from), specifier)
      : null;
  if (!base) return null;
  return [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")].find(existsSync) ?? null;
};

/** The entry file and every component it reaches through imports. */
const reachableFiles = (entry: string): string[] => {
  const seen = new Set<string>([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    const source = stripComments(readFileSync(file, "utf-8"));
    for (const [, specifier] of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
      const target = resolveImport(file, specifier);
      if (target && target.startsWith(COMPONENTS) && !seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return [...seen];
};

/** Literal internal destinations written in a file: JSX `href`s and crumb routes. */
const literalLinks = (file: string): string[] => {
  const source = stripComments(readFileSync(file, "utf-8"));
  const found = [
    ...source.matchAll(/\bhref=(?:"([^"]*)"|'([^']*)'|\{\s*["'`]([^"'`$]*)["'`]\s*\})/g),
    ...source.matchAll(/\broute:\s*["'`]([^"'`$]*)["'`]/g),
  ].map((match) => match.slice(1).find((group) => group !== undefined)!);
  return found.filter((href) => href.startsWith("/") && !href.startsWith("//"));
};

const routeOf = (href: string) => href.split(/[?#]/)[0].replace(/\/$/, "") || "/";

const pageFileFor = (route: string) =>
  join(LOCALE_APP, ...route.split("/").filter(Boolean), "page.tsx");

/** `route → where it is linked from`, across every source. */
const collectLinks = () => {
  const links = new Map<string, Set<string>>();
  const perSource = new Map<string, number>();
  const add = (source: string, hrefs: readonly string[]) => {
    perSource.set(source, (perSource.get(source) ?? 0) + hrefs.length);
    for (const href of hrefs) {
      const route = routeOf(href);
      links.set(route, (links.get(route) ?? new Set()).add(source));
    }
  };

  add("navigation: header", navDestinations().map((item) => item.href));
  add("navigation: footer quick links", FOOTER_QUICK_LINKS.map((item) => item.href));
  add("navigation: footer legal strip", LEGAL_LINKS.map((item) => item.href));

  const scanned = new Map<string, string[]>();
  for (const [name, entry] of Object.entries(ENTRIES)) {
    const files = reachableFiles(entry);
    scanned.set(name, files.map(display));
    for (const file of files) add(`${name}: ${display(file)}`, literalLinks(file));
  }

  return { links, perSource, scanned };
};

describe("internal links resolve to pages", () => {
  const { links, perSource, scanned } = collectLinks();

  it("reads links from every source, so the check below cannot pass on nothing", () => {
    for (const source of [
      "navigation: header",
      "navigation: footer quick links",
      "navigation: footer legal strip",
    ]) {
      expect(perSource.get(source), source).toBeGreaterThan(0);
    }
    for (const name of Object.keys(ENTRIES)) {
      const total = [...perSource].filter(([source]) => source.startsWith(`${name}:`)).reduce((sum, [, n]) => sum + n, 0);
      expect(total, `${name} yielded no literal links`).toBeGreaterThan(0);
    }
  });

  it("follows the imports into the components that carry the links", () => {
    // Proof that the import walk works, named by the files known to hold links.
    expect(scanned.get("vision & mission page")).toContain("components/pages/vision-mission/strategy-cta.tsx");
    expect(scanned.get("site layout")).toContain("components/layout/site-header.tsx");
    expect(scanned.get("site layout")).toContain("components/layout/site-footer.tsx");
  });

  it("has a page for every internal link", () => {
    const missing = [...links]
      .filter(([route]) => !existsSync(pageFileFor(route)))
      .map(([route, sources]) => `${route} ← ${[...sources].join(" | ")}`)
      .sort();
    expect(missing).toEqual([]);
  });
});
