import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { LiveForm } from "@/components/admin/videos/live-form";
import { getAllAssociationOptions } from "@/lib/admin/videos/association-options";
import { loadLiveEditor } from "@/lib/admin/videos/editor-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Starting a broadcast.
 *
 * `?from=<id>` fills the form from a broadcast that has finished — the path
 * out of the "this one ran past its time" screen, for the case it was written
 * for: a championship that ran long, and an editor who wants to carry on
 * showing it. The details travel by id rather than in the address, because a
 * bilingual title and a venue in a query string is a URL nobody can read.
 */
const NewLivePage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const { from } = await searchParams;
  // A repeated parameter is a hand-edited address, not a request to read two
  // broadcasts. The first one is the answer.
  const copyFrom = Array.isArray(from) ? (from[0] ?? null) : (from ?? null);

  const t = await getTranslations("Videos");
  const common = await getTranslations("Common");
  const screen = await loadLiveEditor(locale, null, copyFrom);

  const header = (
    <PageHeader
      title={t("newLiveTitle")}
      description={t("goLiveIntro")}
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
      <LiveForm
        record={null}
        template={screen.data.template}
        active={screen.data.active}
        thumbnailUrl={screen.data.thumbnailUrl}
        canEnd={screen.data.canEnd}
        associationOptions={await getAllAssociationOptions()}
        locale={locale}
      />
    </>
  );
};

export default NewLivePage;
