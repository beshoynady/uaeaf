import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { GallerySectionBoard } from "@/components/admin/homepage-albums/section-board";
import { loadGallerySectionScreen } from "@/lib/admin/albums/section-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * The homepage's photo-gallery section (`PHOTO_GALLERY`): whether it is shown,
 * what it says, and which albums it draws.
 *
 * One more route under Homepage, as the video section is — the dashboard
 * registers one route per section, and the rail inside `/homepage/*` is how an
 * editor moves between them.
 */
const HomepageAlbumsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Albums");
  const common = await getTranslations("Common");
  const screen = await loadGallerySectionScreen(locale);

  if (screen.status !== "ready") {
    return (
      <>
        <PageHeader title={t("gallerySectionTitle")} description={t("gallerySectionSubtitle")} />
        <AccessDenied
          title={common("accessDeniedTitle")}
          message={screen.status === "noSection" ? t("gallerySectionMissing") : t("accessDenied")}
        />
      </>
    );
  }

  // The board draws the header: Save sits beside the title, and only the
  // client component knows whether anything has changed.
  return (
    <GallerySectionBoard
      sectionId={screen.data.sectionId}
      initial={screen.data.draft}
      albums={screen.data.albums}
      albumsReadable={screen.data.albumsReadable}
      locale={locale}
    />
  );
};

export default HomepageAlbumsPage;
