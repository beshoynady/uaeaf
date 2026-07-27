import { Alexandria, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
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

export const metadata = {
  title: "الاتحاد الإماراتي لألعاب القوى | UAE Athletics Federation",
  description: "UAEAF Digital Ecosystem",
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

export default function RootLayout({ children }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${alexandria.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full flex flex-col font-arabic text-body">{children}</body>
    </html>
  );
}
