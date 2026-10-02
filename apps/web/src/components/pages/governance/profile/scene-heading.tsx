import type { ReactNode } from "react";
import { SectionHeading } from "@uaeaf/brand-ui";

import { ordinal } from "../shared/text";

/**
 * A scene's number and name above its `h2`.
 *
 * The number is the one its nav entry shows, passed in rather than counted
 * here, so the two stay in step when an earlier scene drops out. It is hidden
 * from a screen reader, which already hears the heading and has no use for a
 * position that only means something to the eye.
 */
export const SceneHeading = ({
  number,
  label,
  title,
  lead,
}: {
  number: number;
  label: string;
  title: string;
  lead?: ReactNode;
}) => (
  <div data-part="scene-heading" className="flex flex-col gap-[var(--space-3)]">
    <p className="flex items-center gap-[var(--space-2)] text-overline text-[color:var(--surface-accent,var(--surface-text-muted))]">
      <span aria-hidden="true">{ordinal(number)}</span>
      <span aria-hidden="true">·</span>
      <span>{label}</span>
    </p>
    <SectionHeading title={title} description={lead} />
  </div>
);
