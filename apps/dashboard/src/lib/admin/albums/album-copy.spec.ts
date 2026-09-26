import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTranslator } from "next-intl";
import ar from "../../../../messages/ar.json";
import en from "../../../../messages/en.json";
import { ALBUM_ERROR_CODES } from "./error-codes";
import { AFFILIATION_PROBLEMS } from "./affiliation";
import { ALBUM_STATES } from "./types";

/**
 * Every word the album screens ask for exists, in both languages.
 *
 * next-intl answers a missing key with the key itself, on the screen of the
 * person who just pressed something — and nothing fails until that moment.
 * So the keys are read from the screens' own source, and the ones built at
 * run time are listed from the closed lists that build them.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const ROOTS = [
  "components/admin/albums",
  "components/admin/homepage-albums",
  "app/[locale]/(app)/albums",
  "app/[locale]/(app)/homepage/albums",
  "lib/admin/albums",
];

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return files(full);
    return /\.tsx?$/.test(entry) && !/\.spec\./.test(entry) ? [full] : [];
  });

const staticKeys = [
  ...new Set(
    ROOTS.flatMap((root) => files(join(SRC, root))).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/\bt\(\s*"([A-Za-z0-9_.]+)"/g)].map(([, key]) => key),
    ),
  ),
];

const DRAFT_PROBLEMS = [
  "titleArRequired",
  "titleEnRequired",
  "slugInvalid",
  "descriptionPair",
  "descriptionCannotClear",
  "locationPair",
  "championshipNamePair",
  "championshipNameCannotClear",
  ...AFFILIATION_PROBLEMS,
];

const dynamicKeys = [
  ...ALBUM_STATES.map((state) => `state_${state}`),
  ...["championship", "publicEvent", "season", "none"].map((kind) => `affiliation_${kind}`),
  ...DRAFT_PROBLEMS.map((problem) => `problem_${problem}`),
  ...ALBUM_ERROR_CODES.map((code) => `errors.${code}`),
  ...["queued", "uploading", "done", "failed"].map((status) => `uploadStatus_${status}`),
  ...["wrongType", "tooLarge", "aborted"].map((code) => `upload_${code}`),
  ...["latest", "manual"].flatMap((mode) => [`galleryMode_${mode}`, `galleryMode_${mode}Hint`]),
  ...["seasonLabel", "championshipLabel", "competitionLabel", "publicEventLabel"],
  ...["lockModuleMissing", "lockNeedsSeason", "lockNeedsChampionship", "lockExclusiveWithPublicEvent", "lockExclusiveWithChampionship"],
];

const lookup = (messages: Record<string, unknown>, key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages.Albums);

describe("Albums copy", () => {
  it("is actually reading the screens", () => {
    expect(staticKeys.length).toBeGreaterThan(100);
  });

  it.each([
    ["ar", ar],
    ["en", en],
  ])("has every key the screens ask for in %s", (_, messages) => {
    const missing = [...staticKeys, ...dynamicKeys].filter(
      (key) => typeof lookup(messages as Record<string, unknown>, key) !== "string",
    );
    expect(missing).toEqual([]);
  });

  it("names the sidebar entry in both languages", () => {
    expect(ar.Nav.albums).toBe("ألبومات الصور");
    expect(typeof en.Nav.albums).toBe("string");
  });

  it("keeps the module-missing hint in the brief's exact words", () => {
    expect(ar.Albums.lockModuleMissing).toBe("يتوفر عند بناء الوحدة");
  });

  it("formats its plurals in Arabic without throwing", () => {
    const t = createTranslator({ locale: "ar", messages: ar, namespace: "Albums" });
    expect(t("photoCount", { count: 2 })).toBe("صورتان");
    expect(t("generatedAltCount", { count: 3, total: 10 })).toContain("3");
    expect(t("uploadSummary", { done: 2, total: 5, failed: 1 })).toContain("1");
  });
});
