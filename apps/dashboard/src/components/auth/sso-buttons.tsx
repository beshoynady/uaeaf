import { getTranslations } from "next-intl/server";

/**
 * Single sign-on entry points.
 *
 * `AUTH_PROVIDERS` in the user schema lists `Local`, `Google` and
 * `Microsoft`, but **no OAuth endpoint exists on the API** (verified
 * 2026-09-08: auth.controller.ts declares only login/refresh/logout/
 * logout-all). Shipping buttons that lead nowhere would be worse than not
 * shipping them, so the section is gated on `UAEAF_SSO_PROVIDERS` and
 * renders nothing until that variable names a provider.
 *
 * Server-side env, not `NEXT_PUBLIC_`: which providers a deployment offers
 * is a server fact, and this component is a server component, so the client
 * bundle never needs it.
 *
 * The day the endpoints ship: set `UAEAF_SSO_PROVIDERS=google,microsoft`.
 */
const SUPPORTED = ["google", "microsoft"] as const;
export type SsoProvider = (typeof SUPPORTED)[number];

export function configuredProviders(raw: string | undefined): SsoProvider[] {
  if (!raw) {
    return [];
  }
  const requested = raw.split(",").map((value) => value.trim().toLowerCase());
  return SUPPORTED.filter((provider) => requested.includes(provider));
}

export async function SsoButtons({ locale }: { locale: string }) {
  const providers = configuredProviders(process.env.UAEAF_SSO_PROVIDERS);
  if (providers.length === 0) {
    return null;
  }

  const t = await getTranslations("Auth");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[color:var(--color-border-default)]" />
        <span className="text-caption text-[color:var(--color-text-muted)]">{t("ssoDivider")}</span>
        <span className="h-px flex-1 bg-[color:var(--color-border-default)]" />
      </div>

      <div className="flex flex-col gap-3">
        {providers.map((provider) => (
          <a
            key={provider}
            // A full navigation, not fetch: an OAuth handshake leaves the
            // origin, so it must be a document request the browser owns.
            href={`/api/auth/sso/${provider}?locale=${locale}`}
            className="flex h-12 items-center justify-center gap-3 rounded-[var(--button-radius)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] text-label font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
          >
            {t(provider === "google" ? "ssoGoogle" : "ssoMicrosoft")}
          </a>
        ))}
      </div>
    </div>
  );
}
