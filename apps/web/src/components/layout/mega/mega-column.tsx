import { useTranslations } from "next-intl";
import type { NavItem } from "@/lib/navigation";
import { MegaLink } from "@/components/layout/mega/mega-link";

/**
 * A column of destinations under a visible heading.
 *
 * The heading is `h2` and visible rather than `sr-only`: a panel of eight
 * links with no headings is eight peers to a screen reader, and the grouping
 * the design draws is exactly the information navigation needs.
 *
 * The one conditional destination in the tree is filtered here rather than
 * removed from `navigation.ts`, because the tree is also what the footer and
 * the sitemap read, and neither can express "only while broadcasting".
 */
export const MegaColumn = ({
  column,
  currentPath,
  live = null,
}: {
  column: NavItem;
  currentPath: string;
  /** The running broadcast, or `null` while none is on air. Forwarded to
   *  whichever child happens to be the live-stream item; every other column
   *  has no such child, so it has no effect there. */
  live?: { title: string; href: string } | null;
}) => {
  const t = useTranslations("Nav");
  const visible = column.children!.filter((item) => item.key !== "liveStream" || live !== null);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h2 className="text-overline text-[color:var(--color-text-muted)]">{t(column.key)}</h2>
      <ul className="flex flex-col">
        {visible.map((item) => (
          <li key={item.key}>
            <MegaLink item={item} currentPath={currentPath} live={item.key === "liveStream" ? live : null} />
          </li>
        ))}
      </ul>
    </div>
  );
};
