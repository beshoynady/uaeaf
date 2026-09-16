import type { CSSProperties } from "react";
import { MEASURE } from "@/components/pages/president/president-message";
import { AccentRule } from "@/components/ui/accent-rule";
import { REGISTER_CLASSES, Section } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PlanStepPublic } from "@/lib/api/types";
import { planRowLayout, type PlanBreakpoint } from "./row-capacity";

/**
 * From the plan to delivery, «نحوّل الاستراتيجية إلى واقع» (Figma `758:218`),
 * redesigned as an ascending path on the green register (ADR-0075).
 *
 * Figma prints five English labels joined by ↓ arrows on an Arabic page. Here
 * the steps climb: from `md` each stands one rise higher than the one before
 * it, in the reading direction, joined chip to chip — the identity's own
 * geometry, the ascent of «نقطة الارتقاء» (Chapter 1 §2.1), applied to the one
 * section whose content is a climb. On a phone the steps stack with a line
 * along the reading-start edge.
 *
 * - The line is one segment per climb, drawn inside the step it leaves: from
 *   this chip's centre (half a chip in from the reading edge) to the next
 *   chip's, one column and one gap across and one rise up. Each segment is
 *   sized by the column it lives in, so it meets the chips at every width;
 *   a single line across the list would have to guess where the chips are.
 *   Mirrored as a whole in Arabic, so it still starts at its own chip.
 *
 * - An ordered list: the steps are a sequence and their numbers are content
 *   (rule 4). The DOM order is the number order; the grid inherits the page's
 *   direction, and the line's drawing is mirrored for the other direction.
 * - Each step: its number in a chip on the line, its title, its description
 *   where the editor wrote one.
 * - The line is drawn once, from its start, when the block enters the view;
 *   the steps reveal after it in reading order. Under reduced motion all is at
 *   rest.
 * - The rise per step, the column count and the column gap are custom
 *   properties declared in `motion.css`, in steps of the space scale: the
 *   rise is `--space-12`, the chip `size-12`, so a chip's centre is
 *   `--space-6` below its step's top edge.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

/**
 * The classes the climb needs at each width it can start from, written out in
 * full because Tailwind reads the source, not the computed string. Below the
 * climb the steps are the phone's list: stacked, with the line along the
 * reading-start edge and no rise between them.
 */
const STEP_ROW: Record<PlanBreakpoint, { list: string; line: string; item: string; segment: string; body: string }> = {
  md: {
    list: "md:grid md:grid-cols-[repeat(var(--plan-steps),minmax(0,1fr))] md:items-start md:gap-x-[var(--plan-gap)] md:gap-y-0",
    line: "md:hidden",
    item: "md:flex-col md:pt-[calc(var(--plan-step)*var(--space-12))]",
    segment: "md:block",
    body: "md:pt-0",
  },
  lg: {
    list: "lg:grid lg:grid-cols-[repeat(var(--plan-steps),minmax(0,1fr))] lg:items-start lg:gap-x-[var(--plan-gap)] lg:gap-y-0",
    line: "lg:hidden",
    item: "lg:flex-col lg:pt-[calc(var(--plan-step)*var(--space-12))]",
    segment: "lg:block",
    body: "lg:pt-0",
  },
  xl: {
    list: "xl:grid xl:grid-cols-[repeat(var(--plan-steps),minmax(0,1fr))] xl:items-start xl:gap-x-[var(--plan-gap)] xl:gap-y-0",
    line: "xl:hidden",
    item: "xl:flex-col xl:pt-[calc(var(--plan-step)*var(--space-12))]",
    segment: "xl:block",
    body: "xl:pt-0",
  },
  "2xl": {
    list: "2xl:grid 2xl:grid-cols-[repeat(var(--plan-steps),minmax(0,1fr))] 2xl:items-start 2xl:gap-x-[var(--plan-gap)] 2xl:gap-y-0",
    line: "2xl:hidden",
    item: "2xl:flex-col 2xl:pt-[calc(var(--plan-step)*var(--space-12))]",
    segment: "2xl:block",
    body: "2xl:pt-0",
  },
};

