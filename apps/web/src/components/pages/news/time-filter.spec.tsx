import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NewsTimeFilter } from "./time-filter";
import { presetRange } from "@uaeaf/content/time-range";
import type { FeedQuery } from "@/lib/news/feed-query";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push }),
}));

const base: FeedQuery = { range: {}, page: 1 };

/**
 * The window on the publication date, as one list (owner decision 2026-09-23).
 *
 * It replaced a row of five chips. The chips were links and therefore worked
 * with no JavaScript at all, which the component was deliberately built for —
 * so they survive inside `<noscript>`, and this file holds that: a reader
 * without JavaScript keeps every window the chips gave them.
 */
describe("NewsTimeFilter", () => {
  const options = () =>
    within(screen.getByRole("combobox")).getAllByRole("option").map((option) => (option as HTMLOptionElement).value);

  it("offers every window in one list, plus the custom one", () => {
    render(<NewsTimeFilter query={base} />);

    expect(options()).toEqual(["all", "today", "thisWeek", "thisMonth", "thisYear", "custom"]);
  });

  it("opens on the window the address already names", () => {
    render(<NewsTimeFilter query={{ ...base, range: presetRange("thisMonth") }} />);

    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("thisMonth");
  });

  it("calls a hand-typed window custom, not one of the presets", () => {
    // Two dates that match no preset: the list has to say so rather than
    // silently showing "all time" while the feed is narrowed.
    render(<NewsTimeFilter query={{ ...base, range: { from: "2019-03-02", to: "2019-04-08" } }} />);

    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("custom");
  });

  it("keeps every window reachable without JavaScript", () => {
    // The chips this list replaced were links, and a link needs no script.
    //
    // Asserted on the SERVER's html, which is the only place it can be: a
    // browser parses `noscript` content as text when scripting is on, so a
    // client render has nothing inside it to find. The server's html is also
    // exactly what the reader this test is about receives and stops at.
    const html = renderToString(<NewsTimeFilter query={base} />);
    const fallback = html.slice(html.indexOf("<noscript>"));

    expect(html).toContain("<noscript>");
    for (const preset of ["today", "thisWeek", "thisMonth", "thisYear"]) {
      expect(fallback).toContain(`time_${preset}`);
    }
    expect(fallback).toContain("timeAll");
    // …and the two dates, whose form the list would otherwise keep closed.
    expect(fallback).toContain("timeApply");
  });
});
