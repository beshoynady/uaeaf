import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { EditorialScreenNotice } from "@/components/admin/editorial-editor/editorial-screen-notice";
import { VisionMissionEditor } from "@/components/admin/vision-mission/editor";
import { loadEditorialScreen } from "@/lib/admin/editorial-screen";
import type { VisionMissionResponse } from "@/lib/admin/vision-mission";
import { resolveLocale } from "@/i18n/params";

/**
 * Vision & Mission (ADR-0070): opened, refused and resolved to one record by
 * the shared editorial loader, as every editorial screen is.
 */
const VisionMissionAdminPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("VisionMission");
  const screen = await loadEditorialScreen<VisionMissionResponse>("visionMissionPage", locale, searchParams);
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
    visionText: t("blockerField.visionText"),
    missionText: t("blockerField.missionText"),
  };

  return (
    <>
      {header}
      <VisionMissionEditor
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

export default VisionMissionAdminPage;
