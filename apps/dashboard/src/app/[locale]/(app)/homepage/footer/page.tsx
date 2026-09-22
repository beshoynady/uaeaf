import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterEditor } from "@/components/admin/footer/footer-editor";
import { RelationAccessDenied, RelationLoadFailed, holdsAll } from "@/components/admin/sponsor-relations/relation-page-states";
import { resolveLocale } from "@/i18n/params";
import { loadFooter } from "@/lib/admin/footer-settings";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { HOMEPAGE_FOOTER_GRANTS } from "@/lib/navigation";

/**
 * The footer's settings (ADR-0092 D12): its own words, edited here, beside
 * what it shows from the contact page's record.
 *
 * Opened only with every grant it uses (`HOMEPAGE_FOOTER_GRANTS`).
 */
const HomepageFooterPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("FooterSettings");
  const header = { title: t("title"), description: t("description") };
  const grants = await readGrants(locale);
  if (!holdsAll(grants, HOMEPAGE_FOOTER_GRANTS)) return <RelationAccessDenied {...header} />;

  const load = await loadFooter((path) => fetchAsUser<unknown>(path, locale));
  if (load.state !== "ready") return <RelationLoadFailed {...header} />;

  return <FooterEditor initial={load.initial} sourced={load.sourced} />;
};

export default HomepageFooterPage;
