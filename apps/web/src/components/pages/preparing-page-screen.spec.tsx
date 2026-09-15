import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import sitemap from "@/app/sitemap";
import { PREPARING_PAGES, PUBLIC_PAGES } from "@/lib/pages/public-pages";
import { absoluteUrl } from "@/lib/seo/metadata";
import { PreparingPageScreen, buildPreparingPageMetadata } from "./preparing-page-screen";

/**
 * A page in preparation: a destination the site already links to, served as
 * its title, its trail and one status line from the messages, and nothing
 * else (batch brief 2026-09-15 §6.4). It stays out of the index and the
 * sitemap until the full page replaces it at the same route.
 */

const { messageAt } = vi.hoisted(() => ({
  /** A message by its dotted path; throws where none exists, so a missing
   *  label fails the test rather than rendering its key. */
  messageAt: (messages: unknown, path: string): string => {
    const value = path
      .split(".")
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
    if (typeof value !== "string") throw new Error(`No message at "${path}"`);
    return value;
  },
}));

// The real messages, so the titles asserted are the ones the site prints.
vi.mock("next-intl/server", async () => {
  const messages = {
    ar: (await import("../../../messages/ar.json")).default,
    en: (await import("../../../messages/en.json")).default,
  };
  return {
    getTranslations: async ({ locale, namespace }: { locale: "ar" | "en"; namespace?: string }) =>
      (key: string) => messageAt(messages[locale], namespace ? `${namespace}.${key}` : key),
  };
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Every built page whose indexability reads content gets some, so the sitemap
// lists everything it can and the absence asserted below means something.
vi.mock("@/lib/api/public-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/public-client")>()),
  fetchPublic: async (path: string) =>
    path === "/federation-personnel/public"
      ? [{}]
      : { items: [{}], email: "e", introText: { ar: "ن", en: "t" }, messageBody: { ar: "ن", en: "t" }, visionText: { ar: "ن", en: "t" } },
}));

const MESSAGES = { ar, en } as const;
const LOCALES = ["ar", "en"] as const;

const underAbout = (route: string) => route === "/about" || route.startsWith("/about/");
const depth = (route: string) => route.split("/").filter(Boolean).length;

const breadcrumbList = (container: HTMLElement) =>
  [...container.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => JSON.parse(script.textContent ?? "null"))
    .find((data) => data?.["@type"] === "BreadcrumbList") ?? null;

const heroTrail = (container: HTMLElement, locale: "ar" | "en") =>
  container.querySelector(`nav[aria-label="${MESSAGES[locale].Pages.breadcrumbLabel}"]`);

const renderPage = async (key: string, locale: "ar" | "en") =>
  render(await PreparingPageScreen({ pageKey: key, locale }));

describe("the registry of pages in preparation", () => {
  it("gives each page a key and a route of its own that no built page claims", () => {
    expect(PREPARING_PAGES.length).toBeGreaterThan(0);

    const routes = PREPARING_PAGES.map((page) => page.route);
    const keys = [...PUBLIC_PAGES, ...PREPARING_PAGES].map((page) => page.key);
    expect(new Set(routes).size).toBe(routes.length);
    expect(new Set(keys).size).toBe(keys.length);

    const built = new Set(PUBLIC_PAGES.map((page) => page.route));
    expect(routes.filter((route) => built.has(route))).toEqual([]);
  });

  it("names every page with a label the header or the footer already prints, in both languages", () => {
    for (const page of PREPARING_PAGES) {
      expect(["Nav", "Legal", "Footer"], page.titleKey).toContain(page.titleKey.split(".")[0]);
      for (const locale of LOCALES) {
        expect(() => messageAt(MESSAGES[locale], page.titleKey), `${locale} ${page.titleKey}`).not.toThrow();
      }
    }
  });
});

describe("PreparingPageScreen", () => {
  it.each(LOCALES)("prints the title, the trail where shown, and the one status line, and nothing more (%s)", async (locale) => {
    for (const page of PREPARING_PAGES) {
      const { container, unmount } = await renderPage(page.key, locale);

      const title = messageAt(MESSAGES[locale], page.titleKey);
      const status = messageAt(MESSAGES[locale], "Preparing.status");
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(container.querySelector("h1")?.textContent, page.route).toBe(title);

      // Read from a copy: the structured data is not visible text, and removing
      // nodes React owns would break its unmount.
      const visible = container.cloneNode(true) as HTMLElement;
      visible.querySelectorAll("script").forEach((script) => script.remove());
      const trail = heroTrail(visible, locale)?.textContent ?? "";
      expect(visible.textContent, page.route).toBe(`${trail}${title}${status}`);

      unmount();
    }
  });

  it("keeps the trail out of the hero under /about, and in structured data from depth two", async () => {
    const about = PREPARING_PAGES.filter((page) => underAbout(page.route));
    expect(about.length).toBeGreaterThan(0);

    for (const page of about) {
      const { container, unmount } = await renderPage(page.key, "ar");
      expect(heroTrail(container, "ar"), page.route).toBeNull();

      const list = breadcrumbList(container);
      if (depth(page.route) >= 2) {
        expect(list?.itemListElement[0]?.item, page.route).toBe(absoluteUrl("ar", "/"));
        expect(list?.itemListElement.at(-1)?.item, page.route).toBe(absoluteUrl("ar", page.route));
        expect(list?.itemListElement.at(-1)?.name, page.route).toBe(messageAt(ar, page.titleKey));
      } else {
        expect(list, page.route).toBeNull();
      }
      unmount();
    }
  });

  it("shows the trail in the hero elsewhere from depth two, as the listing pages do", async () => {
    const elsewhere = PREPARING_PAGES.filter((page) => !underAbout(page.route));
    expect(elsewhere.length).toBeGreaterThan(0);

    for (const page of elsewhere) {
      const { container, unmount } = await renderPage(page.key, "en");
      const trail = heroTrail(container, "en");

      if (depth(page.route) >= 2) {
        expect(trail?.querySelector('a[href="/"]')?.textContent, page.route).toBe(en.Nav.home);
        expect(trail?.querySelector('[aria-current="page"]')?.textContent, page.route).toBe(messageAt(en, page.titleKey));
        expect(breadcrumbList(container)?.itemListElement.at(-1)?.item, page.route).toBe(absoluteUrl("en", page.route));
      } else {
        expect(trail, page.route).toBeNull();
        expect(breadcrumbList(container), page.route).toBeNull();
      }
      unmount();
    }
  });
});

describe("pages in preparation stay out of search", () => {
  it("are noindex, follow, under their own canonical and title", async () => {
    for (const page of PREPARING_PAGES) {
      for (const locale of LOCALES) {
        const metadata = await buildPreparingPageMetadata(page.key, locale);
        expect(metadata.robots, `${locale} ${page.route}`).toMatchObject({ index: false, follow: true });
        expect(metadata.alternates?.canonical).toBe(absoluteUrl(locale, page.route));
        expect(metadata.title).toBe(
          `${messageAt(MESSAGES[locale], page.titleKey)} | ${MESSAGES[locale].Metadata.title}`,
        );
      }
    }
  });

  it("are absent from the sitemap, which still lists the built pages that have content", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.length).toBeGreaterThan(0);

    const preparing = new Set(
      PREPARING_PAGES.flatMap((page) => LOCALES.map((locale) => absoluteUrl(locale, page.route))),
    );
    expect(urls.filter((url) => preparing.has(url))).toEqual([]);
  });
});
