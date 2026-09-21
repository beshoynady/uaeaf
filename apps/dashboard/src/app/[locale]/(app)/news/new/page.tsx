import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { ArticleEditor } from "@/components/admin/news/article-editor";
import { loadArticleEditor } from "@/lib/admin/newsroom-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Writing a new article.
 *
 * A static segment beside `[id]`, so `/news/new` is this screen and never an
 * article whose identifier happens to be the word. Next resolves the literal
 * first; the pairing is deliberate, not incidental.
 *
 * The screen holds no review, no version history and no publication state,
 * because none of them exists until the article does. Creating it lands the
 * author in the editor for the record that now exists, where all three are.
 */
const NewArticlePage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Newsroom");
  const common = await getTranslations("Common");
  const screen = await loadArticleEditor(locale, null);

  const header = <PageHeader title={t("createTitle")} description={t("createDescription")} />;

  if (screen.status !== "ready") {
    return (
      <>
        {header}
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </>
    );
  }

  return (
    <>
      {header}
      <ArticleEditor
        record={null}
        takenSlugs={screen.data.takenSlugs}
        images={screen.data.images}
        canEdit={screen.data.canEdit}
        canReadMedia={screen.data.canReadMedia}
        locale={locale}
      />
    </>
  );
};

export default NewArticlePage;
