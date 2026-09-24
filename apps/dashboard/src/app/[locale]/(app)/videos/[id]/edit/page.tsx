import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { EmptyState } from "@/components/ui/empty-state";
import { VideoForm } from "@/components/admin/videos/video-form";
import { getAllAssociationOptions } from "@/lib/admin/videos/association-options";
import { loadVideoEditor } from "@/lib/admin/videos/editor-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Changing one video.
 *
 * Four outcomes, kept apart: refused, unreachable, gone, and the form. A 404
 * and a 403 lead a reader to two different places — one to an administrator,
 * one to the list — and collapsing them sends someone hunting for a permission
 * they already hold.
 */
const EditVideoPage = async ({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) => {
  const { id } = await params;
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Videos");
  const common = await getTranslations("Common");
  const screen = await loadVideoEditor(locale, id);

  const header = (
    <PageHeader
      title={t("editVideoTitle")}
      breadcrumb={[{ label: t("breadcrumbContent") }, { label: t("breadcrumbVideos"), href: `/${locale}/videos` }]}
    />
  );

  if (screen.status === "notFound") {
    return (
      <>
        {header}
        <EmptyState icon="inbox" title={t("notFoundTitle")} body={t("notFoundBody")} />
      </>
    );
  }

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
        record={screen.data.record}
        thumbnailUrl={screen.data.thumbnailUrl}
        canPublish={screen.data.canPublish}
        canDelete={screen.data.canDelete}
        associationOptions={await getAllAssociationOptions()}
        locale={locale}
      />
    </>
  );
};

export default EditVideoPage;
