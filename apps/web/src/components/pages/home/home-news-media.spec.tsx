import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CarouselControls } from "@/components/ui/carousel-controls";
import { PressCoverageCard } from "./press-coverage-card";
import { HomeNewsSection } from "./news-section";
import type { ArticlePublic, PageSectionPublic } from "@/lib/api/types";

const translate = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

vi.mock("next-intl", () => ({
  useTranslations: () => translate,
  useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
}));
vi.mock("next-intl/server", () => ({ getTranslations: async () => translate }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const words = (count: number) => Array.from({ length: count }, () => "كلمة").join(" ");

const article = (n: number, overrides: Partial<ArticlePublic> = {}): ArticlePublic => ({
  id: String(n),
  category: "General",
  topic: n === 1 ? "nationalTeam" : null,
  tags: [],
  slug: `story-${n}`,
  title: { ar: `خبر ${n}`, en: `Story ${n}` },
  authorDisplayName: { ar: "الإعلام", en: "Media" },
  publishDate: "2026-09-21T09:00:00.000Z",
  sourceOutlet: null,
  sourceUrl: null,
  coverMediaId: null,
  body: {
    ar: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: words(450) }] }] },
    en: { type: "doc" },
  },
  excerpt: { ar: `مقتطف ${n}`, en: `Excerpt ${n}` },
  seo: null,
  ...overrides,
});

const shelf = { id: "latest", sectionTitle: null, sectionSubtitle: null } as unknown as PageSectionPublic;

describe("HomeNewsSection", () => {
  it("leads with the newest story and lists the next five beside it", async () => {
    render(await HomeNewsSection({ section: shelf, articles: [1, 2, 3, 4, 5, 6, 7].map((n) => article(n)), covers: new Map(), locale: "ar" }));

    const [lead, ...list] = screen.getAllByRole("article");
    expect(within(lead).getByRole("link")).toHaveAttribute("href", "/news/story-1");
    // Six stories, as the canvas draws them; a seventh is not drawn.
    expect(list.map((item) => within(item).getByRole("link").getAttribute("href"))).toEqual([
      "/news/story-2",
      "/news/story-3",
      "/news/story-4",
      "/news/story-5",
      "/news/story-6",
    ]);
  });

  it("gives every story one link, its headline, and a heading of one level", async () => {
    render(await HomeNewsSection({ section: shelf, articles: [article(1), article(2)], covers: new Map(), locale: "ar" }));

    for (const story of screen.getAllByRole("article")) {
      expect(within(story).getAllByRole("link")).toHaveLength(1);
      expect(within(story).getByRole("heading", { level: 3 })).toBeInTheDocument();
    }
  });

  it("says how long the lead story takes to read, counted from its words", async () => {
    render(await HomeNewsSection({ section: shelf, articles: [article(1)], covers: new Map(), locale: "ar" }));

    // 450 words at 200 a minute, rounded up.
    expect(screen.getByText(/readingTime:\{"minutes":3\}/)).toBeInTheDocument();
    expect(screen.getByText("topic_nationalTeam")).toBeInTheDocument();
  });

  it("links to the whole newsroom from its heading", async () => {
    render(await HomeNewsSection({ section: shelf, articles: [article(1)], covers: new Map(), locale: "ar" }));

    expect(screen.getByRole("link", { name: "homeViewAll" })).toHaveAttribute("href", "/news");
  });

  it("draws nothing when the newsroom has published nothing", async () => {
    expect(await HomeNewsSection({ section: shelf, articles: [], covers: new Map(), locale: "ar" })).toBeNull();
  });
});

describe("PressCoverageCard", () => {
  it("leaves the site only through a link that says so", () => {
    render(
      <PressCoverageCard
        logo="[logo]"
        publication="[publication]"
        title="[title]"
        excerpt="[excerpt]"
        date={{ label: "[date]" }}
        href="https://example.org/coverage"
        labels={{ read: "Read the coverage", readLabel: "Read the original coverage (opens in a new window)" }}
      />,
    );

    const link = screen.getByRole("link", { name: "Read the original coverage (opens in a new window)" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    // The visible words are inside the accessible name (WCAG 2.5.3).
    expect(link).toHaveTextContent("Read the coverage");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("CarouselControls", () => {
  const labels = { previous: "Previous", next: "Next", position: "Group 1 of 2" };

  it("steps back and forward, and cannot step past either end", async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const { rerender } = render(
      <CarouselControls pages={2} current={0} onPrevious={onPrevious} onNext={onNext} controls="track" labels={labels} />,
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).toHaveBeenCalledTimes(1);

    rerender(<CarouselControls pages={2} current={1} onPrevious={onPrevious} onNext={onNext} controls="track" labels={labels} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("says where the reader is in words, and draws the dots as a picture of it", () => {
    const { container } = render(
      <CarouselControls pages={3} current={1} onPrevious={() => {}} onNext={() => {}} controls="track" labels={labels} />,
    );

    expect(screen.getByText("Group 1 of 2")).toHaveAttribute("aria-live", "polite");
    const dots = container.querySelectorAll("[aria-hidden='true'] > span");
    expect(dots).toHaveLength(3);
    expect([...dots].map((dot) => dot.hasAttribute("data-current"))).toEqual([false, true, false]);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-controls", "track");
      // 44px, the touch-target floor.
      expect(button.className).toContain("size-11");
    }
  });
});
