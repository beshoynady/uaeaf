import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ar from "../../../messages/ar.json";
import { StaticPageScreen, isInstitutional } from "./static-page-screen";

/**
 * The trail of a page built on `StaticPageScreen` (IA §8.5, ADR-0072 D7): in
 * the hero from depth two, except on the institutional pages, About and every
 * page under it, which keep it in structured data only (owner decision
 * 2026-09-15).
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

const visibleTrail = (container: HTMLElement) => container.querySelector(`nav[aria-label="${ar.Pages.breadcrumbLabel}"]`);

const trailData = (container: HTMLElement) =>
  [...container.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => JSON.parse(script.textContent ?? "{}") as { "@type"?: string })
    .find((data) => data["@type"] === "BreadcrumbList");

describe("isInstitutional", () => {
  it("names About and every page under it, and nothing else", () => {
    expect(["/about", "/about/board-members", "/about/governance/vision-mission"].map(isInstitutional)).toEqual([true, true, true]);
    expect(["/", "/aboutus", "/media/albums", "/news"].map(isInstitutional)).toEqual([false, false, false, false]);
  });
});

describe("StaticPageScreen's trail", () => {
  it.each(["board-members", "committees"])("keeps the %s trail out of the hero and in structured data", async (pageKey) => {
    const { container } = render(await StaticPageScreen({ pageKey, locale: "ar", title: "عنوان", subtitle: null }));

    expect(visibleTrail(container)).toBeNull();
    expect(trailData(container)).toBeDefined();
  });

  it("shows the trail in the hero on a page two levels deep outside About", async () => {
    const { container } = render(await StaticPageScreen({ pageKey: "albums", locale: "ar", title: "عنوان", subtitle: null }));

    expect(visibleTrail(container)).not.toBeNull();
    expect(trailData(container)).toBeDefined();
  });
});
