import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";
import { MegaLink } from "./mega-link";

const enMessages = loadMessages("en");

/**
 * `@/i18n/navigation`'s real `Link` never forwards `prefetch` to the DOM — it
 * is Next's internal prefetch behaviour, not a rendered attribute — so the
 * prefetch decision itself is otherwise unobservable from a render. Scoped to
 * this file only: every other mega spec renders the real, locale-aware
 * `Link`.
 */
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    prefetch,
    children,
    ...rest
  }: {
    href: string;
    prefetch?: boolean;
    children?: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} data-prefetch={prefetch === false ? "false" : "true"} {...rest}>
      {children}
    </a>
  ),
}));

describe("MegaLink prefetch", () => {
  // `/athletics` is a registered PREPARING route, so the PAGE part is
  // prefetchable — but the literal string "/athletics#disciplines" is not a
  // route `isBuilt` has ever seen. Reverting the gate from
  // `isBuilt(pagePart(item.href!))` back to `isBuilt(item.href!)` makes this
  // fail, because the raw href with its `#` never matches a registered route.
  it("يقرأ قرار الجلب المسبق من جزء الصفحة قبل الـanchor", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <MegaLink item={{ key: "disciplinesEvents", href: "/athletics#disciplines" }} currentPath="/" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("data-prefetch", "true");
  });
});
