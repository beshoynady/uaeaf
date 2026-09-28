import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { CARD_ICON, BADGE, BADGE_NEUTRAL } from "@/components/ui/surface";
import { isBuilt } from "@/lib/pages/built-routes";
import { pagePart, type NavItem } from "@/lib/navigation";
import { NavIcon } from "@/components/layout/mega/nav-icon";

/** Same neutral chip as `TopicBadge`'s unclassified state: a status label,
 *  not a colour role. */
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className={`${BADGE} ${BADGE_NEUTRAL}`}>{children}</span>
);

/**
 * One destination inside a panel: icon tile, title, optional description,
 * optional badge.
 *
 * `aria-current` sits on the link and never on a panel's trigger button: the
 * button discloses, it does not navigate, and marking both would name two
 * current pages at once. The badge sits inside the `<Link>`, not beside it,
 * so it joins the link's accessible name rather than becoming text a screen
 * reader cannot attribute to anything.
 */
export const MegaLink = ({ item, currentPath }: { item: NavItem; currentPath: string }) => {
  const t = useTranslations("Nav");

  return (
    <Link
      href={item.href!}
      prefetch={isBuilt(pagePart(item.href!)) ? undefined : false}
      aria-current={item.href === currentPath ? "page" : undefined}
      data-nav-focusable=""
      className={`mega-link flex min-h-11 items-start gap-3 rounded-sm p-3 ${TRANSITION} ${FOCUS} hover:bg-[color:var(--color-surface-sunken)] active:text-[color:var(--color-text-secondary)]`}
    >
      <span className={`${CARD_ICON} size-10 shrink-0`}>
        <NavIcon name={item.key} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-body font-bold">
          {t(item.key)}
          {item.badge ? <Badge>{t("badgeSoon")}</Badge> : null}
        </span>
        {item.descriptionKey ? (
          <span className="text-caption text-[color:var(--color-text-muted)]">
            {t(item.descriptionKey)}
          </span>
        ) : null}
      </span>
    </Link>
  );
};
