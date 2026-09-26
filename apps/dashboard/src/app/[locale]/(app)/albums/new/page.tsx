import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { AlbumForm } from "@/components/admin/albums/album-form";
import { loadAlbumEditor } from "@/lib/admin/albums/editor-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Adding an album.
 *
 * A static segment beside `[id]`, so `/albums/new` is this screen and never an
 * album whose id happens to be the word — Next resolves the literal first.
 *
 * Photos are not added here: an album with no id has nowhere to put them. The
 * first save opens the album's own edit page, where the photo section is.
 */
const NewAlbumPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Albums");
  const common = await getTranslations("Common");
  const screen = await loadAlbumEditor(locale, null);

  const header = (
    <PageHeader
      title={t("newAlbumTitle")}
      description={t("newAlbumHint")}
      breadcrumb={[{ label: t("breadcrumbContent") }, { label: t("breadcrumbAlbums"), href: `/${locale}/albums` }]}
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
      <AlbumForm record={null} athletes={[]} clubs={[]} permissions={screen.data.permissions} locale={locale} />
    </>
  );
};

export default NewAlbumPage;
