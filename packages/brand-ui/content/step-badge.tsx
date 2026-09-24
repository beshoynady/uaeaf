import type { ReactNode } from "react";

export type StepBadgeProps = {
  /** The step number, already localised. */
  step: ReactNode;
  /**
   * The localised word for "step", rendered for assistive technology.
   *
   * A bare numeral in a circle reads to a screen reader as a stray digit
   * between a heading and a form. Required whenever the badge stands alone.
   */
  stepLabel: string;
  className?: string;
};

/**
 * A step number in a green disc, for the sections of a long editor form.
 *
 * Green because a step is a position in a task the reader is doing, and green
 * is the action colour (ADR-0050). The disc is filled rather than outlined:
 * at this size an outline reads as a bullet.
 *
 * Server Component.
 */
export const StepBadge = ({ step, stepLabel, className }: StepBadgeProps) => (
  <span className={["brand-step-badge", className].filter(Boolean).join(" ")}>
    <span className="brand-visually-hidden">{stepLabel}</span>
    <span aria-hidden="true">{step}</span>
  </span>
);
