import type { ReactNode } from "react";
import { SectionHeading } from "@uaeaf/brand-ui";

import { ordinal } from "../shared/text";

/**
 * A section's heading with its chapter number above it.
 *
 * The number is the one the section nav prints for the same section, passed
 * in rather than fixed, so a dropped section renumbers both together. It is
 * decorative — the nav already announces the order — and hidden from a screen
 * reader.
 */
export const ChapterHeading = ({
  number,
  title,
  lead,
  action,
}: {
  number: number;
  title: string;
  lead?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col gap-[var(--space-2)]">
    <span
      aria-hidden="true"
      data-part="chapter"
      className="text-overline text-[color:var(--surface-text-muted)]"
    >
      {ordinal(number)}
    </span>
    <SectionHeading title={title} description={lead} action={action} />
  </div>
);
