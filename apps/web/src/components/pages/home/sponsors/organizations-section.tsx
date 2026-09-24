import { getTranslations } from "next-intl/server";
import { SectionHeading, Surface } from "@uaeaf/brand-ui";
import { SeamLines } from "@/components/ui/identity-hero";
import { SeamHandover } from "@/components/ui/seam-handover";
import { CONTAINER, Section } from "@/components/ui/section";
import { localeDirection, type AppLocale } from "@/i18n/routing";
import type { LocalizedText, OrganizationCardPublic } from "@/lib/api/types";
import { motionIsOff } from "@/lib/motion/switches";
import { OrganizationCard } from "./organization-card";
import { ORGANISATIONS_MOTION } from "./organizations-motion";
import { MembershipsRowCinematic, PartnersRowCinematic } from "./organizations-row-cinematic";

/**
 * Partners and memberships: logo-and-name cards (ADR-0077 D3–D4, ADR-0085 D5).
 * Two sections, never merged with each other or with sponsors (ADR-0037).
 *
 * - Partners stand on the green register (decision J): after the sponsors'
 *   neutral grid the register change is the seam (page rule 3), the register is
 *   the identity element (rule 1), and two card grids never follow each other
 *   on one ground (rule 5). The band is the kit's expressive `brand-green`
 *   surface (ADR-0098 D2) laid full-bleed over the register, so the section
 *   keeps its landmark and `data-register` while its ground, heading and
 *   every kit accent inside read the identity surface's white ink.
 * - Memberships follow on the neutral ground with the canvas mesh and the seam
 *   lines below the seam (ADR-0075 M0-B), from lg, the green band being before
 *   them. Each membership card carries the kit's `hover` edge (ADR-0098 D5).
 * - A fixed row, no carousel and no dots; a longer list wraps beneath, centred.
 * - Absent when nothing is visible (the empty-shelf rule).
 */

export interface OrganizationsSectionSettings {
  sectionTitle?: LocalizedText | null;
  sectionSubtitle?: LocalizedText | null;
}

/** The row itself, shared by both motions so the only difference between
 *  them is the motion. */
const ROW = "mt-8 flex flex-wrap justify-center gap-4 md:mt-12";

/** The band's vertical rhythm, the same on both grounds. */
const SPACING = "relative py-12 md:py-16 lg:py-24";

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

  // The body is the same on both grounds; only what surrounds it differs.
  const body = (
    <>
      <div data-reveal="">
        <div data-reveal-part="rise">
          {/* The kit's heading takes no `id`; the span names the landmark with
              the same words. On the green band its title, rule and sentence
              all read the surface's white, as ADR-0098 §8.2 requires. */}
          <SectionHeading
            title={<span id={titleId}>{section?.sectionTitle?.[locale] ?? t(`${kind}.title`)}</span>}
            description={subtitle ?? undefined}
          />
        </div>
      </div>
      {/* The one switch (`organizations-motion.ts`). The approved row is the
          default and is unchanged; the cinematic one is an exploration whose
          departures are written up rather than merged in quietly. */}
      {ORGANISATIONS_MOTION === "cinematic" ? (
        partners ? (
          <PartnersRowCinematic items={ordered} locale={locale} className={ROW} />
        ) : (
          <MembershipsRowCinematic items={ordered} locale={locale} className={ROW} />
        )
      ) : (
        <ul data-reveal="" className={ROW}>
          {ordered.map((item) => (
            <OrganizationCard
              key={item.id}
              name={item.name}
              logo={item.logo}
              locale={locale}
              // Partners carry no edge: on the green band every tone collapses
              // to white, and a white ring around a white plate adds nothing.
              frame={partners ? undefined : { variant: "hover", tone: "tricolor" }}
            />
          ))}
        </ul>
      )}
    </>
  );

  if (partners) {
    return (
      // `bleed` so the band reaches both viewport edges: the surface below is
      // the ground, and the container moves inside it.
      <Section enter={false} labelledBy={titleId} register="green" ground="base" bleed className="relative">
        <Surface kind="brand-green" as="div" className={SPACING}>
          {/* The band's colour is carried across its own top padding as the
              seam enters the view (ADR-0087 D8). First, so it lies under
              everything else here; not in the page at all when
              `UAEAF_MOTION_OFF` names `seam`. */}
          {!motionIsOff("seam") ? <SeamHandover direction={localeDirection[locale]} /> : null}
          <div className={CONTAINER}>{body}</div>
        </Surface>
      </Section>
    );
  }

  return (
    <Section enter={false} labelledBy={titleId} register="neutral" ground="base" className={SPACING}>
      {/* From lg: at md the heading spans the line and the strokes came 0–28px
          from it (IL-5, measured 2026-09-17), the President's finding. */}
      <SeamLines placement="below" from="lg" />
      {/* The mesh tint over the neutral ground (ADR-0098 §5-D), nested so
          `Section` keeps the register, the landmark and the seam lines. */}
      <Surface kind="canvas" mesh as="div">
        {body}
      </Surface>
    </Section>
  );
};
