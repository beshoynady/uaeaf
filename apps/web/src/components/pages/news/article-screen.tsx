import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RichText } from "@/components/rich-text/rich-text";
import { NewsCard } from "./news-card";
import { ArticleCover } from "./cover";
import { PublishDate } from "./publish-date";
import { TopicBadge } from "./topic-badge";
import { SourceBlock } from "./source-attribution";
import { TagList } from "./tag-list";
import { ShareArticle } from "./share-article";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * One story (Figma `1739:2341`).
 *
 * ── The body is drawn, never injected ──────────────────────────────────────
 *
 * `RichText` walks the stored ProseMirror document and emits elements. It is
 * an allowlist and it fails closed: a node or mark it does not name is not
 * drawn, a link whose scheme it does not accept keeps its words and loses its
 * target, and nothing is ever passed as HTML. A document that somehow reached
 * the database without passing the API's own allowlist still cannot put markup
 * or a script URL on this page.
 *
 * ── The quote block ────────────────────────────────────────────────────────
 *
 * The design gives a pulled quote a tinted ground and a green edge on the
 * reading side. `RichText` is shared with the President's Message, where the
 * approved composition draws a quieter blockquote, so the styling is scoped
 * here with a descendant variant rather than changed in the shared renderer —
 * the pattern the dashboard's own editor already uses. Nothing about the other
 * page changes.
 *
 * ── The foot of the article ────────────────────────────────────────────────
 *
 * Tags, then a rule, then the share row — the order and the placement the
 * design draws (`1739:2380`, `1739:2389`, `1739:2390`), at the foot and not
 * beside the title. The share row opens a preview before it opens anything
 * else; see `share-article.tsx` for why.
 *
 * ── What the design still draws that there is no data for ──────────────────
 *
 * A reading time, a dateline location and a photo strip. `articles` carries
 * none of the three and there is no link between an article and an album, so
 * each stays a reported scope conflict rather than invented content. The
 * category badge and the share buttons left this list on 2026-09-21, when the
 * fields behind them shipped.
 */
export const ArticleScreen = ({
  article,
  locale,
  related,
  covers,
  shareUrl,
  shareImage,
}: {
  article: ArticlePublic;
  locale: AppLocale;
  related: readonly ArticlePublic[];
  covers: ReadonlyMap<string, MediaAssetPublic>;
  /** Absolute: every share target is another origin, and a relative path
   *  posted to one of them points at that platform's own domain. */
  shareUrl: string;
  /** What the platforms will show — the cover, or the generated placeholder. */
  shareImage: string | null;
}) => {
  const t = useTranslations("News");
  const cover = article.coverMediaId ? covers.get(article.coverMediaId) : undefined;

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <article className="mx-auto flex w-full max-w-[72ch] flex-col gap-6">
        <header className="flex flex-col items-start gap-4">
          <TopicBadge topic={article.topic} />

          <h1 className="text-h1 text-balance text-[color:var(--color-text-primary)]">
            {article.title[locale]}
          </h1>

          <p className="text-body-lg text-pretty text-[color:var(--color-text-secondary)]">
            {article.excerpt[locale]}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-[color:var(--color-text-secondary)]">
            <span>
              {t("byline")} {article.authorDisplayName[locale]}
            </span>
            {article.publishDate ? (
              <>
                <span aria-hidden>•</span>
                <PublishDate date={article.publishDate} />
              </>
            ) : null}
          </div>

          {/* Where a media round-up came from, before the reader starts on the
              words. A `FederationInMedia` article is the federation reporting
              that somebody else published something, and shown without its
              source it is indistinguishable from the newsroom's own writing —
              which is a provenance claim, not a styling detail. Nothing at all
              on an ordinary article, and nothing on a round-up written before
              the fields existed. */}
          <SourceBlock article={article} />
        </header>

        <figure className="m-0 flex flex-col gap-2">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-md)]">
            <ArticleCover
              article={article}
              cover={cover}
              locale={locale}
              sizes="(min-width: 768px) 72ch, 100vw"
              // The article's own picture is its Largest Contentful Paint.
              priority
            />
          </div>
          {cover?.altText?.[locale] ? (
            <figcaption className="text-caption text-[color:var(--color-text-secondary)]">
              {cover.altText[locale]}
            </figcaption>
          ) : null}
        </figure>

        {/* The measure, the rhythm between blocks and the quote's treatment
            belong to the page that places the text, not to the text. */}
        <div
          className="flex flex-col gap-4 text-body text-[color:var(--color-text-primary)] [&_blockquote]:border-s-4 [&_blockquote]:border-[color:var(--color-brand-primary)] [&_blockquote]:bg-[color:var(--color-surface-sunken)] [&_blockquote]:p-6 [&_blockquote]:ps-6 [&_h2]:mt-2 [&_h3]:mt-2"
        >
          <RichText doc={article.body[locale]} locale={locale} />
        </div>

        <TagList tags={article.tags} className="mt-2" />

        {/* The rule the design draws between the labels and the share row:
            two different things to do with the story, told apart. */}
        <hr className="my-2 border-0 border-t border-[color:var(--color-border-default)]" />

        <ShareArticle
          url={shareUrl}
          title={article.title[locale]}
          excerpt={article.excerpt[locale]}
          image={shareImage}
        />

        <p className="mt-2">
          <Link
            href="/news"
            className={`text-body-sm font-bold text-[color:var(--color-text-link)] underline underline-offset-4 ${TRANSITION} ${FOCUS}`}
          >
            {t("backToList")}
          </Link>
        </p>
      </article>

      {related.length > 0 ? (
        <section aria-labelledby="news-related" className="flex flex-col gap-5">
          <h2 id="news-related" className="text-h3 text-[color:var(--color-text-primary)]">
            {t("relatedHeading")}
          </h2>
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.id} className="relative flex">
                <NewsCard
                  article={item}
                  locale={locale}
                  cover={item.coverMediaId ? covers.get(item.coverMediaId) : undefined}
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};
