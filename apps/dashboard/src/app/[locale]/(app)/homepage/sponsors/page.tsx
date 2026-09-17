import { getTranslations, setRequestLocale } from "next-intl/server";
import { RelationAccessDenied, RelationLoadFailed, holdsAll } from "@/components/admin/sponsor-relations/relation-page-states";
import { SponsorsEditor } from "@/components/admin/sponsor-relations/sponsors-editor";
import { resolveLocale } from "@/i18n/params";
import { toMediaOptions } from "@/lib/admin/media-options";
import { loadSponsors } from "@/lib/admin/sponsor-relations/load";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { HOMEPAGE_SPONSORS_GRANTS } from "@/lib/navigation";

/**
 * The homepage's sponsors (ADR-0077 D1–D2, ADR-0085): each sponsor with its
 * sponsorships, the SPONSORS section's banner preference and call to action,
 * and a preview drawn with the site's banner rule.
 *
 * Opened only with every grant one Save can use (`HOMEPAGE_SPONSORS_GRANTS`).
 */
const HomepageSponsorsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("SponsorRelations");
  const header = { title: t("sponsors.title"), description: t("sponsors.description") };
  const grants = await readGrants(locale);
  if (!holdsAll(grants, HOMEPAGE_SPONSORS_GRANTS)) return <RelationAccessDenied {...header} />;

  const [load, media] = await Promise.all([
    loadSponsors((path) => fetchAsUser<unknown>(path, locale)),
    fetchAsUser<unknown[]>("/media-assets", locale).catch(() => null),
  ]);
  if (load.state !== "ready") return <RelationLoadFailed {...header} />;

  return <SponsorsEditor initial={load.draft} images={toMediaOptions(media)} canReadMedia={media !== null} now={new Date().toISOString()} />;
};

export default HomepageSponsorsPage;
