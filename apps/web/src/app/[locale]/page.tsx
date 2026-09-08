import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo/metadata";
import type { AppLocale } from "@/i18n/routing";

/**
 * Homepage placeholder.
 *
 * The stock `create-next-app` template that lived here has been removed: it
 * shipped Next.js branding and its own full-viewport layout, which conflicts
 * with the real app shell now wrapping every route.
 *
 * The 13 approved homepage sections (Homepage Specification §6, Reconciled
 * v0.2.0) are a separate increment, deliberately deferred by the owner while
 * the listing pages are built.
 */

/**
 * Chapter 14 §11 — the homepage is `noindex` while it is a placeholder.
 *
 * This is the uncomfortable one, so it is worth stating plainly: `/` is the
 * single most important URL on the site, and shipping it `noindex` looks
 * wrong. It is not. What is currently at `/` is one heading and one sentence
 * saying the page is under construction — §11's "MUST NOT rely solely on
 * empty fields, placeholders" is describing exactly this — and PR-010
 * forbids showing "Coming Soon" to the public at all. An indexed placeholder
 * homepage is worse than an unindexed one: it is what search engines cache
 * as the federation's front door.
 *
 * It flips to `true` in the change that lands the approved sections.
 */
const INDEXABLE = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return buildMetadata({
    locale,
    route: "/",
    title: t("title"),
    description: t("description"),
    indexable: INDEXABLE,
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-20 sm:px-6 md:px-8 lg:px-12 xl:px-16">
      <h1 className="rise-in text-h1 text-[color:var(--color-text-primary)]">{t("title")}</h1>
      <p
        className="rise-in text-body text-[color:var(--color-text-secondary)]"
        style={{ "--rise-index": 1 } as React.CSSProperties}
      >
        {t("description")}
      </p>
    </div>
  );
}
