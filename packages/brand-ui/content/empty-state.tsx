import type { ReactNode } from "react";

import { Surface } from "../surface/surface";

export type EmptyStateProps = {
  /**
   * What happened, in the reader's terms. Not "No results" — "No document
   * matches «budget»". An empty state that does not name its own cause leaves
   * the reader guessing whether the filter, the search or the site is at fault.
   */
  title: ReactNode;
  description?: ReactNode;
  /** The way out. A `Button` that clears the filter, usually. */
  action?: ReactNode;
  className?: string;
};

/**
 * A list that has nothing in it, said clearly, with a way out.
 *
 * On canvas with the mesh, so an empty region still reads as part of the page
 * rather than as a hole in it — but faintly: `--opacity-mesh-subtle` on this
 * ground, not the stronger value ink uses.
 *
 * No illustration. Chapter 27 §31: this system has no illustration style, and
 * inventing one for an empty state is how a second visual language gets in
 * through the least-reviewed door.
 *
 * Server Component. The action is passed in, so whatever state clears the
 * filter stays in the page that owns it.
 */
export const EmptyState = ({ title, description, action, className }: EmptyStateProps) => (
  <Surface
    kind="canvas"
    mesh
    as="div"
    className={["brand-empty-state", className].filter(Boolean).join(" ")}
  >
    <p className="brand-empty-state__title">{title}</p>
    {description === undefined ? null : (
      <p className="brand-empty-state__description">{description}</p>
    )}
    {action === undefined ? null : <div className="brand-empty-state__action">{action}</div>}
  </Surface>
);
