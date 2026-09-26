import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "@/test/next-navigation";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { EditorShell } from "./editor-shell";
import type { EditorialState } from "@/lib/admin/editorial-state";

vi.mock("next/navigation", () => import("@/test/next-navigation"));

// The two panels the shell draws itself both fetch on mount. What they draw is
// their own specs' business; here they would only be two network reads and a
// slower test.
vi.mock("@/components/admin/editorial/status-panel", () => ({
  EditorialStatusPanel: () => <div data-testid="status-panel" />,
}));
vi.mock("@/components/admin/editorial/revisions-panel", () => ({
  EditorialRevisionsPanel: () => <div data-testid="revisions-panel" />,
}));

/**
 * The frame every page editor shares (ADR-0102 §D1).
 *
 * The load-bearing test here is the first one. The whole reason the shell
 * renders one panel at a time rather than four with `hidden` is that every
 * field is controlled from state the *page* holds, above this component — so
 * unmounting a panel cannot take a value with it. That is an invariant about
 * where state lives, and it is invisible in the code: a future editor that held
 * its draft inside the render prop would look correct and would lose an
 * author's work on every tab press.
 *
 * The rest pin the contract the five screens rely on: a tab appears only where
 * the page supplied its content, the tab is in the URL, and the header names
 * the page once.
 */

const EDITORIAL: EditorialState = {
  publicationState: "Draft",
  mode: "direct",
  blockedReason: null,
  publishedAt: null,
  publishedBy: null,
  workflowInstanceId: null,
  workflowStatus: null,
  currentStepId: null,
  canEdit: true,
  availableActions: ["save"],
  blockedByReadiness: [],
  updatedAt: null,
  publishBlockers: [],
  workflow: null,
  history: [],
};

/** A page whose draft lives where every real one's does: above the shell. */
const Harness = ({
  editorial = EDITORIAL as EditorialState | null,
  withSeo = true,
}: {
  editorial?: EditorialState | null;
  withSeo?: boolean;
}) => {
  const [headline, setHeadline] = useState("");
  const [metaTitle, setMetaTitle] = useState("");

  return (
    <ToastProvider>
      <EditorShell
        entityType="aboutFederationPage"
        entityId="rec-1"
        heading={{ trail: [{ label: "الصفحات", href: "/pages" }, { label: "نبذة" }], title: "نبذة" }}
        dirty={headline !== ""}
        body={() => ({ headline })}
        onDiscard={() => setHeadline("")}
        canEdit
        editorial={editorial}
        seo={
          withSeo
            ? () => (
                <label>
                  عنوان البحث
                  <input value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} />
                </label>
              )
            : undefined
        }
      >
        {() => (
          <label>
            العنوان
            <input value={headline} onChange={(event) => setHeadline(event.target.value)} />
          </label>
        )}
      </EditorShell>
    </ToastProvider>
  );
};

const mount = (props: Parameters<typeof Harness>[0] = {}) =>
  renderWithIntl(<Harness {...props} />, "ar");

const tab = (name: RegExp) => screen.getByRole("tab", { name });

beforeEach(() => {
  navigation.reset();
});

describe("EditorShell tabs", () => {
  it("keeps a typed value across a tab switch and back", async () => {
    const user = userEvent.setup();
    mount();

    await user.type(screen.getByLabelText("العنوان"), "محطات");
    await user.click(tab(/الإصدارات/));
    await user.click(tab("المحتوى" as unknown as RegExp));

    // The draft lives above the shell, so unmounting the panel cannot take it.
    expect(screen.getByLabelText("العنوان")).toHaveValue("محطات");
  });

  it("keeps a value typed on the SEO tab too", async () => {
    const user = userEvent.setup();
    mount();

    await user.click(tab(/SEO/));
    await user.type(screen.getByLabelText("عنوان البحث"), "نبذة");
    await user.click(tab("المحتوى" as unknown as RegExp));
    await user.click(tab(/SEO/));

    expect(screen.getByLabelText("عنوان البحث")).toHaveValue("نبذة");
  });

  it("offers no tab whose content the page did not supply", () => {
    mount({ editorial: null, withSeo: false });

    // No editorial state, no review tab; no SEO renderer, no SEO tab. A tab
    // that is present and empty tells a reader something is there.
    expect(screen.queryByRole("tab", { name: /SEO/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /المراجعة/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "المحتوى" })).toBeInTheDocument();
  });

  it("draws SEO immediately after the content", () => {
    mount();

    // Owner decision 2026-09-26: both are the author's own writing, so they are
    // adjacent, and the two panels a reader only consults follow.
    expect(screen.getAllByRole("tab").map((node) => node.textContent?.trim())).toEqual([
      "المحتوى",
      "SEO والمشاركة",
      "المراجعة والنشر",
      "الإصدارات والسجل",
    ]);
  });

  it("puts the tab in the URL, and takes it back out for the content tab", async () => {
    const user = userEvent.setup();
    mount();

    await user.click(tab(/SEO/));
    expect(navigation.replace).toHaveBeenLastCalledWith("?tab=seo", { scroll: false });

    await user.click(tab("المحتوى" as unknown as RegExp));
    // The default tab is the absence of the parameter, not `?tab=content`: a
    // link to the editor should be the editor's address.
    expect(navigation.replace).toHaveBeenLastCalledWith("?", { scroll: false });
  });

  it("opens on the tab the URL names", () => {
    navigation.setSearch("tab=review");
    mount();

    expect(tab(/المراجعة/)).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("status-panel")).toBeInTheDocument();
  });

  it("falls back to the content tab for a tab this page does not offer", () => {
    navigation.setSearch("tab=seo");
    mount({ withSeo: false });

    // A stale bookmark opens the editor, not an empty frame.
    expect(screen.getByRole("tab", { name: "المحتوى" })).toHaveAttribute("aria-selected", "true");
  });

  it("names the page once, in the header", () => {
    mount();

    expect(screen.getAllByRole("heading", { level: 1 }).map((node) => node.textContent)).toEqual(["نبذة"]);
  });

  it("keeps the tab it is on when another parameter changes around it", async () => {
    const user = userEvent.setup();
    navigation.setSearch("section=timeline");
    mount();

    await user.click(tab(/SEO/));

    // `?section=` is the page's, not the shell's, and a tab press must not
    // discard it — the reader would come back to the wrong section.
    const [url] = navigation.replace.mock.calls.at(-1)!;
    expect(new URLSearchParams(String(url).slice(1)).get("section")).toBe("timeline");
  });
});
