import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import arMessages from "../../../../messages/ar.json";
import type { ViewerPhoto } from "@/lib/albums/photo-window";

import { PhotoSlider } from "./photo-slider";

/**
 * The slider, held to its contract: what it mounts, what it fetches, how the
 * keyboard moves it in each reading direction, and what it says.
 */

/** `render` with the provider as a wrapper, so `rerender` keeps it. */
const IntlWrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="ar" messages={arMessages}>
    {children}
  </NextIntlClientProvider>
);
const renderWithIntl = (ui: ReactElement) => render(ui, { wrapper: IntlWrapper });

const photo = (n: number, overrides: Partial<ViewerPhoto> = {}): ViewerPhoto => ({
  id: `p${n}`,
  src: `https://res.cloudinary.com/uaeaf/image/upload/v1/albums/p${n}.jpg`,
  width: 1600,
  height: 1000,
  alt: `وصف الصورة ${n}`,
  caption: `تعليق ${n}`,
  credit: null,
  source: null,
  ...overrides,
});

const album = (count: number) => Array.from({ length: count }, (_, i) => photo(i + 1));

const renderSlider = (props: Partial<Parameters<typeof PhotoSlider>[0]> = {}) => {
  const onIndexChange = vi.fn();
  const photos = props.photos ?? album(48);
  const utils = renderWithIntl(
    <PhotoSlider
      photos={photos}
      index={0}
      total={photos.length}
      onIndexChange={onIndexChange}
      playing={false}
      {...props}
    />,
  );
  return { ...utils, onIndexChange };
};

const slides = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>(".av-slide")];
const slideImage = (slide: HTMLElement) => slide.querySelector("img") as HTMLImageElement;

beforeEach(() => {
  document.documentElement.setAttribute("dir", "rtl");
});

afterEach(() => {
  document.documentElement.removeAttribute("dir");
});

describe("windowing — what exists and what is fetched", () => {
  it("mounts ±8 slides around the current photo, not the whole album", () => {
    const { container } = renderSlider({ index: 20 });
    expect(slides(container)).toHaveLength(17);
    expect(slides(container)[0].getAttribute("aria-label")).toBe("الصورة 13 من 48");
  });

  it("stands a spacer in for the slides before the window, so the row keeps its geometry", () => {
    const { container } = renderSlider({ index: 20 });
    const spacer = container.querySelector<HTMLElement>(".av-spacer");
    expect(spacer?.style.getPropertyValue("--av-lead")).toBe("12");
    expect(container.querySelector<HTMLElement>(".av-track")?.style.getPropertyValue("--av-i")).toBe("20");
  });

  it("offers the current photo at 640w and 1640w and lets the browser choose; every side slide is w_480", () => {
    const { container } = renderSlider({ index: 20 });
    const current = slideImage(container.querySelector<HTMLElement>(".av-slide[data-current]")!);
    const offered = current
      .getAttribute("srcset")
      ?.split(", ")
      .map((entry) => `${entry.match(/w_(\d+)/)?.[1]} ${entry.split(" ")[1]}`);
    expect(offered).toEqual(["640 640w", "1640 1640w"]);
    expect(current.getAttribute("sizes")).toBe("(min-width: 1024px) 820px, 300px");

    const sides = slides(container).filter((slide) => !slide.hasAttribute("data-current")).map(slideImage);
    expect(sides).toHaveLength(16);
    for (const image of sides) {
      expect(image.src).toContain("w_480");
      expect(image.hasAttribute("srcset")).toBe(false);
    }
    // Nothing on the slider asks for the desktop file outright any more.
    expect(sides.some((image) => image.src.includes("w_1640"))).toBe(false);
  });

  it("fetches the two slides either side at once and the rest lazily", () => {
    const { container } = renderSlider({ index: 20 });
    const loading = slides(container).map((slide) => slideImage(slide).getAttribute("loading"));
    expect(loading.filter((value) => value === "eager")).toHaveLength(5);
    expect(loading.filter((value) => value === "lazy")).toHaveLength(12);
  });

  it("fetches every filmstrip thumbnail at w_192", () => {
    renderSlider({ index: 20 });
    const strip = screen.getByRole("group", { name: "مصغّرات الصور" });
    const images = strip.querySelectorAll("img");
    expect(images).toHaveLength(48);
    for (const image of images) expect(image.src).toContain("w_192");
  });

  it("reserves every image box from the stored size, so nothing shifts when bytes arrive", () => {
    const { container } = renderSlider({ index: 3 });
    for (const image of container.querySelectorAll("img")) {
      expect(image.getAttribute("width")).toBe("1600");
      expect(image.getAttribute("height")).toBe("1000");
    }
  });
});

