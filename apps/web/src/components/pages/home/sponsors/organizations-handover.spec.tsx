import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrganizationCardPublic } from "@/lib/api/types";
import { OrganizationsSection } from "./organizations-section";

/**
 * Where the seam handover stands (ADR-0087 D8): on one seam, the top of the
 * partners' green band, and nowhere else until that one has been measured.
 */

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/components/ui/seam-handover", () => ({
  SeamHandover: ({ direction }: { direction: string }) => <div data-seam-handover="" data-direction={direction} />,
}));

const card = (id: string): OrganizationCardPublic =>
  ({
    id,
    name: { ar: `جهة ${id}`, en: `Body ${id}` },
    logo: { url: "https://res.cloudinary.com/demo/image/upload/v1/logo.png", altText: { ar: "شعار", en: "logo" }, width: 480, height: 240 },
    displayOrder: 0,
  }) as OrganizationCardPublic;

const draw = async (kind: "partners" | "memberships", locale: "ar" | "en" = "ar") =>
  render(await OrganizationsSection({ kind, items: [card("a")], section: null, locale })).container;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the seam handover's one place", () => {
  it("stands at the top of the partners' band, in the page's reading direction", async () => {
    expect((await draw("partners", "ar")).querySelector("[data-seam-handover]")?.getAttribute("data-direction")).toBe("rtl");
    expect((await draw("partners", "en")).querySelector("[data-seam-handover]")?.getAttribute("data-direction")).toBe("ltr");
  });

  it("comes first inside a positioned band: it fills the band's top edge to edge, and lies under what follows", async () => {
    const section = (await draw("partners")).querySelector("section");
    // `absolute inset-x-0 top-0` is measured from the nearest positioned
    // ancestor. If the band stopped being one, the strip would span something
    // else, silently.
    expect(section?.className.split(" ")).toContain("relative");
    expect(section?.querySelector(":scope > div")?.firstElementChild?.hasAttribute("data-seam-handover")).toBe(true);
  });

  it("stands nowhere else: the memberships open on the page's own ground, where there is no colour to carry", async () => {
    expect((await draw("memberships")).querySelector("[data-seam-handover]")).toBeNull();
  });

  it("is not in the page at all when the switch names it", async () => {
    vi.stubEnv("UAEAF_MOTION_OFF", "seam");
    expect((await draw("partners")).querySelector("[data-seam-handover]")).toBeNull();
  });
});
