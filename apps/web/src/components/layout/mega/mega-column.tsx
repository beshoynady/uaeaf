import { useTranslations } from "next-intl";
import type { NavItem } from "@/lib/navigation";
import { MegaLink } from "@/components/layout/mega/mega-link";

/**
 * A column of destinations under a visible heading.
 *
 * The heading is `h2` and visible rather than `sr-only`: a panel of eight
 * links with no headings is eight peers to a screen reader, and the grouping
 * the design draws is exactly the information navigation needs.
 */
export const MegaColumn = ({ column, currentPath }: { column: NavItem; currentPath: string }) => {
  const t = useTranslations("Nav");

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h2 className="text-overline text-[color:var(--color-text-muted)]">{t(column.key)}</h2>
      <ul className="flex flex-col">
        {column.children!.map((item) => (
          <li key={item.key}>
            <MegaLink item={item} currentPath={currentPath} />
          </li>
        ))}
      </ul>
    </div>
  );
};
