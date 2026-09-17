import { getTranslations } from "next-intl/server";
import { SeamLines } from "@/components/ui/identity-hero";
import { REGISTER_CLASSES, Section } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, OrganizationCardPublic } from "@/lib/api/types";
import { OrganizationCard } from "./organization-card";
import { SectionHeading } from "./section-heading";

/**
 * Partners and memberships: logo-and-name cards (ADR-0077 D3–D4, ADR-0085 D5).
 * Two sections, never merged with each other or with sponsors (ADR-0037).
 *
 * - Partners stand on the green register (decision J): after the sponsors'
 *   neutral grid the register change is the seam (page rule 3), the register is
 *   the identity element (rule 1), and two card grids never follow each other
 *   on one ground (rule 5).
 * - Memberships follow on the neutral ground with the seam lines below the seam
 *   (ADR-0075 M0-B), from lg, the green band being before them.
 * - A fixed row, no carousel and no dots; a longer list wraps beneath, centred.
 * - Absent when nothing is visible (the empty-shelf rule).
 */

export interface OrganizationsSectionSettings {
  sectionTitle?: LocalizedText | null;
  sectionSubtitle?: LocalizedText | null;
}

const GREEN = REGISTER_CLASSES.green;

export const OrganizationsSection = async ({
  kind,
  items,
  section,
  locale,
}: {
  kind: "partners" | "memberships";
  items: readonly OrganizationCardPublic[];
  section: OrganizationsSectionSettings | null;
  locale: AppLocale;
}) => {
  if (items.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "HomeSponsors" });
  const ordered = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
  const titleId = `home-${kind}-title`;
  const partners = kind === "partners";
  const storedSubtitle = section?.sectionSubtitle?.[locale] ?? null;
  const subtitle = partners ? storedSubtitle : (storedSubtitle ?? t("memberships.subtitle"));

  return (
    <Section
      enter={false}
      labelledBy={titleId}
      register={partners ? "green" : "neutral"}
      ground="base"
      className="relative py-12 md:py-16 lg:py-24"
    >
      {/* From lg: at md the heading spans the line and the strokes came 0–28px
          from it (IL-5, measured 2026-09-17), the President's finding. */}
      {partners ? null : <SeamLines placement="below" from="lg" />}
      <SectionHeading
        id={titleId}
        title={section?.sectionTitle?.[locale] ?? t(`${kind}.title`)}
        subtitle={subtitle}
        onRegister={partners}
        mutedClass={partners ? GREEN.muted : undefined}
      />
      <ul data-reveal="" className="mt-8 flex flex-wrap justify-center gap-4 md:mt-12">
        {ordered.map((item) => (
          <OrganizationCard key={item.id} name={item.name} logo={item.logo} locale={locale} />
        ))}
      </ul>
    </Section>
  );
};
