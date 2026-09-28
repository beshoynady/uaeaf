import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  BrandBorder,
  EmptyState,
  PageHero,
  SectionHeading,
  StatHighlight,
  Surface,
} from "@uaeaf/brand-ui";

import { breadcrumbTrail, isInstitutional, loadStaticPage, text } from "@/components/pages/static-page-screen";
import { heroPhotoSlot } from "@/components/ui/hero-photo";
import { visibleTrail } from "@/components/ui/visible-trail";
import { CONTAINER } from "@/components/ui/section";
import { altOf, fetchPublicMedia, isExternalMedia } from "@/lib/api/media";
import { fetchPublic } from "@/lib/api/public-client";
import type { AppointmentPublic } from "@/lib/api/types";
import { AboutPageJsonLd, BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";

const KEY = "board-members";

/**
 * The people holding board posts, from `GET /federation-appointments/public`.
 *
 * NOT `/federation-personnel/public`, which this page read until 2026-09-27:
 * that endpoint returns every person whose `status` is `Active`, with no filter
 * on holding a post, so every staff member and committee member appeared here as
 * a member of the board and was counted in the figure below the hero
 * (`docs/reviews/accounts-profiles-review.md` P0-1, ADR-0119).
 *
 * `currentLeadership` behind this endpoint applies the three conditions that
 * matter together — the appointment is still `Active`, its term has not run out,
 * and its role is one the board itself holds — and returns five fields, contact
 * details not among them.
 */
const loadOfficers = async (): Promise<AppointmentPublic[]> => {
  const officers = await fetchPublic<AppointmentPublic[]>("/federation-appointments/public");
  if (!Array.isArray(officers)) {
    return [];
  }

  // The endpoint already sorts, and the DTO ships `displayOrder` so a caller
  // rendering a grid can too. Sorting here as well costs nothing and keeps the
  // board's own order from depending on which endpoint served the page.
  return [...officers].sort((left, right) => left.displayOrder - right.displayOrder);
};

/**
 * Board members, on `@uaeaf/brand-ui`.
 *
 * The hero (the record's photograph where it has one, the ink ground where it
 * has none), then the board's size on the green identity ground (the page's own
 * register is green, ADR-0060 D1), then the members as hover-bordered cards. A
 * portrait is ringed only when the record's photo resolves: an empty ring would
 * be a placeholder standing in for a person, and the system has no illustration
 * style to fill it with (Chapter 27 §31).
 *
 * No search field: the page has no approved copy for a search that matches
 * nothing, and an empty state that cannot name its cause is the defect
 * `EmptyState` exists to prevent.
 */
export const BoardMembersScreen = async ({ locale }: { locale: AppLocale }) => {
  const [{ page, title, subtitle, heroImage }, officers, tPages, tNav, tSections, tPreparing] = await Promise.all([
    loadStaticPage(KEY, locale),
    loadOfficers(),
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Sections" }),
    getTranslations({ locale, namespace: "Preparing" }),
  ]);
  const portraits = await fetchPublicMedia(officers.map((officer) => officer.photoId));

  const trail = breadcrumbTrail(page, (key) => tPages(key), (key) => tNav(key));
  // ADR-0072 D7: an `/about` page emits its trail to `BreadcrumbJsonLd` and
  // draws none. Drawn, this one also announced two current pages — the kit marks
  // every step without an `href` as the current one, and "About" has no landing
  // page of its own (IA §8.1).
  const breadcrumb = isInstitutional(page.route) ? undefined : visibleTrail(trail, locale);
  // Pinned to Latin digits (Chapter 19 §5): `ar` alone reaches that only by
  // the locale's default, not by a decision.
  const count = new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(officers.length);

  return (
    // A fragment: the layout already renders the page's one `<main>`.
    <>
      <AboutPageJsonLd locale={locale} route={page.route} name={title} description={subtitle ?? title} />
      <BreadcrumbJsonLd
        locale={locale}
        trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
      />

      <PageHero
        title={title}
        description={subtitle ?? undefined}
        media={heroPhotoSlot(heroImage, locale)}
        breadcrumb={breadcrumb}
        breadcrumbLabel={tPages("breadcrumbLabel")}
      />

      {officers.length === 0 ? (
        <Surface kind="canvas" className="py-[var(--space-16)]">
          <div className={CONTAINER}>
            <EmptyState title={tPreparing("status")} />
          </div>
        </Surface>
      ) : (
        <>
          <Surface kind="brand-green" className="py-[var(--space-12)]">
            <div className={CONTAINER}>
              <StatHighlight value={count} label={tSections("boardMembers")} />
            </div>
          </Surface>

          <Surface kind="canvas" className="py-[var(--space-16)]">
            <div className={CONTAINER}>
              <SectionHeading title={tSections("boardMembers")} />
              {/* Chapter 5 §5.2's column counts read as content columns: one
                  card per 4 of 4 · 8 · 12 gives 1 · 2 · 3. */}
              <ul className="grid gap-[var(--space-6)] md:grid-cols-2 lg:grid-cols-3">
                {officers.map((officer) => {
                  const portrait = officer.photoId ? portraits.get(officer.photoId) : undefined;
                  const post = text(officer.positionTitle, locale);

                  return (
                    // The post is part of the key: one person may hold two
                    // appointments, and the endpoint carries no id to key on.
                    <li key={`${officer.fullName.en}-${post}`}>
                      <BrandBorder variant="hover" className="h-full">
                        <Surface
                          kind="raised"
                          as="article"
                          className="flex h-full flex-col gap-[var(--space-3)] p-[var(--space-6)]"
                        >
                          {portrait ? (
                            <BrandBorder shape="circle" className="size-[var(--space-24)] shrink-0">
                              <Image
                                src={portrait.file.url}
                                alt={altOf(portrait, locale)}
                                width={portrait.file.width}
                                height={portrait.file.height}
                                // `--space-24` (96px): `sizes` takes a length, not a custom property.
                                sizes="6rem"
                                unoptimized={isExternalMedia(portrait.file.url)}
                                className="size-full rounded-[var(--radius-full)] object-cover"
                              />
                            </BrandBorder>
                          ) : null}
                          <h3 className="text-h4">{officer.fullName[locale]}</h3>
                          {post ? (
                            <p className="text-body-sm text-[color:var(--surface-text-muted)]">{post}</p>
                          ) : null}
                        </Surface>
                      </BrandBorder>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Surface>
        </>
      )}
    </>
  );
};
