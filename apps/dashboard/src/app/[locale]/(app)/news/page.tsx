import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { ArticleList } from "@/components/admin/news/article-list";
import { loadArticleList } from "@/lib/admin/newsroom-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Every article the newsroom has, in every state.
 *
 * Three jobs open it — writing, deciding and publishing — because all three
 * begin by finding the article. Reading alone does not: a list exists to be
 * worked from, and showing one to somebody with no action available on it is
 * showing them a worklist they cannot use.
 */
export default async function NewsroomPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Newsroom");
  const common = await getTranslations("Common");
  const screen = await loadArticleList(locale);

  const header = <PageHeader title={t("title")} description={t("description")} />;

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
      <ArticleList articles={screen.data.articles} reviews={screen.data.reviews} locale={locale} />
    </>
  );
}
