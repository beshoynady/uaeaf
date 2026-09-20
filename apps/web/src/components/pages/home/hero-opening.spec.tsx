import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { HeroSlidePublic } from "@/lib/api/types";
import { HERO_STAGE } from "@/components/ui/surface";
import { HomeHero } from "./hero";

/**
 * The homepage hero's opening (ADR-0087 D13): the first slide's words arrive in
 * the order every other hero on the site arrives in, and nothing else about the
 * hero changes. What is held here is what a later edit could break without
 * anything looking wrong: only the first slide opens, the order is the shared
 * table's, the server sends nothing hidden, and the switch removes it whole.
 */

vi.mock("next-intl/server", () => ({
  getTranslations: async () => {
    const t = (key: string) => key;
    t.raw = (key: string) => key;
    return t;
  },
}));
vi.mock("./hero-controls-slot", () => ({ HeroControlsSlot: () => null }));
vi.mock("./hero-picture", () => ({ HeroPicture: () => <div data-hero-ken-burns="" /> }));
vi.mock("@/components/ui/scroll-cue", () => ({ ScrollCue: () => null }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const image = { url: "https://res.cloudinary.com/demo/image/upload/v1/hero.jpg", altText: { ar: "عدّاء", en: "A runner" }, width: 2400, height: 1350 };

const slide = (id: string, overrides: Partial<HeroSlidePublic> = {}): HeroSlidePublic =>
  ({
    id,
    mediaType: "IMAGE",
    desktop: image,
    desktopLtr: null,
    mobile: null,
    videoId: null,
    eyebrow: { ar: "الموسم", en: "The season" },
    title: { ar: `عنوان ${id}`, en: `Title ${id}` },
    subtitle: { ar: "سطر", en: "A line" },
    primaryCta: { label: { ar: "اقرأ", en: "Read" }, url: "/news", isExternal: false },
    secondaryCta: null,
    displayOrder: 0,
    ...overrides,
  }) as HeroSlidePublic;

const open = async (slides: HeroSlidePublic[]) => {
  const { container } = render(await HomeHero({ slides, locale: "ar" }));
  return [...container.querySelectorAll<HTMLElement>("li[data-hero-slide]")];
};

const steps = (scope: HTMLElement) =>
  [...scope.querySelectorAll<HTMLElement>(".hero-open")].map((node) => Number(node.style.getPropertyValue("--hero-step")));

describe("the homepage hero's opening", () => {
  it("opens the first slide in the order every hero arrives in: title, line, then what comes after", async () => {
    const [first] = await open([slide("a"), slide("b")]);
    expect(steps(first)).toEqual([HERO_STAGE.title, HERO_STAGE.title, HERO_STAGE.subtitle, HERO_STAGE.card]);
  });

  it("opens nothing on a later slide: its words arrive on the lanes, and an opening there would run as it became current", async () => {
    const [, second] = await open([slide("a"), slide("b")]);
    expect(steps(second)).toEqual([]);
  });

  it("skips what a slide does not have, and keeps the rest in their places", async () => {
    const [first] = await open([slide("a", { eyebrow: null, primaryCta: null })]);
    expect(steps(first)).toEqual([HERO_STAGE.title, HERO_STAGE.subtitle]);
  });

  it("sends nothing hidden: no inline opacity, visibility or transform on anything that opens", async () => {
    const [first] = await open([slide("a")]);
    for (const node of first.querySelectorAll<HTMLElement>(".hero-open")) {
      expect(node.style.opacity).toBe("");
      expect(node.style.visibility).toBe("");
      expect(node.style.transform).toBe("");
    }
  });

  it("never opens a word: the lanes own the words, and two animations on one transform leave only the last", async () => {
    const [first] = await open([slide("a")]);
    expect(first.querySelectorAll("[data-hero-word].hero-open")).toHaveLength(0);
  });
});

describe("the opening's one rule", () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "styles", "motion.css"), "utf-8").replace(
    /\/\*[\s\S]*?\*\//g,
    (block) => block.replace(/[^\n]/g, " "),
  );
  const rule = css.match(/([^{}]*\.hero-open[^{}]*)\{([^{}]*)\}/);

  it("is off when the switch names the hero, and only then", () => {
    expect(rule?.[1]).toContain(':root:not([data-motion-off~="hero"])');
    expect(css.match(/\.hero-open/g)).toHaveLength(1);
  });

  it("plays the settle the other heroes play, by transform alone, from tokens", () => {
    const body = rule?.[2] ?? "";
    // The same declaration as `.pm-settle`, fill included: one way a settle
    // behaves on this site, and the one already proven on three heroes.
    expect(body).toContain("animation: pm-settle var(--motion-duration-base) var(--motion-easing-decelerate) both");
    expect(body).toContain("var(--motion-ascent-stagger)");
    expect(body.replace(/var\([^)]*\)/g, "")).not.toMatch(/\d+(?:px|ms|s)\b/);
    const keyframe = css.match(/@keyframes pm-settle\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect([...keyframe.matchAll(/^\s*([a-z-]+)\s*:/gm)].map(([, name]) => name)).toEqual(["transform", "transform"]);
  });

  it("stands still for a reader who asked for less motion", () => {
    const at = css.indexOf(".hero-open");
    const before = css.slice(0, at);
    const opened = before.lastIndexOf("@media (prefers-reduced-motion: no-preference)");
    // Between that at-rule and the rule, every brace that opened has not closed the media block.
    const between = before.slice(opened);
    expect(opened).toBeGreaterThan(-1);
    expect((between.match(/\{/g) ?? []).length - (between.match(/\}/g) ?? []).length).toBe(1);
  });
});
