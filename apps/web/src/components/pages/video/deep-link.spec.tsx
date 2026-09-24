import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeVideoSection } from "@/components/pages/home/video-section";
import { LibraryScreen } from "./library-screen";
import { videoObject } from "@/lib/video/structured-data";
import type { LibraryQuery } from "@/lib/video/library-query";
import type { VideoPublic, VideoSectionPublic } from "@/lib/video/types";

/**
 * One video, one address.
 *
 * `?video=<id>` opens the player on arrival, opening one writes the address
 * back, and closing takes it off again — all without a navigation, and without
 * losing the filters the reader had set. The four ways this goes wrong are
 * each pinned below: a stale id, a lost filter, a history stack full of
 * players, and a JSON-LD graph where every video claims the same URL.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
  useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
}));

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const video = (id: string, overrides: Partial<VideoPublic> = {}): VideoPublic => ({
  id,
  title: { ar: `عنوان ${id}`, en: `Title ${id}` },
  category: "championships",
  kind: "video",
  platform: "youtube",
  url: `https://www.youtube.com/watch?v=${id}`,
  externalId: id,
  thumbnailId: null,
  publishedAt: "2026-03-14T10:00:00.000Z",
  season: "2025-2026",
  tags: [],
  ...overrides,
});

const A = "6ab42297b8010ed304b0bf5a";
const B = "6ab42297b8010ed304b0bf5b";

const BASE: LibraryQuery = { kind: "all", period: "any", range: {}, page: 1 };

const library = (props: Partial<Parameters<typeof LibraryScreen>[0]> = {}) =>
  render(
    <LibraryScreen
      query={BASE}
      videos={[video(A), video(B)]}
      reels={[]}
      total={2}
      live={null}
      thumbnails={new Map()}
      seasons={[]}
      associations={[]}
      locale="ar"
      pageSize={12}
      {...props}
    />,
  );

describe("the library's deep link", () => {
  let replaceState: ReturnType<typeof vi.spyOn>;
  let pushState: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    push.mockClear();
    window.history.replaceState({}, "", "/ar/media/videos");
    replaceState = vi.spyOn(window.history, "replaceState");
    pushState = vi.spyOn(window.history, "pushState");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the player on the linked video at load", () => {
    library({ openVideoId: B });

    expect(screen.getByRole("dialog")).toHaveAccessibleName("عنوان " + B);
  });

  it("opens no player, and does not throw, for an id that is not in the list", () => {
    // A deleted video, a draft, or a link whose filters have since changed.
    // The library is what the reader gets, which is the useful outcome.
    library({ openVideoId: "6ab42297b8010ed304b0bfff" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("writes the video into the address when one is opened by hand", async () => {
    library();

    await userEvent.click(screen.getAllByTestId("video-card")[0]);

    expect(replaceState).toHaveBeenCalled();
    const written = String(replaceState.mock.calls.at(-1)?.[2]);
    expect(written).toContain(`video=${A}`);
  });

  it("takes the video back out of the address when the player closes", async () => {
    library({ openVideoId: A });

    await userEvent.click(screen.getByRole("button", { name: "close" }));

    const written = String(replaceState.mock.calls.at(-1)?.[2]);
    expect(written).not.toContain("video=");
    expect(written).toContain("/media/videos");
  });

  it("never pushes a history entry, so Back leaves the library rather than the player", async () => {
    // `push` would make the back button walk out of the player one video at a
    // time; the player is a state of this page, not a page of its own.
    library();

    await userEvent.click(screen.getAllByTestId("video-card")[0]);

    expect(pushState).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps every filter in the address when it writes the video into it", async () => {
    // The whole point of a shareable link: "reels from TikTok, this one".
    library({ query: { ...BASE, kind: "reel", platform: "tiktok", search: "100m", page: 2 } });

    await userEvent.click(screen.getAllByTestId("video-card")[0]);

    const written = String(replaceState.mock.calls.at(-1)?.[2]);
    expect(written).toContain("kind=reel");
    expect(written).toContain("platform=tiktok");
    expect(written).toContain("search=100m");
    expect(written).toContain("page=2");
    expect(written).toContain(`video=${A}`);
  });

  it("does not reopen the player after the reader closes it", async () => {
    // The linked id is still in the props; only a ref stops the effect from
    // putting the dialog straight back.
    library({ openVideoId: A });

    await userEvent.click(screen.getByRole("button", { name: "close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("the homepage section", () => {
  const section = (overrides: Partial<VideoSectionPublic> = {}): VideoSectionPublic => ({
    enabled: true,
    title: { ar: "من قلب المضمار", en: "From the track" },
    subtitle: null,
    live: null,
    featured: video(A),
    carousel: { items: [video(B)] },
    ...overrides,
  });

  it("draws nothing at all when the section row is switched off", () => {
    // What a deployment with no `VIDEO_LIBRARY` row amounts to: the endpoint
    // answers `enabled: false`, and the homepage must render without it rather
    // than fail. A section that renders empty is worse than one that is absent.
    const { container } = render(
      <HomeVideoSection section={section({ enabled: false })} thumbnails={new Map()} locale="ar" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("draws nothing when it is enabled but has nothing to show", () => {
    const { container } = render(
      <HomeVideoSection
        section={section({ featured: null, live: null, carousel: { items: [] } })}
        thumbnails={new Map()}
        locale="ar"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("still opens its cards in place, with no address to write", async () => {
    // The homepage has no address for one video, so its player is a pure
    // state change — unchanged by the library's deep linking.
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<HomeVideoSection section={section()} thumbnails={new Map()} locale="ar" />);

    await userEvent.click(screen.getAllByTestId("video-card")[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(replaceState).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe("VideoObject", () => {
  it("gives every video its own url", () => {
    // One shared `url` across twelve VideoObjects tells a search engine that
    // twelve different videos live at the same address.
    const one = videoObject(video(A), undefined, "ar", "https://uaeaf.ae");
    const two = videoObject(video(B), undefined, "ar", "https://uaeaf.ae");

    expect(one?.url).toBe(`https://uaeaf.ae/ar/media/videos?video=${A}`);
    expect(two?.url).toBe(`https://uaeaf.ae/ar/media/videos?video=${B}`);
    expect(one?.url).not.toBe(two?.url);
  });

  it("describes no video that has never been published", () => {
    expect(videoObject(video(A, { publishedAt: null }), undefined, "ar", "https://uaeaf.ae")).toBeNull();
  });
});
