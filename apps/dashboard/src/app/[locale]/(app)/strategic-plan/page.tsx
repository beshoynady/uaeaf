import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { EditorialScreenNotice } from "@/components/admin/editorial-editor/editorial-screen-notice";
import { StrategicPlanEditor } from "@/components/admin/strategic-plan/editor";
import { loadEditorialScreen } from "@/lib/admin/editorial-screen";
import type { StrategicPlanResponse } from "@/lib/admin/strategic-plan";
import { resolveLocale } from "@/i18n/params";

/**
 * Strategic Plan (ADR-0075): opened, refused and resolved to one record by
 * the shared editorial loader, as every editorial screen is.
 */
const StrategicPlanAdminPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("StrategicPlan");
  const screen = await loadEditorialScreen<StrategicPlanResponse>("strategicPlansPage", locale, searchParams);
  const header = <PageHeader title={t("title")} description={t("description")} />;

  if (screen.status !== "ready") {
    const common = await getTranslations("Common");
    return (
      <>
        {header}
        <EditorialScreenNotice screen={screen} t={t} common={common} />
      </>
    );
  }

  const fieldLabels = {
    heroImageId: t("blockerField.heroImageId"),
    introText: t("blockerField.introText"),
  };

  return (
    <>
      {header}
      <StrategicPlanEditor
        record={screen.record}
        images={screen.images}
        canEdit={screen.canEdit}
        canReadMedia={screen.canReadMedia}
        locale={locale}
        editorial={screen.editorial}
        fieldLabels={fieldLabels}
      />
    </>
  );
};

export default StrategicPlanAdminPage;
