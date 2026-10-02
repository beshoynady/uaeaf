import { getTranslations } from "next-intl/server";
import { SectionHeading, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { AppointmentView } from "@/lib/governance/types";

import { PersonCard } from "../shared/person-card";

/**
 * Every remaining board post, as cards.
 *
 * One column on a phone, two from `md`, three from `lg`: Chapter 5 §5.2's
 * content columns, one card per four of 4 · 8 · 12, as the current board page
 * lays them out.
 */
export const BoardMembers = async ({
  members,
  locale,
}: {
  members: readonly AppointmentView[];
  locale: AppLocale;
}) => {
  if (members.length === 0) return null;

  const [t, tGov] = await Promise.all([
    getTranslations({ locale, namespace: "Board" }),
    getTranslations({ locale, namespace: "Gov" }),
  ]);

  return (
    <Surface kind="canvas" id="members">
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        <div className="flex flex-col gap-[var(--space-3)]">
          <span data-part="eyebrow" className="text-label text-[color:var(--surface-link)]">
            {t("membersEyebrow")}
          </span>
          <SectionHeading title={t("membersTitle")} />
        </div>

        <ul data-field="members" className="grid gap-[var(--space-6)] md:grid-cols-2 lg:grid-cols-3">
          {members.map((post, index) => (
            <li key={post.id}>
              <PersonCard post={post} locale={locale} photoLabel={tGov("photoPending")} step={index} />
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
};
