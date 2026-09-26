import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { loadPageActivation } from "@/lib/admin/page-activation-state";
import { PageActivationBar } from "@/components/admin/activation/page-activation-bar";
import { AccessDenied } from "@/components/ui/access-denied";
import { VideosBoard } from "@/components/admin/videos/videos-board";
import { AddVideoLink, GoLiveLink } from "@/components/admin/videos/videos-actions";
import { loadVideosScreen } from "@/lib/admin/videos/videos-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * The videos screen: links from the platforms the federation publishes on,
 * and the broadcast currently on the public site.
 *
 * Read on the server so a reader without `videos:Read` never receives the
 * list, and so the write affordances are decided from the same grants the API
 * will check.
 */
const VideosPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Videos");
  const common = await getTranslations("Common");
  const screen = await loadVideosScreen(locale);

  // The public `/media/videos` listing page's own switch — reachable here as
  // well as in `/pages` (owner brief §3). One field, one route.
  const activation = await loadPageActivation("videosPage", locale);

  // The two actions sit on the title's own row, as the design draws them, so
  // they are read with the page's name rather than as the first item of the
  // list below it.
  const header = (
    <PageHeader
      title={t("title")}
      description={t("subtitle")}
      breadcrumb={[{ label: t("breadcrumbContent") }, { label: t("breadcrumbVideos") }]}
      actions={
        screen.status === "ready" && screen.data.canCreate ? (
          <>
            <GoLiveLink />
            <AddVideoLink />
          </>
        ) : undefined
      }
    />
  );

  if (screen.status !== "ready") {
    return (
      <>
        {header}
        <AccessDenied
          title={common("accessDeniedTitle")}
          message={screen.status === "unavailable" ? t("unavailable") : t("accessDenied")}
        />
      </>
    );
  }

  return (
    <>
      {header}

      {activation ? (
        <PageActivationBar
          entity={activation.entity}
          pageName={t("title")}
          recordId={null}
          isActive={activation.isActive}
          canPublish={activation.canPublish}
          saved={activation.saved}
        />
      ) : null}

      <VideosBoard
        videos={screen.data.videos}
        live={screen.data.live}
        thumbnails={screen.data.thumbnails}
        canCreate={screen.data.canCreate}
        canUpdate={screen.data.canUpdate}
        canDelete={screen.data.canDelete}
        locale={locale}
      />
    </>
  );
};

export default VideosPage;
