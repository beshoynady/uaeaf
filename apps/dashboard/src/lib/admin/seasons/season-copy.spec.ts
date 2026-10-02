import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ar from "../../../../messages/ar.json";
import en from "../../../../messages/en.json";
import { SEASON_ERROR_CODES } from "./error-codes";
import { SEASON_PROBLEM_CODES } from "./season-draft";
import { SEASON_PHASE_TYPES, SEASON_STATES } from "./types";

/**
 * Every word the season screens ask for exists, in both languages.
 *
 * next-intl answers a missing key with the key itself, on the screen of the
 * person who just pressed something — and nothing fails until that moment.
 * So the keys are read from the screens' own source (every `t("…")`, and the
 * literal keys of a `t(cond ? "a" : "b")`), and the ones built at run time
 * are listed from the closed lists that build them — the album screens'
 * method (`album-copy.spec.ts`).
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const ROOTS = ["components/admin/seasons", "app/[locale]/(app)/seasons", "lib/admin/seasons"];

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return files(full);
    return /\.tsx?$/.test(entry) && !/\.spec\./.test(entry) ? [full] : [];
  });

const sources = ROOTS.flatMap((root) => files(join(SRC, root))).map((file) => readFileSync(file, "utf8"));

const staticKeys = [
  ...new Set(
    sources.flatMap((source) => [
      ...[...source.matchAll(/\bt\(\s*"([A-Za-z0-9_.]+)"/g)].map(([, key]) => key),
      // `t(kind === "current" ? "makeCurrentConfirmBody" : "deleteConfirmBody", …)`
      ...[...source.matchAll(/\bt\([^)]*?\?\s*"([A-Za-z0-9_.]+)"\s*:\s*"([A-Za-z0-9_.]+)"/g)].flatMap(([, a, b]) => [a, b]),
    ]),
  ),
];

const dynamicKeys = [
  ...["current", "archived", "hidden", "unpublished", "draft", "live"].map((badge) => `badge_${badge}`),
  ...["publish", "submit", "publishApproved"].flatMap((step) => [`step_${step}`, `stepHint_${step}`]),
  ...["notPublished", "closingMissing"].map((kind) => `note_${kind}`),
  ...SEASON_PHASE_TYPES.map((type) => `phaseType_${type}`),
  ...["direct", "approval", "unknown"].map((mode) => `policy_${mode}`),
  ...SEASON_STATES.map((state) => `state_${state}`),
  ...SEASON_PROBLEM_CODES.map((code) => `problem_${code}`),
  ...SEASON_ERROR_CODES.map((code) => `errors.${code}`),
  "contentAlbums",
  "contentVideos",
  "contentAlbumsUnknown",
  "contentVideosUnknown",
];

const lookup = (catalogue: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalogue);

describe("the season screens' words", () => {
  it("finds keys to check, so the rule below cannot pass on nothing", () => {
    expect(staticKeys.length).toBeGreaterThan(50);
    expect(staticKeys).toContain("makeCurrentConfirmBody");
  });

  it.each([
    ["ar", ar],
    ["en", en],
  ] as const)("has every key in %s", (_, catalogue) => {
    const missing = [...staticKeys, ...dynamicKeys].filter(
      (key) => typeof lookup((catalogue as Record<string, unknown>).Seasons, key) !== "string",
    );
    expect(missing).toEqual([]);
  });

  it("gives a taken-down season its own words, not the draft's", () => {
    expect(ar.Seasons.state_Unpublished).not.toBe(ar.Seasons.state_Draft);
    expect(en.Seasons.state_Unpublished).not.toBe(en.Seasons.state_Draft);
  });

  it("names the seasons screen and its sidebar group in both languages", () => {
    expect(ar.Nav.seasons).toBeTruthy();
    expect(en.Nav.seasons).toBeTruthy();
    // The breadcrumb reads the group's own key, so the two cannot disagree.
    expect(ar.Nav.eventsSeasons).toBe("الفعاليات والمواسم");
    expect(en.Nav.eventsSeasons).toBe("Events & Seasons");
  });
});
