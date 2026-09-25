import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  BrandBorder,
  EmptyState,
  PageHero,
  SectionHeading,
  StatHighlight,
  Surface,
  type BreadcrumbItem,
} from "@uaeaf/brand-ui";

import { breadcrumbTrail, isInstitutional, loadStaticPage, text } from "@/components/pages/static-page-screen";
import { heroPhotoSlot } from "@/components/ui/hero-photo";
import { visibleTrail } from "@/components/ui/visible-trail";
import { CONTAINER } from "@/components/ui/section";
import { altOf, fetchPublicMedia, isExternalMedia } from "@/lib/api/media";
import { fetchPublic } from "@/lib/api/public-client";
import type { FederationPersonnelPublic } from "@/lib/api/types";
import { AboutPageJsonLd, BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";

const KEY = "board-members";

/** `GET /federation-personnel/public` returns Active personnel only, in a
 *  public-safe shape that structurally omits `internalContact`. */
const loadMembers = async (): Promise<FederationPersonnelPublic[]> => {
  const members = await fetchPublic<FederationPersonnelPublic[]>("/federation-personnel/public");
  return Array.isArray(members) ? members : [];
};

/**
 * Board members, on `@uaeaf/brand-ui`.
 *
 * The hero (the record's photograph where it has one, the ink ground where it
 * has none), then the board's size on the green identity ground (the page's
 * own register is green, ADR-0060 D1), then the members as hover-bordered
 * cards. A portrait is ringed only when the record's photo resolves: an empty
 * ring would be a placeholder standing in for a person, and the system has no
 * illustration style to fill it with (Chapter 27 §31).
 *
 * No search field: the page has no approved copy for a search that matches
 * nothing, and an empty state that cannot name its cause is the defect
 * `EmptyState` exists to prevent.
 */
export const BoardMembersScreen = async ({ locale }: { locale: AppLocale }) => {
  const [{ page, title, subtitle, heroImage }, members, tPages, tNav, tSections, tPreparing] = await Promise.all([
    loadStaticPage(KEY, locale),
    loadMembers(),
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Sections" }),
    getTranslations({ locale, namespace: "Preparing" }),
  ]);
  const portraits = await fetchPublicMedia(members.map((member) => member.photoId));

  const trail = breadcrumbTrail(page, (key) => tPages(key), (key) => tNav(key));
  // ADR-0072 D7: an `/about` page emits its trail to `BreadcrumbJsonLd` and
  // draws none. Drawn, this one also announced two current pages — the kit marks
  // every step without an `href` as the current one, and "About" has no landing
  // page of its own (IA §8.1).
  const breadcrumb = isInstitutional(page.route) ? undefined : visibleTrail(trail, locale);
  // Pinned to Latin digits (Chapter 19 §5): `ar` alone reaches that only by
  // the locale's default, not by a decision.
  const count = new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(members.length);

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

      {members.length === 0 ? (
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
                {members.map((member) => {
                  const portrait = member.photoId ? portraits.get(member.photoId) : undefined;
                  const bio = text(member.shortBio, locale);

                  return (
                    <li key={member.id}>
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
                          <h3 className="text-h4">{member.fullName[locale]}</h3>
                          {bio ? (
                            <p className="text-body-sm text-[color:var(--surface-text-muted)]">{bio}</p>
                          ) : null}
                          {member.publicContact?.email ? (
                            <a
                              href={`mailto:${member.publicContact.email}`}
                              dir="ltr"
                              className="mt-auto inline-flex min-h-11 items-center self-start text-body-sm text-[color:var(--color-text-link)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
                            >
                              {member.publicContact.email}
                            </a>
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
