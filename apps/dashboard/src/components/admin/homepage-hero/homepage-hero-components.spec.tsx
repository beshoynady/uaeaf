import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PointLike } from "@uaeaf/content/hero";
import { renderWithIntl } from "@/test/render";
import { addSlide, fromApi, moveSlide, moveSlideTo, type HeroDraft, type MediaLookup, type NextEventDraft, type SlideDraft } from "@/lib/admin/homepage-hero";
import { CtaCard } from "./cta-card";
import { FocalPointPicker } from "./focal-point-picker";
import { HeroPreview, previewNow } from "./hero-preview";
import { SlideStrip } from "./slide-strip";

beforeAll(() => {
  // jsdom has no layout, so no ResizeObserver: the preview's scale stays 0 and
  // the frame is laid out but hidden, which is what these tests read.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

const NOW = new Date("2026-09-17T08:00:00.000Z");

const record = (id: string, order: number, overrides: Record<string, unknown> = {}) => ({
  _id: id,
  displayOrder: order,
  active: true,
  imageAssetId: "img1",
  desktopFocalPoint: { x: 30, y: 60 },
  ltrImageMode: "mirror",
  title: { ar: `عنوان ${order + 1}`, en: `Title ${order + 1}` },
  subtitle: { ar: "نص", en: "Text" },
  primaryCta: { isVisible: true, label: { ar: "البطولات", en: "Championships" }, url: "/championships" },
  secondaryCta: { isVisible: false, label: null, url: null },
  ...overrides,
});

const EVENT: NextEventDraft = {
  isVisible: true,
  label: { ar: "الحدث القادم", en: "Next event" },
  name: { ar: "بطولة الإمارات", en: "UAE Championship" },
  venue: { ar: "أبوظبي", en: "Abu Dhabi" },
  startsAt: "2026-10-16T14:00:00.000Z",
  endsAt: "2026-10-18T18:00:00.000Z",
};

const draftOf = (...slides: ReturnType<typeof record>[]): HeroDraft =>
  fromApi({ _id: "64b000000000000000000020", sectionType: "HERO", configuration: { nextEvent: EVENT } }, slides);

const MEDIA: MediaLookup = new Map([
  ["img1", { url: "/uploads/a.jpg", width: 3840, height: 2160, altText: { ar: "", en: "" }, isAiGenerated: true }],
  ["img2", { url: "/uploads/b.jpg", width: 3840, height: 2160, altText: { ar: "", en: "" }, isAiGenerated: false }],
]);

describe("FocalPointPicker", () => {
  const Controlled = ({ onValue }: { onValue: (point: PointLike) => void }) => {
    const [value, setValue] = useState<PointLike>({ x: 50, y: 50 });
    return (
      <FocalPointPicker
        imageUrl="/a.jpg"
        width={16}
        height={9}
        value={value}
        textZone="right"
        label="Focal point"
        onChange={(point) => {
          setValue(point);
          onValue(point);
        }}
      />
    );
  };

  it("moves 1% with an arrow, 10% with Shift, and stops at the edge", async () => {
    const user = userEvent.setup();
    const seen: PointLike[] = [];
    renderWithIntl(<Controlled onValue={(point) => seen.push(point)} />, "en");
    const marker = screen.getByRole("button", { name: /horizontal 50%, vertical 50%/i });
    marker.focus();
    await user.keyboard("{ArrowRight}");
    expect(seen.at(-1)).toEqual({ x: 51, y: 50 });
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(seen.at(-1)).toEqual({ x: 51, y: 40 });
    for (let step = 0; step < 6; step += 1) await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(seen.at(-1)).toEqual({ x: 100, y: 40 });
    expect(screen.getByText("Horizontal 100% · Vertical 40%")).toBeInTheDocument();
  });
});

describe("SlideStrip", () => {
  /** The strip with a draft that really moves, as the editor gives it. */
  const Host = ({ draft, onMoveBy }: { draft: HeroDraft; onMoveBy: (key: string, delta: -1 | 1) => void }) => {
    const [current, setCurrent] = useState(draft);
    return (
      <SlideStrip
        slides={current.slides}
        selectedKey={current.slides[0]?.key ?? null}
        changedKeys={new Set()}
        media={MEDIA}
        now={NOW}
        onSelect={vi.fn()}
        onMove={(key, to) => setCurrent((d) => moveSlideTo(d, key, to))}
        onMoveBy={(key, delta) => {
          onMoveBy(key, delta);
          setCurrent((d) => moveSlide(d, key, delta));
        }}
        onAdd={vi.fn()}
      />
    );
  };
  const renderStrip = (draft: HeroDraft, onMoveBy = vi.fn()) => renderWithIntl(<Host draft={draft} onMoveBy={onMoveBy} />, "en");

  it("shows each slide's number, title, status and temporary mark, and the count out of five", () => {
    const draft = draftOf(record("64b000000000000000000031", 0), record("64b000000000000000000032", 1, { active: false, imageAssetId: "img2" }));
    renderStrip(draft);
    expect(screen.getByRole("heading", { name: /Slides\s+2 of 5/ })).toBeInTheDocument();
    const cards = screen.getAllByRole("listitem").filter((item) => item.hasAttribute("data-slide-card"));
    expect(within(cards[0]).getByText("Title 1")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Visible")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Temporary")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Hidden")).toBeInTheDocument();
    expect(within(cards[1]).queryByText("Temporary")).not.toBeInTheDocument();
  });

  it("moves a slide with the buttons and the arrow keys, and says where it went", async () => {
    const user = userEvent.setup();
    const onMoveBy = vi.fn();
    const draft = draftOf(record("64b000000000000000000031", 0), record("64b000000000000000000032", 1));
    renderStrip(draft, onMoveBy);
    expect(screen.getByRole("button", { name: "Move slide 1 earlier" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move slide 1 later" }));
    expect(onMoveBy).toHaveBeenLastCalledWith("64b000000000000000000031", 1);
    expect(screen.getByText("The slide is now in position 2 of 2")).toBeInTheDocument();

    // The moved slide is now slide 2; the left arrow in English moves it back.
    screen.getByRole("button", { name: /Drag to move slide 2/ }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onMoveBy).toHaveBeenLastCalledWith("64b000000000000000000031", -1);
    expect(screen.getByText("The slide is now in position 1 of 2")).toBeInTheDocument();
  });

  it("announces no position until the list it draws shows the slide moved", async () => {
    const user = userEvent.setup();
    const draft = draftOf(record("64b000000000000000000031", 0), record("64b000000000000000000032", 1));
    // The editor hands the strip a deferred list: right after a press it still
    // shows the old order, and announcing from it would name the old position.
    const { rerender } = renderWithIntl(
      <SlideStrip slides={draft.slides} selectedKey={null} changedKeys={new Set()} media={MEDIA} now={NOW} onSelect={vi.fn()} onMove={vi.fn()} onMoveBy={vi.fn()} onAdd={vi.fn()} />,
      "en",
    );
    await user.click(screen.getByRole("button", { name: "Move slide 1 later" }));
    expect(screen.queryByText(/The slide is now in position/)).not.toBeInTheDocument();
    const moved = moveSlide(draft, draft.slides[0].key, 1);
    rerender(
      <SlideStrip slides={moved.slides} selectedKey={null} changedKeys={new Set()} media={MEDIA} now={NOW} onSelect={vi.fn()} onMove={vi.fn()} onMoveBy={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(screen.getByText("The slide is now in position 2 of 2")).toBeInTheDocument();
  });

  it("keeps adding offered until five, then disabled with the reason", async () => {
    let draft = draftOf(record("64b000000000000000000031", 0));
    const { unmount } = renderStrip(draft);
    expect(screen.getByRole("button", { name: /Add slide/ })).toBeInTheDocument();
    unmount();
    draft = addSlide(addSlide(addSlide(addSlide(draft))));
    renderStrip(draft);
    expect(screen.getByRole("button", { name: /Add slide/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Add slide/ })).toHaveAccessibleDescription(/reached the limit of five slides/);
  });
});

describe("CtaCard", () => {
  it("names the second visible button a text link, and a lone one the primary button", () => {
    const value = { isVisible: true, label: { ar: "المزيد", en: "More" }, url: "https://example.org" };
    const { unmount } = renderWithIntl(<CtaCard id="c" slot="secondary" value={value} otherVisible onChange={vi.fn()} errors={[]} errorPath="slides.k.secondaryCta" />, "en");
    expect(screen.getByText("Text link")).toBeInTheDocument();
    expect(screen.getByText("External link: opens in a new tab.")).toBeInTheDocument();
    unmount();
    renderWithIntl(<CtaCard id="c" slot="secondary" value={value} otherVisible={false} onChange={vi.fn()} errors={[]} errorPath="slides.k.secondaryCta" />, "en");
    expect(screen.getByText("Primary button")).toBeInTheDocument();
    expect(screen.getByText("One visible button: shown as the primary button.")).toBeInTheDocument();
  });

  it("puts the API's refusal beside the link, wired to the field", () => {
    const value = { isVisible: true, label: { ar: "المزيد", en: "More" }, url: "ftp://x" };
    renderWithIntl(
      <CtaCard id="c" slot="primary" value={value} otherVisible={false} onChange={vi.fn()} errors={[{ path: "slides.k.primaryCta.url", code: "invalidCtaUrl" }]} errorPath="slides.k.primaryCta" />,
      "en",
    );
    const url = screen.getByLabelText("Link");
    expect(url).toHaveAttribute("aria-invalid", "true");
    expect(url).toHaveAccessibleDescription(expect.stringContaining("Start with / or https://."));
  });
});

describe("HeroPreview", () => {
  const renderPreview = (slide: SlideDraft, state: "before" | "live" | "after" = "before") =>
    renderWithIntl(<HeroPreview slide={slide} index={0} count={1} media={MEDIA} nextEvent={EVENT} eventState={state} now={NOW} />, "en");

  it("crops the Arabic picture at its focal point and flips the English one with its point", async () => {
    const user = userEvent.setup();
    const [slide] = draftOf(record("64b000000000000000000031", 0)).slides;
    renderPreview(slide);
    const image = () => document.querySelector<HTMLImageElement>("[data-hero-preview-image]")!;
    expect(image().style.objectPosition).toBe("30% 60%");
    expect(image().style.transform).toBe("");
    expect(screen.getByText("The original picture, cropped around the focal point.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "English" }));
    // The crop holds the same pixels, in the picture's own coordinates; the
    // whole element is then flipped, so the subject is seen at 70%.
    expect(image().style.objectPosition).toBe("30% 60%");
    expect(image().style.transform).toBe("scaleX(-1)");
    expect(screen.getByText("The picture is flipped horizontally, and its focal point with it.")).toBeInTheDocument();
  });

  it("lays the frame out at the device's own size and height rule", async () => {
    const user = userEvent.setup();
    const [slide] = draftOf(record("64b000000000000000000031", 0)).slides;
    renderPreview(slide);
    const frame = () => document.querySelector<HTMLElement>("[data-hero-preview]")!;
    expect(frame().style.width).toBe("1440px");
    // ADR-0078: the viewport less the 96px header.
    expect(frame().style.minHeight).toBe("804px");
    await user.click(screen.getByRole("radio", { name: "Phone" }));
    expect(frame().style.width).toBe("390px");
    expect(frame().style.minHeight).toBe("748px");
  });

  it("draws the event bar's countdown before, 'Happening now' during, and nothing after", () => {
    const [slide] = draftOf(record("64b000000000000000000031", 0)).slides;
    const { unmount } = renderPreview(slide, "before");
    expect(document.querySelector("[data-hero-preview-event]")).toHaveAttribute("data-hero-preview-event", "before");
    unmount();
    const live = renderPreview(slide, "live");
    expect(within(document.querySelector<HTMLElement>("[data-hero-preview-event]")!).getByText("جارية الآن")).toBeInTheDocument();
    live.unmount();
    renderPreview(slide, "after");
    expect(document.querySelector("[data-hero-preview-event]")).toBeNull();
    expect(screen.getByText("The bar is not drawn in this state.")).toBeInTheDocument();
  });

  it("reads a past event's countdown three days before its start", () => {
    const past = { ...EVENT, startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2026-01-02T00:00:00.000Z" };
    expect(previewNow(past, "before", NOW).toISOString()).toBe("2025-12-28T19:48:00.000Z");
    expect(previewNow(EVENT, "before", NOW)).toBe(NOW);
    expect(previewNow(EVENT, "live", NOW).toISOString()).toBe(EVENT.startsAt);
  });
});
