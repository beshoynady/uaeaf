import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { VideoSectionBoard } from "@/components/admin/homepage-video/section-board";
import { getAllAssociationOptions } from "@/lib/admin/videos/association-options";
import { loadVideoSectionScreen } from "@/lib/admin/videos/section-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * The homepage's video section (ADR-0085's pattern): what it says, which video
 * it leads with, and what the carousel beneath it draws.
 *
 * A seventh entry under Homepage rather than a new pattern — the dashboard
 * registers one route per section, and there is no sections index page to hang
 * a panel inside (ت٦).
 */
const HomepageVideoPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Videos");
  const common = await getTranslations("Common");
  const screen = await loadVideoSectionScreen(locale);

  if (screen.status !== "ready") {
    return (
      <>
        <PageHeader title={t("sectionTitle")} description={t("sectionSubtitle")} />
        <AccessDenied
          title={common("accessDeniedTitle")}
          message={screen.status === "noSection" ? t("sectionMissing") : t("accessDenied")}
        />
      </>
    );
  }

  // The board draws the header: the approved design puts Save beside the
  // title, and only the client component knows whether anything has changed.
  return (
    <VideoSectionBoard
      sectionId={screen.data.sectionId}
      initial={screen.data.draft}
      associationOptions={await getAllAssociationOptions()}
      videos={screen.data.videos}
      videoOptions={screen.data.videos.map((video) => ({
        id: video.id,
        label: video.title[locale] || video.title.ar || video.title.en,
      }))}
      locale={locale}
    />
  );
};

export default HomepageVideoPage;
