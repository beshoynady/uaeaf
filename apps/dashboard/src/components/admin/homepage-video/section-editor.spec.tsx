import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VideoSectionEditor } from "./section-editor";
import { readSectionDraft } from "./section-draft";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

/**
 * The homepage's video section, configured.
 *
 * Its settings live in the `configuration` of the existing `VIDEO_LIBRARY`
 * row in `pageSections` — the same free-form field the hero and the sponsor
 * strip use. No new collection, and no second way to configure one section.
 *
 * `readSectionDraft` is the guard that matters: `configuration` is `Mixed`, so
 * a half-saved draft or a key from an older shape can be in it, and the
 * homepage must still render.
 */
describe("readSectionDraft", () => {
  it("opens on the documented defaults when nothing is saved", () => {
    const draft = readSectionDraft(null);

    expect(draft.featuredMode).toBe("latest");
    expect(draft.carouselSource).toBe("latest");
    expect(draft.carouselCount).toBe(8);
    expect(draft.includeReels).toBe(false);
  });

  it("survives a configuration of the wrong shape entirely", () => {
    for (const nonsense of [undefined, "a string", 42, [], { carousel: "not an object" }]) {
      expect(readSectionDraft(nonsense as never).carouselCount).toBe(8);
    }
  });

  it("keeps a saved configuration", () => {
    const draft = readSectionDraft({
      featured: { mode: "specific", videoId: "66f0a1b2c3d4e5f60718293a" },
      carousel: { source: "filtered", count: 12, category: "training", includeReels: true },
    });

    expect(draft.featuredMode).toBe("specific");
    expect(draft.featuredVideoId).toBe("66f0a1b2c3d4e5f60718293a");
    expect(draft.carouselSource).toBe("filtered");
    expect(draft.carouselCount).toBe(12);
    expect(draft.includeReels).toBe(true);
  });
});

describe("VideoSectionEditor", () => {
  const setup = (draft = readSectionDraft(null)) => {
    const onSave = vi.fn();
    render(
      <VideoSectionEditor
        initial={draft}
        onSave={onSave}
        associationOptions={[]}
        videoOptions={[]}
        videos={[]}
        locale="ar"
      />,
    );
    return { onSave, user: userEvent.setup() };
  };

  it("offers exactly the counts the design lays out, defaulting to eight", () => {
    setup();

    const select = screen.getByLabelText("carouselCount") as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual(["4", "6", "8", "10", "12"]);
    expect(select.value).toBe("8");
  });

  it("opens on the newest-videos source", () => {
    setup();

    // By role and a partial name: each source is now a card whose label
    // carries the title AND the line of consequence under it, so the
    // accessible name is both. The default it asserts is unchanged.
    expect(screen.getByRole("radio", { name: /sourceLatest/ })).toBeChecked();
  });

  it("leaves reels out of the carousel by default", () => {
    setup();

    expect((screen.getByLabelText("includeReels") as HTMLInputElement).checked).toBe(false);
  });

  it("tells the editor a broadcast takes over the featured slot", () => {
    // Otherwise the featured video appearing to change by itself during a
    // broadcast reads as a bug.
    setup();

    expect(screen.getByText("featuredLiveNote")).toBeInTheDocument();
  });

  it("hides the championship filter while there is nothing to link to", () => {
    setup();

    expect(screen.queryByLabelText("associationLabel")).toBeNull();
  });

  it("saves what the editor chose", async () => {
    const { user, onSave } = setup();

    await user.selectOptions(screen.getByLabelText("carouselCount"), "12");
    await user.click(screen.getByLabelText("includeReels"));
    await user.click(screen.getByRole("button", { name: "save" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ carouselCount: 12, includeReels: true });
  });
});
