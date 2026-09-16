import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlanItemPublic, PlanMetricPublic, PlanPhasePublic, PlanStepPublic, PublicImage } from "@/lib/api/types";
import { countable } from "./count-up";
import { PlanExecutionPath } from "./execution-path";
import { PlanMetrics } from "./metrics";
import { PlanObjectives } from "./objectives";
import { PlanOverview } from "./overview";
import { PlanPhasesBand } from "./phases-band";
import { PlanPillars } from "./pillars";
import { PlanCta } from "./plan-cta";

/**
 * The Strategic Plan as ADR-0075 lays it out: eight sections whose order and
 * composition the code fixes, and whose words, pictures and list items the
 * record decides. What is asserted here is that structure; distances, contrast
 * and the entrance are measured in a browser.
 */

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const text = (value: string) => ({ ar: value, en: value });

const photo = (name: string): PublicImage => ({ url: `/${name}.png`, altText: { ar: "صورة", en: "picture" }, width: 1536, height: 672 });

/** Items given out of order, so a component that prints arrival order fails. */
const items = (count: number): PlanItemPublic[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    title: text(`عنصر ${i + 1}`),
    description: text(`وصف ${i + 1}`),
    displayOrder: i + 1,
  })).reverse();

const phases: PlanPhasePublic[] = [
  { id: "p2", title: text("التطوير"), description: text("ب"), iconKey: "trending-up", displayOrder: 2 },
  { id: "p1", title: text("الأساس"), description: text("أ"), iconKey: "layers", displayOrder: 1 },
  { id: "p3", title: text("التنافسية"), description: text("ج"), iconKey: "trophy", displayOrder: 3 },
  { id: "p4", title: text("الأثر"), description: text("د"), iconKey: "sparkles", displayOrder: 4 },
];

const metrics: PlanMetricPublic[] = [
  { id: "m1", value: "2030", label: text("أفق"), displayOrder: 1 },
  { id: "m2", value: "15", label: text("برنامجًا"), displayOrder: 2 },
  { id: "m3", value: "+30%", label: text("مشاركة"), displayOrder: 3 },
  { id: "m4", value: "+25%", label: text("مواهب"), displayOrder: 4 },
];

const steps: PlanStepPublic[] = ["المحور الاستراتيجي", "الهدف", "المبادرة", "القياس", "الأثر"].map((title, i) => ({
  id: `s${i + 1}`,
  title: text(title),
  description: null,
  displayOrder: i + 1,
}));

const numbers = (container: HTMLElement) => [...container.querySelectorAll("[data-item-number]")].map((n) => n.textContent);

describe("PlanOverview", () => {
  it("prints the stored heading with the accent rule and the photograph at the start of the reading line", () => {
    const { container } = render(
      <PlanOverview record={{ introHeading: text("خارطة"), introText: text("نص"), introImage: photo("intro") }} locale="ar" sizes="100vw" />,
    );
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("data-ground", "base");
    expect(container.querySelector("h2 [data-accent-rule]")).not.toBeNull();
    expect(container.querySelector('[data-field="introHeading"]')!.textContent).toBe("خارطة");
    expect(container.querySelector('[data-field="introText"]')!.className).toContain("text-body-lg");
    const picture = container.querySelector<HTMLElement>("[data-slanted-photo]")!;
    expect(picture).toHaveAttribute("data-side", "start");
    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
  });

  it("draws no picture and one column when the record has none", () => {
    const { container } = render(
      <PlanOverview record={{ introHeading: text("خارطة"), introText: text("نص"), introImage: null }} locale="ar" sizes="100vw" />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-slanted-photo]")).toBeNull();
  });
});

