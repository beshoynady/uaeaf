import type { CSSProperties } from "react";
import { FEATURE_CYCLE, SectionHeading, Surface, type FeatureTone } from "@uaeaf/brand-ui";
import { CONTAINER } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PlanItemPublic, PublicImage } from "@/lib/api/types";

/**
 * The strategic objectives, «من المحاور إلى أهداف ملموسة»: numbered rows beside
 * a photograph, on a canvas surface with the mesh.
 *
 * - Rows, not cards, so the pillars' card grid before them is not followed by
 *   a second grid (rule 5); an ordered list, because the plan refers to the
 *   objectives by number (rule 4).
 * - Each row is marked by a short edge on its reading-start side in the
 *   identity colour its position gives it, cycling green, ink, red as the
 *   pillars' cards do (`FEATURE_CYCLE`). The pastel item inks are gone: the
 *   edge is the only colour, and the number and the words stay in the
 *   surface's own ink, where every one of them clears AA.
 * - The photograph at the start of the reading line, the words in seven of the
 *   twelve columns from `lg` (`SlantedPhoto`: the kit's `SplitFeature` takes
 *   project assets only, and this is a stored Cloudinary asset).
 * - Each row reveals once: the number, then the title, then the text.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

/** The row's edge per identity tone, written out for the class scanner. On
 *  canvas the surface's text is the ink step of the flag. */
const ROW_EDGE: Record<FeatureTone, string> = {
  green: "border-[color:var(--color-brand-primary)]",
  ink: "border-[color:var(--surface-text)]",
  red: "border-[color:var(--color-brand-secondary)]",
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

  return (
    <Surface kind="canvas" mesh className="overflow-clip">
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        <div className={image ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
          <div className={`min-w-0 ${image ? "lg:col-span-7 lg:col-start-6" : ""}`}>
            <SectionHeading title={<span data-field="objectivesTitle">{title[locale]}</span>} />

            <ol data-field="objectives" className="flex flex-col gap-6 md:gap-8">
              {ordered.map((objective, index) => (
                <li
                  key={objective.id}
                  data-reveal=""
                  data-plan-row=""
                  data-tone={FEATURE_CYCLE[index % FEATURE_CYCLE.length]}
                  className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 border-s-[length:var(--border-width-thick)] ps-4 md:gap-x-6 md:ps-6 ${ROW_EDGE[FEATURE_CYCLE[index % FEATURE_CYCLE.length]]}`}
                >
                  <span
                    aria-hidden="true"
                    data-item-number=""
                    data-reveal-part="numeral"
                    className="row-span-2 self-start text-display-l tabular-nums text-[color:var(--surface-text)]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3
                    data-part="title"
                    data-reveal-part="rise"
                    style={revealStep(1)}
                    className="self-end text-h3 text-balance text-[color:var(--surface-text)]"
                  >
                    {objective.title[locale]}
                  </h3>
                  <p
                    data-part="description"
                    data-reveal-part="rise"
                    style={revealStep(2)}
                    className="text-body text-pretty text-[color:var(--surface-text-muted)]"
                  >
                    {objective.description[locale]}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {image ? <SlantedPhoto image={image} locale={locale} side="start" sizes={sizes} /> : null}
        </div>
      </div>
    </Surface>
  );
};
