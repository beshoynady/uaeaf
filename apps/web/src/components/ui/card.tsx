import type { ReactNode } from "react";
import { REGISTER_CLASSES, type Register } from "./section";
import { CARD, LIFT } from "./surface";

/**
 * A surface that sits above its section.
 *
 * ADR-0059 diagnosed flat cards as one of five defects: the elevation tokens
 * existed and nothing consumed them, so every card was a rectangle with a
 * 1px border on a surface the same colour as itself. Depth here comes from
 * three things at once, which is what makes it read as depth rather than as
 * a shadow someone remembered to add — a lighter surface than the ground, a
 * readable border, and `--elevation-card`. All three are `ui/surface`'s
 * decision, not this component's: the border used to be
 * `--color-border-default` here and `--color-border-strong` on the contact
 * page, which is how one system ends up with two kinds of card.
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
   *  is a false affordance (Chapter 11 §UX, "affordance"). */
  interactive?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const tone = REGISTER_CLASSES[register];
  const surface =
    register === "neutral"
      ? CARD
      : `rounded-[var(--radius-md)] border ${tone.border} bg-white/8`;

  // The rise and the elevation cross-fade are `.lift`'s (ADR-0065 D5) — one
  // definition, shared with every other raised object on the site. What stays
  // here is the part that is specific to a card on a coloured band, where the
  // ground has to lighten because a shadow on a green surface says nothing.
  const feedback = interactive
    ? [
        LIFT,
        register === "neutral"
          ? ""
          : "transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:bg-white/12 active:bg-white/8",
        "focus-within:outline-none focus-within:ring-2",
        "focus-within:ring-[color:var(--a11y-focus-ring)]",
        "focus-within:ring-offset-2",
        "focus-within:ring-offset-[color:var(--a11y-focus-offset)]",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div className={`${surface} p-6 ${feedback}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
