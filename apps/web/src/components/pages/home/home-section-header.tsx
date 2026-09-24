import { SectionHeading } from "@uaeaf/brand-ui";
import { Link } from "@/i18n/navigation";
import { ChevronIcon } from "@/components/ui/chevron-icon";
import { FOCUS, TEXT_TARGET } from "@/components/ui/interactive";

/**
 * A homepage section's heading: the title and its sentence at the start, the
 * way into the full list at the end, both resting on one line. Shared by
 * "Latest news" and "UAEAF in the Media", which are drawn the same way.
 *
 * Built on the kit's `SectionHeading` (ADR-0098), so the tricolour rule under
 * the title and the on-surface text colours come from the library rather than
 * from classes written here — the heading reads correctly on the canvas and on
 * the photographic ground alike.
 *
 * `SectionHeading` takes no `id`, and the section's landmark is named by
 * `aria-labelledby`. The id therefore goes on a span that wraps the title
 * inside the `h2`: the computed name is the same words, and no second heading
 * element is introduced to hold an attribute.
 *
 * The whole heading is the section's first reveal step; the link rides with it.
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
  <div data-reveal-part="rise">
    <SectionHeading
      title={<span id={id}>{title}</span>}
      // `undefined`, not `null`: the kit draws its paragraph for anything that
      // is not `undefined`, and an empty paragraph is a gap in the rhythm.
      description={subtitle ?? undefined}
      action={
        <Link
          href={link.href}
          aria-label={link.ariaLabel}
          // The gap opens on hover: the arrow leans toward where the link goes.
          className={`${TEXT_TARGET} ${FOCUS} inline-flex items-center gap-1.5 rounded-xs text-body font-bold text-[color:var(--surface-link)] transition-[gap] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:gap-2.5`}
        >
          {link.label}
          <ChevronIcon direction="forward" />
        </Link>
      }
    />
  </div>
);
