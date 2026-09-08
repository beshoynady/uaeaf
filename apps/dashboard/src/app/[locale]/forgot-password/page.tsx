import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { resolveLocale } from "@/i18n/params";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations("ForgotPassword");

  return (
    <AuthShell
      locale={locale}
      title={t("title")}
      description={t("subtitle")}
    >
      <ForgotPasswordForm locale={locale} />
    </AuthShell>
  );
}
