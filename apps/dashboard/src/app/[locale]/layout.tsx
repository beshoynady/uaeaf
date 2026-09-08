import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alexandria, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { routing, localeDirection, type AppLocale } from "@/i18n/routing";
import { THEME_COOKIE } from "@/lib/auth/cookies";
import "./globals.css";

// Chapter 4 §ADR-0007 official typeface decision; §4.8 variable fonts preferred;
// §4.9 next/font self-hosts, preloads and sets font-display: swap. Same three
// families as apps/web — one type system across both surfaces.
const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["arabic", "latin"],
  weight: "variable",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Chapter 4 §4.3: the body's base family switches with locale, not just the
// CSS variable pool.
const bodyFontClass: Record<AppLocale, string> = {
  ar: "font-arabic",
  en: "font-latin",
};

const THEMES = new Set(["light", "dark"]);

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
    // An internal tool: keep it out of search results entirely.
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { locale: requested } = await params;
  if (!hasLocale(routing.locales, requested)) {
    notFound();
  }
  const locale = requested;
  setRequestLocale(locale);

  // Chapter 7 §7.4: theme resolution is a `data-theme` attribute. apps/web
  // needs an inline bootstrap script for this because it reads localStorage,
  // which only exists in the browser. Here the preference already arrives in
  // a cookie, so the server can render the final attribute directly — no
  // blocking script, and no flash of the wrong theme to eliminate.
  //
  // Falls back to "light", not to an absent attribute. The generated token
  // CSS defines dark purely as `[data-theme="dark"]` and carries no
  // `prefers-color-scheme` rule at all (verified 2026-09-07 against
  // packages/design-tokens/build/css/dark.css), so omitting the attribute
  // does not mean "follow the OS" here — it just renders light while
  // claiming otherwise. Stamping the value explicitly keeps what the page
  // shows and what the toggle says in agreement.
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = stored && THEMES.has(stored) ? stored : "light";

  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      data-theme={theme}
      className={`${alexandria.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className={`min-h-full ${bodyFontClass[locale]} text-body`}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
