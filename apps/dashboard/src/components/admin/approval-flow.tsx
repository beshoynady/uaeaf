import { useId } from "react";
import { UiIcon } from "@/lib/icons/ui-icons";

/**
 * The path a piece of content takes to publication, as one ordered line:
 * where it starts, who must decide on it, and where it ends.
 *
 * Deliberately knows nothing about policies. It takes words, so any screen
 * that has to show an approval path — the policy screen now, a record's own
 * review state later — draws the same picture from its own facts.
 *
 * - An ordered list inside a captioned figure: the order IS the information,
 *   and a screen reader announces each stage's position before its name.
 * - The arrows are decoration and hidden; they point along the reading
 *   direction, so they turn round in Arabic.
 * - It wraps rather than scrolls, so a five-person sequence on a narrow
 *   screen reads as two lines instead of disappearing off the edge.
 * - Named by its caption explicitly: the implicit figcaption name is not
 *   computed by every accessibility API.
 * - Colour is never the only signal: the ends and the stages differ in their
 *   words as well as their edges.
 */
export const ApprovalFlow = ({
  caption,
  start,
  stages,
  end,
}: {
  caption: string;
  start: string;
  stages: readonly string[];
  end: string;
}) => {
  const captionId = useId();
  const steps = [
    { label: start, tone: "start" as const },
    ...stages.map((label) => ({ label, tone: "stage" as const })),
    { label: end, tone: "end" as const },
  ];

  return (
    <figure aria-labelledby={captionId} className="m-0 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-4">
      <figcaption id={captionId} className="text-caption font-medium text-[color:var(--color-text-secondary)]">{caption}</figcaption>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {steps.map((step, index) => (
          <li key={`${step.tone}-${index}`} className="flex items-center gap-2">
            <span className={`rounded-[var(--radius-md)] border px-3 py-1.5 text-label ${TONE[step.tone]}`}>
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <UiIcon
                name="chevron-right"
                className="size-[var(--icon-size-xs)] shrink-0 text-[color:var(--color-text-muted)] rtl:-scale-x-100"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  );
};

/** Neutral at the start, the brand's green edge on the people who decide
 *  (ADR-0050: green marks what is active), success at the end. */
const TONE = {
  start:
    "border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-text-secondary)]",
  stage:
    "border-[color:var(--color-brand-primary)] bg-[color:var(--color-surface-raised)] font-medium text-[color:var(--color-text-primary)]",
  end: "border-[color:var(--color-semantic-success)] bg-[color:var(--color-surface-raised)] font-medium text-[color:var(--color-semantic-success-text)]",
} as const;
