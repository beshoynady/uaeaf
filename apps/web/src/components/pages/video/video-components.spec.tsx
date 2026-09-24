import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmbedFrame } from "./embed-frame";
import { PlatformBadge } from "./platform-badge";
import { ReelCard } from "./reel-card";
import { VideoCard } from "./video-card";
import { VideoPlayerModal } from "./video-player-modal";
import type { VideoPublic } from "@/lib/video/types";

/**
 * The five promises this system makes that no happy path exercises.
 *
 * 1. No third-party iframe exists before a reader asks for one.
 * 2. A library video goes to the nocookie origin; a broadcast cannot.
 * 3. The platform's name reaches assistive technology and nothing else, on a
 *    public card.
 * 4. A reel is never drawn in the 16:9 shell.
 * 5. The player traps focus, closes on Escape and hands focus back.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
}));

const video = (overrides: Partial<VideoPublic> = {}): VideoPublic => ({
  id: "v1",
  title: { ar: "نهائي 100 متر", en: "100m final" },
  category: "championships",
  kind: "video",
  platform: "youtube",
  url: "https://www.youtube.com/watch?v=abc123",
  externalId: "abc123",
  thumbnailId: null,
  publishedAt: "2026-03-14T10:00:00.000Z",
  season: "2025-2026",
  tags: [],
  ...overrides,
});

const LABELS = {
  play: "play",
  failedTitle: "failedTitle",
  failedBody: "failedBody",
  openOn: "openOn",
  retry: "retry",
};

describe("EmbedFrame", () => {
  it("renders no iframe at all before the press", async () => {
    // The whole point of the facade. A homepage carrying eight embeds at rest
    // pays for eight third-party waterfalls most visitors never start.
    const { container } = render(
      <EmbedFrame platform="youtube" externalId="abc123" url="https://youtu.be/abc123" title="A clip" labels={LABELS}>
        <span>facade</span>
      </EmbedFrame>,
    );

    expect(container.querySelectorAll("iframe")).toHaveLength(0);
  });

  it("renders exactly one iframe after the press, from the nocookie origin", async () => {
    const { container } = render(
      <EmbedFrame platform="youtube" externalId="abc123" url="https://youtu.be/abc123" title="A clip" labels={LABELS}>
        <span>facade</span>
      </EmbedFrame>,
    );

    await userEvent.click(screen.getByRole("button"));

    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute("src")).toContain("youtube-nocookie.com/embed/abc123");
  });

  it("uses the ordinary YouTube origin for a broadcast", async () => {
    // The nocookie host does not serve live streams reliably. This is the one
    // place the two differ, and it is the reason `live` exists as a prop.
    const { container } = render(
      <EmbedFrame platform="youtube" externalId="LIVE1" url="https://youtube.com/live/LIVE1" title="Live" live labels={LABELS}>
        <span>facade</span>
      </EmbedFrame>,
    );

    await userEvent.click(screen.getByRole("button"));

    const src = container.querySelector("iframe")?.getAttribute("src") ?? "";
    expect(src).toContain("www.youtube.com/embed/LIVE1");
    expect(src).not.toContain("nocookie");
  });

  it("offers a link out, and never a dead player, for a platform with no embed", () => {
    // X needs its own third-party script to embed, which would be a script on
    // every page that draws a card. A link is the honest affordance.
    const { container } = render(
      <EmbedFrame platform="x" externalId="99" url="https://x.com/uaeaf/status/99" title="A post" labels={LABELS}>
        <span>facade</span>
      </EmbedFrame>,
    );

    expect(container.querySelectorAll("iframe")).toHaveLength(0);
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://x.com/uaeaf/status/99");
  });
});

describe("PlatformBadge", () => {
  it("reads the platform's name to assistive technology and shows nobody else", () => {
    const { container } = render(<PlatformBadge platform="tiktok" label="TikTok" />);

    expect(screen.getByText("TikTok")).toHaveClass("sr-only");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("VideoCard and ReelCard", () => {
  it("draws a landscape video in the 16:9 shell", () => {
    render(
      <VideoCard
        video={video()}
        locale="ar"
        labels={{ platform: "YouTube", category: "championships" }}
        onPlay={() => undefined}
      />,
    );

    const shell = screen.getByTestId("video-card").querySelector("span");
    expect(shell).toHaveStyle({ aspectRatio: "16 / 9" });
  });

  it("draws a reel at 9:16, never letterboxed into a landscape card", () => {
    // Cropping a 9:16 still to 16:9 takes the subject's head off; padding it
    // into bars is worse. The separate shelf is the design's answer and this
    // is what holds the two components apart.
    render(
      <ReelCard
        video={video({ kind: "reel", platform: "instagram" })}
        locale="ar"
        labels={{ platform: "Instagram" }}
        onPlay={() => undefined}
      />,
    );

    expect(screen.getByTestId("reel-card")).toHaveStyle({ aspectRatio: "9 / 16" });
  });

  it("names the card by its title in the reading language", () => {
    render(
      <VideoCard
        video={video()}
        locale="en"
        labels={{ platform: "YouTube", category: "championships" }}
        onPlay={() => undefined}
      />,
    );

    expect(within(screen.getByTestId("video-card")).getByText("100m final")).toBeInTheDocument();
  });
});

describe("VideoPlayerModal", () => {
  const MODAL_LABELS = {
    ...LABELS,
    close: "close",
    previous: "previous",
    next: "next",
    position: "1 of 3",
    platform: "YouTube",
    category: "championships",
    share: "share",
    shareCopied: "copied",
    openOnPlatform: "openOnPlatform",
  };

  const open = (props: Partial<Parameters<typeof VideoPlayerModal>[0]> = {}) => {
    const opener = document.createElement("button");
    opener.textContent = "the card";
    document.body.append(opener);

    const view = render(
      <VideoPlayerModal
        video={video()}
        locale="ar"
        labels={MODAL_LABELS}
        onClose={() => undefined}
        onPrevious={() => undefined}
        onNext={() => undefined}
        hasPrevious
        hasNext
        returnFocusTo={opener}
        {...props}
      />,
    );
    return { ...view, opener };
  };

  it("announces itself as a modal dialog named by the video", () => {
    open();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog")).toHaveAccessibleName("نهائي 100 متر");
  });

  it("starts focus on Close rather than inside the platform's frame", () => {
    // Landing on the iframe hands the reader's first keystroke to YouTube.
    open();
    expect(screen.getByRole("button", { name: "close" })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    open({ onClose });

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("still closes on Escape after focus has fallen out of the dialog", async () => {
    // Found in review: clicking the title — which is not focusable — leaves
    // `document.activeElement` as `<body>`, and a keydown handler bound to the
    // panel never fires again. The reader is then stuck in a dialog that
    // ignores Escape. The same happens after any click into the platform's
    // iframe, whose keys never reach this document at all.
    const onClose = vi.fn();
    open({ onClose });
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pulls focus back into the dialog when Tab is pressed from outside it", async () => {
    // The other half of the same failure: with focus on the body, Tab walks
    // into the site header behind the dialog rather than to the close button.
    open();
    (document.activeElement as HTMLElement | null)?.blur();

    await userEvent.tab();

    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("keeps Tab inside the dialog", async () => {
    // Without the trap a reader tabs out into the page behind, which is still
    // there and still full of cards they cannot see.
    const { container } = open();
    const dialog = screen.getByRole("dialog");

    for (let press = 0; press < 12; press += 1) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    expect(container).toBeTruthy();
  });

  it("returns focus to the element that opened it", () => {
    // Captured on open rather than looked up on close: by then the grid may
    // have re-rendered and the card may be gone.
    const { unmount, opener } = open();

    unmount();

    expect(document.activeElement).toBe(opener);
  });

  it("refuses to step past either end rather than wrapping", () => {
    open({ hasPrevious: false, hasNext: false });

    expect(screen.getByRole("button", { name: "previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "next" })).toBeDisabled();
  });
});
