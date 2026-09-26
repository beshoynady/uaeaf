import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { BrandGround } from "@/components/ui/brand-ground";
import { EditorialScreenNotice } from "@/components/admin/editorial-editor/editorial-screen-notice";
import { VisionMissionEditor } from "@/components/admin/vision-mission/editor";
import { loadEditorialScreen } from "@/lib/admin/editorial-screen";
import { readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
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
      <BrandGround>
        {header}
        <EditorialScreenNotice screen={screen} t={t} common={common} />
      </BrandGround>
    );
  }

  const fieldLabels = {
    heroImageId: t("blockerField.heroImageId"),
    visionText: t("blockerField.visionText"),
    missionText: t("blockerField.missionText"),
  };

  // The publish grant decides whether the activation bar offers a control or
  // only states the page's condition: editing the page and deciding when the
  // public sees it are different jobs (ADR-0102 §D2).
  const grants = await readGrants(locale);

  // No `PageHeader` on this branch: the editor's own shell draws the header
  // (ADR-0102 §D1), and two headers would be two `h1`s on one screen.
  return (
    <BrandGround>
      <VisionMissionEditor
        canPublish={hasPermission(grants, "visionMissionPage", "Publish")}
        record={screen.record}
        images={screen.images}
        canEdit={screen.canEdit}
        canReadMedia={screen.canReadMedia}
        locale={locale}
        editorial={screen.editorial}
        fieldLabels={fieldLabels}
      />
    </BrandGround>
  );
};

export default VisionMissionAdminPage;
