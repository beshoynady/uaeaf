import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PresidentMessagePublic } from "@/lib/api/types";
import { PresidentHero } from "./president-hero";
import { PresidentMessage } from "./president-message";
import { ValuesBand } from "./values-band";

/**
 * The President's Message page, built from the Live record (ADR-0069 D10,
 * `page-president-message.md` §7.4). What is asserted here is structure the
 * record decides; distances, the reading measure and the entrance are measured
 * in a browser, where they exist.
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

describe("PresidentHero", () => {
  it("stands on the green band when the record has no background image (composition B)", () => {
    const { container } = render(<PresidentHero record={RECORD} locale="ar" breadcrumb={null} />);
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("data-composition", "b");
    expect(section).toHaveAttribute("data-register", "green");
  });

  it("stands on the record's background image under the scrim when there is one (composition C)", () => {
    const ground = { url: "/ground.png", altText: { ar: "", en: "" }, width: 1600, height: 900 };
    const { container } = render(
      <PresidentHero record={{ ...RECORD, heroImage: ground }} locale="ar" breadcrumb={null} />,
    );
    expect(container.querySelector("section")).toHaveAttribute("data-composition", "c");
    expect(container.querySelector('img[src*="ground"]')).not.toBeNull();
  });

  it("puts the title block before the portrait in reading order", () => {
    const { container } = render(<PresidentHero record={RECORD} locale="en" breadcrumb={null} />);
    const title = container.querySelector("h1");
    const portrait = container.querySelector('img[alt="The President"]');
    expect(title?.textContent).toBe("President's Message");
    expect(portrait).not.toBeNull();
    expect(title!.compareDocumentPosition(portrait!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the identity lines out of the accessibility tree", () => {
    const { container } = render(<PresidentHero record={RECORD} locale="ar" breadcrumb={null} />);
    expect(container.querySelector("[data-identity-lines]")).toHaveAttribute("aria-hidden", "true");
  });

  it("gives the title the whole row when the record has no portrait, in either language", () => {
    for (const locale of ["ar", "en"] as const) {
      const { container, unmount } = render(
        <PresidentHero record={{ ...RECORD, featuredImage: null }} locale={locale} breadcrumb={null} />,
      );
      const row = container.querySelector("h1")!.closest("[class*='lg:grid ']")!;
      expect(row.className).toContain("lg:grid-cols-1");
      expect(row.className).not.toContain("rtl:grid-cols");
      unmount();
    }
  });

  it("caps the portrait at five of the twelve columns from lg", () => {
    const { container } = render(<PresidentHero record={RECORD} locale="en" breadcrumb={null} />);
    const row = container.querySelector<HTMLElement>("h1")!.closest<HTMLElement>("[class*='lg:grid ']")!;
    expect(row.className).toContain("lg:grid-cols-[minmax(0,1fr)_var(--pm-portrait-track)]");
    expect(row.style.getPropertyValue("--pm-portrait-track")).toContain("calc(100% * 5 / 12)");
  });

  it("gives the portrait its size before the picture arrives, from the asset's own dimensions", () => {
    const { container } = render(<PresidentHero record={RECORD} locale="en" breadcrumb={null} />);
    const portrait = container.querySelector<HTMLImageElement>('img[alt="The President"]')!;
    expect(portrait.style.aspectRatio).toBe("491 / 508");
    expect(portrait.style.width).toContain("491px");
    expect(portrait.className).not.toContain("w-auto");
  });

  it("stands group A beside the title in Arabic below lg, and above it otherwise", () => {
    const { container } = render(<PresidentHero record={RECORD} locale="ar" breadcrumb={null} />);

    const beside = container.querySelector("h1")!.parentElement!.querySelectorAll('[data-il-group="a"]');
    expect(beside).toHaveLength(2);
    expect(beside[0].parentElement!.className).toContain("max-lg:rtl:block");

    const above = container.querySelectorAll('[data-identity-lines] [data-il-group="a"]');
    expect(above).toHaveLength(2);
    expect(above[0].className).toContain("max-lg:rtl:hidden");

    expect(container.querySelector("[data-il-reserve]")!.className).toContain("max-lg:rtl:h-0");
  });

  it("settles a background image over the ambient duration, on the ground plane only", () => {
    const ground = { url: "/ground.png", altText: { ar: "", en: "" }, width: 1600, height: 900 };
    const { container } = render(
      <PresidentHero record={{ ...RECORD, heroImage: ground }} locale="en" breadcrumb={null} />,
    );
    expect(container.querySelector('img[src*="ground"]')!.className).toContain("pm-ground");
    expect(container.querySelectorAll(".pm-ground")).toHaveLength(1);
  });
});

describe("PresidentMessage", () => {
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

  it("places the pull-quote after the first paragraph, as a figure holding a blockquote", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    const flow = [...(container.querySelector("article > div")?.children ?? [])];
    expect(flow[0].tagName).toBe("P");
    expect(flow[1].tagName).toBe("FIGURE");
    expect(flow[1].querySelector("blockquote")?.textContent).toBe("«نعمل على بناء منظومة متكاملة»");
  });

  // ADR-0072 D9: from `lg` the quote and the body stand side by side, as in the
  // owner's reference; the DOM order, and so the phone's reading order, is unchanged.
  it("sets the pull-quote in a column of its own beside the body from lg, alongside every paragraph", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    const flow = container.querySelector<HTMLElement>("article > div")!;
    expect(flow.className).toContain("lg:grid");
    const figure = flow.querySelector<HTMLElement>("figure")!;
    expect(figure.className).toContain("lg:col-start-2");
    expect(figure.style.gridRow).toBe("1 / span 3");
    // Beside the body, one column gap away, rather than at the container's far edge.
    expect(figure.className).toContain("lg:justify-self-start");
    expect(figure.querySelector("[data-quote-mark]")).toHaveAttribute("aria-hidden", "true");
    expect(figure.querySelector("[data-reveal-part='rule']")!.className).toContain("var(--color-border-accent)");
  });
  // Rule 1 (guide §٨): the message follows the green portrait hero with no
  // photograph of its own, so it carries the identity strokes below the seam,
  // on the page's ground, where they clear 3:1 (ADR-0075 M0-B; the finding
  // ADR-0074 D8 left pending).
  it("draws the identity strokes below the seam with the hero, reserving no room", () => {
    const { container } = render(<PresidentMessage record={RECORD} locale="ar" />);
    const section = container.querySelector("section")!;
    expect(section.className).toContain("relative");
    const seam = section.querySelector<HTMLElement>("[data-seam-lines]")!;
    expect(seam).not.toBeNull();
    expect(seam).toHaveAttribute("data-placement", "below");
    expect(seam).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[data-identity-band]")).toBeNull();
  });

  it("draws no figure when the record has no pull-quote", () => {
    const { container } = render(<PresidentMessage record={{ ...RECORD, pullQuote: null }} locale="en" />);
    expect(container.querySelector("figure")).toBeNull();
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
  it("lists the values in their display order, each titled by a heading", () => {
    const { container } = render(<ValuesBand record={RECORD} locale="en" />);
    expect(container.querySelector("section")).toHaveAttribute("data-register", "green");
    expect(container.querySelector("h2")?.textContent).toBe("Our Values & Direction");
    expect([...container.querySelectorAll("ul > li h3")].map((node) => node.textContent)).toEqual([
      "Vision",
      "Excellence",
      "Leadership",
    ]);
    expect(container.querySelectorAll("ul > li svg[aria-hidden='true']")).toHaveLength(3);
  });

  it("lets an odd last card take the whole row where the grid has two columns", () => {
    const { container } = render(<ValuesBand record={RECORD} locale="ar" />);
    const cards = container.querySelectorAll("ul > li");
    expect(cards[cards.length - 1].className).toContain("md:max-xl:col-span-2");
    expect(cards[0].className).not.toContain("col-span-2");
  });

  it("draws nothing when the record has no values", () => {
    const { container } = render(<ValuesBand record={{ ...RECORD, values: [] }} locale="ar" />);
    expect(container.querySelector("section")).toBeNull();
  });
});
