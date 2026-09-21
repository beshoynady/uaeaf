import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { ReviewBoard } from "@/components/admin/news/review-board";
import { loadReviewQueue } from "@/lib/admin/newsroom-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * What is waiting on the person reading the screen.
 *
 * The scoping is entirely the server's: `pending-mine` reads the caller's
 * identity from their token and takes no user parameter, so no screen — this
 * one included — can ask for somebody else's worklist.
 */
export default async function ReviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Newsroom");
  const common = await getTranslations("Common");
  const screen = await loadReviewQueue(locale);

  const header = <PageHeader title={t("reviewTitle")} description={t("reviewDescription")} />;

  if (screen.status !== "ready") {
    return (
      <>
        {header}
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </>
    );
  }

  const items = screen.data.pending.flatMap((review) => {
    const article = screen.data.articles.get(review.entityId);
    // A review whose article could not be read is dropped rather than drawn
    // with holes: a reviewer cannot decide on a record they cannot see.
    return article
      ? [{ instanceId: review.instanceId, article, publishedTitle: null, submittedAt: review.startedAt }]
      : [];
  });

  return (
    <>
      {header}
      <ReviewBoard items={items} locale={locale} />
    </>
  );
}
