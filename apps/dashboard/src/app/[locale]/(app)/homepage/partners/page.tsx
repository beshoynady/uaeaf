import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrganizationsEditor } from "@/components/admin/sponsor-relations/organizations-editor";
import { RelationAccessDenied, RelationLoadFailed, holdsAll } from "@/components/admin/sponsor-relations/relation-page-states";
import { resolveLocale } from "@/i18n/params";
import { toMediaOptions } from "@/lib/admin/media-options";
import { loadOrganizations } from "@/lib/admin/sponsor-relations/load";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { HOMEPAGE_PARTNERS_GRANTS } from "@/lib/navigation";

/**
 * The homepage's partners (ADR-0077 D3, ADR-0085): the records, their order and
 * whether each is shown, saved at once.
 *
 * Opened only with every grant one Save can use (`HOMEPAGE_PARTNERS_GRANTS`, the
 * list its navigation link checks too). The library is optional: without
 * `mediaAssets:Read` the logo field says why it cannot list pictures.
 */
const HomepagePartnersPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("SponsorRelations");
  const header = { title: t("partners.title"), description: t("partners.description") };
  const grants = await readGrants(locale);
  if (!holdsAll(grants, HOMEPAGE_PARTNERS_GRANTS)) return <RelationAccessDenied {...header} />;

  const [load, media] = await Promise.all([
    loadOrganizations("partners", (path) => fetchAsUser<unknown>(path, locale)),
    fetchAsUser<unknown[]>("/media-assets", locale).catch(() => null),
  ]);
  if (load.state !== "ready") return <RelationLoadFailed {...header} />;

  return <OrganizationsEditor kind="partners" initial={load.draft} images={toMediaOptions(media)} canReadMedia={media !== null} />;
};

export default HomepagePartnersPage;
