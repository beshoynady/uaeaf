import type { CSSProperties } from "react";
import { SectionHeading, Surface } from "@uaeaf/brand-ui";
import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { PlanPhasePublic } from "@/lib/api/types";
import { PlanPhaseIcon } from "@/lib/icons/plan-phase-icons";
import { planRowLayout, type PlanBreakpoint } from "./row-capacity";

/**
 * The plan's phases (Figma `756:217`, the "Timeline Row"), as a rail on a
 * full-bleed brand-green surface (ADR-0075, ADR-0098 D7).
 *
 * - The green surface carries the section's identity (rule 1), the seams on
 *   both sides are surface changes (rule 3), and no card grid stands next to
 *   the pillars' (rule 5).
 * - A rail joins the phases: horizontal through the icons from `lg`, vertical
 *   along the reading-start edge on a phone, absent at `md`, where two columns
 *   share no line. The rail is the surface's own border colour.
 * - Everything on the green is its one white tier (ADR-0098 §8.2): the number
 *   is set apart by size, not by a quieter ink.
 * - From `lg` one column per phase (`--plan-phases`), as the execution path
 *   sets one per step: a phase added in the dashboard stays on the rail's row
 *   instead of wrapping below the line with its chip off it.
 * - Each phase: its icon in a chip on the rail, its number at Display L in
 *   the band's muted tier, its title and its description. An ordered list:
 *   the phases are a sequence, and the number is content (rule 4).
 * - A stored heading is printed when the editor gives one; the frame gives
 *   none, so the section is named for assistive technology by a hidden
 *   heading from the site's messages.
 * - Each phase reveals once, in reading order: the chip, then the words.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

/**
 * The classes the rail's row needs at each width it can start from, written
 * out in full because Tailwind reads the source, not the computed string.
 * Below the row the phases are the phone's list: the rail runs along the
 * reading-start edge and every phase stands beside its chip.
 *
 * `lg` carries the tablet's two columns with it (the owner's decision of
 * 2026-09-16): while the list still fits the `lg` row, the two-column form
 * stays, and the rail is not drawn across it — a line through two rows would
 * pass behind the second.
 */
const PHASE_ROW: Record<PlanBreakpoint, { list: string; rail: string; item: string; body: string }> = {
  md: {
    list: "md:grid-cols-[repeat(var(--plan-phases),minmax(0,1fr))] md:gap-6",
    rail: "max-md:inset-y-0 max-md:start-6 max-md:w-[var(--border-width-thick)] md:inset-x-0 md:top-6 md:h-[var(--border-width-thick)]",
    item: "md:flex-col md:gap-6",
    body: "md:pt-0",
  },
  lg: {
    list: "md:grid-cols-2 md:gap-6 lg:grid-cols-[repeat(var(--plan-phases),minmax(0,1fr))] xl:gap-8",
    rail: "max-md:inset-y-0 max-md:start-6 max-md:w-[var(--border-width-thick)] md:max-lg:hidden lg:inset-x-0 lg:top-6 lg:h-[var(--border-width-thick)]",
    item: "lg:flex-col lg:gap-6",
    body: "lg:pt-0",
  },
  xl: {
    list: "xl:grid-cols-[repeat(var(--plan-phases),minmax(0,1fr))] xl:gap-8",
    rail: "max-xl:inset-y-0 max-xl:start-6 max-xl:w-[var(--border-width-thick)] xl:inset-x-0 xl:top-6 xl:h-[var(--border-width-thick)]",
    item: "xl:flex-col xl:gap-6",
    body: "xl:pt-0",
  },
  "2xl": {
    list: "2xl:grid-cols-[repeat(var(--plan-phases),minmax(0,1fr))] 2xl:gap-8",
    rail: "max-2xl:inset-y-0 max-2xl:start-6 max-2xl:w-[var(--border-width-thick)] 2xl:inset-x-0 2xl:top-6 2xl:h-[var(--border-width-thick)]",
    item: "2xl:flex-col 2xl:gap-6",
    body: "2xl:pt-0",
  },
};

/** The phone's list, and the rail along its reading-start edge. */
const PHASE_STACKED = {
  list: "",
  rail: "inset-y-0 start-6 w-[var(--border-width-thick)]",
  item: "",
  body: "",
};

export const PlanPhasesBand = ({
  phases,
  title,
  label,
  locale,
}: {
  phases: readonly PlanPhasePublic[];
  /** The stored heading, printed when present. */
  title: string | null;
  /** The hidden name the section takes when no heading is stored. */
  label: string;
  locale: AppLocale;
}) => {
  const ordered = [...phases].sort((a, b) => a.displayOrder - b.displayOrder);
  if (ordered.length === 0) return null;

  const titleId = "strategic-plan-phases-title";
  // How many the rail holds at each width decides where the row is drawn
  // (`row-capacity.ts`); past that the phases are the phone's list.
  const layout = planRowLayout("phases", ordered.length);
  const shape = layout.rowFrom ? PHASE_ROW[layout.rowFrom] : PHASE_STACKED;

  return (
    <Surface kind="brand-green">
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        {title ? (
          <SectionHeading title={<span data-field="phasesTitle">{title}</span>} />
        ) : (
          <h2 id={titleId} className="sr-only">
            {label}
          </h2>
        )}

        <ol
          data-field="phases"
          className={`relative grid gap-8 ${shape.list}`}
          style={{ "--plan-phases": ordered.length } as CSSProperties}
        >
          {/* The rail: through the chips' centres — 24px from the start edge
              while the phases stand in a column, 24px from the top once they
              stand in a row. */}
          <span
            aria-hidden="true"
            data-plan-rail=""
            className={`pointer-events-none absolute bg-[color:var(--surface-border)] ${shape.rail}`}
          />
          {ordered.map((phase, index) => (
            <li key={phase.id} data-reveal="" className={`relative flex gap-4 ${shape.item}`}>
              <span
                data-reveal-part="chip"
                data-plan-chip=""
                className="relative flex size-12 shrink-0 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--color-brand-primary)]"
              >
                <PlanPhaseIcon iconKey={phase.iconKey} className="size-6" />
              </span>
              <div data-reveal-part="rise" style={revealStep(1)} className={`min-w-0 pt-2 ${shape.body}`}>
                <span
                  aria-hidden="true"
                  data-item-number=""
                  className="block text-display-l tabular-nums text-[color:var(--surface-text)]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 data-part="title" className="mt-2 text-h3 text-balance">
                  {phase.title[locale]}
                </h3>
                <p data-part="description" className="mt-2 text-body text-pretty text-[color:var(--surface-text)]">
                  {phase.description[locale]}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Surface>
  );
};
