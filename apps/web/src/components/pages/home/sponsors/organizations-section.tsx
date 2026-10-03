import Image from "next/image";
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
 * - Partners sit on a full-width dark band (`ink` + mesh) with a faint stadium
 *   photo behind it, so they don't share a ground with the sponsors grid
 *   above.
 * - Memberships follow on the neutral ground with the canvas mesh and the seam
 *   lines below the seam (ADR-0075 M0-B), from lg, after the dark band
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
              the same words. On the ink band its title, rule and sentence
              read the surface's white ink. */}
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
              // No frame on partner cards; the white plate already stands
              // out on the dark band.
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
      <Section enter={false} labelledBy={titleId} register="black" ground="base" bleed className="relative">
        <Surface kind="ink" mesh as="div" className={SPACING}>
          {/* The band's colour is carried across its own top padding as the
              seam enters the view (ADR-0087 D8). Keep it before the other
              layers so it sits under them. Skipped when `UAEAF_MOTION_OFF`
              includes `seam`. */}
          {!motionIsOff("seam") ? <SeamHandover direction={localeDirection[locale]} /> : null}
          {/* Faint background photo (12%). Decorative only. */}
          <Image
            className="brand-photo-image opacity-[calc(1_-_var(--opacity-scrim-photo))]"
            src="/design-assets/hero/hero-slide-1-photo-1-2374-1203.png"
            alt=""
            fill
            sizes="100vw"
            aria-hidden="true"
          />
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
