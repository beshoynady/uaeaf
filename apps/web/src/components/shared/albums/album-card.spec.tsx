import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AA_NORMAL_TEXT, contrastRatio, themeTokens } from "@uaeaf/design-tokens/testing";

import { AlbumCard } from "./album-card";
import { AssociationChips } from "./association-chips";
import { PhotoStack } from "./photo-stack";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { MediaAssetPublic } from "@/lib/api/types";

/**
 * What the album card promises, and what the photo stack inside it may and
 * may not do.
 *
 * 1. One destination, one link, named by the title.
 * 2. The affiliation chip exists only when there is an affiliation, and its
 *    kind is written out — the colour is not the only carrier.
 * 3. The stack draws as many layers as there are photographs, up to three,
 *    and describes only the one a reader can see.
 * 4. The stack never moves on its own (ADR-0099 D2): its animation is
 *    attached only under hover or focus, and only without reduced motion.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(",")})` : key,
  useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const photo = (id: string): MediaAssetPublic => ({
  id,
  file: { url: `/media/${id}.jpg`, mimeType: "image/jpeg", width: 1600, height: 1000, size: 1, photographer: null, captureDate: null },
  caption: { ar: "", en: "" },
  altText: { ar: `وصف ${id}`, en: `Alt ${id}` },
  displayOrder: 0,
  isFeatured: false,
});

const album = (overrides: Partial<AlbumListItem> = {}): AlbumListItem => ({
  id: "a1",
  title: { ar: "نهائي سباق 100 متر", en: "100m final" },
  slug: "final-100m",
  description: null,
  championshipId: null,
  competitionId: null,
  publicEventId: null,
  athleteIds: [],
  clubIds: [],
  eventDate: "2026-03-15T00:00:00.000Z",
  location: { ar: "دبي", en: "Dubai" },
  isFeatured: false,
  championshipName: null,
  coverImageId: null,
  publishedAt: null,
  tags: [],
  assetCount: 24,
  previewPhotos: [photo("p1"), photo("p2"), photo("p3"), photo("p4")],
  ...overrides,
});

describe("AlbumCard", () => {
  it("is one link to the album, named by its title", () => {
    render(<AlbumCard album={album()} locale="ar" />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/media/albums/final-100m");
    expect(screen.getByRole("link", { name: "نهائي سباق 100 متر" })).toBe(links[0]);
  });

  it("describes the link with the date, the place and the photo count", () => {
    render(<AlbumCard album={album()} locale="ar" />);

    const description = screen.getByRole("link").getAttribute("aria-describedby");
    const details = document.getElementById(description ?? "");
    expect(details).toHaveTextContent("2026-03-15");
    expect(details).toHaveTextContent("دبي");
    expect(details).toHaveTextContent("photoCount(count=24)");
  });

  it("uses the heading level it is given", () => {
    render(<AlbumCard album={album()} locale="en" headingLevel="h2" />);
    expect(screen.getByRole("heading", { level: 2, name: "100m final" })).toBeInTheDocument();
  });

  it("leaves out a place the album does not have, rather than an empty row item", () => {
    render(<AlbumCard album={album({ location: null })} locale="ar" />);
    expect(screen.queryByText("placeLabel:", { exact: false })).toBeNull();
  });

  it("draws no chip at all for an album with no affiliation", () => {
    render(<AlbumCard album={album()} locale="ar" />);
    expect(screen.queryByRole("list", { name: "label" })).toBeNull();
  });

  it("draws the narrowest affiliation only, with its kind written out", () => {
    render(
      <AlbumCard
        album={album()}
        locale="ar"
        affiliations={[
          { kind: "championship", id: "c", label: "بطولة الإمارات 2026" },
          { kind: "competition", id: "k", label: "نهائي 100 متر" },
        ]}
      />,
    );

    const chips = within(screen.getByRole("list", { name: "label" })).getAllByRole("listitem");
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent("kind_competition: نهائي 100 متر");
    expect(chips[0].firstElementChild).toHaveAttribute("data-kind", "competition");
  });
});

describe("AssociationChips", () => {
  const items = [
    { kind: "championship" as const, id: "c", label: "UAE Championship", href: "/championships/c" },
    { kind: "competition" as const, id: "k", label: "100m final" },
  ];

  it("renders nothing when there is nothing to name", () => {
    const { container } = render(<AssociationChips items={[]} placement="hero" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("draws every affiliation on a hero, and links the ones that have a page", () => {
    render(<AssociationChips items={items} placement="hero" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/championships/c");
  });

  it("never links a chip over a photograph, where it sits inside a card link", () => {
    render(<AssociationChips items={items} placement="media" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it.each(["championship", "competition", "publicEvent"] as const)(
    "writes the %s kind on the chip itself, visibly, before the name",
    (kind) => {
      const { container } = render(
        <AssociationChips items={[{ kind, id: "x", label: "Name" }]} placement="media" />,
      );
      const chip = container.querySelector(`.album-chip[data-kind="${kind}"]`)!;
      const marker = chip.querySelector(".album-chip__kind")!;
      expect(marker).toHaveTextContent(`kind_${kind}:`);
      // Seen, not only heard: nothing between the marker and the chip hides it.
      expect(marker.closest(".brand-visually-hidden")).toBeNull();
      expect(chip.querySelector(".brand-visually-hidden")).toBeNull();
      expect(chip.textContent).toBe(`kind_${kind}: Name`);
    },
  );

  it("writes the kind on the hero's chips too, linked or not", () => {
    const { container } = render(<AssociationChips items={items} placement="hero" />);
    const markers = [...container.querySelectorAll(".album-chip__kind")].map((marker) => marker.textContent);
    expect(markers).toEqual(["kind_championship:", "kind_competition:"]);
    expect(screen.getByRole("link")).toHaveTextContent("kind_championship: UAE Championship");
  });
});

describe("the chips' paint (ADR-0063 D1)", () => {
  const css = readFileSync(join(import.meta.dirname, "albums.css"), "utf-8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );

  /** Every rule that paints a chip, as its selector and declarations. */
  const chipRules = [...css.matchAll(/([^{}]*\.album-chip[^{}]*)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].trim(),
    body: match[2],
  }));

  const declared = (body: string, property: string) =>
    body.match(new RegExp(`(?:^|;|\\s)${property}:\\s*var\\((--[a-z0-9-]+)\\)`))?.[1];

  it("finds the rules it checks", () => {
    expect(chipRules.length).toBeGreaterThan(4);
  });

  it("paints no chip's words with an identity colour: those are plates", () => {
    const identity = /^--color-brand-(?:primary|secondary|black|white)$/;
    const offenders = chipRules
      .map(({ selector, body }) => ({ selector, ink: declared(body, "color") }))
      .filter(({ ink }) => ink !== undefined && identity.test(ink));
    expect(offenders).toEqual([]);
  });

  const MEDIA = {
    championship: { plate: "--color-brand-primary", ink: "--color-text-on-brand", measured: 4.81 },
    publicEvent: { plate: "--color-brand-secondary", ink: "--color-text-on-brand", measured: 5.88 },
    competition: {
      plate: "--color-brand-surface-ink-surface",
      ink: "--color-brand-surface-ink-text",
      measured: 19.68,
    },
  } as const;

  it.each(Object.keys(MEDIA) as (keyof typeof MEDIA)[])(
    "puts the %s chip over a photograph on the plate and ink recorded for it",
    (kind) => {
      const rule = chipRules.find(
        ({ selector }) => selector === `.album-chips[data-placement="media"] .album-chip[data-kind="${kind}"]`,
      );
      expect(declared(rule?.body ?? "", "background-color")).toBe(MEDIA[kind].plate);
      expect(declared(rule?.body ?? "", "color")).toBe(MEDIA[kind].ink);
    },
  );

  it.each(["light", "dark", "high-contrast"] as const)(
    "clears 4.5:1 for every chip over a photograph in the %s theme",
    (theme) => {
      const tokens = themeTokens(theme);
      for (const { plate, ink, measured } of Object.values(MEDIA)) {
        const ratio = contrastRatio(tokens[ink], tokens[plate]);
        expect(ratio, `${ink} on ${plate}`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
        // The same number in every theme: none of these six values moves.
        expect(Number(ratio.toFixed(2)), `${ink} on ${plate}`).toBe(measured);
      }
    },
  );
});

