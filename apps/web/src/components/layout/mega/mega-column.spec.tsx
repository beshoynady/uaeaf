import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { renderWithIntl } from "@/test/render-with-intl";
import { MegaColumn } from "./mega-column";
import { loadMessages } from "@/i18n/messages";

const enMessages = loadMessages("en");

const column = {
  key: "athleticsCommunity",
  children: [
    { key: "clubs", href: "/clubs", descriptionKey: "clubsDescription" },
    { key: "athletes", href: "/athletes" },
    { key: "nationalTeams", href: "/national-teams", badge: "soon" as const },
    { key: "disciplinesEvents", href: "/athletics#disciplines" },
  ],
};

const contentColumn = {
  key: "contentColumn",
  children: [
    { key: "news", href: "/news", descriptionKey: "newsDescription" },
    { key: "photoAlbums", href: "/media/albums" },
    { key: "videos", href: "/media/videos" },
    { key: "liveStream", href: "/media/videos#live" },
  ],
};

describe("عمود اللوحة", () => {
  it("عنوان العمود h2 مرئي", () => {
    renderWithIntl(<MegaColumn column={column} currentPath="/" />, "en");
    expect(screen.getByRole("heading", { level: 2 })).toBeVisible();
  });

  // `toBeVisible()` alone cannot see an `sr-only` class — jsdom applies no
  // stylesheet, so the clipped-rect CSS an `sr-only` utility relies on is
  // never evaluated. The heading must additionally not carry that class, or a
  // future edit could clip it back to screen-reader-only without any test
  // objecting.
  it("عنوان العمود ليس sr-only", () => {
    renderWithIntl(<MegaColumn column={column} currentPath="/" />, "en");
    expect(screen.getByRole("heading", { level: 2 })).not.toHaveClass("sr-only");
  });

  it("aria-current على الرابط المطابق وحده", () => {
    renderWithIntl(<MegaColumn column={column} currentPath="/clubs" />, "en");
    expect(screen.getByRole("link", { name: /Clubs/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /National Teams/ })).not.toHaveAttribute("aria-current");
  });

  // `/athletics#disciplines` is a position inside `/athletics`, not `/athletics`
  // itself: on that very page, its own link must not also claim to be current.
  it("aria-current لا يُضبط على رابط anchor لنفس الصفحة", () => {
    renderWithIntl(<MegaColumn column={column} currentPath="/athletics" />, "en");
    expect(screen.getByRole("link", { name: /Disciplines/ })).not.toHaveAttribute("aria-current");
  });

  it("الشارة تُنطق مع اسم الرابط", () => {
    renderWithIntl(<MegaColumn column={column} currentPath="/" />, "en");
    expect(screen.getByRole("link", { name: /National Teams & Talent.*Soon/s })).toBeInTheDocument();
  });

  // Nothing previously distinguished "the one item with a badge got one" from
  // "every item got one" — a chip stamped on every link would still have
  // passed the assertion above.
  it("لا شارة على رابط لم يحمل badge", () => {
    renderWithIntl(<MegaColumn column={column} currentPath="/" />, "en");
    expect(screen.getAllByText("Soon")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Clubs/ })).not.toHaveTextContent("Soon");
  });

  it("الوصف يظهر لعنصر يحمل descriptionKey ولا يظهر لعنصر بلا واحد", () => {
    renderWithIntl(<MegaColumn column={column} currentPath="/" />, "en");
    expect(screen.getByRole("link", { name: /Clubs/ })).toHaveTextContent("General Assembly members");
    expect(screen.getByRole("link", { name: /^Athletes$/ })).not.toHaveTextContent(
      "General Assembly members",
    );
  });

  // `Link` (from `@/i18n/navigation`) prefixes the locale itself; the segment
  // and query/hash the item declared must still reach the DOM unchanged.
  it("href على الرابط يطابق الوجهة مع بادئة اللغة", () => {
    renderWithIntl(<MegaColumn column={column} currentPath="/" />, "en");
    expect(screen.getByRole("link", { name: /^Athletes$/ })).toHaveAttribute("href", "/en/athletes");
  });
});

describe("بند البث المباشر", () => {
  it("لا يظهر ولا يُعدّ من الأعمدة الفعلية حين لا بث", () => {
    const { container } = renderWithIntl(
      <MegaColumn column={contentColumn} currentPath="/" live={null} />,
      "en",
    );
    expect(screen.queryByRole("link", { name: /Live Stream/i })).not.toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(contentColumn.children.length - 1);
  });

  it("يظهر بعنوانه الحقيقي ورابطه أثناء البث فقط", () => {
    const { rerender } = renderWithIntl(
      <MegaColumn column={contentColumn} currentPath="/" live={null} />,
      "en",
    );
    expect(screen.queryByRole("link", { name: /Live Stream/i })).not.toBeInTheDocument();

    rerender(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <MegaColumn
          column={contentColumn}
          currentPath="/"
          live={{ title: "National Championships — Day 1", href: "/media/videos#live" }}
        />
      </NextIntlClientProvider>,
    );
    const link = screen.getByRole("link", { name: /Live Stream/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("/media/videos#live"));
    expect(link).toHaveTextContent("National Championships — Day 1");
  });

  it("لا يمس البند الحي بقية روابط العمود", () => {
    renderWithIntl(
      <MegaColumn
        column={contentColumn}
        currentPath="/"
        live={{ title: "t", href: "/media/videos#live" }}
      />,
      "en",
    );
    expect(screen.getByRole("link", { name: /^Videos$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^News/ })).toBeInTheDocument();
  });
});
