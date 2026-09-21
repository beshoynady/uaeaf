import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RichText } from "@/components/rich-text/rich-text";
import { NewsCard } from "./news-card";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { altOf, isExternalMedia } from "@/lib/api/media";
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
 * ── What the design draws that there is no data for ────────────────────────
 *
 * A category badge, a reading time, a dateline location, a photo strip and six
 * share buttons. `articles` carries none of those: categories, tags and
 * advanced social sharing are out of scope for this batch by the owner's own
 * instruction, and there is no link between an article and an album. Each is
 * reported as a scope conflict rather than filled with invented content.
 */
export const ArticleScreen = ({
  article,
  locale,
  related,
  covers,
}: {
  article: ArticlePublic;
  locale: AppLocale;
  related: readonly ArticlePublic[];
  covers: ReadonlyMap<string, MediaAssetPublic>;
}) => {
  const format = useFormatter();
  const t = useTranslations("News");
  const cover = article.coverMediaId ? covers.get(article.coverMediaId) : undefined;

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <article className="mx-auto flex w-full max-w-[72ch] flex-col gap-6">
        <header className="flex flex-col gap-4">
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
                <time dateTime={article.publishDate}>
                  {format.dateTime(new Date(article.publishDate), { dateStyle: "long" })}
                </time>
              </>
            ) : null}
          </div>
        </header>

        {cover ? (
          <figure className="m-0 flex flex-col gap-2">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-md)]">
              <Image
                src={cover.file.url}
                alt={altOf(cover, locale)}
                fill
                sizes="(min-width: 768px) 72ch, 100vw"
                // The article's own picture is its Largest Contentful Paint.
                priority
                className="object-cover"
                unoptimized={isExternalMedia(cover.file.url)}
              />
            </div>
            {cover.altText?.[locale] ? (
              <figcaption className="text-caption text-[color:var(--color-text-secondary)]">
                {cover.altText[locale]}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {/* The measure, the rhythm between blocks and the quote's treatment
            belong to the page that places the text, not to the text. */}
        <div
          className="flex flex-col gap-4 text-body text-[color:var(--color-text-primary)] [&_blockquote]:border-s-4 [&_blockquote]:border-[color:var(--color-brand-primary)] [&_blockquote]:bg-[color:var(--color-surface-sunken)] [&_blockquote]:p-6 [&_blockquote]:ps-6 [&_h2]:mt-2 [&_h3]:mt-2"
        >
          <RichText doc={article.body[locale]} locale={locale} />
        </div>

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
