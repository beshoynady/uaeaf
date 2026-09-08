import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { StatusMessage } from "@/components/auth/status-message";
import { resolveLocale } from "@/i18n/params";

/**
 * Reached from the emailed link, so the token is a query parameter.
 *
 * A missing token is handled here rather than inside the form: with nothing
 * to submit, a password field would be a dead end. The screen says what
 * happened and offers the one action that helps — request a new link.
 */
export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations("ResetPassword");

  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";

  return (
    <AuthShell locale={locale} title={t("title")} description={t("subtitle")}>
      {token.length === 0 ? (
        <div className="flex flex-col gap-6">
          <StatusMessage tone="error" title={t("missingTokenTitle")}>
            {t("missingTokenBody")}
          </StatusMessage>
          <a
            href={`/${locale}/forgot-password`}
            className="flex h-12 w-full items-center justify-center rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] text-label font-medium text-[color:var(--button-primary-text)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--button-primary-background-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--button-primary-background-pressed)]"
          >
            {t("requestNewLink")}
          </a>
        </div>
      ) : (
        <ResetPasswordForm token={token} locale={locale} />
      )}
    </AuthShell>
  );
}
