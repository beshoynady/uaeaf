import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PresidentMessagePublic } from "@/lib/api/types";
import { PresidentMessage } from "./president-message";
import { ValuesBand } from "./values-band";

/**
 * The President's Message page, built from the Live record (ADR-0069 D10,
 * `page-president-message.md` §7.4) and assembled from `@uaeaf/brand-ui`
 * (ADR-0098 D7). What is asserted here is structure the record and the kit
 * decide; distances, the reading measure and the entrance are measured in a
 * browser, where they exist.
 */

const paragraph = (words: string, lead?: string) => ({
  type: "paragraph",
  content: [
    ...(lead ? [{ type: "text", text: lead, marks: [{ type: "bold" }] }] : []),
    { type: "text", text: words },
  ],
});

const RECORD: PresidentMessagePublic = {
  heroTitle: { ar: "كلمة الرئيس", en: "President's Message" },
  heroSubtitle: { ar: "كلمة رئيس اتحاد الإمارات لألعاب القوى", en: "President of the UAE Athletics Federation" },
  signatoryName: { ar: "سعادة اللواء الدكتور محمد عبدالله المر", en: "Dr. Muhammad Abdullah Al-Murr" },
  signatoryTitle: { ar: "رئيس الاتحاد", en: "President" },
  pullQuote: { ar: "«نعمل على بناء منظومة متكاملة»", en: "\"We are building an integrated system\"" },
  messageBody: {
    ar: { type: "doc", content: [paragraph(" الأولى", "يتبنّى"), paragraph(" الثانية", "نسعى"), paragraph(" الثالثة", "لطالما")] },
    en: { type: "doc", content: [paragraph("First."), paragraph("Second."), paragraph("Third.")] },
  },
  valuesTitle: { ar: "قيمنا وتوجهاتنا", en: "Our Values & Direction" },
  values: [
    { title: { ar: "التميز", en: "Excellence" }, description: { ar: "ب", en: "b" }, iconKey: "award", displayOrder: 2 },
    { title: { ar: "الرؤية", en: "Vision" }, description: { ar: "أ", en: "a" }, iconKey: "eye", displayOrder: 1 },
    { title: { ar: "القيادة", en: "Leadership" }, description: { ar: "ج", en: "c" }, iconKey: "star", displayOrder: 3 },
  ],
  heroImage: null,
  featuredImage: { url: "/portrait.png", altText: { ar: "الرئيس", en: "The President" }, width: 491, height: 508 },
  seo: null,
  publishedAt: "2026-09-13T11:32:14.553Z",
};

describe("PresidentMessage", () => {
  it("stands on a canvas surface with the mesh", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    const section = container.querySelector('section[data-surface="canvas"]')!;
    expect(section).not.toBeNull();
    expect(section.querySelector(":scope > .brand-mesh")).not.toBeNull();
  });

  it("renders every paragraph of the stored body inside one article, bold lead-ins included", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    const article = container.querySelector("article");
    expect(article?.querySelectorAll(":scope > div > p")).toHaveLength(3);
    expect([...(article?.querySelectorAll("strong") ?? [])].map((node) => node.textContent)).toEqual([
      "يتبنّى",
      "نسعى",
      "لطالما",
    ]);
  });

  it("places the quote card after the first paragraph: an ink figure holding the portrait and the blockquote", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    const flow = [...(container.querySelector("article > div")?.children ?? [])];
    expect(flow[0].tagName).toBe("P");
    const figure = flow[1].querySelector("figure")!;
    expect(figure).toHaveAttribute("data-surface", "ink");
    expect(figure.querySelector("blockquote")?.textContent).toBe("«نعمل على بناء منظومة متكاملة»");
    expect(figure.querySelector("img[data-portrait]")).toHaveAttribute("alt", "الرئيس");
  });

  // ADR-0098 §8.4: ink measures 1.05:1 against the dark page ground, so the
  // card needs an edge cue that is not its ground.
  it("gives the ink card the mesh", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    expect(container.querySelector("figure > .brand-mesh")).not.toBeNull();
  });

  // ADR-0072 D9: from `lg` the card and the body stand side by side; the DOM
  // order, and so the phone's reading order, is unchanged.
  it("sets the card in a column of its own beside the body from lg, alongside every paragraph", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    const flow = container.querySelector<HTMLElement>("article > div")!;
    expect(flow.className).toContain("lg:grid");
    const column = flow.children[1] as HTMLElement;
    expect(column.className).toContain("lg:col-start-2");
    expect(column.style.gridRow).toBe("1 / span 3");
  });

  it("keeps the portrait in a card without a quote, and draws no card with neither", () => {
    const portraitOnly = render(<PresidentMessage record={{ ...RECORD, pullQuote: null }} locale="en" />).container;
    expect(portraitOnly.querySelector("figure img[data-portrait]")).not.toBeNull();
    expect(portraitOnly.querySelector("blockquote")).toBeNull();

    const neither = render(
      <PresidentMessage record={{ ...RECORD, pullQuote: null, featuredImage: null }} locale="en" />,
    ).container;
    expect(neither.querySelector("figure")).toBeNull();
  });

  it("signs the message with the name, the title and the Live publication's date", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    const signature = container.querySelector("article > footer");
    expect(signature?.textContent).toContain("سعادة اللواء الدكتور محمد عبدالله المر");
    expect(signature?.textContent).toContain("رئيس الاتحاد");
    const time = signature?.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-09-13T11:32:14.553Z");
    expect(time?.textContent).toBe("13 سبتمبر 2026");

    const english = render(<PresidentMessage record={RECORD} locale="en" />).container;
    expect(english.querySelector("time")?.textContent).toBe("September 13, 2026");
  });

  // Chapter 4 §4.10: no text under 13px. The caption role is 12px on a phone
  // (§4.4), so the date takes body-sm, 13px there (owner decision, closing brief M4).
  it("sets the signature's date at no less than 13px on a phone: body-sm, not the caption role", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    const date = container.querySelector("article > footer time")!.parentElement!;
    expect(date.className).toContain("text-body-sm");
    expect(date.className).not.toContain("text-caption");
  });
});

describe("ValuesBand", () => {
  it("lists the values in their display order on the green surface, each a glass tile titled by a heading", () => {
    const { container } = render(<ValuesBand record={RECORD} locale="en" />);
    expect(container.querySelector("section")).toHaveAttribute("data-surface", "brand-green");
    expect(container.querySelector(".brand-section-heading h2")?.textContent).toBe("Our Values & Direction");
    expect([...container.querySelectorAll("ul > li .brand-glass-tile h3")].map((node) => node.textContent)).toEqual([
      "Vision",
      "Excellence",
      "Leadership",
    ]);
    expect(container.querySelectorAll("ul > li .brand-glass-tile__icon[aria-hidden='true'] svg")).toHaveLength(3);
  });

  it("lets an odd last tile take the whole row where the grid has two columns", () => {
    const { container } = render(<ValuesBand record={RECORD} locale="ar" />);
    const cards = container.querySelectorAll("ul > li");
    expect(cards[cards.length - 1].className).toContain("md:max-xl:col-span-2");
    expect(cards[0].className ?? "").not.toContain("col-span-2");
  });

  it("draws nothing when the record has no values", () => {
    const { container } = render(<ValuesBand record={{ ...RECORD, values: [] }} locale="ar" />);
    expect(container.querySelector("section")).toBeNull();
  });
});