describe("PhotoStack", () => {
  const layers = (container: HTMLElement) => container.querySelectorAll(".photo-stack__layer");

  it("draws at most three layers", () => {
    const { container } = render(<PhotoStack photos={album().previewPhotos} locale="ar" />);
    expect(layers(container)).toHaveLength(3);
    expect(container.firstElementChild).toHaveAttribute("data-layers", "3");
  });

  it("draws two photographs as two layers and one as one, never repeating a photograph", () => {
    const two = render(<PhotoStack photos={[photo("a"), photo("b")]} locale="ar" />);
    expect(layers(two.container)).toHaveLength(2);
    const one = render(<PhotoStack photos={[photo("a")]} locale="ar" />);
    expect(layers(one.container)).toHaveLength(1);
  });

  it("describes only the front photograph", () => {
    render(<PhotoStack photos={album().previewPhotos} locale="en" />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Alt p1");
  });

  it("paints the front photograph last, so its edge covers the folded ones", () => {
    const { container } = render(<PhotoStack photos={album().previewPhotos} locale="ar" />);
    const slots = [...layers(container)].map((layer) => layer.getAttribute("data-slot"));
    expect(slots).toEqual(["2", "1", "0"]);
  });

  it("stands a quiet surface in for an album with no photographs yet", () => {
    const { container } = render(<PhotoStack photos={[]} locale="ar" />);
    expect(layers(container)).toHaveLength(0);
    expect(container.querySelector(".photo-stack__empty")).toHaveAttribute("data-surface", "canvas");
  });
});

describe("the stack's motion contract (ADR-0099 D2)", () => {
  const css = readFileSync(join(import.meta.dirname, "albums.css"), "utf-8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );

  /** Every rule that attaches an animation to a stack layer. */
  const attaching = [...css.matchAll(/([^{}]+)\{[^{}]*\banimation:\s*photo-stack-[a-z]+/g)].map((match) =>
    match[1].trim(),
  );

  it("finds the rules it is checking", () => {
    expect(attaching.length).toBeGreaterThan(0);
  });

  it("attaches the animation only under hover or focus", () => {
    for (const selectorList of attaching) {
      for (const selector of selectorList.split(",")) {
        expect(selector).toMatch(/:hover|:focus-within/);
      }
    }
  });

  it("attaches it only when the reader has not asked for reduced motion", () => {
    const guarded = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/g) ?? [];
    const inside = guarded.join("\n");
    expect(inside).toMatch(/animation:\s*photo-stack-trio/);
    expect(inside).toMatch(/animation:\s*photo-stack-pair/);
    const outside = guarded.reduce((rest, block) => rest.replace(block, ""), css);
    expect(outside).not.toMatch(/animation:\s*photo-stack-/);
  });
});
