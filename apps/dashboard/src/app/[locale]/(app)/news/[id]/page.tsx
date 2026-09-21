import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { ArticleEditor } from "@/components/admin/news/article-editor";
import { loadArticleEditor } from "@/lib/admin/newsroom-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * One article: its text, its review, its history and its publication state.
 *
 * The three static siblings — `new`, `review`, `policies` — are resolved
 * before this dynamic segment by Next itself, so none of them can be read as
 * an article identifier.
 *
 * Save, submit for review and publish are all on this screen and none is
 * implemented by it: the shell owns the save and the status panel draws
 * exactly the actions the server said this reader may take.
 */
const ArticlePage = async ({ params }: { params: Promise<{ locale: string; id: string }> }) => {
  const { id } = await params;
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Newsroom");
  const common = await getTranslations("Common");
  const screen = await loadArticleEditor(locale, id);

  if (screen.status === "notFound") {
    // A permitted read of an address that names nothing. The 404 is the truth
    // about the URL; an access-denied page here would send an editor looking
    // for a permission they already hold.
    notFound();
  }

  const header = <PageHeader title={t("editorTitle")} description={t("editorDescription")} />;

  if (screen.status !== "ready") {
    return (
      <>
        {header}
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </>
    );
  }

  const fieldLabels = {
    title: t("fieldTitle"),
    slug: t("fieldSlug"),
    body: t("fieldBody"),
    authorDisplayName: t("fieldAuthor"),
    coverMediaId: t("fieldCover"),
  };

  return (
    <>
      {header}
      <ArticleEditor
        record={screen.data.record}
        takenSlugs={screen.data.takenSlugs}
        images={screen.data.images}
        canEdit={screen.data.canEdit}
        canReadMedia={screen.data.canReadMedia}
        locale={locale}
        editorial={screen.data.editorial}
        fieldLabels={fieldLabels}
      />
    </>
  );
};

export default ArticlePage;
