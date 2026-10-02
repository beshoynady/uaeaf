import { SectionHeading, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import { revealStep } from "@/lib/motion/reveal";

import { ordinal } from "../shared/text";

export type HowStep = { title: string; text: string };

/**
 * How committees work, in three numbered steps: who fills them, how long they
 * serve, and how they nest.
 *
 * Deliberately says nothing a record could contradict — no count of
 * committees and no rule about who may chair one — since both come from the
 * data and change without anyone editing this copy.
 */
export const CommitteesHow = ({
  eyebrow,
  title,
  steps,
  className = "",
}: {
  eyebrow: string;
  title: string;
  steps: readonly HowStep[];
  className?: string;
}) => {
  if (steps.length === 0) return null;

  return (
    <Surface kind="canvas" mesh className={className}>
      <div
        data-field="how"
        className={`${CONTAINER} flex flex-col gap-[var(--space-8)] py-12 md:py-16 lg:py-24`}
      >
        <div className="flex flex-col gap-[var(--space-2)]">
          <p data-field="howEyebrow" className="text-label text-[color:var(--surface-text-muted)]">
            {eyebrow}
          </p>
          <SectionHeading title={<span data-field="howTitle">{title}</span>} />
        </div>

        <ol data-field="howSteps" className="grid gap-[var(--space-6)] md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} data-part="step" className="gov-flip" style={revealStep(index)}>
              <Surface
                kind="raised"
                as="article"
                className="flex h-full flex-col gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] p-[var(--space-6)]"
              >
                <span
                  aria-hidden="true"
                  data-part="index"
                  className="text-display-l leading-none text-[color:var(--surface-text-muted)] opacity-40"
                >
                  {ordinal(index + 1)}
                </span>
                <h3 data-part="title" className="text-h4">
                  {step.title}
                </h3>
                <p data-part="text" className="text-body-sm text-[color:var(--surface-text-muted)]">
                  {step.text}
                </p>
              </Surface>
            </li>
          ))}
        </ol>
      </div>
    </Surface>
  );
};
