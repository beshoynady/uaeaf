import { setRequestLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { SsoButtons } from "@/components/auth/sso-buttons";
import { resolveLocale } from "@/i18n/params";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations("Login");

  return (
    <AuthShell locale={locale} title={t("title")} description={t("subtitle")}>
      <LoginForm locale={locale} />
      {/* Renders nothing until UAEAF_SSO_PROVIDERS is set — the API has no
          OAuth endpoint yet. See components/auth/sso-buttons.tsx. */}
      <SsoButtons locale={locale} />
    </AuthShell>
  );
}