describe("PlanPhasesBand", () => {
  it("stands on the green register as an ordered list of phases, numbered in display order with their icons", () => {
    const { container } = render(<PlanPhasesBand phases={phases} title={null} label="مراحل" locale="ar" />);
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("data-register", "green");
    expect(container.querySelector('ol[data-field="phases"]')).not.toBeNull();
    expect(numbers(container)).toEqual(["01", "02", "03", "04"]);
    expect([...container.querySelectorAll("ol > li h3")].map((h) => h.textContent)).toEqual(["الأساس", "التطوير", "التنافسية", "الأثر"]);
    expect(container.querySelectorAll("ol > li [data-plan-chip] svg[aria-hidden='true']")).toHaveLength(4);
    expect(container.querySelector("[data-plan-rail]")).toHaveAttribute("aria-hidden", "true");
  });

  it("names the section by a hidden heading when no heading is stored, and prints the stored one when it is", () => {
    const hidden = render(<PlanPhasesBand phases={phases} title={null} label="مراحل الخطة" locale="ar" />);
    const heading = hidden.container.querySelector("h2")!;
    expect(heading.textContent).toBe("مراحل الخطة");
    expect(heading.className).toContain("sr-only");
    expect(hidden.container.querySelector("section")).toHaveAttribute("aria-labelledby", heading.id);
    hidden.unmount();

    const stored = render(<PlanPhasesBand phases={phases} title="مراحلنا" label="مراحل الخطة" locale="ar" />);
    expect(stored.container.querySelector("h2")!.textContent).toBe("مراحلنا");
    expect(stored.container.querySelector("h2")!.className).not.toContain("sr-only");
  });

  // Rule 4: the list carries no `order`, `direction` or reversed flow; the
  // DOM order is the number order and the grid inherits the page's direction.
  it("keeps the phases in document order with no reordering utility", () => {
    const { container } = render(<PlanPhasesBand phases={phases} title={null} label="م" locale="en" />);
    const list = container.querySelector("ol")!;
    expect(list.className).not.toMatch(/order-|flex-row-reverse|direction/);
    for (const item of list.querySelectorAll(":scope > li")) expect(item.className).not.toMatch(/order-/);
  });

  it("draws nothing without phases", () => {
    expect(render(<PlanPhasesBand phases={[]} title={null} label="م" locale="ar" />).container.querySelector("section")).toBeNull();
  });

  // The rail is one line through the chips from `lg`; a fifth phase added in
  // the dashboard must stay on that row rather than wrap below the line.
  // ADR-0075 (owner decisions 2026-09-16): a list that outgrows the row it
  // stands in takes the layout it already has on a phone, from the first
  // width whose row holds it, and never a narrower column than the approved
  // minimum. Five phases fit no row below `2xl`; six fit none at all.
  it("draws five phases as a row only from 2xl, and drops the tablet columns", () => {
    const five = [...phases, { id: "p5", title: text("الاستدامة"), description: text("هـ"), iconKey: "layers", displayOrder: 5 } as PlanPhasePublic];
    const { container } = render(<PlanPhasesBand phases={five} title={null} label="م" locale="ar" />);
    const list = container.querySelector<HTMLElement>('ol[data-field="phases"]')!;

    expect(list.className).toContain("2xl:grid-cols-[repeat(var(--plan-phases),minmax(0,1fr))]");
    expect(list.className).not.toContain("lg:grid-cols-[repeat(var(--plan-phases),minmax(0,1fr))]");
    expect(list.className).not.toContain("md:grid-cols-2");
    // The rail runs along the reading-start edge until the row is drawn.
    expect(container.querySelector<HTMLElement>("[data-plan-rail]")!.className).toContain("max-2xl:start-6");
  });

  it("draws six phases as the phone's list at every width, with no row and no rail across", () => {
    const six = Array.from({ length: 6 }, (_, index) => ({
      id: `p${index + 1}`,
      title: text(`مرحلة ${index + 1}`),
      description: text("و"),
      iconKey: "layers",
      displayOrder: index + 1,
    })) as PlanPhasePublic[];
    const { container } = render(<PlanPhasesBand phases={six} title={null} label="م" locale="ar" />);
    const list = container.querySelector<HTMLElement>('ol[data-field="phases"]')!;

    expect(list.className).not.toMatch(/grid-cols/);
    const rail = container.querySelector<HTMLElement>("[data-plan-rail]")!;
    expect(rail.className).toContain("inset-y-0");
    expect(rail.className).not.toMatch(/inset-x-0/);
  });

  it("sets one column per phase, not a fixed four, wherever the row is drawn", () => {
    const { container } = render(<PlanPhasesBand phases={phases} title={null} label="م" locale="ar" />);
    const list = container.querySelector<HTMLElement>('ol[data-field="phases"]')!;
    expect(list.className).toContain("lg:grid-cols-[repeat(var(--plan-phases),minmax(0,1fr))]");
    expect(list.className).not.toContain("lg:grid-cols-4");
    expect(list.style.getPropertyValue("--plan-phases")).toBe("4");
  });
});

