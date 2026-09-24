import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PublicImage, VisionMissionPublic } from "@/lib/api/types";
import { ValuesBand } from "@/components/pages/president/values-band";
import { StrategicGoals } from "./goals";
import { VisionMissionStatements } from "./statements";
import { StrategyCta } from "./strategy-cta";

/**
 * Vision & Mission built from `@uaeaf/brand-ui` (ADR-0098 D7). Every picture
 * the page prints is content with a field on the record (owner rule
 * 2026-09-14, ADR-0070 D1), so what is asserted is structure the record and
 * the system decide: which surface each section stands on, which identity
 * tone each card takes, and that every stored field is still marked for the
 * browser's text comparison. Distances and the entrance are measured in a
 * browser.
 */

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

const photo = (name: string): PublicImage => ({
  url: `/${name}.png`,
  altText: { ar: "", en: "" },
  width: 1536,
  height: 672,
});

const RECORD: VisionMissionPublic = {
  heroTitle: { ar: "الرؤية والرسالة", en: "Vision & Mission" },
  heroSubtitle: { ar: "ع", en: "s" },
  heroImage: null,
  visionTitle: { ar: "رؤية", en: "Vision line" },
  visionText: { ar: "نص الرؤية", en: "Vision text" },
  visionImage: null,
  missionTitle: { ar: "رسالة", en: "Mission line" },
  missionText: { ar: "نص الرسالة", en: "Mission text" },
  missionImage: null,
  goalsTitle: null,
  strategicGoals: [],
  coreValues: [
    { title: { ar: "التميز", en: "Excellence" }, description: { ar: "أ", en: "a" }, iconKey: "award", displayOrder: 1 },
  ],
  valuesImage: null,
  ctaImage: null,
  seo: null,
  publishedAt: "2026-09-14T11:23:32.754Z",
};

const goals = (count: number, iconKey: "star" | null = "star") =>
  Array.from({ length: count }, (_, i) => ({
    title: { ar: `هدف ${i + 1}`, en: `Goal ${i + 1}` },
    description: { ar: "و", en: "d" },
    iconKey,
    displayOrder: i + 1,
  })) as unknown as VisionMissionPublic["strategicGoals"];

const values = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    title: { ar: `قيمة ${i + 1}`, en: `Value ${i + 1}` },
    description: { ar: "ق", en: "v" },
    iconKey: "award" as const,
    displayOrder: i + 1,
  }));

const surfaces = (container: HTMLElement, kind: string) =>
  [...container.querySelectorAll<HTMLElement>(`section[data-surface="${kind}"]`)];

describe("VisionMissionStatements", () => {
  it("sets each statement on its own canvas surface with the mesh", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "ar" }));

    const sections = surfaces(container, "canvas");
    expect(sections).toHaveLength(2);
    for (const section of sections) expect(section.querySelector(".brand-mesh")).not.toBeNull();
  });

  it("names each statement with the kit's section heading, in reading order", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "ar" }));

    const headings = [...container.querySelectorAll(".brand-section-heading h2")].map((h) => h.textContent);
    expect(headings).toEqual(["vision", "mission"]);
  });

  it("draws each statement's photograph when the record has one, and none when it has none", async () => {
    const { container } = render(
      await VisionMissionStatements({ record: { ...RECORD, visionImage: photo("vision") }, locale: "ar" }),
    );

    const [vision, mission] = surfaces(container, "canvas");
    expect(vision.querySelector('img[src*="vision"]')).not.toBeNull();
    expect(mission.querySelector("img")).toBeNull();
  });

  it("puts the vision's photograph at the end of the line and the mission's at the start", async () => {
    const { container } = render(
      await VisionMissionStatements({
        record: { ...RECORD, visionImage: photo("vision"), missionImage: photo("mission") },
        locale: "ar",
      }),
    );

    const sides = [...container.querySelectorAll("[data-slanted-photo]")].map((p) => p.getAttribute("data-side"));
    expect(sides).toEqual(["end", "start"]);
  });

  it("marks every stored statement field for the text comparison", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "en" }));

    for (const [field, text] of [
      ["visionTitle", "Vision line"],
      ["visionText", "Vision text"],
      ["missionTitle", "Mission line"],
      ["missionText", "Mission text"],
    ]) {
      expect(container.querySelector(`[data-field="${field}"]`)?.textContent).toBe(text);
    }
  });
});

