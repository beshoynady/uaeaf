import { Link } from "@/i18n/navigation";
import { ChevronIcon } from "@/components/ui/chevron-icon";
import { FOCUS, TEXT_TARGET } from "@/components/ui/interactive";
import { revealStep } from "@/lib/motion/reveal";

/**
 * A homepage section's heading as the approved canvas draws it (2026-09-22):
 * the title and its sentence at the start, the way into the full list at the
 * end, both resting on one line. Shared by "Latest news" and "UAEAF in the
 * Media", which the canvas draws the same way.
 *
 * No accent rule before the title, unlike `SectionHeading`: the canvas has
 * none, and it is the reference for these two sections.
 *
 * Its parts are the first two steps of the section's reveal: the title, then
 * its sentence and the link together.
 */
export const HomeSectionHeader = ({
  id,
  title,
  subtitle,
  link,
}: {
  id: string;
  title: string;
  subtitle: string | null;
  link: { href: string; label: string; ariaLabel?: string };
}) => (
  <div className="flex flex-wrap items-end justify-between gap-6">
    <div className="max-w-[640px]">
      <h2 id={id} data-reveal-part="rise" className="text-h2 text-balance text-[color:var(--color-text-primary)]">
        {title}
      </h2>
      {subtitle ? (
        <p data-reveal-part="rise" style={revealStep(1)} className="mt-2.5 text-body text-pretty text-[color:var(--color-text-secondary)]">
          {subtitle}
        </p>
      ) : null}
    </div>
    <Link
      href={link.href}
      aria-label={link.ariaLabel}
      data-reveal-part="rise"
      style={revealStep(1)}
      // The gap opens on hover, as drawn: the arrow leans toward where the
      // link goes.
      className={`${TEXT_TARGET} ${FOCUS} inline-flex items-center gap-1.5 rounded-xs text-body font-bold text-[color:var(--color-text-link)] transition-[gap] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:gap-2.5`}
    >
      {link.label}
      <ChevronIcon direction="forward" />
    </Link>
  </div>
);
