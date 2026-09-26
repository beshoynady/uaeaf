import type { CSSProperties, ReactNode } from "react";

/**
 * The small line above a section's heading, marked by the identity's three
 * strokes.
 *
 * The stroke sits on the reading edge — before the words in either language —
 * so it reads as a mark opening the line rather than a decoration trailing it.
 * Logical margin does that without either language being a special case.
 *
 * `data-reveal-part` and `style` are forwarded so a section can give the
 * eyebrow its place in that section's entrance without this component knowing
 * anything about the sequence.
 */
export const SectionEyebrow = ({
  children,
  onDark = false,
  className = "",
  style,
  ...rest
}: {
  children: ReactNode;
  /** On an ink or identity-coloured ground the middle stroke is the paper
   *  colour rather than the ink one, so all three stay visible. */
  onDark?: boolean;
  className?: string;
  style?: CSSProperties;
} & Record<`data-${string}`, string | undefined>) => (
  <span
    {...rest}
    style={style}
    className={`flex w-fit items-center gap-2.5 text-label font-bold tracking-wide ${
      onDark ? "text-[color:var(--color-section-black-text)]" : "text-[color:var(--color-text-link)]"
    } ${className}`}
  >
    <span
      aria-hidden="true"
      className={`h-[3px] w-7 shrink-0 rounded-full ${
        onDark
          ? "from-[var(--color-brand-primary)] via-[var(--color-section-black-text)] to-[var(--color-brand-secondary)]"
          : "from-[var(--color-brand-primary)] via-[var(--color-text-primary)] to-[var(--color-brand-secondary)]"
      } ltr:bg-linear-to-r rtl:bg-linear-to-l`}
    />
    {children}
  </span>
);