describe("countable", () => {
  it("counts a whole figure, keeping a sign or a percent as stored", () => {
    expect(countable("2030")).toEqual({ prefix: "", target: 2030, suffix: "" });
    expect(countable("15")).toEqual({ prefix: "", target: 15, suffix: "" });
    expect(countable("+30%")).toEqual({ prefix: "+", target: 30, suffix: "%" });
  });

  // Counting only the first run of digits turned "1.5M" into "0.5M → 1.5M".
  it("does not count a figure with a decimal or grouping mark, or with no Western digits", () => {
    expect(countable("1.5M")).toBeNull();
    expect(countable("1,200")).toBeNull();
    expect(countable("2٫5")).toBeNull();
    expect(countable("٣٠٪")).toBeNull();
  });
});

describe("PlanPillars", () => {
  it("numbers the pillars in display order on cards coloured by position, without icons", () => {
    const { container } = render(<PlanPillars pillars={items(6)} title={text("محاورنا")} text={text("نركز")} locale="ar" />);
    const cards = [...container.querySelectorAll('ol[data-field="pillars"] > li')];
    expect(cards.map((card) => card.className.match(/--color-item-(\d)-surface/)?.[1])).toEqual(["1", "2", "3", "4", "1", "2"]);
    expect(numbers(container)).toEqual(["01", "02", "03", "04", "05", "06"]);
    expect([...container.querySelectorAll('[data-part="title"]')].map((t) => t.textContent)).toEqual(
      ["عنصر 1", "عنصر 2", "عنصر 3", "عنصر 4", "عنصر 5", "عنصر 6"],
    );
    expect(container.querySelectorAll("ol svg")).toHaveLength(0);
    expect(container.querySelector('[data-field="pillarsText"]')!.className).toContain("text-body-lg");
  });

  // Rule 1 after a coloured band (ADR-0075 M0-B): the strokes stand below the seam.
  it("draws the identity strokes below the seam with the band before, on a positioned section", () => {
    const { container } = render(<PlanPillars pillars={items(3)} title={text("م")} text={null} locale="ar" />);
    const section = container.querySelector("section")!;
    expect(section.className).toContain("relative");
    expect(section).toHaveAttribute("data-ground", "base");
    expect(section.querySelector("[data-seam-lines]")).toHaveAttribute("data-placement", "below");
    // From md: on a phone the heading spans the line and no corner stays 32px
    // clear of it (IL-5 measured 3.7–11px at 360).
    expect(section.querySelector("[data-seam-lines]")).toHaveAttribute("data-from", "md");
    expect(container.querySelector('[data-field="pillarsText"]')).toBeNull();
  });
});

