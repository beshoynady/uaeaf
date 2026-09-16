import type { CSSProperties } from "react";
import { AccentRule } from "@/components/ui/accent-rule";
import { SeamLines } from "@/components/ui/identity-hero";
import { itemInk, itemTone, type ItemTone } from "@/components/ui/item-card";
import { Section } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PlanItemPublic, PublicImage } from "@/lib/api/types";

/**
 * The strategic objectives, «من المحاور إلى أهداف ملموسة» (Figma `757:239`):
 * numbered rows beside a photograph, on the sunken ground (ADR-0075).
 *
 * - Figma sets five full-width rows, each on a pastel ground with a loose
 *   accent bar. The rows keep their shape; the pastels go. Each row is marked
 *   by a short edge on its reading-start side and its number at Display L, in
 *   the ink its position gives it (ADR-0072 D1): the palette as a second cue on
 *   a closed, ordered set, never a category.
 * - Rows, not cards, so the pillars' grid before them is not followed by a
 *   second grid (rule 5); an ordered list, because the plan refers to the
 *   objectives by number (rule 4).
 * - The photograph at the start of the reading line, the words in seven of
 *   the twelve columns from `lg`; the identity strokes on the seam with the
 *   pillars stand in the far corner, where the heading leaves the frame empty
 *   (`SeamLines`, rule 3). The section clips sideways only, for the bleed,
 *   so the strokes above its top edge stay painted.
 * - Each row reveals once: the number climbs, then the title, then the text.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

/** The row's edge in its item's ink, written out per tone for the class scanner. */
const ROW_EDGE: Record<ItemTone, string> = {
  1: "border-[color:var(--color-item-1-ink)]",
  2: "border-[color:var(--color-item-2-ink)]",
  3: "border-[color:var(--color-item-3-ink)]",
  4: "border-[color:var(--color-item-4-ink)]",
};

export const PlanObjectives = ({
  objectives,
  title,
  image,
  locale,
  sizes,
}: {
  objectives: readonly PlanItemPublic[];
  title: LocalizedText;
  image: PublicImage | null;
  locale: AppLocale;
  sizes: string;
}) => {
  const ordered = [...objectives].sort((a, b) => a.displayOrder - b.displayOrder);
  if (ordered.length === 0) return null;

  const titleId = "strategic-plan-objectives-title";

  return (
    <Section
      enter={false}
      labelledBy={titleId}
      ground="sunken"
      className="relative isolate overflow-x-clip py-12 md:py-16 lg:py-24"
    >
      <SeamLines />
      <div className={image ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
        <div className={`min-w-0 ${image ? "lg:col-span-7 lg:col-start-6" : ""}`}>
          <div data-reveal="">
            <h2
              id={titleId}
              data-reveal-part="rise"
              className="flex items-center gap-4 text-h2 text-balance text-[color:var(--color-text-primary)]"
            >
              <AccentRule />
              <span data-field="objectivesTitle">{title[locale]}</span>
            </h2>
          </div>

          <ol data-field="objectives" className="mt-8 flex flex-col gap-6 md:mt-12 md:gap-8">
            {ordered.map((objective, index) => {
              const tone = itemTone(index);
              return (
                <li
                  key={objective.id}
                  data-reveal=""
                  data-plan-row=""
                  className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 border-s-[length:var(--border-width-thick)] ps-4 md:gap-x-6 md:ps-6 ${ROW_EDGE[tone]}`}
                >
                  <span
                    aria-hidden="true"
                    data-item-number=""
                    data-reveal-part="numeral"
                    className={`row-span-2 self-start text-display-l tabular-nums ${itemInk(tone)}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3
                    data-part="title"
                    data-reveal-part="rise"
                    style={revealStep(1)}
                    className="self-end text-h3 text-balance text-[color:var(--color-text-primary)]"
                  >
                    {objective.title[locale]}
                  </h3>
                  <p
                    data-part="description"
                    data-reveal-part="rise"
                    style={revealStep(2)}
                    className="text-body text-pretty text-[color:var(--color-text-secondary)]"
                  >
                    {objective.description[locale]}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        {image ? <SlantedPhoto image={image} locale={locale} side="start" sizes={sizes} /> : null}
      </div>
    </Section>
  );
};
