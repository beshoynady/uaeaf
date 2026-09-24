import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandBorder, EmptyState } from "@uaeaf/brand-ui";
import { readGrants, requireSession } from "@/lib/auth/session";
import { visibleNavItems } from "@/lib/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { BrandGround } from "@/components/ui/brand-ground";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/params";

const OverviewPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
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
    <BrandGround>
      <PageHeader title={t("title")} description={t("welcome")} />

      {sections.length === 0 ? (
        // A real state, not an error: an account exists but has no role yet.
        // Saying so beats an empty page that looks broken.
        <EmptyState title={shell("noPermissions")} />
      ) : (
        // The quick-actions panel carries the one static tricolour edge on
        // this screen (Chapter 12 §12.15, Operational dose): painted, never
        // moving, and never `hover` — the links inside are crossed by the
        // pointer all day.
        <BrandBorder variant="static" tone="tricolor" className="rounded-[var(--radius-md)]">
          <section className="flex flex-col gap-4 rounded-[var(--radius-md)] bg-[color:var(--color-surface-raised)] p-5">
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
        </BrandBorder>
      )}
    </BrandGround>
  );
};

export default OverviewPage;
