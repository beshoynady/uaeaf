import type { ReactNode } from "react";

/**
 * Publishes the neutral `canvas` surface variables around a screen's content.
 *
 * Every `@uaeaf/brand-ui` control reads its ink, edge, focus ring and primary
 * plate from `--surface-*` custom properties, and those exist only inside an
 * element carrying `data-surface`. The signed-in shell's `<main>` carries none,
 * so outside this wrapper a library primary button resolves to no background
 * and a filter chip's focus outline to no colour at all — invalid at computed
 * time, which drops the outline rather than falling back to anything.
 *
 * The bare attribute, not the library's `Surface` component: `Surface` adds
 * the class that paints the ground, and the dashboard's ground is the shell's
 * own sunken neutral (Chapter 12 §12.15.1 — no coloured surface under working
 * content). The attribute alone paints nothing; it only publishes variables.
 *
 * `display: contents` so the wrapper takes no box: each screen's sections stay
 * direct flex items of the shell's column and keep its gap. Custom properties
 * inherit through the DOM, not the box tree, so they still reach every child.
 *
 * This belongs on the shell's `<main>` once, and would then be deleted here.
 */
export const BrandGround = ({ children }: { children: ReactNode }) => (
  <div data-surface="canvas" className="contents">
    {children}
  </div>
);
