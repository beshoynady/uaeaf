import { Children, isValidElement, type ReactNode } from "react";

/**
 * Full-bleed section registers.
 *
 * ADR-0059 §D2 restored coloured grounds to the system: the federation's own
 * guide §6.1 shows the logo on white, red, green and black grounds as four
 * official options, and then uses them on twelve pages — stationery, flags,
 * the referee kit, every local-championship garment. The project rule that
 * had prohibited them ("explicitly NOT: a full-section background wash") is
 * retired by that ADR.
 *
 * Each register is a complete measured set — surface, text, muted text,
 * border, divider — sitting at the 600/700 step rather than the 500, because
 * white on `green.500` measures 4.81:1 and leaves no room for a second text
 * tier, while `green.700` measures 9.40:1 and carries both.
 *
 * Which register a page gets is not a taste decision. ADR-0059 §D1 retired
 * the numeric colour budget and replaced it with the guide's own logic:
 * colour marks *what a region is*. The guide assigns green to
 * administrators (§3.3), red to referees (§2.3) and to every local
 * championship (§4.3 onward), white to athletes in international context
 * (§1.3). `lib/pages/public-pages.ts` carries that mapping per page.
 */

export type Register = "neutral" | "green" | "red" | "black";

/**
 * Class strings per register, written out in full rather than composed.
 *
 * Tailwind scans source text for complete class names; a template literal
 * like `bg-[color:var(--color-section-${register}-surface)]` produces no CSS
 * at all and fails silently — the exact failure mode that put two undefined
 * custom properties into production (ADR-0059 §D5).
 */
export const REGISTER_CLASSES: Record<
  Register,
  { surface: string; muted: string; border: string; divider: string }
> = {
  neutral: {
    surface: "bg-[color:var(--color-surface-base)] text-[color:var(--color-text-primary)]",
    muted: "text-[color:var(--color-text-secondary)]",
    border: "border-[color:var(--color-border-default)]",
    divider: "divide-[color:var(--color-border-subtle)]",
  },
  green: {
    surface:
      "bg-[color:var(--color-section-green-surface)] text-[color:var(--color-section-green-text)]",
    muted: "text-[color:var(--color-section-green-text-muted)]",
    border: "border-[color:var(--color-section-green-border)]",
    divider: "divide-[color:var(--color-section-green-divider)]",
  },
  red: {
    surface:
      "bg-[color:var(--color-section-red-surface)] text-[color:var(--color-section-red-text)]",
    muted: "text-[color:var(--color-section-red-text-muted)]",
    border: "border-[color:var(--color-section-red-border)]",
    divider: "divide-[color:var(--color-section-red-divider)]",
  },
  black: {
    surface:
      "bg-[color:var(--color-section-black-surface)] text-[color:var(--color-section-black-text)]",
    muted: "text-[color:var(--color-section-black-text-muted)]",
    border: "border-[color:var(--color-section-black-border)]",
    divider: "divide-[color:var(--color-section-black-divider)]",
  },
};

/**
 * The public container.
 *
 * Chapter 5 §5.3 caps the public experience at 1440px. The horizontal
 * padding steps are §5.2's margin column read straight down — 16 · 24 · 32 ·
 * 48 · 64 · auto — so at a 1440px viewport the content measures exactly
 * 1440 − 2×64 = 1312px, which is the width the approved footer composition
 * already uses. No new number is introduced here.
 */
export const CONTAINER = "mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16";

export function Section({
  register = "neutral",
  children,
  className,
  id,
  labelledBy,
  bleed = false,
}: {
  register?: Register;
  children: ReactNode;
  className?: string;
  id?: string;
  /** `aria-labelledby` target. A `<section>` only becomes a landmark when it
   *  has an accessible name, so a section with a heading should point at it
   *  and one without should stay an unnamed generic region. */
  labelledBy?: string;
  /** Skip the container — for a band whose content must reach the viewport
   *  edge, such as a full-width image. */
  bleed?: boolean;
}) {
  const tone = REGISTER_CLASSES[register];
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-register={register}
      className={`w-full ${tone.surface}${className ? ` ${className}` : ""}`}
    >
      {bleed ? children : <div className={CONTAINER}>{children}</div>}
    </section>
  );
}

/**
 * The mandatory separator between a green and a red band.
 *
 * ADR-0059 §D2: Federation Green and Federation Red measure **1.15:1**
 * against each other at their register values. Stacked directly they have no
 * visible boundary whatsoever — before considering that red/green is the
 * classic confusion pair for roughly 8% of men. The guide never abuts them
 * either: in the four-stroke motif there is always white or black between.
 *
 * Height comes from the 8pt scale (Chapter 3 §3.14 — "no free value outside
 * this list"). `--space-2` is the smallest step that reads as a deliberate
 * band; `--space-1` at 4px reads as a rendering artefact of the border above
 * it, which is the opposite of the point.
 */
export function SectionSeparator() {
  return (
    <div
      aria-hidden="true"
      data-testid="section-separator"
      className="h-2 w-full bg-[color:var(--color-section-adjacent-separator)]"
    />
  );
}

/**
 * A page's bands, with the adjacency rule applied for you.
 *
 * The rule could have been a sentence in the ADR and a reviewer's job. It is
 * a component instead, because the mistake it prevents is invisible: two
 * bands at 1.15:1 do not look wrong in a screenshot, they look like one band.
 * Composing sections through this stack makes the omission impossible rather
 * than merely discouraged.
 */
export function SectionStack({ children }: { children: ReactNode }) {
  const sections = Children.toArray(children).filter(Boolean);
  const output: ReactNode[] = [];

  let previous: Register | null = null;
  sections.forEach((child, index) => {
    const register = isValidElement<{ register?: Register }>(child)
      ? (child.props.register ?? "neutral")
      : null;

    if (needsSeparator(previous, register)) {
      output.push(<SectionSeparator key={`separator-${index}`} />);
    }
    output.push(child);
    // A node this stack cannot read the register of resets the chain rather
    // than inheriting the last one — an unknown neighbour is not evidence
    // that the next green band is safe.
    previous = register;
  });

  return <>{output}</>;
}

export function needsSeparator(previous: Register | null, next: Register | null): boolean {
  if (previous === null || next === null) return false;
  return (
    (previous === "green" && next === "red") || (previous === "red" && next === "green")
  );
}
