import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PublicImage, VisionMissionPublic } from "@/lib/api/types";
import { ValuesBand } from "@/components/pages/president/values-band";
import { IdentityHero } from "@/components/ui/identity-hero";
import { StrategicGoals } from "./goals";
import { VisionMissionStatements } from "./statements";
import { StrategyCta } from "./strategy-cta";

/**
 * Vision & Mission as ADR-0072 lays it out. Every picture the page prints is
 * content with a field on the record (owner rule 2026-09-14, ADR-0070 D1), so
 * what is asserted is structure the record and the system decide; distances,
 * the reading measure and the entrance are measured in a browser.
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

const statement = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`section[aria-labelledby="${id}"]`)!;

describe("VisionMissionStatements", () => {
  it("draws each statement's photograph when the record has one, and none when it has none", async () => {
    const { container } = render(
      await VisionMissionStatements({ record: { ...RECORD, visionImage: photo("vision") }, locale: "ar" }),
    );

    expect(statement(container, "vision-title").querySelector('img[src*="vision"]')).not.toBeNull();
    expect(statement(container, "mission-title").querySelector("img")).toBeNull();
  });

  // ADR-0072 D5: sections alternate their ground, so the rhythm is carried by
  // the page and not by a panel inside it.
  it("sets the vision on the base ground and the mission on the sunken ground", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "ar" }));

    expect(statement(container, "vision-title")).toHaveAttribute("data-ground", "base");
    expect(statement(container, "mission-title")).toHaveAttribute("data-ground", "sunken");
  });

  // Owner decision (brief 2026-09-15 §٣, ADR-0075): the ordinals fall to
  // Display L and the hero title rises to Display XL — the title is the
  // message, the ordinal is punctuation.
  it("prints each ordinal at Display L in its item's ink, hidden from assistive technology", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "ar" }));

    const numeral = (id: string) => statement(container, id).querySelector("[data-numeral]")!;
    expect(numeral("vision-title").textContent).toBe("01");
    expect(numeral("mission-title").textContent).toBe("02");
    expect(numeral("vision-title")).toHaveAttribute("aria-hidden", "true");
    expect(numeral("vision-title").className.split(" ")).toContain("md:text-display-l");
    expect(numeral("vision-title").className.split(" ")).toContain("text-h1");
    expect(numeral("vision-title").className).not.toContain("text-display-2xl");
    expect(numeral("vision-title").className).toContain("var(--color-item-1-ink)");
    expect(numeral("mission-title").className).toContain("var(--color-item-2-ink)");
  });

  // ADR-0072 D6: from `lg` the photograph leaves the container and runs to the
  // page edge on its own side, cut along a slanted inner edge.
  it("bleeds each photograph to the page edge on its own side from lg, cut on a slant", async () => {
    const { container } = render(
      await VisionMissionStatements({
        record: { ...RECORD, visionImage: photo("vision"), missionImage: photo("mission") },
        locale: "ar",
      }),
    );

    const vision = statement(container, "vision-title").querySelector<HTMLElement>("[data-slanted-photo]")!;
    const mission = statement(container, "mission-title").querySelector<HTMLElement>("[data-slanted-photo]")!;
    expect(vision.className).toContain("lg:absolute");
    // 5 of the 12 columns, the cap a portrait takes beside a title, so the words keep 7.
    expect(vision.className).toContain("lg:w-[calc(100%*5/12_-_var(--space-8))]");
    expect(vision.className).toContain("lg:end-0");
    expect(mission.className).toContain("lg:start-0");
    expect(vision.querySelector("[data-slant]")!.className).toContain("clip-path");
  });

  it("keeps each photograph content, loaded lazily, with no scrim", async () => {
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
    }
    expect(container.querySelector('[class*="linear-gradient"]'), "no scrim over the statements").toBeNull();
  });

  // ADR-0072 D2: IL-5 keeps the strokes 32px from text only, so they may cross a
  // photograph; drawn at the light weight and out of the accessibility tree.
  it("crosses each photograph with light identity strokes, hidden from assistive technology", async () => {
    const { container } = render(
      await VisionMissionStatements({ record: { ...RECORD, visionImage: photo("vision") }, locale: "ar" }),
    );

    const lines = statement(container, "vision-title").querySelector("[data-slanted-photo] [data-identity-lines]")!;
    expect(lines).toHaveAttribute("aria-hidden", "true");
    const strokes = lines.querySelectorAll("[data-il-stroke]");
    expect(strokes.length).toBeGreaterThanOrEqual(2);
    for (const stroke of strokes) expect(stroke).toHaveAttribute("data-il-weight", "light");
  });

  it("marks each statement's name with the accent rule", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "ar" }));

    for (const id of ["vision-title", "mission-title"]) {
      expect(container.querySelector(`#${id} [data-accent-rule]`), id).toHaveAttribute("aria-hidden", "true");
    }
  });

  // Chapter 4 §4.10: no text under 13px. The label role is 12px on a phone
  // (§4.4), so the names take body-sm, 13px there (owner decision, closing brief M4).
  it("sets each statement's name at no less than 13px on a phone: body-sm, not the label role", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "ar" }));

    for (const id of ["vision-title", "mission-title"]) {
      const name = container.querySelector(`#${id}`)!;
      expect(name.className, id).toContain("text-body-sm");
      expect(name.className, id).not.toContain("text-label");
    }
  });

  // Rule 3 (page-building guide §8): the seam between the statements is marked
  // by their two photographs meeting there on opposite sides. Without both, the
  // mission draws the identity strokes on it, as the goals do on theirs.
  it("draws seam lines on the mission when the two photographs do not meet at its seam", async () => {
    const seamOf = async (record: VisionMissionPublic) => {
      const { container, unmount } = render(await VisionMissionStatements({ record, locale: "ar" }));
      const seam = statement(container, "mission-title").querySelector("[data-seam-lines]");
      const vision = statement(container, "vision-title").querySelector("[data-seam-lines]");
      unmount();
      return { seam: seam !== null, vision: vision !== null };
    };

    expect(await seamOf({ ...RECORD, missionImage: photo("mission") })).toEqual({ seam: true, vision: false });
    expect(await seamOf({ ...RECORD, visionImage: photo("vision") })).toEqual({ seam: true, vision: false });
    expect(await seamOf({ ...RECORD, visionImage: photo("vision"), missionImage: photo("mission") })).toEqual({
      seam: false,
      vision: false,
    });
  });

  // The strokes stand across the seam, half of them above the mission's top
  // edge: the section clips sideways only, for the photograph's bleed.
  it("clips the mission sideways only where it draws seam lines, so the strokes above its edge stay painted", async () => {
    const { container } = render(await VisionMissionStatements({ record: { ...RECORD, missionImage: photo("mission") }, locale: "ar" }));

    const mission = statement(container, "mission-title");
    expect(mission.className).toContain("overflow-x-clip");
    expect(mission.className.split(" ")).not.toContain("overflow-clip");
  });

  // The owner's rule of 2026-09-15: the lines take the empty places and never
  // push content aside, so there is no band that reserves room for them.
  it("reserves no band for the lines", async () => {
    const { container } = render(await VisionMissionStatements({ record: RECORD, locale: "ar" }));

    expect(container.querySelector("[data-identity-band]")).toBeNull();
  });
});

describe("StrategicGoals", () => {
  it("colours the cards through the four item colours by position, starting again after the fourth", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(6) }, locale: "ar" }));

    const cards = [...container.querySelectorAll('ol[data-field="strategicGoals"] > li')];
    expect(cards.map((card) => card.className.match(/--color-item-(\d)-surface/)?.[1])).toEqual(["1", "2", "3", "4", "1", "2"]);
  });

  it("prints each goal's number at display size in its item's ink", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(2) }, locale: "ar" }));

    const numbers = [...container.querySelectorAll('ol[data-field="strategicGoals"] > li [data-item-number]')];
    expect(numbers.map((n) => n.textContent)).toEqual(["01", "02"]);
    expect(numbers[0].className).toContain("text-display-l");
    expect(numbers[0].className).toContain("var(--color-item-1-ink)");
    expect(numbers[1].className).toContain("var(--color-item-2-ink)");
    expect(numbers[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("draws a goal's icon from the closed set when the record names one, and none when it does not", async () => {
    const withIcons = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(2) }, locale: "ar" }));
    expect(withIcons.container.querySelectorAll("ol > li svg[aria-hidden='true']")).toHaveLength(2);
    withIcons.unmount();

    const without = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(2, null) }, locale: "ar" }));
    expect(without.container.querySelectorAll("ol > li svg")).toHaveLength(0);
  });

  it("names the goals at the h2 size with the accent rule, and sets the stored sentence under it", async () => {
    const { container } = render(
      await StrategicGoals({
        record: { ...RECORD, strategicGoals: goals(1), goalsTitle: { ar: "جملة الأهداف", en: "Goals line" } },
        locale: "ar",
      }),
    );

    const heading = container.querySelector("#vision-mission-goals-title")!;
    expect(heading.className).toContain("text-h2");
    expect(heading.querySelector("[data-accent-rule]")).not.toBeNull();
    expect(container.querySelector('[data-field="goalsTitle"]')!.className).toContain("text-body-lg");
  });

  // Owner brief 2026-09-15 §4.2–4.3: the goals carry a section-scale identity
  // element, and the seam with the mission before them is marked. The identity
  // strokes stand on that seam in its empty corner, at the reading end.
  it("draws identity strokes on the seam with the section before, reserving no room", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(6) }, locale: "ar" }));

    const section = container.querySelector<HTMLElement>('section[aria-labelledby="vision-mission-goals-title"]')!;
    const seam = section.querySelector<HTMLElement>("[data-seam-lines]")!;
    expect(seam, "the seam lines are drawn").not.toBeNull();
    expect(seam).toHaveAttribute("aria-hidden", "true");
    // Placed against the section and out of the flow, so no content moves for them.
    expect(section.className).toContain("relative");
    expect(seam.className).toContain("absolute");
    for (const stroke of seam.querySelectorAll("[data-il-stroke]")) expect(stroke).toHaveAttribute("data-il-weight", "light");
  });

  // IL-3 and IL-7: A stands on the frame's left edge and B on its right. The
  // empty corner is the reading end, the left in Arabic and the right in English,
  // so each direction draws the group whose edge that is.
  it("draws group A for Arabic and group B for English on the seam", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(1) }, locale: "ar" }));

    const seam = container.querySelector("[data-seam-lines]")!;
    const groupA = seam.querySelectorAll('[data-il-group="a"]');
    const groupB = seam.querySelectorAll('[data-il-group="b"]');
    expect(groupA).toHaveLength(2);
    expect(groupB).toHaveLength(2);
    expect(groupA[0].parentElement!.className).toContain("ltr:hidden");
    expect(groupB[0].parentElement!.className).toContain("rtl:hidden");
  });

  it("carries no arrow: the cards are not links", async () => {
    const { container } = render(await StrategicGoals({ record: { ...RECORD, strategicGoals: goals(3) }, locale: "ar" }));

    expect(container.querySelector("ol a")).toBeNull();
    expect(container.querySelector("ol")!.textContent).not.toMatch(/[→←]/);
  });
});

describe("IdentityHero", () => {
  const hero = () =>
    render(
      <IdentityHero titleId="t" title="الرؤية والرسالة" subtitle="ع" ground={photo("hero")} locale="ar" />,
    ).container.querySelector("section[data-composition]")!;

  // Owner decision 2026-09-16 (ADR-0078): header plus hero is the screen's
  // height on every page. This retires ADR-0071 D6's content-height band, which
  // is why there is no longer a mode to test the opposite of.
  it("fills the first screen with a photograph, on every page (ADR-0078)", () => {
    expect(hero().className.split(" ")).toContain("hero-first-screen");
  });

  // Owner decision 2026-09-15: institutional pages carry no visible trail.
  it("opens straight on the lines and the title when the page gives no trail", () => {
    const section = hero();
    expect(section.querySelector("nav")).toBeNull();
    expect(section.querySelector("[data-hero-trail]")).toBeNull();
  });

  it("draws its strokes at the light weight", () => {
    const strokes = hero().querySelectorAll("[data-il-stroke]");
    expect(strokes).toHaveLength(4);
    for (const stroke of strokes) expect(stroke).toHaveAttribute("data-il-weight", "light");
  });
});

describe("ValuesBand", () => {
  it("stands on the page's sunken ground where a page asks for it, coloured by position", () => {
    const { container } = render(
      <ValuesBand record={{ values: values(6), valuesTitle: { ar: "قيمنا", en: "Our Values" } }} locale="ar" register="neutral" ground="sunken" />,
    );

    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("data-register", "neutral");
    expect(section).toHaveAttribute("data-ground", "sunken");
    expect(container.querySelector("img")).toBeNull();
    const cards = [...container.querySelectorAll("ul > li")];
    expect(cards.map((card) => card.className.match(/--color-item-(\d)-surface/)?.[1])).toEqual(["1", "2", "3", "4", "1", "2"]);
  });

  it("draws each value's icon in its item's ink, without a chip", () => {
    const { container } = render(
      <ValuesBand record={{ values: values(2), valuesTitle: null }} locale="ar" register="neutral" />,
    );

    const icons = [...container.querySelectorAll("ul > li [data-item-icon]")];
    expect(icons).toHaveLength(2);
    expect(icons[0].className).toContain("var(--color-item-1-ink)");
    expect(container.querySelector(".card-icon")).toBeNull();
  });

  it("stays on the green register by default, as the President's Message prints it", () => {
    const { container } = render(<ValuesBand record={{ values: values(1), valuesTitle: null }} locale="ar" />);

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

  it("stands on the green register with its photograph slanted at the far end", async () => {
    const { container } = render(await StrategyCta({ locale: "ar", ground: photo("cta") }));

    expect(container.querySelector("section")).toHaveAttribute("data-register", "green");
    expect(container.querySelector("[data-slanted-photo]")!.className).toContain("lg:end-0");
    expect(container.querySelector('[class*="linear-gradient"]'), "the words stand beside the photograph, not on it").toBeNull();
  });

  // On the green band the primary takes the band's inverse, so it outweighs the
  // outlined secondary instead of sinking into the band (green on green 1.95:1).
  it("gives the primary action the band's inverse on the green register", async () => {
    const { container } = render(await StrategyCta({ locale: "ar", ground: null }));

    const primary = container.querySelector('a[href="/about/governance/strategic-plan"]')!;
    expect(primary.className).toContain("bg-[color:var(--color-section-green-text)]");
    expect(primary.className).toContain("text-[color:var(--color-section-green-surface)]");
  });

  it("stands on the page's own ground where a page asks for it", async () => {
    const { container } = render(await StrategyCta({ locale: "ar", ground: null, register: "neutral" }));

    expect(container.querySelector("section")).toHaveAttribute("data-register", "neutral");
  });

  // Rule 1 (guide §٨): a neutral call with no photograph has no section-scale
  // identity element, and it follows the green values on both pages, so its
  // seam lines stand below the seam (ADR-0075 M0-B). With a photograph the
  // picture is the element and no strokes are added.
  it("draws seam lines below the seam on the neutral ground when it has no photograph, and none with one", async () => {
    const without = render(await StrategyCta({ locale: "ar", ground: null, register: "neutral" }));
    const seam = without.container.querySelector<HTMLElement>("section [data-seam-lines]")!;
    expect(seam).not.toBeNull();
    expect(seam).toHaveAttribute("data-placement", "below");
    expect(without.container.querySelector("section")!.className).toContain("relative");
    without.unmount();

    const withPhoto = render(await StrategyCta({ locale: "ar", ground: photo("cta"), register: "neutral" }));
    expect(withPhoto.container.querySelector("[data-seam-lines]")).toBeNull();
    withPhoto.unmount();

    const onGreen = render(await StrategyCta({ locale: "ar", ground: null, register: "green" }));
    expect(onGreen.container.querySelector("[data-seam-lines]")).toBeNull();
  });

  it("links to the strategic plan and to About", async () => {
    const { container } = render(await StrategyCta({ locale: "ar", ground: null }));

    expect([...container.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "/about/governance/strategic-plan",
      "/about",
    ]);
  });
});
