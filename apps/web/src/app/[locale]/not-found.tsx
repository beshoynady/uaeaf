import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { UaeafMotif } from "@/components/brand/uaeaf-motif";
import { CONTAINER, REGISTER_CLASSES } from "@/components/ui/section";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { PUBLIC_PAGES } from "@/lib/pages/public-pages";

/**
 * The 404 screen.
 *
 * IA §4.5 files this as **P0** — "platform is not launchable without these" —
 * and until now the site had Next.js's unstyled default, outside the app
 * shell, in one language. It is reached often today: the approved
 * nine-item navigation (IA §8.1) points at nine destinations that have no
 * page yet, so `/about`, `/members`, `/tournaments`, `/events/federation-events`
 * and `/media` all land here, as do the footer's `/help`, `/accessibility`,
 * `/privacy`, `/terms` and `/sitemap`.
 *
 * PR-010 forbids showing "Coming Soon" to the public, so this page does not
 * claim the missing pages are on their way. It says the link does not resolve
 * and offers the pages that do exist — which is both honest and the more
 * useful of the two.
 *
 * No `generateMetadata`: Next.js serves this with a 404 status, and a 404 is
 * already excluded from indexing by its status code. Adding `noindex` on top
 * would be belt-and-braces on a page search engines never index anyway.
 */
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  const pages = await getTranslations("Pages");
  const tone = REGISTER_CLASSES.black;

  // Only the routes that actually resolve. Reading the registry rather than
  // listing them here means this page cannot go stale as pages are built.
  const available = PUBLIC_PAGES.slice(0, 6);

  return (
    <section className={`w-full overflow-hidden ${tone.surface}`}>
      <div className={`${CONTAINER} grid items-center gap-8 py-16 md:grid-cols-[1fr_auto] md:py-24`}>
        <div className="min-w-0">
          <p className={`text-overline ${tone.muted}`}>404</p>
          <h1 className="rise-in mt-2 text-h1 text-balance">{t("title")}</h1>
          <p
            className={`rise-in mt-4 max-w-[62ch] text-body-lg ${tone.muted}`}
            style={{ "--rise-index": 1 } as React.CSSProperties}
          >
            {t("description")}
          </p>

          <Link
            href="/"
            className={`mt-8 inline-flex min-h-11 items-center rounded-[var(--button-radius)] border px-4 text-label font-medium ${tone.border} ${TRANSITION} ${FOCUS} hover:bg-white/12 active:bg-white/8`}
          >
            {t("backHome")}
          </Link>

          <h2 className={`mt-10 text-caption ${tone.muted}`}>{t("available")}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {available.map((page) => (
              <li key={page.key}>
                <Link
                  href={page.route}
                  className={`inline-flex min-h-11 items-center rounded-xs text-body-sm underline-offset-4 ${TRANSITION} ${FOCUS} hover:underline active:text-[color:var(--color-section-black-text-muted)]`}
                >
                  {pages(page.messageKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <UaeafMotif tone="inherit" className="h-20 w-full self-end opacity-70 md:h-40 md:w-40" />
      </div>
    </section>
  );
}
