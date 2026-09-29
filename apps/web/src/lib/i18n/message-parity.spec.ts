import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadMessages, MESSAGE_FILES } from "../../i18n/messages";
import { PRIMARY_NAV, type NavItem } from "../navigation";

const MESSAGES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../messages");
const LOCALES = ["ar", "en"] as const;
type Locale = (typeof LOCALES)[number];

const namespacesInFile = (locale: Locale, file: string): string[] =>
  Object.keys(JSON.parse(readFileSync(join(MESSAGES_ROOT, locale, `${file}.json`), "utf8")));

const filesOnDisk = (locale: Locale): string[] =>
  readdirSync(join(MESSAGES_ROOT, locale))
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""));

/** Every leaf path in a messages object, dotted as next-intl reads it. */
const paths = (node: unknown, prefix = ""): string[] => {
  if (typeof node !== "object" || node === null) return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  );
};

const flatten = (items: readonly NavItem[]): NavItem[] =>
  items.flatMap((item) => [item, ...flatten(item.children ?? [])]);

const navKeys = () =>
  flatten(PRIMARY_NAV).flatMap((item) =>
    [item.key, item.descriptionKey].filter((key): key is string => Boolean(key)),
  );

// `home` names the breadcrumb's first crumb on every page; `badgeSoon` is the badge text.
const NAV_KEYS_USED_ELSEWHERE = ["home", "badgeSoon"];

describe("تطابق ملفات الرسائل بين اللغتين", () => {
  it("نفس أسماء الملفات في اللغتين ومطابقة لـ MESSAGE_FILES", () => {
    const expected = [...MESSAGE_FILES].sort();
    expect(filesOnDisk("ar").sort()).toEqual(expected);
    expect(filesOnDisk("en").sort()).toEqual(expected);
  });

  it("كل مساحة اسم في ملف واحد فقط داخل كل لغة", () => {
    for (const locale of LOCALES) {
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const file of MESSAGE_FILES) {
        for (const namespace of namespacesInFile(locale, file)) {
          if (seen.has(namespace)) duplicates.push(namespace);
          seen.add(namespace);
        }
      }
      expect(duplicates, locale).toEqual([]);
    }
  });

  it("نفس مساحات الأسماء عبر MESSAGE_FILES في اللغتين", () => {
    const namespacesOf = (locale: Locale) =>
      new Set(MESSAGE_FILES.flatMap((file) => namespacesInFile(locale, file)));
    const inAr = namespacesOf("ar");
    const inEn = namespacesOf("en");
    expect([...inAr].filter((ns) => !inEn.has(ns)), "في العربي فقط").toEqual([]);
    expect([...inEn].filter((ns) => !inAr.has(ns)), "في الإنجليزي فقط").toEqual([]);
  });

  it("لا مفتاح في لغة دون الأخرى", () => {
    const inAr = new Set(paths(loadMessages("ar")));
    const inEn = new Set(paths(loadMessages("en")));
    expect([...inAr].filter((key) => !inEn.has(key)), "في العربي فقط").toEqual([]);
    expect([...inEn].filter((key) => !inAr.has(key)), "في الإنجليزي فقط").toEqual([]);
  });

  it("كل بند في الشجرة له اسم في اللغتين", () => {
    const inAr = new Set(paths(loadMessages("ar")));
    expect(navKeys().filter((key) => !inAr.has(`Nav.${key}`))).toEqual([]);
  });

  it("لا مفتاح يتيم تحت Nav", () => {
    const used = new Set([...navKeys(), ...NAV_KEYS_USED_ELSEWHERE]);
    const nav = (loadMessages("en") as Record<string, unknown>).Nav;
    const orphans = paths(nav).filter((key) => !used.has(key));
    expect(orphans).toEqual([]);
  });
});
