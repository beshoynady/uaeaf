import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { SeasonForm } from "@/components/admin/seasons/season-form";
import { loadSeasonEditor } from "@/lib/admin/seasons/editor-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Adding a season (dash-02, empty).
 *
 * A static segment beside `[id]`, so `/seasons/new` is this screen and never a
 * season whose id happens to be the word — Next resolves the literal first.
 */
const NewSeasonPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Seasons");
  const common = await getTranslations("Common");
  // The sidebar group's own name, so the trail and the menu cannot disagree.
  const nav = await getTranslations("Nav");
  const screen = await loadSeasonEditor(locale, null);

  const header = (
    <PageHeader
      title={t("newSeasonTitle")}
      breadcrumb={[{ label: nav("eventsSeasons") }, { label: t("breadcrumbSeasons"), href: `/${locale}/seasons` }]}
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

  const { images, documents, sponsors, permissions, publishMode } = screen.data;
  return (
    <>
      {header}
      <SeasonForm
        record={null}
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

export default NewSeasonPage;
