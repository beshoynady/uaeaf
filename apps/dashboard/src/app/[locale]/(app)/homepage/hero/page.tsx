import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomepageHeroEditor } from "@/components/admin/homepage-hero/homepage-hero-editor";
import { AccessDenied } from "@/components/ui/access-denied";
import { PageHeader } from "@/components/ui/page-header";
import { resolveLocale } from "@/i18n/params";
import { loadHomepageHero } from "@/lib/admin/homepage-hero-load";
import { toMediaOptions } from "@/lib/admin/media-options";
import { hasPermission } from "@/lib/auth/permissions";
import { HOMEPAGE_HERO_GRANTS } from "@/lib/navigation";
import { fetchAsUser, readGrants } from "@/lib/auth/session";

/**
 * The homepage hero: its slides, the next-event bar and the playback, on one
 * screen with a live preview.
 *
 * Opened only with every grant the screen uses (`HOMEPAGE_HERO_GRANTS`, the list
 * its navigation link checks too): a screen whose Save could land half its
 * writes would be worse than no screen.
 * Checked here on the server; the API checks every write again.
 */

/** Where "Open site" goes. Outside production the local site is the honest
 *  default; in production an unset address hides the link. */
const siteUrl = (): string | null =>
  process.env.UAEAF_SITE_URL || (process.env.NODE_ENV === "production" ? null : "http://localhost:3001");

const HomepageHeroPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("HomepageHero");
  const grants = await readGrants(locale);

  if (!HOMEPAGE_HERO_GRANTS.every(({ resourceType, action }) => hasPermission(grants, resourceType, action))) {
    const common = await getTranslations("Common");
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </>
    );
  }

  const [load, media] = await Promise.all([
    loadHomepageHero((path) => fetchAsUser<unknown>(path, locale)),
    fetchAsUser<unknown[]>("/media-assets", locale).catch(() => null),
  ]);

  if (load.state !== "ready") {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <p role="status" className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4 text-body-sm text-[color:var(--color-text-primary)]">
          {t(load.state)}
        </p>
      </>
    );
  }

  return (
    <HomepageHeroEditor
      initial={load.draft}
      images={toMediaOptions(media)}
      canReadMedia={media !== null}
      siteUrl={siteUrl()}
      now={new Date().toISOString()}
    />
  );
};

export default HomepageHeroPage;
