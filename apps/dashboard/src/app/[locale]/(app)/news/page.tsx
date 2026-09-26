import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { BrandGround } from "@/components/ui/brand-ground";
import { AccessDenied } from "@/components/ui/access-denied";
import { ArticleList } from "@/components/admin/news/article-list";
import { NewsroomSummaryCards } from "@/components/admin/news/newsroom-summary";
import { loadArticleList } from "@/lib/admin/newsroom-screen";
import { loadPageActivation } from "@/lib/admin/page-activation-state";
import { PageActivationBar } from "@/components/admin/activation/page-activation-bar";
import { resolveLocale } from "@/i18n/params";

/**
 * Every article the newsroom has, in every state.
 *
 * Three jobs open it — writing, deciding and publishing — because all three
 * begin by finding the article. Reading alone does not: a list exists to be
 * worked from, and showing one to somebody with no action available on it is
 * showing them a worklist they cannot use.
 */
const NewsroomPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Newsroom");
  const common = await getTranslations("Common");
  const screen = await loadArticleList(locale);

  // The public `/news` listing page's own switch. Its hero record is edited in
  // `/pages`, but this is where somebody managing the newsroom actually is, so
  // the switch is reachable from both (owner brief §3). One field, one route —
  // see `loadPageActivation`.
  const activation = await loadPageActivation("newsPage", locale);

  const header = <PageHeader title={t("title")} description={t("description")} />;

  if (screen.status !== "ready") {
    return (
      <BrandGround>
        {header}
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </BrandGround>
    );
  }

  return (
    <BrandGround>
      {header}

      {activation ? (
        <PageActivationBar
          entity={activation.entity}
          pageName={t("title")}
          recordId={null}
          isActive={activation.isActive}
          canPublish={activation.canPublish}
          saved={activation.saved}
        />
      ) : null}

      {/* Absent rather than zeroed when the read was refused: a row of noughts
          it does not know would be a claim about a newsroom it cannot see. */}
      {screen.data.summary ? <NewsroomSummaryCards summary={screen.data.summary} /> : null}

      <ArticleList
        articles={screen.data.articles}
        reviews={screen.data.reviews}
        locale={locale}
        canCreate={screen.data.canCreate}
      />
    </BrandGround>
  );
};

export default NewsroomPage;
