import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { EmptyState } from "@/components/ui/empty-state";
import { SeasonForm } from "@/components/admin/seasons/season-form";
import { seasonNameOf } from "@/lib/admin/seasons/list-filters";
import { loadSeasonEditor } from "@/lib/admin/seasons/editor-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Changing one season (dash-02).
 *
 * Four outcomes, kept apart: refused, unreachable, gone, and the form. A 404
 * and a 403 lead a reader to two different places.
 */
const EditSeasonPage = async ({ params }: { params: Promise<{ locale: string; id: string }> }) => {
  const { id } = await params;
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Seasons");
  const common = await getTranslations("Common");
  // The sidebar group's own name, so the trail and the menu cannot disagree.
  const nav = await getTranslations("Nav");
  const screen = await loadSeasonEditor(locale, id);

  const record = screen.status === "ready" ? screen.data.record : null;
  const header = (
    <PageHeader
      title={record ? t("editSeasonTitle", { name: seasonNameOf(record, locale) }) : t("editSeasonFallbackTitle")}
      breadcrumb={[{ label: nav("eventsSeasons") }, { label: t("breadcrumbSeasons"), href: `/${locale}/seasons` }]}
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

  if (screen.status !== "ready" || record === null) {
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

  const { images, documents, sponsors, permissions, publishMode } = screen.data;
  return (
    <>
      {header}
      <SeasonForm
        record={record}
        images={images}
        documents={documents}
        sponsors={sponsors}
        permissions={permissions}
        publishMode={publishMode}
        locale={locale}
        now={new Date().toISOString()}
      />
    </>
  );
};

export default EditSeasonPage;
