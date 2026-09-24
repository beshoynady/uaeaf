import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero, Surface } from "@uaeaf/brand-ui";
import { buildPreparingPageMetadata } from "@/components/pages/preparing-page-screen";
import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import { findPreparingPage } from "@/lib/pages/public-pages";

/**
 * `/about`: in preparation (`PREPARING_PAGES`) until its full page replaces
 * this file at the same route.
 *
 * Built from `@uaeaf/brand-ui` (ADR-0098 D7). Institutional recipe, reduced to
 * what the page has: a title and one status line, so there is no body section
 * to colour and no heading to set. The copy is exactly what
 * `PreparingPageScreen` prints — the link's own label and the one
 * `Preparing.status` line — and the metadata is still its (`noindex`).
 */
const KEY = "about";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPreparingPageMetadata(KEY, locale);
};

const AboutPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const page = findPreparingPage(KEY)!;
  const t = await getTranslations({ locale });
  const title = t(page.titleKey);

  return (
    <>
      <PageHero
        title={title}
        breadcrumb={[{ label: t("Nav.home"), href: `/${locale}` }, { label: title }]}
        breadcrumbLabel={t("Pages.breadcrumbLabel")}
      />
      <Surface kind="canvas" mesh>
        <div className={`${CONTAINER} py-12 md:py-16`}>
          <p className="max-w-[68ch] text-body-lg text-[color:var(--surface-text-muted)]">{t("Preparing.status")}</p>
        </div>
      </Surface>
    </>
  );
};

export default AboutPage;
