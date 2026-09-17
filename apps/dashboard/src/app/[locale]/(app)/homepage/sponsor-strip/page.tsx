import { getTranslations, setRequestLocale } from "next-intl/server";
import { RelationAccessDenied, RelationLoadFailed, holdsAll } from "@/components/admin/sponsor-relations/relation-page-states";
import { StripEditor } from "@/components/admin/sponsor-relations/strip-editor";
import { resolveLocale } from "@/i18n/params";
import { loadStrip } from "@/lib/admin/sponsor-relations/load";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { HOMEPAGE_SPONSOR_STRIP_GRANTS } from "@/lib/navigation";

/**
 * The global sponsor strip's settings (ADR-0077 D5, ADR-0085 D7), with a preview
 * that reads the sponsors and the banner preference to answer as the site does.
 *
 * Opened only with every grant it uses (`HOMEPAGE_SPONSOR_STRIP_GRANTS`).
 */
const HomepageSponsorStripPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("SponsorRelations");
  const header = { title: t("strip.title"), description: t("strip.description") };
  const grants = await readGrants(locale);
  if (!holdsAll(grants, HOMEPAGE_SPONSOR_STRIP_GRANTS)) return <RelationAccessDenied {...header} />;

  const load = await loadStrip((path) => fetchAsUser<unknown>(path, locale));
  if (load.state !== "ready") return <RelationLoadFailed {...header} />;

  return (
    <StripEditor
      initial={load.initial}
      sponsors={load.sponsors}
      sponsorships={load.sponsorships}
      bannerSponsorshipId={load.bannerSponsorshipId}
      now={new Date().toISOString()}
    />
  );
};

export default HomepageSponsorStripPage;
