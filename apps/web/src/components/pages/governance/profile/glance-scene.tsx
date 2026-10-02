import { useTranslations } from "next-intl";
import { StatCard, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { PersonProfileView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { count, say } from "../shared/text";
import { SCENE_HAS, SCENE_SCROLL_MARGIN } from "./profile-scenes";
import { SceneHeading } from "./scene-heading";

/**
 * Committees the person chairs now.
 *
 * A chair is whoever holds a committee's highest-ranked position, so this
 * counts rank-1 committee posts rather than looking for a title: the admin
 * names positions, and a test on the name breaks when one is renamed.
 */
export const committeesChaired = (profile: PersonProfileView): number =>
  profile.current.filter((post) => post.body === "committee" && post.position.rank === 1).length;

/** Whole calendar years since the earliest post, current or closed, began. */
export const yearsWithFederation = (profile: PersonProfileView, now: Date = new Date()): number | null => {
  const starts = [...profile.current, ...profile.previous].map((post) =>
    new Date(post.termStart).getUTCFullYear(),
  );
  if (starts.length === 0) return null;
  return Math.max(0, now.getUTCFullYear() - Math.min(...starts));
};

/**
 * `#glance` — the record in three figures.
 *
 * Inverts with the theme. The term card is drawn only while a current post
 * names one: a person whose posts have all closed has no current term, and a
 * former term under "electoral term" would read as the present one.
 */
export const GlanceScene = ({
  profile,
  locale,
  number,
}: {
  profile: PersonProfileView;
  locale: AppLocale;
  number: number;
}) => {
  const t = useTranslations("Person");
  if (!SCENE_HAS.glance(profile)) return null;

  const term = profile.current[0]?.cycle.label ?? null;
  const years = yearsWithFederation(profile);

  const stats = [
    term ? { key: "term", value: say(term, locale), label: t("statTerm") } : null,
    { key: "committees", value: count(committeesChaired(profile), locale), label: t("statCommittees") },
    years === null ? null : { key: "years", value: count(years, locale), label: t("statYears") },
  ].filter((stat): stat is NonNullable<typeof stat> => stat !== null);

  return (
    <Surface kind="canvas" id="glance" className={SCENE_SCROLL_MARGIN}>
      <div className={`${CONTAINER} flex flex-col gap-[var(--space-10)] py-[var(--space-16)] lg:py-[var(--space-24)]`}>
        <SceneHeading number={number} label={t("glanceTitle")} title={t("glanceHeading")} />

        <ul data-field="stats" className="grid gap-[var(--space-4)] md:grid-cols-3 md:gap-[var(--space-6)]">
          {stats.map((stat, index) => (
            <li key={stat.key} data-part={stat.key} className="gov-flip" style={revealStep(index)}>
              <StatCard className="h-full" value={stat.value} label={stat.label} />
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
};