describe("PlanObjectives", () => {
  it("prints numbered rows in display order, each edged and numbered in its item's ink, beside a photograph at the start", () => {
    const { container } = render(
      <PlanObjectives objectives={items(5)} title={text("من المحاور")} image={photo("objectives")} locale="ar" sizes="100vw" />,
    );
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("data-ground", "sunken");
    expect(section.className).toContain("overflow-x-clip");
    expect(section.querySelector("[data-seam-lines]")).toHaveAttribute("data-placement", "centered");

    const rows = [...container.querySelectorAll('ol[data-field="objectives"] > li')];
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.className.match(/--color-item-(\d)-ink/)?.[1])).toEqual(["1", "2", "3", "4", "1"]);
    expect(numbers(container)).toEqual(["01", "02", "03", "04", "05"]);
    expect(rows[0].querySelector("[data-item-number]")!.className).toContain("text-display-l");
    expect(rows[0].querySelector("[data-item-number]")!.className).toContain("var(--color-item-1-ink)");
    expect(rows[0].querySelector("h3")!.textContent).toBe("عنصر 1");
    // Rows, not cards: no item-card tone attribute, so the section reads as a statement.
    expect(container.querySelector("li[data-item-tone]")).toBeNull();
    expect(container.querySelector("[data-slanted-photo]")).toHaveAttribute("data-side", "start");
  });
});

describe("PlanMetrics", () => {
  it("prints each figure as stored, counted by CountUp, in its item's ink, beside a photograph at the end", () => {
    const { container } = render(
      <PlanMetrics metrics={metrics} title={text("نقيس")} label="مؤشرات" image={photo("metrics")} locale="ar" sizes="100vw" />,
    );
    expect(container.querySelector("section")).toHaveAttribute("data-ground", "base");
    const figures = [...container.querySelectorAll('ul[data-field="metrics"] [data-count]')];
    expect(figures.map((f) => f.getAttribute("data-count"))).toEqual(["2030", "15", "+30%", "+25%"]);
    expect(figures.map((f) => f.querySelector('[data-part="value"]')!.textContent)).toEqual(["2030", "15", "+30%", "+25%"]);
    expect(figures[0].className).toContain("var(--color-item-1-ink)");
    expect(figures[3].className).toContain("var(--color-item-4-ink)");
    expect(figures[0].className).toContain("text-display-l");
    expect(container.querySelector("ul")).toHaveAttribute("aria-label", "مؤشرات");
    expect(container.querySelector("[data-slanted-photo]")).toHaveAttribute("data-side", "end");
    // Not numbered: no number the eye reads as a position.
    expect(container.querySelector("[data-item-number]")).toBeNull();
  });
});

