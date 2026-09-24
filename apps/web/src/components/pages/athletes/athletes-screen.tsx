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

import { breadcrumbTrail, loadStaticPage } from "@/components/pages/static-page-screen";
import { CONTAINER } from "@/components/ui/section";
import { fetchPublic } from "@/lib/api/public-client";
import type { AthletePublic, Paginated } from "@/lib/api/types";
import { BreadcrumbJsonLd, CollectionPageJsonLd } from "@/lib/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";

const KEY = "athletes";

/**
 * `GET /athletes/public` — a paginated, public-safe list.
 *
 * The response deliberately omits `dateOfBirth` upstream (ADR-0028 / Federal
 * Law 26/2025 on minors' data); it is absent from the type as well as from the
 * render. `nationalityId` and `disciplineIds` are unresolved references with no
 * public read behind them, which is also why there are no discipline filter
 * chips: a chip labelled with an ObjectId is worse than no chip.
 */
const loadAthletes = async (): Promise<AthletePublic[]> => {
  const response = await fetchPublic<Paginated<AthletePublic>>("/athletes/public");
  return Array.isArray(response?.items) ? response.items : [];
};

/**
 * Athletes, on `@uaeaf/brand-ui`: ink hero, the registered count on the green
 * identity ground, then the directory as hover-bordered cards. No portrait
 * ring, because the public athlete record carries no photo field.
 */
export const AthletesScreen = async ({ locale }: { locale: AppLocale }) => {
  const [{ page, title, subtitle }, athletes, tPages, tNav, tSections, tPreparing] = await Promise.all([
    loadStaticPage(KEY, locale),
    loadAthletes(),
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Sections" }),
    getTranslations({ locale, namespace: "Preparing" }),
  ]);

  const trail = breadcrumbTrail(page, (key) => tPages(key), (key) => tNav(key));
  // IA §8.5 makes a trail mandatory only from depth 2; this top-level page
  // has none of its own, so the hero shows home and the page itself.
  const breadcrumb: BreadcrumbItem[] =
    trail.length > 0
      ? trail.map((crumb, index) => ({
          label: crumb.name,
          href:
            index === trail.length - 1 || crumb.route === null
              ? undefined
              : `/${locale}${crumb.route === "/" ? "" : crumb.route}`,
        }))
      : [{ label: tNav("home"), href: `/${locale}` }, { label: title }];
  // Latin digits, pinned (Chapter 19 §5).
  const count = new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(athletes.length);

  return (
    <>
      <CollectionPageJsonLd
        locale={locale}
        route={page.route}
        name={title}
        description={subtitle ?? title}
        items={athletes.map((athlete) => athlete.name[locale])}
      />
      {trail.length > 0 ? (
        <BreadcrumbJsonLd
          locale={locale}
          trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
        />
      ) : null}

      <PageHero
        title={title}
        description={subtitle ?? undefined}
        breadcrumb={breadcrumb}
        breadcrumbLabel={tPages("breadcrumbLabel")}
      />

      {athletes.length === 0 ? (
        <Surface kind="canvas" className="py-[var(--space-16)]">
          <div className={CONTAINER}>
            <EmptyState title={tPreparing("status")} />
          </div>
        </Surface>
      ) : (
        <>
          <Surface kind="brand-green" className="py-[var(--space-12)]">
            <div className={CONTAINER}>
              <StatHighlight value={count} label={tSections("registeredAthletes")} />
            </div>
          </Surface>

          <Surface kind="canvas" className="py-[var(--space-16)]">
            <div className={CONTAINER}>
              <SectionHeading title={tSections("registeredAthletes")} />
              <ul className="grid gap-[var(--space-6)] md:grid-cols-2 lg:grid-cols-3">
                {athletes.map((athlete) => (
                  <li key={athlete.id}>
                    <BrandBorder variant="hover" className="h-full">
                      <Surface
                        kind="raised"
                        as="article"
                        className="flex h-full flex-col gap-[var(--space-2)] p-[var(--space-6)]"
                      >
                        <h3 className="text-h4">{athlete.name[locale]}</h3>
                        {athlete.federationName ? (
                          <p className="text-body-sm text-[color:var(--surface-text-muted)]">
                            {athlete.federationName[locale]}
                          </p>
                        ) : null}
                      </Surface>
                    </BrandBorder>
                  </li>
                ))}
              </ul>
            </div>
          </Surface>
        </>
      )}
    </>
  );
};
