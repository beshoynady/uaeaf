import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PublicImage, VisionMissionPublic } from "@/lib/api/types";
import { ValuesBand } from "@/components/pages/president/values-band";
import { IdentityHero } from "@/components/ui/identity-hero";
import { StrategicGoals } from "./goals";
import { VisionMissionStatements } from "./statements";
import { StrategyCta } from "./strategy-cta";

/**
 * Every picture the page prints is content with a field on the record (owner
 * rule 2026-09-14, ADR-0070 D1). A section draws its photograph when the
 * published version has one, and stands without it when it has none; what is
 * asserted here is that the record decides, not how the photograph looks.
 */

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

// The call's links are locale-aware; which locale they carry is not what this
// file is about.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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

describe("VisionMissionStatements", () => {
  it("draws each statement's photograph when the record has one, and none when it has none", async () => {
    const element = await VisionMissionStatements({
      record: { ...RECORD, visionImage: photo("vision") },
      locale: "ar",
    });
    const { container } = render(element);

    expect(container.querySelector('section[aria-labelledby="vision-title"] img[src*="vision"]')).not.toBeNull();
    expect(container.querySelector('section[aria-labelledby="mission-title"] img')).toBeNull();
  });

  // ADR-0071 D7: the photograph is a column beside the statement, not a ground
  // under a scrim, so the statement reads on the page's own ground.
  it("sets each photograph beside its statement, not behind it", async () => {
    const { container } = render(
      await VisionMissionStatements({
        record: { ...RECORD, visionImage: photo("vision"), missionImage: photo("mission") },
        locale: "ar",
      }),
    );

    for (const name of ["vision", "mission"]) {
      const image = container.querySelector(`img[src*="${name}"]`)!;
      expect(image.closest("[aria-hidden]"), `${name}: the photograph is content, not a hidden ground`).toBeNull();
      expect(image.getAttribute("loading")).toBe("lazy");
      // From `lg` the picture takes the statement's height, cropped, rather than
      // a thumbnail at its own ratio beside a taller text.
      expect(image.className).toContain("lg:h-full");
      expect(image.className).toContain("lg:object-cover");
    }
    expect(container.querySelector('[class*="linear-gradient"]'), "no scrim over the statements").toBeNull();
  });

  it("prints each statement's ordinal at display size, hidden from assistive technology", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "ar" }));

    const numeral = (id: string) => container.querySelector(`section[aria-labelledby="${id}"] [data-numeral]`);
    expect(numeral("vision-title")?.textContent).toBe("01");
    expect(numeral("mission-title")?.textContent).toBe("02");
    expect(numeral("vision-title")).toHaveAttribute("aria-hidden", "true");
    expect(numeral("vision-title")?.className).toContain("text-display-xl");
  });

  it("draws the four identity strokes in the band, without an entrance", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "ar" }));

    const band = container.querySelector("[data-identity-band]");
    expect(band).not.toBeNull();
    const strokes = band!.querySelectorAll("[data-il-stroke]");
    expect(strokes).toHaveLength(4);
    expect(band!.querySelector("[data-identity-lines]")).toHaveAttribute("aria-hidden", "true");
    // `.il-stroke` is the hero's entrance; a band further down the page is not a stage.
    for (const stroke of strokes) expect(stroke.classList.contains("il-stroke")).toBe(false);
  });
});

describe("StrategicGoals", () => {
  it("prints each goal's number at display size", async () => {
    const goals = [1, 2].map((n) => ({ title: { ar: `هدف ${n}`, en: `Goal ${n}` }, description: { ar: "و", en: "d" }, displayOrder: n }));
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals }, locale: "ar" }));

    const numbers = [...container.querySelectorAll('ol[data-field="strategicGoals"] > li > [aria-hidden="true"]')];
    expect(numbers.map((n) => n.textContent)).toEqual(["01", "02"]);
    for (const n of numbers) expect(n.className).toContain("text-display-l");
  });
});

describe("IdentityHero", () => {
  const hero = (height?: "first-screen" | "content") =>
    render(
      <IdentityHero
        titleId="t"
        title="الرؤية والرسالة"
        subtitle="ع"
        ground={photo("hero")}
        locale="ar"
        breadcrumb={null}
        height={height}
      />,
    ).container.querySelector("section[data-composition]")!;

  it("fills the first screen with a photograph by default (ADR-0067 D2)", () => {
    expect(hero().className).toContain("min-h-[calc(100svh-var(--space-24))]");
  });

  it("takes its content's height where the page makes it a band (ADR-0071 D6)", () => {
    expect(hero("content").className).not.toContain("min-h-[calc(100svh-var(--space-24))]");
  });
});

describe("ValuesBand", () => {
  const values = { values: RECORD.coreValues, valuesTitle: { ar: "قيمنا", en: "Our Values" } };

  it("draws the band's photograph when one is given", () => {
    const { container } = render(<ValuesBand record={values} locale="ar" ground={photo("values")} />);

    expect(container.querySelector('img[src*="values"]')).not.toBeNull();
  });

  it("stays on its register with no photograph, as the President's Message prints it", () => {
    const { container } = render(<ValuesBand record={values} locale="ar" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("section")).toHaveAttribute("data-register", "green");
  });
});

describe("StrategyCta", () => {
  it("draws the call's photograph when the record has one, and none when it has none", async () => {
    const withPhoto = render(await StrategyCta({ locale: "ar", ground: photo("cta") }));
    expect(withPhoto.container.querySelector('img[src*="cta"]')).not.toBeNull();
    withPhoto.unmount();

    const without = render(await StrategyCta({ locale: "ar", ground: null }));
    expect(without.container.querySelector("img")).toBeNull();
  });
});
