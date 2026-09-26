import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { BrandGround } from "@/components/ui/brand-ground";
import { EditorialScreenNotice } from "@/components/admin/editorial-editor/editorial-screen-notice";
import { StrategicPlanEditor } from "@/components/admin/strategic-plan/editor";
import { loadEditorialScreen } from "@/lib/admin/editorial-screen";
import { readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
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
      <BrandGround>
        {header}
        <EditorialScreenNotice screen={screen} t={t} common={common} />
      </BrandGround>
    );
  }

  const fieldLabels = {
    heroImageId: t("blockerField.heroImageId"),
    introText: t("blockerField.introText"),
  };

  // The publish grant decides whether the activation bar offers a control or
  // only states the page's condition: editing the page and deciding when the
  // public sees it are different jobs (ADR-0102 §D2).
  const grants = await readGrants(locale);

  // No `PageHeader` on this branch: the editor's own shell draws the header
  // (ADR-0102 §D1), and two headers would be two `h1`s on one screen.
  return (
    <BrandGround>
      <StrategicPlanEditor
        canPublish={hasPermission(grants, "strategicPlansPage", "Publish")}
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

export default StrategicPlanAdminPage;
