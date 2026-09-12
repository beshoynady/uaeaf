import { getTranslations, setRequestLocale } from "next-intl/server";
import { readGrants, requireSession } from "@/lib/auth/session";
import { visibleNavItems } from "@/lib/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/params";

export default async function OverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  await requireSession(locale);
  const t = await getTranslations("Overview");
  const nav = await getTranslations("Nav");
  const shell = await getTranslations("Shell");

  // Everything except the overview itself. The grants come from the same
  // memoised GET /users/me the shell above already made, so listing the
  // reachable sections costs no extra round trip.
  const grants = await readGrants(locale);
  const sections = visibleNavItems(grants).filter((item) => item.requires !== null);

  return (
    <>
      <PageHeader title={t("title")} description={t("welcome")} />

      {sections.length === 0 ? (
        // A real state, not an error: an account exists but has no role yet.
        // Saying so beats an empty page that looks broken.
        <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-6 py-10 text-center text-body-sm text-[color:var(--color-text-muted)]">
          {shell("noPermissions")}
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-h4 text-[color:var(--color-text-primary)]">{t("sectionsTitle")}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="block rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-5 py-4 text-body text-[color:var(--color-text-primary)] transition-colors hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
                >
                  {nav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
