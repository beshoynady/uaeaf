import { getTranslations } from "next-intl/server";
import { SectionHeading, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { AppointmentView } from "@/lib/governance/types";

import { PersonCard } from "../shared/person-card";

/**
 * The rank below the chairman, as cards: two columns from `md`, because the
 * approved chart draws this rank as a pair and the cards repeat that shape.
 * How many posts the rank holds and what they are called is the admin's.
 */
export const BoardLeadership = async ({
  leadership,
  locale,
}: {
  leadership: readonly AppointmentView[];
  locale: AppLocale;
}) => {
  if (leadership.length === 0) return null;

  const [t, tGov] = await Promise.all([
    getTranslations({ locale, namespace: "Board" }),
    getTranslations({ locale, namespace: "Gov" }),
  ]);

  return (
    <Surface kind="canvas" id="leadership">
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        <SectionHeading title={t("leadershipEyebrow")} />

        <ul data-field="leadership" className="grid gap-[var(--space-6)] md:grid-cols-2">
          {leadership.map((post, index) => (
            <li key={post.id}>
              <PersonCard post={post} locale={locale} photoLabel={tGov("photoPending")} step={index} />
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
};
