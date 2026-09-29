import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";

/**
 * The grounds a promoted card may stand on — existing `data-surface` values
 * from `packages/design-tokens/css/surfaces.css` only. There is no blue
 * surface in that file; a panel that wants one is a
 * `DESIGN DECISION REQUIRED`, not a value invented here.
 */
export type FeatureCardTone = "brand-green" | "brand-red" | "section-black" | "ink";

export interface FeatureCardProps {
  eyebrow: string;
  title: string | null;
  meta?: string | null;
  href: string;
  cta: string;
  tone: FeatureCardTone;
  children?: ReactNode;
}

/**
 * The panel's one promoted destination.
 *
 * One link around the whole card, not a link per line: two links to the same
 * address inside one card read as two destinations to a screen reader and
 * double the tab stops for a single choice. With no title there is nothing to
 * promote, so the panel is shorter rather than showing an empty card.
 *
 * `data-surface` publishes the ground's variables and `brand-surface` paints
 * them (`surface-paint-contract.spec.ts`); every tone here carries light ink,
 * so both are required together.
 */
export const FeatureCard = ({ eyebrow, title, meta, href, cta, tone, children }: FeatureCardProps) => {
  if (!title) return null;

  return (
    <Link
      href={href}
      data-nav-focusable=""
      data-surface={tone}
      // `min-h-[calc(var(--space-16)*4)]` = 256px: no token sits at the
      // ~250px the canvas shows, and this is the nearest multiple of an
      // existing spacing step (`--space-16`, 64px) above it.
      className={`feature-card brand-surface flex min-h-[calc(var(--space-16)*4)] flex-col justify-end gap-2 rounded-[var(--radius-md)] p-[var(--space-6)] ${TRANSITION} ${FOCUS}`}
    >
      {children}
      <span className="text-overline opacity-85">{eyebrow}</span>
      <span className="text-title font-bold">{title}</span>
      {meta ? <span className="text-caption opacity-85">{meta}</span> : null}
      <span className="text-body-sm font-medium">{cta}</span>
    </Link>
  );
};
