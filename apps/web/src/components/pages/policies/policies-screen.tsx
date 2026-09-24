import { getTranslations } from "next-intl/server";
import { Button, CtaBand, LinkTile, PageHero, Surface } from "@uaeaf/brand-ui";

import { loadGovernanceDocuments, type DocumentGroup } from "@/lib/pages/governance-documents";
import type { AppLocale } from "@/i18n/routing";

import { PoliciesBrowser, type PoliciesCopy } from "./policies-browser";
import "./policies.css";

const GROUPS: readonly DocumentGroup[] = ["regulations", "policies", "forms", "guides"];

/**
 * Regulations & Policies — the first page assembled entirely from
 * `@uaeaf/brand-ui` (ADR-0098 D7).
 *
 * The composition, in order: an ink hero carrying the breadcrumb, the heading
 * and the search; a filter card riding the hero's edge; a `DocumentCard` grid
 * per category; a green "Governance and strategy" section of link tiles; and a
 * red call to action.
 *
 * **The call to action is a card inset into the canvas, not a full-bleed band**
 * (ADR-0098 §8.6). Full-bleed it would land directly under the green section,
 * and the two grounds measure 1.15:1 from each other — they would read as one
 * band with no boundary anywhere in it. The canvas gutter around the card is
 * the separator, and it is a boundary a reader can see rather than the hairline
 * the mandatory separator token provides. Recorded as an approved deviation
 * from the reference design.
 *
 * Server Component. Only the browser below it holds state.
 */
export const PoliciesScreen = async ({ locale }: { locale: AppLocale }) => {
  const [t, tNav, documents] = await Promise.all([
    getTranslations({ locale, namespace: "Policies" }),
    getTranslations({ locale, namespace: "Nav" }),
    loadGovernanceDocuments(),
  ]);

  const copy: PoliciesCopy = {
    searchLabel: t("searchLabel"),
    searchPlaceholder: t("searchPlaceholder"),
    clearSearch: t("clearSearch"),
    allFilter: t("allFilter"),
    countUnit: t("countUnit"),
    // `t.raw` keeps the placeholders: these three are filled in the client,
    // because a function cannot cross that boundary.
    showingTemplate: t.raw("showing"),
    groups: Object.fromEntries(
      GROUPS.map((group) => [
        group,
        { title: t(`groups.${group}.title`), description: t(`groups.${group}.description`) },
      ]),
    ) as PoliciesCopy["groups"],
    emptySearchTemplate: t.raw("emptySearchTitle"),
    emptyGroupTitle: t("emptyGroupTitle"),
    emptyDescription: t("emptyDescription"),
    showAll: t("showAll"),
    view: t("view"),
    downloadTemplate: t.raw("download"),
    dateLabel: t("dateLabel"),
    sizeLabel: t("sizeLabel"),
    featuredBadge: t("featuredBadge"),
    seedNotice: t("seedNotice"),
    types: {
      Regulation: t("types.Regulation"),
      Policy: t("types.Policy"),
      Form: t("types.Form"),
      Guide: t("types.Guide"),
      Decision: t("types.Decision"),
    },
  };

  return (
    <div className="policies">
      <PageHero
        title={t("title")}
        // The old page carried a separate "Governance and organisation"
        // section whose text said what this sentence says. One statement, in
        // the place a reader meets first.
        description={t("intro")}
        breadcrumb={[
          { label: tNav("home"), href: `/${locale}` },
          { label: tNav("aboutOverview"), href: `/${locale}/about` },
          { label: t("title") },
        ]}
        breadcrumbLabel={t("breadcrumbLabel")}
      />

      <PoliciesBrowser documents={documents} locale={locale} copy={copy} />

      <Surface kind="brand-green" className="policies-governance">
        <div className="policies-governance__body">
          <h2 className="policies-governance__title">{t("governanceTitle")}</h2>
          <p className="policies-governance__description">{t("governanceDescription")}</p>
          <div className="policies-governance__tiles">
            <LinkTile
              title={t("tiles.vision.title")}
              description={t("tiles.vision.description")}
              href={`/${locale}/about/governance/vision-mission`}
            />
            <LinkTile
              title={t("tiles.strategy.title")}
              description={t("tiles.strategy.description")}
              href={`/${locale}/about/governance/strategic-plan`}
            />
          </div>
        </div>
      </Surface>

      <CtaBand
        tone="red"
        layout="card"
        title={t("ctaTitle")}
        description={t("ctaDescription")}
        action={
          <Button variant="primary" href={`/${locale}/contact`}>
            {t("ctaAction")}
          </Button>
        }
      />
    </div>
  );
};
