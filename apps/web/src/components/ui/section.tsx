import { Children, isValidElement, type ReactNode } from "react";
import { SECTION_ENTER } from "./surface";

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
 * A register, expressed as a Brand UI Kit surface.
 *
 * The two systems were built five weeks apart and painted the same grounds
 * twice: `Section` through Tailwind classes, `Surface` through `data-surface`.
 * That cost more than tidiness. A `BrandAccentBar` inside a black-register
 * footer resolved `--surface-tricolor-mid` from the `:root` fallback, so its
 * middle step was **black on the black footer** — the bar was there and half
 * of it was invisible. Measured 2026-09-24.
 *
 * Emitting both attributes from one element is the smallest change that makes
 * them one mechanism: the Tailwind classes keep painting exactly what they
 * painted, and every kit component inside now reads the right ink, edge and
 * tricolour without the call site wrapping anything.
 */
export const SURFACE_OF: Record<Register, string> = {
  neutral: "canvas",
  // The register surfaces, not the kit's expressive `brand-green`/`brand-red`.
  // These publish ADR-0059 D2's own measured values — `green.700` with
  // `green.100` under it — which is what the shipped pages were measured
  // against. Mapping to the gradient variant would have quietly moved every
  // register band's second text tier below AA.
  green: "section-green",
  red: "section-red",
  black: "section-black",
};

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
/**
 * The neutral register's second ground (ADR-0072 D5). A page alternates its
 * neutral sections between the base and this sunken step, so its rhythm is
 * carried by the grounds. Every text tier and item colour is measured on both.
 */
const SUNKEN_SURFACE = "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-primary)]";

export const CONTAINER = "mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16";

export function Section({
  register = "neutral",
  children,
  className,
  id,
  labelledBy,
  bleed = false,
  enter = true,
  ground = "base",
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
  /**
   * Whether the contents rise into place as the reader reaches them.
   *
   * On by default: one motion language for every band on the site is the
   * point, and `SECTION_ENTER` cannot hide content (it is opacity-free) or
   * shift layout (it is a transform).
   *
   * Turn it off for a band containing a `position: fixed` descendant. A
   * transform on an ancestor becomes that descendant's containing block, so
   * the fixed element would start scrolling with the page — a real defect,
   * and one that only appears while the animation is running.
   *
   * Ignored under `bleed`, which has no container to move.
   */
  enter?: boolean;
  /** The neutral register's ground: `base`, or `sunken` for every other band. */
  ground?: "base" | "sunken";
}) {
  const tone = REGISTER_CLASSES[register];
  const surface = register === "neutral" && ground === "sunken" ? SUNKEN_SURFACE : tone.surface;
  const inner = enter ? SECTION_ENTER : "";
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-register={register}
      // The same band, named in the kit's vocabulary. See `SURFACE_OF`.
      data-surface={SURFACE_OF[register]}
      data-ground={register === "neutral" ? ground : undefined}
      className={`w-full ${surface}${className ? ` ${className}` : ""}`}
    >
      {/* A bleed band keeps its children as direct descendants and gets no
          entrance. Its content reaches the viewport edge by definition, so
          translating it uncovers the band's own ground along that edge — the
          same reason the animation is on the contents rather than the section
          everywhere else. There is nothing here for the motion to hide behind. */}
      {bleed ? children : <div className={`${CONTAINER} ${inner}`}>{children}</div>}
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
