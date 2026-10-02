import { getTranslations } from "next-intl/server";
import { PageHero, StatCard } from "@uaeaf/brand-ui";

import type { AppLocale } from "@/i18n/routing";
import type { BoardPageView } from "@/lib/governance/types";

import { count, say } from "../shared/text";
import { boardHeadcount, committeeCount, hasMembers, hasStructure } from "./board-data";
import { ArrowDownIcon } from "./board-icons";

/**
 * The opening band: the page's words from its own record, two jump links, and
 * the board's size in four figures.
 *
 * `PageHero` rather than a hero of this page's own, so the board opens the way
 * every other institutional page does. The kit has no eyebrow slot and its own
 * slot renders after the description, so the kicker rides in the title node to
 * sit above the heading, and is hidden from assistive technology there so the
 * h1 still names the page and nothing else.
 *
 * Every figure is counted from the view. A jump link is drawn only for a
 * section that rendered, so no link leads to an anchor that is not there.
 */
export const BoardHero = async ({ board, locale }: { board: BoardPageView; locale: AppLocale }) => {
  const [t, tGov] = await Promise.all([
    getTranslations({ locale, namespace: "Board" }),
    getTranslations({ locale, namespace: "Gov" }),
  ]);

  const { hero } = board.page;
  const eyebrow = say(hero.eyebrow, locale) || t("eyebrow");
  const title = say(hero.title, locale) || t("title");
  const subtitle = say(hero.subtitle, locale);

  const jumps = [
    hasStructure(board.chart) ? { href: "#structure", label: t("jumpStructure") } : null,
    hasMembers(board) ? { href: "#members", label: t("jumpMembers") } : null,
  ].filter((jump): jump is { href: string; label: string } => jump !== null);

  const stats = [
    { key: "members", value: count(boardHeadcount(board.chart), locale), label: t("statMembers") },
    { key: "committees", value: count(committeeCount(board.chart), locale), label: t("statCommittees") },
    { key: "clubs", value: count(board.chart.memberClubCount, locale), label: t("statClubs") },
    board.cycle ? { key: "cycle", value: say(board.cycle.label, locale), label: tGov("term") } : null,
  ].filter((stat): stat is { key: string; value: string; label: string } => stat !== null);

  return (
    <PageHero
      title={
        <>
          {/* Above the title, as the design draws it, but outside the h1's
              accessible name: the page is named by its title, and the kicker
              repeats what the breadcrumb already says. */}
          <span aria-hidden="true" data-field="hero.eyebrow" className="block text-label">
            {eyebrow}
          </span>
          <span data-field="hero.title">{title}</span>
        </>
      }
      description={subtitle ? <span data-field="hero.subtitle">{subtitle}</span> : undefined}
      slot={
        <div className="flex flex-col gap-[var(--space-8)]">
          {jumps.length > 0 ? (
            <nav aria-label={tGov("sectionsLabel")} data-part="jumps">
              <ul className="flex flex-wrap gap-[var(--space-3)]">
                {jumps.map((jump) => (
                  <li key={jump.href}>
                    <a
                      href={jump.href}
                      className="brand-focusable inline-flex min-h-[var(--space-12)] items-center gap-[var(--space-2)] rounded-[var(--radius-full)] border border-[color:var(--surface-border)] px-[var(--space-5)] text-label"
                    >
                      {jump.label}
                      <ArrowDownIcon className="size-[var(--space-4)]" />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <ul data-part="stats" className="grid grid-cols-2 gap-[var(--space-4)] lg:grid-cols-4">
            {stats.map((stat) => (
              <li key={stat.key} data-part={`stat-${stat.key}`}>
                <StatCard value={stat.value} label={stat.label} className="h-full" />
              </li>
            ))}
          </ul>
        </div>
      }
    />
  );
};
