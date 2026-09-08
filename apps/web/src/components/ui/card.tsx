import type { ReactNode } from "react";
import { REGISTER_CLASSES, type Register } from "./section";

/**
 * A surface that sits above its section.
 *
 * ADR-0059 diagnosed flat cards as one of five defects: the elevation tokens
 * existed and nothing consumed them, so every card was a rectangle with a
 * 1px border on a surface the same colour as itself. Depth here comes from
 * three things at once, which is what makes it read as depth rather than as
 * a shadow someone remembered to add — a lighter surface than the ground, a
 * border, and `--elevation-card`.
 *
 * On a coloured register there is no lighter surface to move to: the register
 * *is* the surface, and a white card on a green band would read as a hole
 * punched through it rather than as a raised object. So a card on a coloured
 * register takes its elevation from a translucent lift of the register's own
 * text colour plus that register's measured border, keeping the section
 * whole. The text colour is unchanged either way, so the published contrast
 * ratio still holds.
 */
export function Card({
  register = "neutral",
  interactive = false,
  children,
  className,
}: {
  register?: Register;
  /** Adds hover and pressed feedback. Set this only where the whole card is
   *  a link or a button — feedback on a card that does nothing when clicked
   *  is a false affordance (Chapter 10 §UX, "affordance"). */
  interactive?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const tone = REGISTER_CLASSES[register];
  const surface =
    register === "neutral"
      ? "bg-[color:var(--color-surface-raised)] shadow-card"
      : "bg-white/8";

  // `transform` and `box-shadow` only. ADR-0009 permits transform/opacity for
  // motion; the shadow swap is a paint change on a discrete state, not an
  // animated property, and neither forces layout.
  const feedback = interactive
    ? [
        "transition-[transform,box-shadow,background-color]",
        "duration-[var(--motion-duration-fast)]",
        "ease-[var(--motion-easing-standard)]",
        // The lift runs along the ascent vector, so a card rises the way the
        // identity's strokes do rather than straight up (ADR-0059 §D7).
        "hover:-translate-y-0.5 hover:translate-x-0.5",
        register === "neutral" ? "hover:shadow-card-hover" : "hover:bg-white/12",
        "active:translate-y-0 active:translate-x-0",
        register === "neutral" ? "active:shadow-card" : "active:bg-white/8",
        "focus-within:outline-none focus-within:ring-2",
        "focus-within:ring-[color:var(--a11y-focus-ring)]",
        "focus-within:ring-offset-2",
        "focus-within:ring-offset-[color:var(--a11y-focus-offset)]",
      ].join(" ")
    : "";

  return (
    <div
      className={`rounded-[var(--radius-md)] border ${tone.border} ${surface} p-6 ${feedback}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
