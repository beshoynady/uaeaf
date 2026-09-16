import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { IdentityHero, SeamLines } from "./identity-hero";

/**
 * Task Zero of the strategic plan batch (ADR-0075 M0-A, M0-B, M0-C and the
 * hero hierarchy): what the shared hero and seam lines draw is structure the
 * code decides, so it is asserted here; the distances and the contrast are
 * measured in a browser.
 */

const HERE = dirname(fileURLToPath(import.meta.url));

describe("SeamLines", () => {
  it("centres its group on the seam by default, half of it above the section's top edge", () => {
    const { container } = render(<SeamLines />);
    const seam = container.querySelector<HTMLElement>("[data-seam-lines]")!;
    expect(seam).toHaveAttribute("data-placement", "centered");
    for (const box of seam.querySelectorAll<HTMLElement>(":scope > div")) {
      // `max(32px − padding, −height/2)`: a negative offset, so the strokes rise above the seam.
      expect(box.style.top).toContain("max(");
    }
  });

  // ADR-0075 M0-B: after a coloured band the whole group stands below the seam,
  // on the page's own ground, where every stroke measures 3:1 or more.
  it("stands its whole group below the seam when placed `below`", () => {
    const { container } = render(<SeamLines placement="below" />);
    const seam = container.querySelector<HTMLElement>("[data-seam-lines]")!;
    expect(seam).toHaveAttribute("data-placement", "below");
    const boxes = seam.querySelectorAll<HTMLElement>(":scope > div");
    expect(boxes.length).toBe(2);
    for (const box of boxes) expect(box.style.top).toBe("0px");
    expect(seam.querySelectorAll("[data-il-stroke]")).toHaveLength(4);
    expect(seam.className).not.toContain("max-lg:hidden");
  });

  it("hides the set below lg where a page asks for it, and says so in its data", () => {
    const { container } = render(<SeamLines placement="below" from="lg" />);
    const seam = container.querySelector<HTMLElement>("[data-seam-lines]")!;
    expect(seam).toHaveAttribute("data-from", "lg");
    expect(seam.className.split(" ")).toContain("max-lg:hidden");
  });

  // A heading that spans a phone's line leaves no corner 32px clear of it
  // (IL-5): the Strategic Plan's pillars draw their strokes from md.
  it("hides the set below md where a page asks for it, and says so in its data", () => {
    const { container } = render(<SeamLines placement="below" from="md" />);
    const seam = container.querySelector<HTMLElement>("[data-seam-lines]")!;
    expect(seam).toHaveAttribute("data-from", "md");
    expect(seam.className.split(" ")).toContain("max-md:hidden");
    expect(seam.className.split(" ")).not.toContain("max-lg:hidden");
  });
});

describe("IdentityHero", () => {
  const photo = { url: "/hero.png", altText: { ar: "صورة", en: "picture" }, width: 1536, height: 672 };
  const hero = () =>
    render(<IdentityHero titleId="t" title="الخطة" subtitle="ع" ground={photo} locale="ar" height="content" />).container;

  // Owner decision (brief §٣): the title is the message, the ordinal is
  // punctuation. Display XL is Chapter 4 §4.4's role for a large heading.
  it("sets its title at Display XL from md and at H1 on a phone, so no ordinal outranks it", () => {
    const title = hero().querySelector("h1")!.className.split(" ");
    expect(title).toContain("md:text-display-xl");
    expect(title).toContain("text-h1");
  });

  // ADR-0075 M0-C, option (a): group B's red stroke takes group A's red length,
  // so the two red strokes are drawn the same size.
  it("draws group B's red stroke at group A's red length", () => {
    const strokes = [...hero().querySelectorAll<HTMLElement>("[data-identity-lines] [data-il-stroke]")];
    const redA = strokes.find((s) => s.dataset.ilGroup === "a" && s.dataset.ilStroke === "0")!;
    const redB = strokes.find((s) => s.dataset.ilGroup === "b" && s.dataset.ilStroke === "3")!;
    // The box is the stroke's reach, `length / √2` plus half its thickness. B's
    // red keeps the logo's short-red ribbon shape, whose thickness differs from
    // the long red's by a hundredth of a unit at this length; the length is equal.
    const reach = (stroke: HTMLElement) => Number(stroke.style.width.match(/\* ([\d.]+)\)/)![1]);
    expect(Math.abs(reach(redA) - reach(redB))).toBeLessThan(0.1);
    expect(reach(redB)).toBeGreaterThan(29);
  });
});

describe("the seam edge in high contrast (ADR-0075 M0-A)", () => {
  // A register change marks no seam in high contrast on its own: every
  // register and item surface is white there. One stylesheet rule draws the
  // top and bottom edge of every coloured band in that mode only, from the
  // tokens the high-contrast list defines for solid edges.
  const css = readFileSync(join(HERE, "..", "..", "styles", "motion.css"), "utf-8");

  it("draws the edge of every coloured band in high contrast only, in the strong border colour", () => {
    const rule = css.match(
      /\[data-theme="high-contrast"\]\s+section\[data-register\]:not\(\[data-register="neutral"\]\)::after\s*\{([^}]*)\}/,
    );
    expect(rule, "the high-contrast seam edge rule").not.toBeNull();
    const body = rule![1];
    expect(body).toContain("var(--color-border-strong)");
    expect(body).toContain("var(--border-width-default)");
    expect(body).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  it("does not draw that edge outside high contrast", () => {
    // The only selector that draws the edge is scoped to the high-contrast theme.
    const edgeRules = [...css.matchAll(/section\[data-register\]:not\(\[data-register="neutral"\]\)/g)];
    expect(edgeRules.length).toBeGreaterThan(0);
    for (const match of edgeRules) {
      const before = css.slice(Math.max(0, match.index! - 80), match.index!);
      expect(before).toContain('[data-theme="high-contrast"]');
    }
  });
});
