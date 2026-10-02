import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";

import { ordinal } from "../shared/text";

export interface Chapter {
  id: string;
  label: string;
  /** Contiguous over the sections that drew, so the nav and the headings agree. */
  number: number;
}

/**
 * The chapter nav under the hero, sticky beneath the site header.
 *
 * It lists only sections that drew, from the same list that decides whether
 * they draw, so an entry never points at nothing. On a phone the row scrolls
 * sideways rather than wrapping, and each entry keeps a 48px target.
 */
export const SectionNav = ({ chapters, label }: { chapters: readonly Chapter[]; label: string }) => {
  if (chapters.length === 0) return null;

  return (
    <nav aria-label={label} data-field="section-nav" className="sticky top-[var(--header-height)] z-40">
      <Surface kind="canvas" as="div" className="border-b border-[color:var(--surface-divider)]">
        <ol className={`${CONTAINER} flex gap-[var(--space-2)] overflow-x-auto`}>
          {chapters.map((chapter) => (
            <li key={chapter.id} className="shrink-0">
              <a
                href={`#${chapter.id}`}
                className="brand-focusable inline-flex min-h-[var(--space-12)] items-center gap-[var(--space-2)] whitespace-nowrap px-[var(--space-3)] text-body-sm text-[color:var(--surface-text)] hover:text-[color:var(--surface-link)]"
              >
                <span aria-hidden="true" className="text-label text-[color:var(--surface-text-muted)]">
                  {ordinal(chapter.number)}
                </span>
                {chapter.label}
              </a>
            </li>
          ))}
        </ol>
      </Surface>
    </nav>
  );
};
