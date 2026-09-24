import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { VideoForm } from "@/components/admin/videos/video-form";
import { getAllAssociationOptions } from "@/lib/admin/videos/association-options";
import { loadVideoEditor } from "@/lib/admin/videos/editor-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Adding a video.
 *
 * A static segment beside `[id]`, so `/videos/new` is this screen and never a
 * video whose identifier happens to be the word. Next resolves the literal
 * first; the pairing is deliberate, not incidental.
 *
 * A page rather than the drawer it replaces: the form asks six questions, one
 * of them is a preview of what a visitor will see, and an overlay that covers
 * the list it is adding to made both of those cramped. It is also now an
 * address — an editor can be sent to it, and can come back to it.
 */
const NewVideoPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Videos");
  const common = await getTranslations("Common");
  const screen = await loadVideoEditor(locale, null);

  const header = (
    <PageHeader
      title={t("newVideoTitle")}
      description={t("linkCardHint")}
      breadcrumb={[{ label: t("breadcrumbContent") }, { label: t("breadcrumbVideos"), href: `/${locale}/videos` }]}
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
      <VideoForm
        record={null}
        thumbnailUrl={screen.data.thumbnailUrl}
        canPublish={screen.data.canPublish}
        canDelete={screen.data.canDelete}
        associationOptions={await getAllAssociationOptions()}
        locale={locale}
      />
    </>
  );
};

export default NewVideoPage;
