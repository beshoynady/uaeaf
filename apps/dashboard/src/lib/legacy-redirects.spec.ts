import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { LEGACY_REDIRECTS } from "../../legacy-redirects.mjs";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PAGES = join(APP, "src", "app", "[locale]", "(app)");

describe("LEGACY_REDIRECTS", () => {
  it("sends the old policies address to the new one, in every language", () => {
    // IA §4.8, amended 2026-09-21 (G3): the screen moved to Users & Access,
    // and a bookmark to where it used to be must still arrive.
    expect(LEGACY_REDIRECTS).toContainEqual({
      source: `/:locale(${routing.locales.join("|")})/news/policies`,
      destination: "/:locale/approval-policies",
      permanent: true,
    });
  });

  it("sends the old address without a language to the new one too", () => {
    // Otherwise next-intl would first add the language and land on a page
    // that no longer exists.
    expect(LEGACY_REDIRECTS).toContainEqual({
      source: "/news/policies",
      destination: "/approval-policies",
      permanent: true,
    });
  });

  it("is what the Next configuration actually serves", () => {
    const config = readFileSync(join(APP, "next.config.mjs"), "utf8");
    expect(config).toMatch(/import\s*\{\s*LEGACY_REDIRECTS\s*\}\s*from\s*"\.\/legacy-redirects\.mjs"/);
    expect(config).toMatch(/redirects:\s*async\s*\(\)\s*=>\s*LEGACY_REDIRECTS/);
  });
});

describe("the approval policies page", () => {
  it("lives at its new address and nowhere else", () => {
    expect(existsSync(join(PAGES, "approval-policies", "page.tsx"))).toBe(true);
    // A page left at the old address would be dead code behind the redirect
    // (Next applies redirects before it looks for a page), and the screen
    // would exist twice.
    expect(existsSync(join(PAGES, "news", "policies", "page.tsx"))).toBe(false);
  });
});