export const PlanExecutionPath = ({
  steps,
  title,
  text,
  label,
  locale,
}: {
  steps: readonly PlanStepPublic[];
  title: LocalizedText;
  text: LocalizedText | null;
  /** The list's accessible name. */
  label: string;
  locale: AppLocale;
}) => {
  const ordered = [...steps].sort((a, b) => a.displayOrder - b.displayOrder);
  if (ordered.length === 0) return null;

  const titleId = "strategic-plan-execution-title";
  const green = REGISTER_CLASSES.green;
  const count = ordered.length;
  // How many columns of the measured minimum fit decides where the climb is
  // drawn (`row-capacity.ts`); past that the steps are the phone's list, and
  // a climb with no room to climb draws no segments at all.
  const layout = planRowLayout("steps", count);
  const shape = layout.rowFrom ? STEP_ROW[layout.rowFrom] : null;

  return (
    <Section register="green" enter={false} labelledBy={titleId} className="py-12 md:py-16 lg:py-24">
      <div data-reveal="" className="flex flex-col gap-4">
        <h2 id={titleId} data-reveal-part="rise" className="flex items-center gap-4 text-h2 text-balance">
          <AccentRule onRegister />
          <span data-field="executionTitle">{title[locale]}</span>
        </h2>
        {text ? (
          <p
            data-field="executionText"
            data-reveal-part="rise"
            style={revealStep(1)}
            className={`${MEASURE[locale]} text-body-lg text-pretty ${green.muted}`}
          >
            {text[locale]}
          </p>
        ) : null}
      </div>

      <div
        data-plan-path=""
        data-reveal=""
        className="relative mt-8 md:mt-12"
        style={{ "--plan-steps": count } as CSSProperties}
      >
        {/* The line while the steps stand in a column: along the reading-start
            edge, through the chips. */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 start-6 w-[var(--border-width-thick)] bg-[color:var(--color-section-green-border)] ${shape?.line ?? ""}`}
        />

        <ol
          data-field="executionSteps"
          aria-label={label}
          className={`relative flex flex-col gap-6 [--plan-gap:var(--space-4)] lg:[--plan-gap:var(--space-6)] ${shape?.list ?? ""}`}
        >
          {ordered.map((step, index) => (
            <li
              key={step.id}
              className={`relative flex gap-4 ${shape?.item ?? ""}`}
              style={{ "--plan-step": count - 1 - index } as CSSProperties}
            >
              {/* The climb to the next step, from `md`: a box from this chip's
                  centre up one rise and across to the next chip's centre, its
                  diagonal drawn corner to corner. The last step leaves none. */}
              {shape && index < count - 1 ? (
                <div
                  aria-hidden="true"
                  data-plan-segment=""
                  className={`pointer-events-none absolute start-6 top-[calc(var(--plan-step)*var(--space-12)+var(--space-6)-var(--space-12))] hidden h-[var(--space-12)] w-[calc(100%+var(--plan-gap))] rtl:-scale-x-100 ${shape.segment}`}
                >
                  <svg
                    data-reveal-part="draw"
                    style={revealStep(index)}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    focusable="false"
                    className="block size-full overflow-visible"
                  >
                    <line
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="0"
                      stroke="var(--color-section-green-border)"
                      strokeWidth="var(--border-width-thick)"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              ) : null}
              <span
                data-reveal-part="chip"
                data-plan-chip=""
                style={revealStep(index + 1)}
                className={`relative flex size-12 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-section-green-border)] text-h4 tabular-nums ${green.surface}`}
              >
                <span aria-hidden="true" data-item-number="">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <div data-reveal-part="rise" style={revealStep(index + 2)} className={`min-w-0 pt-2 ${shape?.body ?? ""}`}>
                <h3 data-part="title" className="text-h4 text-balance">
                  {step.title[locale]}
                </h3>
                {step.description ? (
                  <p data-part="description" className={`mt-1 text-body-sm text-pretty ${green.muted}`}>
                    {step.description[locale]}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
};
