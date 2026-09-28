import { describe, expect, it } from "vitest";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import { PRIMARY_NAV, type NavItem } from "../navigation";

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

describe("تطابق المفاتيح بين اللغتين", () => {
  it("لا مفتاح في لغة دون الأخرى", () => {
    const inAr = new Set(paths(ar));
    const inEn = new Set(paths(en));
    expect([...inAr].filter((key) => !inEn.has(key)), "في العربي فقط").toEqual([]);
    expect([...inEn].filter((key) => !inAr.has(key)), "في الإنجليزي فقط").toEqual([]);
  });

  it("كل بند في الشجرة له اسم في اللغتين", () => {
    const inAr = new Set(paths(ar));
    expect(navKeys().filter((key) => !inAr.has(`Nav.${key}`))).toEqual([]);
  });

  it("لا مفتاح يتيم تحت Nav", () => {
    const used = new Set([...navKeys(), ...NAV_KEYS_USED_ELSEWHERE]);
    const orphans = paths((en as Record<string, unknown>).Nav).filter((key) => !used.has(key));
    expect(orphans).toEqual([]);
  });
});
