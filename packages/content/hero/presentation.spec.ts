import { describe, expect, it } from "vitest";
import { heroFrameLayout, heroScrim, heroType } from "./presentation";

describe("the reading wash over the picture", () => {
  it("lays a floor over the whole frame below md, deepest at the foot", () => {
    expect(heroScrim("narrow", "rtl")).toBe(
      "linear-gradient(to bottom, color-mix(in srgb, var(--color-surface-overlay) 64%, transparent) 0%, color-mix(in srgb, var(--color-surface-overlay) 74%, transparent) 50%, color-mix(in srgb, var(--color-surface-overlay) 86%, transparent) 100%)",
    );
    expect(heroScrim("narrow", "ltr")).toBe(heroScrim("narrow", "rtl"));
  });

  it("from md, darkens the side the line starts from and the foot", () => {
    expect(heroScrim("wide", "rtl")).toMatch(/^linear-gradient\(to left, /);
    expect(heroScrim("wide", "ltr")).toMatch(/^linear-gradient\(to right, /);
    expect(heroScrim("wide", "ltr")).toContain("linear-gradient(to bottom, transparent 40%, color-mix(in srgb, var(--color-surface-overlay) 80%, transparent) 100%)");
  });
});

describe("the hero's layout at a width, as the site's breakpoints draw it", () => {
  it.each([
    [390, 16, "narrow", "mobile"],
    [640, 24, "narrow", "mobile"],
    [768, 32, "wide", "desktop"],
    [1024, 48, "wide", "desktop"],
    [1440, 64, "wide", "desktop"],
  ] as const)("at %ipx: %ipx gutter, %s wash, %s type", (width, gutter, wash, type) => {
    expect(heroFrameLayout(width)).toMatchObject({ gutter, wash, type });
  });

  it("keeps the text column to the site's 62ch measure inside a 1440px frame", () => {
    expect(heroFrameLayout(1920)).toMatchObject({ frameMax: 1440, measure: "62ch" });
  });

  it("reserves the controls and, when there is one, the next-event bar beneath the text", () => {
    expect(heroFrameLayout(390).textPaddingBottom(true)).toBe("calc(var(--space-24) + var(--space-4) + var(--space-12) + var(--space-8))");
    expect(heroFrameLayout(1440).textPaddingBottom(true)).toBe("calc(var(--space-16) + var(--space-4) + var(--space-12) + var(--space-8))");
    expect(heroFrameLayout(1440).textPaddingBottom(false)).toBe("calc(0px + var(--space-4) + var(--space-12) + var(--space-8))");
  });
});

describe("the hero's type, from the same tokens the site's utilities read", () => {
  it("uses the mobile sizes below md and the desktop sizes from it", () => {
    expect(heroType("mobile").title).toEqual({ fontSize: "var(--typography-heading-page-mobile)", lineHeight: 1.25, fontWeight: "var(--font-weight-black)" });
    expect(heroType("desktop").title).toEqual({ fontSize: "var(--typography-heading-page-desktop)", lineHeight: 1.2, fontWeight: "var(--font-weight-black)" });
    expect(heroType("desktop").subtitle.fontSize).toBe("var(--typography-body-desktop)");
    expect(heroType("mobile").eyebrow.fontSize).toBe("var(--typography-overline-desktop)");
  });
});
