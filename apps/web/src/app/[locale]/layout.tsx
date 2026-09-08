import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alexandria, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { routing, localeDirection, type AppLocale } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

// Chapter 4 §ADR-0007 official typeface decision. Chapter 4 §4.8: Variable Fonts preferred
// (fewer network requests) — Alexandria and IBM Plex Sans both support weight: "variable".
// Chapter 4 §4.9: next/font self-hosts + preloads + sets font-display: swap automatically,
// implementing the loading strategy without any manual font file management.
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

// IBM Plex Mono has no variable axis upstream — load only the weights actually used
// (Chapter 4 §4.3: technical IDs/codes, a narrow use case, Regular is enough).
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Chapter 4 §4.3 Font Families: Alexandria for Arabic, IBM Plex Sans (ADR-0007) for English —
// the body's base font family switches with locale, not just the CSS variable pool.
const bodyFontClass: Record<AppLocale, string> = {
  ar: "font-arabic",
  en: "font-latin",
};

// Chapter 7 §7.4: theme resolution MUST be CSS-only (data-theme attribute), but the initial
// value still has to be picked before first paint to avoid a flash of the wrong theme — this
// inline script is the one JS exception, it only ever sets the attribute, never computes colors.
const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem('uaeaf-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

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
  };
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { locale: requested } = await params;
  if (!hasLocale(routing.locales, requested)) {
    notFound();
  }
  const locale = requested;

  // Enables static rendering for this locale (next-intl requirement when
  // reading the locale outside of `generateStaticParams` — verified against
  // next-intl 4.14.2 docs, 2026-09-07).
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      className={`${alexandria.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`min-h-full flex flex-col ${bodyFontClass[locale]} text-body`}>
        <NextIntlClientProvider>
          <SiteHeader />
          {/* Target for the header's skip link (WCAG 2.2 SC 2.4.1). `flex-1` keeps
              the footer at the bottom on short pages. */}
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
