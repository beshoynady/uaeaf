import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Focus, and the things stuck to the top of the scroll.
 *
 * A sticky element at the top of the scrollport covers whatever the browser
 * scrolls a focused control to, because the browser scrolls it to the top and
 * the top is where the sticky element is. Measured on the About editor at
 * 1280×560 before the fix: **65% of a focused switch covered** by the editor
 * shell's header.
 *
 * Above the WCAG 2.2 AA floor (2.4.11 asks only that the control is not
 * entirely hidden) and below AAA (2.4.12, fully visible). Fixed anyway: a third
 * of a field is not a field anyone can work in.
 *
 * The documented remedy is `scroll-padding-block-start` on the scrollport,
 * which moves where "the top" is for every scroll-into-view — including the
 * one the browser performs on Tab, which is the case this criterion is about
 * and the one no component can handle for itself.
 *
 * This is a source check, not a rendered one: the rendered proof is in the
 * browser pass, and what breaks later is somebody adding a second
 * `sticky top-0` header without knowing this rule exists. So the test is
 * written the way `interaction-state-contract.spec.ts` is — read the source,
 * and fail on the pattern.
 */
describe("sticky headers and keyboard focus", () => {
  const src = join(process.cwd(), "src");

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : /\.tsx$/.test(full) ? [full] : [];
    });

  /** Pinned to the top of the scrollport. `sticky top-6` and the like park
   *  something beside the content, which is a different thing and harmless. */
  const PINNED_TO_TOP = /\bsticky\b[^"'`]*\btop-0\b/;

  const stickyFiles = walk(src)
    .filter((file) => PINNED_TO_TOP.test(readFileSync(file, "utf8")))
    .map((file) => file.slice(src.length + 1).replace(/\\/g, "/"));

  it("the scrollport reserves room for them", () => {
    const globals = readFileSync(join(src, "app", "[locale]", "globals.css"), "utf8");

    // Only meaningful while something is actually pinned up there. If the last
    // sticky header is ever removed, this assertion stops being a requirement
    // rather than becoming a false one.
    if (stickyFiles.length === 0) {
      expect(stickyFiles).toEqual([]);
      return;
    }

    expect(globals).toMatch(/scroll-padding-block-start:\s*\S+/);
  });

  it("names every element pinned to the top of the scroll, so a new one is a decision", () => {
    // A list, not a count: adding a sticky header should make somebody read
    // the comment above and check the reserved height still covers it.
    expect(stickyFiles.sort()).toEqual([
      "components/admin/editorial-editor/editor-shell.tsx",
      "components/admin/homepage-hero/homepage-hero-editor.tsx",
      "components/admin/roles/permission-matrix-table.tsx",
      "components/admin/sponsor-relations/editor-frame.tsx",
      "components/shell/app-shell.tsx",
      "components/ui/sticky-form-actions.tsx",
    ]);
  });
});
