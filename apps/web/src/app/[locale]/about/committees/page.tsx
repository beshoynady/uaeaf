import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import {
  StaticPageScreen,
  buildStaticPageMetadata,
  loadStaticPage,
  text,
} from "@/components/pages/static-page-screen";
import { Section } from "@/components/ui/section";
import type { CommitteesPage } from "@/lib/api/types";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "committees";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Chapter 14 §11: the intro heading and body are this page's "meaningful
  // textual description". Without a saved record there is nothing but a
  // hero, so it stays out of the index.
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
}

export default async function CommitteesPageScreen({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { record, title, subtitle, heroImage } = await loadStaticPage<CommitteesPage>(KEY, locale);
  const introHeading = text(record?.introHeading, locale);
  const introText = text(record?.introText, locale);

  return (
    <StaticPageScreen pageKey={KEY} locale={locale} title={title} subtitle={subtitle} heroImage={heroImage}>
      {introText ? (
        <Section
          labelledBy={introHeading ? "committees-intro-heading" : undefined}
          className="py-12 md:py-16"
        >
          <div className="rise-scroll max-w-[68ch]">
            {introHeading ? (
              <h2 id="committees-intro-heading" className="text-h2">
                {introHeading}
              </h2>
            ) : null}
            {/* `whitespace-pre-line` because the editor's field is a
                multiline textarea (`static-pages.ts` marks `introText` as
                `multiline`). Collapsing the paragraphs the editor typed into
                one block would silently discard their structure. */}
            <p className="mt-4 text-body-lg whitespace-pre-line text-[color:var(--color-text-secondary)]">
              {introText}
            </p>
          </div>
        </Section>
      ) : null}
    </StaticPageScreen>
  );
}