describe("PlanExecutionPath", () => {
  it("stands on the green register as an ordered list of steps climbing in reading order, joined by one line", () => {
    const { container } = render(
      <PlanExecutionPath steps={steps} title={text("نحوّل")} text={text("لا تقاس")} label="خطوات" locale="ar" />,
    );
    expect(container.querySelector("section")).toHaveAttribute("data-register", "green");
    const list = container.querySelector<HTMLElement>('ol[data-field="executionSteps"]')!;
    expect(list).toHaveAttribute("aria-label", "خطوات");
    expect(numbers(container)).toEqual(["01", "02", "03", "04", "05"]);
    expect([...list.querySelectorAll("h3")].map((h) => h.textContent)).toEqual(["المحور الاستراتيجي", "الهدف", "المبادرة", "القياس", "الأثر"]);

    // The first step is the lowest and the last the highest: five rises down to none.
    const rises = [...list.querySelectorAll<HTMLElement>(":scope > li")].map((li) => li.style.getPropertyValue("--plan-step"));
    expect(rises).toEqual(["4", "3", "2", "1", "0"]);
    expect(list.closest<HTMLElement>("[data-plan-path]")!.style.getPropertyValue("--plan-steps")).toBe("5");

    // One segment per climb, drawn inside the step it leaves, from this chip's
    // centre (half a chip in from the reading edge) to the next chip's (one
    // column and one gap across, one rise up), so it meets the chips whatever
    // the column width. The last step leaves nothing.
    const items = [...list.querySelectorAll<HTMLElement>(":scope > li")];
    const segments = items.map((li) => li.querySelector<HTMLElement>("[data-plan-segment]"));
    expect(segments.filter(Boolean)).toHaveLength(4);
    expect(segments[4]).toBeNull();
    for (const segment of segments.slice(0, 4)) {
      expect(segment).toHaveAttribute("aria-hidden", "true");
      expect(segment!.className).toContain("start-6");
      expect(segment!.className).toContain("w-[calc(100%+var(--plan-gap))]");
      expect(segment!.className).toContain("rtl:-scale-x-100");
      expect(segment!.querySelector("svg")).toHaveAttribute("data-reveal-part", "draw");
      expect(segment!.querySelector("line")!.getAttribute("stroke")).toBe("var(--color-section-green-border)");
    }
    expect(container.querySelector("[data-plan-line]"), "no single line across column middles").toBeNull();
  });

  // Seven steps leave columns narrower than the measured minimum until `xl`;
  // ten fit no width at all, so they climb nowhere and stack as on a phone.
  it("climbs from the first width whose row holds the steps, and nowhere below it", () => {
    const seven = Array.from({ length: 7 }, (_, index) => ({
      id: `s${index + 1}`,
      title: text(`خطوة ${index + 1}`),
      description: null,
      displayOrder: index + 1,
    })) as PlanStepPublic[];
    const { container } = render(<PlanExecutionPath steps={seven} title={text("ت")} text={null} label="م" locale="ar" />);
    const list = container.querySelector<HTMLElement>('ol[data-field="executionSteps"]')!;

    expect(list.className).toContain("xl:grid-cols-[repeat(var(--plan-steps),minmax(0,1fr))]");
    expect(list.className).not.toContain("md:grid-cols-[repeat(var(--plan-steps),minmax(0,1fr))]");
    // The segments are drawn only where the steps climb.
    expect(container.querySelector<HTMLElement>("[data-plan-segment]")!.className).toContain("xl:block");
  });

  it("stacks ten steps at every width, drawing no climb and no segments", () => {
    const ten = Array.from({ length: 10 }, (_, index) => ({
      id: `s${index + 1}`,
      title: text(`خطوة ${index + 1}`),
      description: null,
      displayOrder: index + 1,
    })) as PlanStepPublic[];
    const { container } = render(<PlanExecutionPath steps={ten} title={text("ت")} text={null} label="م" locale="ar" />);
    const list = container.querySelector<HTMLElement>('ol[data-field="executionSteps"]')!;

    expect(list.className).not.toMatch(/grid-cols/);
    expect(container.querySelector("[data-plan-segment]")).toBeNull();
  });

  it("prints a step's description only where the record has one", () => {
    const withText = render(
      <PlanExecutionPath
        steps={[{ ...steps[0], description: text("شرح") }, steps[1]]}
        title={text("ن")}
        text={null}
        label="خ"
        locale="ar"
      />,
    );
    expect(withText.container.querySelectorAll('[data-part="description"]')).toHaveLength(1);
    expect(withText.container.querySelector('[data-field="executionText"]')).toBeNull();
  });
});

describe("PlanCta", () => {
  it("prints the stored title and text beside the photograph, with the two navigation links as buttons", async () => {
    const { container } = render(
      await PlanCta({ title: text("نبني"), text: text("مع رؤية"), image: photo("cta"), locale: "ar", sizes: "100vw" }),
    );
    expect(container.querySelector("section")).toHaveAttribute("data-ground", "base");
    expect(container.querySelector('[data-field="ctaTitle"]')!.textContent).toBe("نبني");
    expect(container.querySelector('[data-field="ctaText"]')!.textContent).toBe("مع رؤية");
    expect([...container.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "/about/governance/vision-mission",
      "/about/governance/policies",
    ]);
    expect(container.querySelector("a")!.className).toContain("focus-visible:ring-2");
    expect(container.querySelector("[data-slanted-photo]")).toHaveAttribute("data-side", "end");
    expect(container.querySelector('[class*="linear-gradient"]'), "no scrim: the words stand beside the picture").toBeNull();
  });

  it("centres the call and draws no picture when the record has none", async () => {
    const { container } = render(await PlanCta({ title: text("نبني"), text: null, image: null, locale: "en", sizes: "100vw" }));
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-reveal]")!.className).toContain("text-center");
    expect(container.querySelector('[data-field="ctaText"]')).toBeNull();
  });
});
