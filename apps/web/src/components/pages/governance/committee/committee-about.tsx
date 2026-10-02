import type { ReactNode } from "react";
import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";

import { ChapterHeading } from "./chapter-heading";
import { ANCHOR_OFFSET } from "./sections";

/**
 * `#about`: the committee's purpose, with the "at a glance" aside beside it.
 *
 * Two columns from `lg` — the text across two thirds and the aside in the
 * last — and one column below, the aside after the text. Returns nothing when
 * the record has no about text; the hero strip still carries the facts.
 */
export const CommitteeAbout = ({
  about,
  number,
  title,
  glance,
}: {
  about: string;
  number: number;
  title: string;
  glance: ReactNode;
}) => {
  if (!about) return null;

  return (
    <Surface kind="canvas" id="about" className={ANCHOR_OFFSET}>
      <div className={`${CONTAINER} grid gap-[var(--space-12)] py-12 md:py-16 lg:grid-cols-3 lg:py-24`}>
        <div className="flex flex-col gap-[var(--space-6)] lg:col-span-2">
          <ChapterHeading number={number} title={title} />
          <p
            data-field="about"
            className="max-w-[68ch] whitespace-pre-line text-body-lg text-[color:var(--surface-text)]"
          >
            {about}
          </p>
        </div>
        {glance}
      </div>
    </Surface>
  );
};