describe("StrategicGoals", () => {
  it("cycles the cards through green, ink and red by position, starting again after the third", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(5) }, locale: "ar" }));

    const tones = [...container.querySelectorAll("ol > li > article")].map((card) => card.getAttribute("data-surface"));
    expect(tones).toEqual(["brand-green", "ink", "brand-red", "brand-green", "ink"]);
  });

  it("uses no pastel item colour anywhere", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(4) }, locale: "ar" }));

    expect(container.innerHTML).not.toMatch(/color-item-/);
  });

  it("gives every ink card the mesh, its required edge cue", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(3) }, locale: "ar" }));

    const ink = container.querySelector('article[data-surface="ink"]')!;
    expect(ink.querySelector(".brand-mesh")).not.toBeNull();
  });

  it("prints each goal's number as the card's ordinal, hidden from assistive technology", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(2) }, locale: "ar" }));

    const ordinals = [...container.querySelectorAll(".brand-feature-card__ordinal")];
    expect(ordinals.map((o) => o.textContent)).toEqual(["01", "02"]);
    for (const ordinal of ordinals) expect(ordinal).toHaveAttribute("aria-hidden", "true");
  });

  it("draws a goal's icon when the record names one, and none when it does not", async () => {
    const withIcon = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(1) }, locale: "ar" }));
    expect(withIcon.container.querySelector(".brand-feature-card__icon svg")).not.toBeNull();
    withIcon.unmount();

    const without = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(1, null) }, locale: "ar" }));
    expect(without.container.querySelector(".brand-feature-card__icon")).toBeNull();
  });

  it("names the goals with the kit's heading and sets the stored sentence as its description", async () => {
    const { container } = render(
      await StrategicGoals({
        record: { ...RECORD, strategicGoals: goals(1), goalsTitle: { ar: "جملة", en: "Line" } },
        locale: "ar",
      }),
    );

    expect(container.querySelector(".brand-section-heading h2")!.textContent).toBe("goals");
    expect(container.querySelector('.brand-section-heading__description [data-field="goalsTitle"]')!.textContent).toBe(
      "جملة",
    );
  });

  it("marks each goal's title and description for the text comparison", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(2) }, locale: "en" }));

    const list = container.querySelector('[data-field="strategicGoals"]')!;
    expect([...list.querySelectorAll('[data-part="title"]')].map((n) => n.textContent)).toEqual(["Goal 1", "Goal 2"]);
    expect(list.querySelectorAll('[data-part="description"]')).toHaveLength(2);
  });

  it("draws nothing without goals", async () => {
    expect(await StrategicGoals({ record: RECORD, locale: "ar" })).toBeNull();
  });
});

describe("ValuesBand", () => {
  it("stands on a full-bleed brand-green surface, each value a glass tile", () => {
    const { container } = render(
      <ValuesBand record={{ values: values(3), valuesTitle: { ar: "القيم", en: "Values" } }} locale="ar" />,
    );

    expect(container.querySelector('section[data-surface="brand-green"]')).not.toBeNull();
    expect(container.querySelectorAll("ul > li > .brand-glass-tile")).toHaveLength(3);
    expect(container.innerHTML).not.toMatch(/color-item-/);
  });

  it("draws each value's icon inside its tile", () => {
    const { container } = render(<ValuesBand record={{ values: values(2), valuesTitle: null }} locale="ar" />);

    expect(container.querySelectorAll(".brand-glass-tile__icon svg")).toHaveLength(2);
  });

  it("marks the list and each tile's words only where a field is named", () => {
    const marked = render(<ValuesBand record={{ values: values(2), valuesTitle: null }} locale="en" field="coreValues" />);
    const list = marked.container.querySelector('[data-field="coreValues"]')!;
    expect([...list.querySelectorAll('[data-part="title"]')].map((n) => n.textContent)).toEqual(["Value 1", "Value 2"]);
    marked.unmount();

    const plain = render(<ValuesBand record={{ values: values(2), valuesTitle: null }} locale="en" />);
    expect(plain.container.querySelector("[data-part]")).toBeNull();
  });
});

describe("StrategyCta", () => {
  it("is a red card inset into the canvas, never a band that could abut the green", async () => {
    const { container } = render(await StrategyCta({ locale: "ar" }));

    const holder = container.querySelector('section[data-surface="canvas"]')!;
    expect(holder).not.toBeNull();
    expect(holder.querySelector('[data-surface="brand-red"]')).not.toBeNull();
  });

  it("links to the strategic plan as the primary action and to About as the secondary, in the page's locale", async () => {
    const { container } = render(await StrategyCta({ locale: "en" }));

    const links = [...container.querySelectorAll<HTMLAnchorElement>("a.brand-button")];
    expect(links.map((a) => [a.getAttribute("href"), a.dataset.variant])).toEqual([
      ["/en/about/governance/strategic-plan", "primary"],
      ["/en/about", "secondary"],
    ]);
  });
});
