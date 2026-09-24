import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveLiveStream, AdminVideo } from "@/lib/admin/videos/types";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const translate = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${Object.values(values).join(",")}` : key;
    return translate;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: unknown }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const { LiveBanner } = await import("./live-banner");
const { VideoTable } = await import("./video-table");

const video = (overrides: Partial<AdminVideo> = {}): AdminVideo => ({
  id: "1",
  title: { ar: "نهائي 100 متر", en: "100m final" },
  category: "championships",
  kind: "video",
  platform: "youtube",
  url: "https://www.youtube.com/watch?v=abc",
  externalId: "abc",
  thumbnailId: null,
  status: "published",
  publishedAt: "2026-03-14T10:00:00.000Z",
  ...overrides,
});

const stream = (expectedEndAt: string): ActiveLiveStream => ({
  id: "live1",
  title: { ar: "اليوم الختامي", en: "Final day" },
  venue: null,
  videoId: "LIVEID",
  url: "https://www.youtube.com/live/LIVEID",
  startedAt: "2026-03-14T18:00:00.000Z",
  expectedEndAt,
  thumbnailId: null,
});

describe("LiveBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T19:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("draws nothing when no broadcast is running", () => {
    // The banner is an interruption. It belongs on screen only while there is
    // something on the site that an editor might need to stop.
    const { container } = render(<LiveBanner stream={null} onEnd={() => undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says how long is left while the broadcast is running", () => {
    render(<LiveBanner stream={stream("2026-03-14T21:30:00.000Z")} onEnd={() => undefined} />);

    // 2h30m from the fake now.
    expect(screen.getByText("liveBannerRemaining:2,30")).toBeInTheDocument();
  });

  it("re-reads the clock, so the figure does not go stale in an open tab", () => {
    // Painted once, "2h 30m left" is wrong a minute later and an hour wrong by
    // the end of a session.
    render(<LiveBanner stream={stream("2026-03-14T21:30:00.000Z")} onEnd={() => undefined} />);
    expect(screen.getByText("liveBannerRemaining:2,30")).toBeInTheDocument();

    // Inside `act`, or the interval fires and React never flushes the state
    // it set — the assertion would read the first paint and pass on nothing.
    act(() => vi.advanceTimersByTime(31 * 60 * 1000));

    expect(screen.getByText("liveBannerRemaining:1,59")).toBeInTheDocument();
  });

  it("says the broadcast is no longer showing once its end time has passed", () => {
    // The row is still `isActive` in the database — nobody pressed anything —
    // but the site stopped showing it, and the banner must not claim otherwise.
    render(<LiveBanner stream={stream("2026-03-14T18:30:00.000Z")} onEnd={() => undefined} />);

    expect(screen.getByText("liveBannerExpired")).toBeInTheDocument();
    expect(screen.queryByText(/liveBannerRemaining/)).toBeNull();
  });

  it("offers both ways out of a running broadcast", () => {
    render(<LiveBanner stream={stream("2026-03-14T21:00:00.000Z")} onEnd={() => undefined} />);

    // Correcting is an address now, not an overlay: a link, so it can be
    // opened in a new tab, bookmarked and sent to a colleague.
    expect(screen.getByRole("link", { name: "liveEdit" })).toHaveAttribute(
      "href",
      "/videos/live/live1/edit",
    );
    expect(screen.getByRole("button", { name: "liveEndNow" })).toBeInTheDocument();
  });
});

/**
 * Both layouts are in the DOM at once — jsdom applies no media query, so
 * `md:hidden` and `hidden md:block` hide nothing here. Every assertion below
 * therefore says which arrangement it is about, which is also the honest thing
 * to do now that there are two.
 */
const table = () => within(screen.getByRole("table").closest("div.hidden") as HTMLElement);
const cards = () => within(screen.getByRole("list", { name: "tableCaption" }));

describe("VideoTable — the table, from `md` up", () => {
  it("names each row's platform in words, not only by its mark", () => {
    // The dashboard shows the word; the public card hides it. An editor
    // scanning a mixed list reads faster than they recognise a monochrome mark.
    render(<VideoTable videos={[video()]} />);

    expect(table().getByText("platform_youtube")).toBeInTheDocument();
  });

  it("makes the title the way into the record", () => {
    render(<VideoTable videos={[video()]} />);

    expect(table().getByRole("link", { name: "نهائي 100 متر" })).toHaveAttribute(
      "href",
      "/videos/1/edit",
    );
  });

  it("carries the full title as a tooltip, because the column clips it", () => {
    render(<VideoTable videos={[video()]} />);

    expect(table().getByRole("link", { name: "نهائي 100 متر" })).toHaveAttribute(
      "title",
      "نهائي 100 متر",
    );
  });

  it("draws the stored still, and nothing at all when there is none", () => {
    // A thumbnail nobody stored is not one this screen may invent: a guessed
    // platform URL is a picture the federation never chose.
    const { container: withStill } = render(
      <VideoTable
        videos={[video({ thumbnailId: "asset1" })]}
        thumbnails={new Map([["asset1", "https://cdn.test/a.jpg"]])}
      />,
    );
    expect(withStill.querySelector("img")).toHaveAttribute("src", "https://cdn.test/a.jpg");

    // No picture draws the placeholder, not an empty box — so there is no
    // `<img>`, and there IS something in its place.
    const { container: without } = render(<VideoTable videos={[video()]} />);
    expect(without.querySelector("img")).toBeNull();
    expect(without.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
  });

  it("offers the row's actions behind one button, not four", () => {
    render(
      <VideoTable
        videos={[video()]}
        rowMenu={() => [{ key: "open", label: "openOnPlatform", onSelect: () => undefined }]}
      />,
    );

    expect(table().getByRole("button", { name: "rowMenuLabel:نهائي 100 متر" })).toBeInTheDocument();
  });

  it("draws no options column for a reader who cannot write", () => {
    // A column full of refusals is worse than no column.
    render(<VideoTable videos={[video()]} />);

    expect(screen.queryByText("colActions")).toBeNull();
  });

  it("orders by publication date, newest first", () => {
    // The same order the public library uses, so what an editor sees is the
    // order a visitor gets. There is no manual ordering anywhere.
    render(
      <VideoTable
        videos={[
          video({ id: "older", title: { ar: "أقدم", en: "older" }, publishedAt: "2026-01-01T00:00:00.000Z" }),
          video({ id: "newer", title: { ar: "أحدث", en: "newer" }, publishedAt: "2026-05-01T00:00:00.000Z" }),
        ]}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("أحدث")).toBeInTheDocument();
  });

  it("sorts drafts, which have no date, after everything published", () => {
    render(
      <VideoTable
        videos={[
          video({ id: "draft", title: { ar: "مسودة", en: "draft" }, status: "draft", publishedAt: null }),
          video({ id: "live", title: { ar: "منشور", en: "published" }, publishedAt: "2026-01-01T00:00:00.000Z" }),
        ]}
      />,
    );

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("منشور")).toBeInTheDocument();
  });

  it("labels a draft as a draft", () => {
    render(<VideoTable videos={[video({ status: "draft", publishedAt: null })]} />);

    expect(table().getByText("status_draft")).toBeInTheDocument();
  });

  it("draws the same rows as cards at phone width", () => {
    // Below `md` a table hides every column after the title behind a sideways
    // scroll nothing advertises. The card carries the same facts and the same
    // actions — built from the same parts, so neither layout can drift.
    render(
      <VideoTable
        videos={[video()]}
        rowMenu={() => [{ key: "open", label: "openOnPlatform", onSelect: () => undefined }]}
      />,
    );

    const card = cards();
    expect(card.getByRole("link", { name: "نهائي 100 متر" })).toHaveAttribute("href", "/videos/1/edit");
    expect(card.getByText("platform_youtube")).toBeInTheDocument();
    expect(card.getByText("status_published")).toBeInTheDocument();
    expect(card.getByRole("button", { name: "rowMenuLabel:نهائي 100 متر" })).toBeInTheDocument();
  });

  it("carries no drag handle — ordering is by date, not by hand", () => {
    const { container } = render(<VideoTable videos={[video()]} />);

    expect(container.querySelector("[draggable='true']")).toBeNull();
  });

  it("says so plainly when there is nothing yet", () => {
    render(<VideoTable videos={[]} />);

    expect(screen.getByText("empty")).toBeInTheDocument();
  });
});
