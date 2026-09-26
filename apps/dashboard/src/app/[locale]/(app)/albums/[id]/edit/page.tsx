import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { EmptyState } from "@/components/ui/empty-state";
import { AlbumForm } from "@/components/admin/albums/album-form";
import { AlbumPhotos } from "@/components/admin/albums/album-photos";
import { loadAlbumEditor } from "@/lib/admin/albums/editor-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Changing one album: its fields, and below them its photos.
 *
 * Four outcomes, kept apart: refused, unreachable, gone, and the form. A 404
 * and a 403 lead a reader to two different places.
 */
const EditAlbumPage = async ({ params }: { params: Promise<{ locale: string; id: string }> }) => {
  const { id } = await params;
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Albums");
  const common = await getTranslations("Common");
  const screen = await loadAlbumEditor(locale, id);

  const header = (
    <PageHeader
      title={t("editAlbumTitle")}
      breadcrumb={[{ label: t("breadcrumbContent") }, { label: t("breadcrumbAlbums"), href: `/${locale}/albums` }]}
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

  if (screen.status !== "ready" || screen.data.record === null) {
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

  const { record, photos, athletes, clubs, permissions } = screen.data;

  return (
    <>
      {header}
      <AlbumForm
        record={record}
        athletes={athletes}
        clubs={clubs}
        permissions={permissions}
        locale={locale}
        photos={
          <AlbumPhotos
            album={record}
            photos={photos}
            canUpdate={permissions.canUpdate}
            canUpload={permissions.canUpload && permissions.canUpdate}
            locale={locale}
          />
        }
      />
    </>
  );
};

export default EditAlbumPage;
