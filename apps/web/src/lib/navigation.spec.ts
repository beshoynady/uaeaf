import { describe, expect, it } from "vitest";
import { FOOTER_QUICK_LINKS, PRIMARY_NAV, isWithin, navDestinations, type NavItem } from "./navigation";
import { PREPARING_PAGES, PUBLIC_PAGES } from "./pages/public-pages";

const flatten = (items: readonly NavItem[]): NavItem[] =>
  items.flatMap((item) => [item, ...flatten(item.children ?? [])]);

describe("badge", () => {
  it("يضع شارة قريبا على national-teams وحده", () => {
    const badged = flatten(PRIMARY_NAV).filter((item) => item.badge);
    expect(badged.map((item) => item.href)).toEqual(["/national-teams"]);
    expect(badged[0]?.badge).toBe("soon");
  });
});

describe("الشجرة تطابق المواصفة", () => {
  it("ستة بنود جذرية بالترتيب", () => {
    expect(PRIMARY_NAV.map((item) => item.key)).toEqual([
      "about",
      "athletics",
      "championshipsResults",
      "eventsSeasons",
      "media",
      "contact",
    ]);
  });

  it("خمسة منها لوحات وتواصل معنا رابط مباشر", () => {
    expect(PRIMARY_NAV.filter((item) => item.children)).toHaveLength(5);
    expect(PRIMARY_NAV.at(-1)).toEqual({ key: "contact", href: "/contact" });
  });

  it("الرئيسية ليست في القائمة", () => {
    expect(PRIMARY_NAV.some((item) => item.href === "/")).toBe(false);
  });

  it("كل لوحة أبناؤها أعمدة وكل عمود أبناؤه روابط", () => {
    for (const panel of PRIMARY_NAV.filter((item) => item.children)) {
      for (const column of panel.children!) {
        expect(column.href, `${column.key} عمود ولا ينقل`).toBeUndefined();
        expect(column.children?.length ?? 0).toBeGreaterThan(0);
        for (const link of column.children!) {
          expect(link.href, `${link.key} رابط ويحمل وجهة`).toBeTruthy();
          expect(link.children).toBeUndefined();
        }
      }
    }
  });
});

describe("الـanchor والـquery", () => {
  it("تقطع قبل مطابقة المسار", () => {
    expect(isWithin("/athletics#disciplines", "/athletics")).toBe(true);
    expect(isWithin("/events?view=calendar", "/events")).toBe(true);
    expect(isWithin("/athletics#ages", "/athletes")).toBe(false);
  });

  it("navDestinations تستبعد الـanchors والبث المباشر", () => {
    const hrefs = navDestinations().map((item) => item.href);
    expect(hrefs.some((href) => href.includes("#"))).toBe(false);
    expect(hrefs).not.toContain("/media/videos#live");
    expect(hrefs).toContain("/athletics");
    expect(hrefs).toContain("/events");
  });

  it("الفوتر لا يكرر وجهة", () => {
    const hrefs = FOOTER_QUICK_LINKS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("كل وجهة تصل إلى صفحة", () => {
  const known = new Set([
    ...PUBLIC_PAGES.map((page) => page.route),
    ...PREPARING_PAGES.map((page) => page.route),
  ]);

  it("كل href في الشجرة مسجل", () => {
    const missing = navDestinations()
      .map((item) => item.href)
      .filter((href) => !known.has(href));
    expect(missing).toEqual([]);
  });

  it("المسارات المحذوفة اختفت من كل سجل", () => {
    expect(known.has("/about/organisational-structure")).toBe(false);
    expect(known.has("/events/federation-events")).toBe(false);
  });
});
