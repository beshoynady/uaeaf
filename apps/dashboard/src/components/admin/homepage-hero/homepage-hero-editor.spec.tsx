import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { fromApi } from "@/lib/admin/homepage-hero";
import { HomepageHeroEditor } from "./homepage-hero-editor";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const SECTION = "64b000000000000000000020";
const SLIDE = "64b000000000000000000031";

const initial = fromApi(
  {
    _id: SECTION,
    sectionType: "HERO",
    configuration: { playback: { autoplay: true, intervalMs: 7000 } },
  },
  [
    {
      _id: SLIDE,
      displayOrder: 0,
      active: true,
      imageAssetId: "64b000000000000000000041",
      desktopFocalPoint: { x: 50, y: 50 },
      ltrImageMode: "mirror",
      title: { ar: "المضمار", en: "The track" },
      subtitle: { ar: "نص", en: "Text" },
      primaryCta: { isVisible: false, label: null, url: null },
      secondaryCta: { isVisible: false, label: null, url: null },
    },
  ],
);

const IMAGES = [{ id: "64b000000000000000000041", caption: { ar: "", en: "" }, url: "/a.jpg", width: 3840, height: 2160, isAiGenerated: true }];

const editorWith = (from: typeof initial) => (
  <ToastProvider>
    <HomepageHeroEditor initial={from} images={IMAGES} canReadMedia siteUrl="http://localhost:3001" now="2026-09-17T08:00:00.000Z" />
  </ToastProvider>
);

const renderEditor = () => renderWithIntl(editorWith(initial), "en");

/** The server's re-read after a save: the same stored hero, as a new object. */
const reread = (title: string) => {
  const next = structuredClone(initial);
  next.slides[0].title.en = title;
  return next;
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  refresh.mockReset();
  push.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomepageHeroEditor", () => {
  it("opens saved, with Save off, the temporary picture counted and the site one click away", () => {
    renderEditor();
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Saved");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByText("1 temporary image needs replacing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open site/ })).toHaveAttribute("href", "http://localhost:3001/en");
  });

  it("marks an edit unsaved, and warns before the page is left", async () => {
    const user = userEvent.setup();
    const add = vi.spyOn(window, "addEventListener");
    renderEditor();
    await user.type(screen.getByLabelText("Title in English"), "!");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(add).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("sends nothing while the draft has something the API would refuse, and links the summary to the field", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.clear(screen.getByLabelText("Title in English"));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(fetchMock).not.toHaveBeenCalled();
    const link = await screen.findByRole("link", { name: "Slide 1 · Title in English: Required because the slide is visible." });
    await user.click(link);
    await waitFor(() => expect(screen.getByLabelText("Title in English")).toHaveFocus());
    expect(screen.getByLabelText("Title in English")).toHaveAttribute("aria-invalid", "true");
  });

  it("saves only what changed, then says so and re-reads", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ _id: SLIDE }), { status: 200 }));
    renderEditor();
    await user.type(screen.getByLabelText("Title in English"), "!");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/admin/hero-slides/${SLIDE}`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ title: { ar: "المضمار", en: "The track!" } });
    expect(await screen.findByText("Hero saved")).toBeInTheDocument();
  });

  it("puts the API's refusal beside its field when the draft passed the screen's own checks", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: "heroTextTooLong", field: "title.en", limit: 44 }), { status: 400 }));
    renderEditor();
    await user.type(screen.getByLabelText("Title in English"), "!");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("link", { name: "Slide 1 · Title in English: Longer than 44 characters." })).toBeInTheDocument();
    expect(screen.getByText("Nothing was saved. Fix these first:")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("freezes the editor while a save is running, so nothing typed in the window is lost", async () => {
    const user = userEvent.setup();
    let answer: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    renderEditor();
    await user.type(screen.getByLabelText("Title in English"), "!");
    await user.click(screen.getByRole("button", { name: "Save" }));
    const region = screen.getByLabelText("Title in English").closest("[data-hero-editor-body]");
    expect(region).toHaveAttribute("inert");
    answer(new Response(JSON.stringify({ _id: SLIDE }), { status: 200 }));
    await waitFor(() => expect(region).not.toHaveAttribute("inert"));
  });

  it("is saved as soon as the save lands, before the re-read arrives, and offers no second Save", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ _id: SLIDE }), { status: 200 }));
    renderEditor();
    await user.type(screen.getByLabelText("Title in English"), "!");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(document.querySelector("[data-save-state]")).toHaveAttribute("data-save-state", "saved");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("keeps an edit typed after the save but before the re-read arrives", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ _id: SLIDE }), { status: 200 }));
    const { rerender } = renderEditor();
    await user.type(screen.getByLabelText("Title in English"), "!");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText("Title in English")).not.toHaveAttribute("inert"));
    await user.type(screen.getByLabelText("Title in English"), "?");
    rerender(editorWith(reread("The track!")));
    expect(screen.getByLabelText("Title in English")).toHaveValue("The track!?");
    expect(document.querySelector("[data-save-state]")).toHaveAttribute("data-save-state", "unsaved");
  });

  it("asks before an in-app link leaves unsaved changes, and goes only when confirmed", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the guard reads the <a> a router Link renders; a plain one stands in for it without mounting the router. */}
        <a href="/en/users">Users</a>
        {editorWith(initial)}
      </>,
      "en",
    );
    await user.type(screen.getByLabelText("Title in English"), "!");
    await user.click(screen.getByRole("link", { name: "Users" }));
    expect(push).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Leave without saving" }));
    expect(push).toHaveBeenCalledWith("/en/users");
  });
});
