import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { SeasonsBoard } from "@/components/admin/seasons/seasons-board";
import { AddSeasonLink } from "@/components/admin/seasons/season-links";
import { loadSeasonsScreen } from "@/lib/admin/seasons/seasons-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * The athletic seasons: every season, its state, and the one that is current
 * (dash-01).
 *
 * Read on the server so a reader without `seasons:Read` never receives the
 * list, and so each write is offered from the same grants the API will check.
 */
const SeasonsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Seasons");
  const common = await getTranslations("Common");
  // The sidebar group's own name, so the trail and the menu cannot disagree.
  const nav = await getTranslations("Nav");
  const screen = await loadSeasonsScreen(locale);

  const header = (
    <PageHeader
      title={t("title")}
      breadcrumb={[{ label: nav("eventsSeasons") }, { label: t("breadcrumbSeasons") }]}
      actions={screen.status === "ready" && screen.data.permissions.canCreate ? <AddSeasonLink /> : undefined}
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

  const { seasons, content, permissions } = screen.data;
  return (
    <>
      {header}
      <SeasonsBoard
        seasons={seasons}
        content={content}
        canCreate={permissions.canCreate}
        canUpdate={permissions.canUpdate}
        canDelete={permissions.canDelete}
        locale={locale}
        now={new Date().toISOString()}
      />
    </>
  );
};

export default SeasonsPage;