describe("the stage", () => {
  it("is a focusable carousel region", () => {
    renderSlider();
    const stage = screen.getByRole("region", { name: "صور الألبوم في شريط العرض" });
    expect(stage).toHaveAttribute("tabindex", "0");
    expect(stage).toHaveAttribute("aria-roledescription", "شريط صور");
  });

  it("hides the neighbours from assistive technology and names the photo in front", () => {
    const { container } = renderSlider({ index: 5 });
    const current = container.querySelector<HTMLElement>(".av-slide[data-current]");
    expect(current).not.toHaveAttribute("aria-hidden");
    expect(slideImage(current as HTMLElement).alt).toBe("وصف الصورة 6");
    const hidden = slides(container).filter((slide) => slide.getAttribute("aria-hidden") === "true");
    expect(hidden).toHaveLength(slides(container).length - 1);
  });

  it("shows a portrait photo whole rather than cropping its subject", () => {
    const photos = [photo(1, { width: 800, height: 1200 }), photo(2)];
    const { container } = renderSlider({ photos, total: 2 });
    const frames = container.querySelectorAll(".av-slide__frame");
    expect(frames[0]).toHaveAttribute("data-fit", "contain");
    expect(frames[1]).toHaveAttribute("data-fit", "cover");
  });
});

describe("keyboard — arrows follow the reading direction of the document", () => {
  it("moves forward on ArrowLeft in Arabic", () => {
    const { onIndexChange } = renderSlider({ index: 5 });
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenLastCalledWith(6);
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenLastCalledWith(4);
  });

  it("moves forward on ArrowRight in English", () => {
    document.documentElement.setAttribute("dir", "ltr");
    const { onIndexChange } = renderSlider({ index: 5 });
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenLastCalledWith(6);
  });

  it("reads the document's direction even though the stage has no dir of its own", () => {
    renderSlider({ index: 5 });
    // The premise of the rule: the element's own `dir` is empty here.
    expect(screen.getByRole("region").dir).toBe("");
  });

  it("goes to the ends on Home and End", () => {
    const { onIndexChange } = renderSlider({ index: 5 });
    fireEvent.keyDown(screen.getByRole("region"), { key: "End" });
    expect(onIndexChange).toHaveBeenLastCalledWith(47);
    fireEvent.keyDown(screen.getByRole("region"), { key: "Home" });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it("does not move past the first photo", () => {
    const { onIndexChange } = renderSlider({ index: 0 });
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" });
    expect(onIndexChange).not.toHaveBeenCalled();
  });
});

describe("the arrow buttons", () => {
  it("are disabled at the ends instead of wrapping", () => {
    const { rerender, onIndexChange } = renderSlider({ index: 0 });
    expect(screen.getByRole("button", { name: "الصورة السابقة" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "الصورة التالية" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);

    rerender(<PhotoSlider photos={album(48)} index={47} total={48} onIndexChange={onIndexChange} playing={false} />);
    expect(screen.getByRole("button", { name: "الصورة التالية" })).toBeDisabled();
  });
});

describe("what the slider says", () => {
  it("counts in two-digit ordinals and announces the position in words", () => {
    const { container } = renderSlider({ index: 6 });
    expect(container.querySelector(".av-counter")?.textContent).toBe("07 / 48");
    expect(container.querySelector(".av-numeral")?.textContent).toBe("07");
    const live = container.querySelector("[aria-live]");
    expect(live?.textContent).toBe("الصورة 7 من 48");
    expect(live).toHaveAttribute("aria-live", "polite");
  });

  it("stops announcing while autoplay runs", () => {
    const { container } = renderSlider({ index: 6, playing: true });
    expect(container.querySelector("[aria-live]")).toHaveAttribute("aria-live", "off");
  });

  it("renders no credit line at all when the photo has no credit", () => {
    const { container } = renderSlider({ photos: [photo(1, { source: "المركز الإعلامي" })], total: 1 });
    expect(container.textContent).not.toContain("تصوير");
  });

  it("writes the credit and the source when both exist", () => {
    renderSlider({ photos: [photo(1, { credit: "سالم", source: "المركز الإعلامي للاتحاد" })], total: 1 });
    expect(screen.getByText("تصوير: سالم · المركز الإعلامي للاتحاد")).toBeInTheDocument();
  });

  it("writes the credit alone when there is no source", () => {
    renderSlider({ photos: [photo(1, { credit: "سالم" })], total: 1 });
    expect(screen.getByText("تصوير: سالم")).toBeInTheDocument();
  });

  it("marks the current thumbnail and names every one", () => {
    const { onIndexChange } = renderSlider({ index: 6 });
    const strip = screen.getByRole("group", { name: "مصغّرات الصور" });
    const current = within(strip).getByRole("button", { name: "الصورة 7 من 48" });
    expect(current).toHaveAttribute("aria-current", "true");
    fireEvent.click(within(strip).getByRole("button", { name: "الصورة 10 من 48" }));
    expect(onIndexChange).toHaveBeenLastCalledWith(9);
  });

  it("fills the lane to (index + 1) / total", () => {
    const { container } = renderSlider({ index: 11 });
    const fill = container.querySelector<HTMLElement>(".av-lane__fill");
    expect(fill?.style.getPropertyValue("--av-progress")).toBe("0.25");
  });
});

describe("motion markers", () => {
  it("draws no finish line for the photo the reader arrived on", () => {
    const { container } = renderSlider({ index: 3 });
    expect(container.querySelector(".av-finish")).toBeNull();
  });

  it("draws the finish line on a photo reached by one step", () => {
    const onIndexChange = vi.fn();
    const photos = album(48);
    const { container, rerender } = renderWithIntl(
      <PhotoSlider photos={photos} index={3} total={48} onIndexChange={onIndexChange} playing={false} />,
    );
    rerender(<PhotoSlider photos={photos} index={4} total={48} onIndexChange={onIndexChange} playing={false} />);
    const current = container.querySelector(".av-slide[data-current]");
    expect(current?.querySelector(".av-finish")).not.toBeNull();
    expect(container.querySelector(".av-track")).not.toHaveAttribute("data-instant");
  });

  it("cuts, with no finish line, on a jump wider than the render window", () => {
    const onIndexChange = vi.fn();
    const photos = album(48);
    const { container, rerender } = renderWithIntl(
      <PhotoSlider photos={photos} index={0} total={48} onIndexChange={onIndexChange} playing={false} />,
    );
    rerender(<PhotoSlider photos={photos} index={30} total={48} onIndexChange={onIndexChange} playing={false} />);
    expect(container.querySelector(".av-track")).toHaveAttribute("data-instant");
    expect(container.querySelector(".av-finish")).toBeNull();
  });

  it("pushes in on the current photo only while autoplay is on", () => {
    const { container, rerender, onIndexChange } = renderSlider({ index: 2 });
    expect(container.querySelector("[data-kenburns]")).toBeNull();
    rerender(<PhotoSlider photos={album(48)} index={2} total={48} onIndexChange={onIndexChange} playing />);
    expect(container.querySelectorAll("[data-kenburns]")).toHaveLength(1);
    expect(container.querySelector("[data-kenburns]")).toHaveAttribute("data-current");
  });
});

describe("the photo link", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("sits beside the caption at every width: an icon button below lg, the labelled button from lg", () => {
    const { container } = renderSlider({ index: 6 });
    const end = container.querySelector(".av-meta__end")!;
    const compact = end.querySelector(".av-share__compact button")!;
    const full = end.querySelector(".av-share__full button")!;
    expect(compact).toHaveClass("brand-icon-button");
    expect(compact).toHaveAttribute("aria-label", "رابط الصورة");
    expect(full).toHaveTextContent("رابط الصورة");
  });

  it("writes ?photo=<id> with replaceState and copies it", async () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    const { container } = renderSlider({ index: 6 });
    fireEvent.click(container.querySelector(".av-share__compact button")!);

    expect(replace).toHaveBeenCalled();
    expect(String(replace.mock.calls.at(-1)?.[2])).toContain("photo=p7");
    expect(push).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("photo=p7"));
    expect(await screen.findByText("تم نسخ رابط الصورة")).toHaveAttribute("role", "status");

    replace.mockRestore();
    push.mockRestore();
  });
});
