import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";

import { ordinal } from "../shared/text";

/**
 * The scenes, as a sticky row under the opening.
 *
 * Drawn from the same list the page draws its scenes from, so an entry exists
 * exactly when its scene does and the numbering has no gap. The row scrolls
 * sideways on a phone instead of wrapping, which would double its height under
 * the header for the whole length of the page.
 */
export const SectionNav = ({
  label,
  entries,
}: {
  label: string;
  entries: readonly { id: string; number: number; label: string }[];
}) => {
  if (entries.length === 0) return null;

  return (
    <nav aria-label={label} data-field="section-nav" className="sticky top-[var(--header-height)] z-40">
      <Surface kind="canvas" as="div" className="border-b border-[color:var(--surface-border)]">
        <ol className={`${CONTAINER} flex gap-[var(--space-2)] overflow-x-auto`}>
          {entries.map((entry) => (
            <li key={entry.id} className="shrink-0">
              <a
                href={`#${entry.id}`}
                className="brand-focusable flex min-h-[var(--space-12)] items-center gap-[var(--space-2)] whitespace-nowrap px-[var(--space-3)] text-body-sm"
              >
                <span aria-hidden="true" className="text-label text-[color:var(--surface-text-muted)]">
                  {ordinal(entry.number)}
                </span>
                <span>{entry.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </Surface>
    </nav>
  );
};
