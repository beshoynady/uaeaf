import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { AlbumsBoard } from "@/components/admin/albums/albums-board";
import { AddAlbumLink } from "@/components/admin/albums/album-links";
import { loadAlbumsScreen } from "@/lib/admin/albums/albums-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * The photo albums: every album of the media centre, its state, and the one
 * the public gallery leads with.
 *
 * Read on the server so a reader without `albums:Read` never receives the list,
 * and so each write is offered from the same grants the API will check.
 */
const AlbumsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Albums");
  const common = await getTranslations("Common");
  const screen = await loadAlbumsScreen(locale);

  const header = (
    <PageHeader
      title={t("title")}
      description={t("subtitle")}
      breadcrumb={[{ label: t("breadcrumbContent") }, { label: t("breadcrumbAlbums") }]}
      actions={screen.status === "ready" && screen.data.canCreate ? <AddAlbumLink /> : undefined}
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
      {/* TODO(isActive): wire when pages.isActive lands */}
      <AlbumsBoard
        albums={screen.data.albums}
        covers={screen.data.covers}
        canCreate={screen.data.canCreate}
        canUpdate={screen.data.canUpdate}
        canDelete={screen.data.canDelete}
        canPublish={screen.data.canPublish}
        locale={locale}
      />
    </>
  );
};

export default AlbumsPage;
