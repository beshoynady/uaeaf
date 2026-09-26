import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import type { LocalizedText } from "@/lib/api/types";
import { hasPermission } from "@/lib/auth/permissions";
import { STATIC_PAGES } from "@/lib/admin/static-pages";
import { PageHeader } from "@/components/ui/page-header";
import { BrandGround } from "@/components/ui/brand-ground";
import { AccessDenied } from "@/components/ui/access-denied";
import { StatTiles, type StatTile } from "@/components/admin/stat-tiles";
import { PageWorkbench, type PageEntry } from "@/components/admin/pages/page-workbench";
import { toMediaOptions } from "@/lib/admin/media-options";
import { resolveLocale } from "@/i18n/params";

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
const SitePagesScreen = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
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
    fetchAsUser<unknown[]>("/media-assets", locale),
    readGrants(locale),
  ]);

  const entries: PageEntry[] = STATIC_PAGES.map((page, index) => ({
    key: page.key,
    record: records[index] ?? null,
    canEdit: hasPermission(grants, page.resourceType, "Update"),
    // Two grants, two jobs: `Update` rewrites the page, `Publish` decides when
    // the public sees it (ADR-0102 §D2). A page's editor is often not its
    // publisher, so the activation bar is resolved separately.
    canPublish: hasPermission(grants, page.resourceType, "Publish"),
  }));

  const editable = entries.filter((entry) => entry.canEdit).length;
  if (editable === 0 && entries.every((entry) => entry.record === null)) {
    // Nothing to read and nothing to write: the only honest thing this
    // screen can say.
    return (
      <BrandGround>
        <PageHeader title={t("title")} description={t("description")} />
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </BrandGround>
    );
  }

  // Shared with every other screen that has an image field: the `_id` → `id`
  // mapping and the "a PDF is not a choice this field can offer" filter are
  // both the kind that get forgotten when each screen writes its own.
  const images = toMediaOptions(media);

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
    <BrandGround>
      <PageHeader title={t("title")} description={t("description")} />
      <StatTiles tiles={tiles} caption={t("tilesCaption")} />
      <PageWorkbench
        entries={entries}
        images={images}
        canReadMedia={media !== null}
        locale={locale}
      />
    </BrandGround>
  );
};

export default SitePagesScreen;
