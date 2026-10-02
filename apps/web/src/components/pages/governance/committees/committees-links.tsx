import { LinkTile, SectionHeading, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";

export type GovernanceLink = { href: string; title: string; description?: string };

/**
 * Where a reader goes from the committees: the board they report to, and the
 * policies they work under.
 *
 * `LinkTile` on the green ground because the tile is built for a brand ground
 * — its fill and edge are the ground's own translucent white — and a neutral
 * card here would punch a plate into it.
 */
export const CommitteesLinks = ({
  title,
  links,
  className = "",
}: {
  title: string;
  links: readonly GovernanceLink[];
  className?: string;
}) => {
  if (links.length === 0) return null;

  return (
    <Surface kind="brand-green" className={className}>
      <div
        data-field="governanceLinks"
        className={`${CONTAINER} flex flex-col gap-[var(--space-8)] py-12 md:py-16 lg:py-24`}
      >
        <SectionHeading title={title} />

        <ul className="grid gap-[var(--space-4)] md:grid-cols-2 md:gap-[var(--space-6)]">
          {links.map((link) => (
            <li key={link.href}>
              <LinkTile
                className="brand-focusable h-full min-h-[var(--space-12)]"
                href={link.href}
                title={<span data-part="title">{link.title}</span>}
                description={
                  link.description ? <span data-part="description">{link.description}</span> : undefined
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
};
