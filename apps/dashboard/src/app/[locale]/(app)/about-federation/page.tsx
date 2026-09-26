import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { BrandGround } from "@/components/ui/brand-ground";
import { EditorialScreenNotice } from "@/components/admin/editorial-editor/editorial-screen-notice";
import { AboutFederationEditor, type AboutSources } from "@/components/admin/about-federation/editor";
import { loadEditorialScreen } from "@/lib/admin/editorial-screen";
import type { AboutFederationResponse } from "@/lib/admin/about-federation";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { resolveLocale } from "@/i18n/params";

/**
 * About the Federation (ADR-0101): opened, refused and resolved to one record
 * by the shared editorial loader, as every editorial screen is.
 *
 * Two things this screen reads that the loader does not:
 *
 * - **the publish grant**, which decides whether the activation bar offers a
 *   control or only states the page's condition. Editing the page and deciding
 *   when the public sees it are different jobs;
 * - **the source counts**, which are what the two automatic sections would
 *   print right now. Refused or unavailable, they become zeros: the badges
 *   then understate rather than the screen failing to open.
 */
const AboutFederationAdminPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("AboutFederation");
  const screen = await loadEditorialScreen<AboutFederationResponse>("aboutFederationPage", locale, searchParams);
  const header = <PageHeader title={t("title")} description={t("description")} />;

  if (screen.status !== "ready") {
    const common = await getTranslations("Common");
    return (
      <BrandGround>
        {header}
        <EditorialScreenNotice screen={screen} t={t} common={common} />
      </BrandGround>
    );
  }

  const [grants, sources] = await Promise.all([
    readGrants(locale),
    fetchAsUser<AboutSources>("/about-federation-page/sources", locale),
  ]);

  // No `PageHeader` on this branch: the editor's own shell draws the header
  // (ADR-0102 §D1), and two headers would be two `h1`s on one screen.
  return (
    <BrandGround>
      <AboutFederationEditor
        record={screen.record}
        sources={sources ?? { leaders: 0, stats: 0, figures: [] }}
        images={screen.images}
        canEdit={screen.canEdit}
        canPublish={hasPermission(grants, "aboutFederationPage", "Publish")}
        canReadMedia={screen.canReadMedia}
        locale={locale}
        editorial={screen.editorial}
      />
    </BrandGround>
  );
};

export default AboutFederationAdminPage;
