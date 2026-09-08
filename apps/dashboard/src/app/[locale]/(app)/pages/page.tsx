import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import type { LocalizedText } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { STATIC_PAGES } from "@/lib/admin/static-pages";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { StatTiles, type StatTile } from "@/components/admin/stat-tiles";
import { PageWorkbench, type PageEntry } from "@/components/admin/pages/page-workbench";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import { resolveLocale } from "@/i18n/params";

interface MediaAssetResponse {
  _id: string;
  caption: LocalizedText;
  file: { url: string; mimeType: string };
}

/**
 * The site's singleton content pages.
 *
 * Every one of these is a public `GET` upstream — they are page furniture,
 * not workflow-governed content — so the reads never fail on permissions and
 * a `null` here means the page has never been saved, not that it is hidden.
 * What *is* per-user is the write: each page has its own `<resource>:Update`
 * grant, resolved once here and carried into the list so the editor can show
 * content without offering a control the API would refuse.
 *
 * The four workflow-governed governance pages (president's message, about,
 * vision & mission, strategic plans) are deliberately absent: the API
 * exposes no update path for them at all, so a screen would be a form with
 * nowhere to submit. See `static-pages.ts`.
 */
export default async function SitePagesScreen({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("SitePages");
  const common = await getTranslations("Common");

  const [records, media, grants] = await Promise.all([
    Promise.all(
      STATIC_PAGES.map((page) =>
        fetchAsUser<Record<string, unknown> | null>(page.apiPath, locale),
      ),
    ),
    fetchAsUser<MediaAssetResponse[]>("/media-assets", locale),
    readGrants(locale),
  ]);

  const entries: PageEntry[] = STATIC_PAGES.map((page, index) => ({
    key: page.key,
    record: records[index] ?? null,
    canEdit: hasPermission(grants, page.resourceType, "Update"),
  }));

  const editable = entries.filter((entry) => entry.canEdit).length;
  if (editable === 0 && entries.every((entry) => entry.record === null)) {
    // Nothing to read and nothing to write: the only honest thing this
    // screen can say.
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </>
    );
  }

  const images: MediaAssetOption[] = (media ?? [])
    // A header background is an image. A PDF in the same library is not a
    // choice this field can offer.
    .filter((asset) => asset.file?.mimeType?.startsWith("image/"))
    .map((asset) => ({ id: asset._id, caption: asset.caption, url: asset.file.url }));

  const emptyCount = entries.filter((entry) => entry.record === null).length;

  const tiles: StatTile[] = [
    {
      key: "total",
      label: t("tileTotal"),
      value: STATIC_PAGES.length,
      note: t("tileTotalNote"),
    },
    {
      key: "empty",
      label: t("tileEmpty"),
      value: emptyCount,
      note: t("tileEmptyNote"),
      tone: emptyCount > 0 ? "attention" : "neutral",
    },
    {
      key: "readonly",
      label: t("tileReadOnly"),
      value: STATIC_PAGES.length - editable,
      note: t("tileReadOnlyNote"),
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <StatTiles tiles={tiles} caption={t("tilesCaption")} />
      <PageWorkbench
        entries={entries}
        images={images}
        canReadMedia={media !== null}
        locale={locale}
      />
    </>
  );
}
