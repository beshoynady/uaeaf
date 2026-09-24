import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveForm } from "@/components/admin/videos/live-form";
import { LiveFinished } from "@/components/admin/videos/live-finished";
import { getAllAssociationOptions } from "@/lib/admin/videos/association-options";
import { loadLiveEditor } from "@/lib/admin/videos/editor-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Correcting the broadcast that is running.
 *
 * -- Five outcomes, and why "finished" is one of them ------------------------
 *
 * The site stops showing a broadcast the moment its stated end time passes,
 * with nobody pressing anything. So this screen can be opened on a record that
 * was live when the editor clicked and is not by the time the page renders —
 * and reporting that as "not found" would send them looking for something
 * nothing deleted. `LiveFinished` says what happened and offers the one action
 * that helps. An id that genuinely names nothing is still missing.
 */
const EditLivePage = async ({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) => {
  const { id } = await params;
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Videos");
  const common = await getTranslations("Common");
  const screen = await loadLiveEditor(locale, id);

  const header = (
    <PageHeader
      title={t("editLiveTitle")}
      breadcrumb={[{ label: t("breadcrumbContent") }, { label: t("breadcrumbVideos"), href: `/${locale}/videos` }]}
    />
  );

  if (screen.status === "finished") {
    return (
      <>
        {header}
        <LiveFinished record={screen.data.record} canStart={screen.data.canStart} locale={locale} />
      </>
    );
  }

  if (screen.status === "notFound") {
    return (
      <>
        {header}
        <EmptyState icon="inbox" title={t("liveNotFoundTitle")} body={t("liveNotFoundBody")} />
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
      <LiveForm
        record={screen.data.record}
        template={null}
        active={null}
        thumbnailUrl={screen.data.thumbnailUrl}
        canEnd={screen.data.canEnd}
        associationOptions={await getAllAssociationOptions()}
        locale={locale}
      />
    </>
  );
};

export default EditLivePage;
