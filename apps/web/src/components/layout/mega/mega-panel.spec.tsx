import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { PRIMARY_NAV } from "@/lib/navigation";
import { MegaPanel } from "./mega-panel";

// `about` carries two columns (The Federation, Governance); `media` carries
// one (Content). Real tree entries rather than a fixture, so the test fails
// if the panel and the tree it renders from ever disagree about shape.
const aboutItem = PRIMARY_NAV.find((item) => item.key === "about")!;
const mediaItem = PRIMARY_NAV.find((item) => item.key === "media")!;

describe("لوحة mega", () => {
  it("region باسم البند", () => {
    renderWithIntl(
      <MegaPanel
        id="p"
        item={aboutItem}
        open
        columns={aboutItem.children!}
        feature={null}
        currentPath="/"
      />,
      "en",
    );
    expect(screen.getByRole("region", { name: /About/ })).toBeInTheDocument();
  });

  // Disclosure navigation, not an application menu (WAI-ARIA APG): a `menu`
  // role would strip every link inside it of link semantics.
  it("ليست role=menu", () => {
    const { container } = renderWithIntl(
      <MegaPanel
        id="p"
        item={aboutItem}
        open
        columns={aboutItem.children!}
        feature={null}
        currentPath="/"
      />,
      "en",
    );
    expect(container.querySelectorAll('[role="menu"], [role="menuitem"]')).toHaveLength(0);
  });

  it("العمود الغائب لا يترك فجوة — الشبكة تعدّ الأعمدة الموجودة", () => {
    const { container } = renderWithIntl(
      <MegaPanel
        id="p"
        item={mediaItem}
        open
        columns={mediaItem.children!}
        feature={null}
        currentPath="/"
      />,
      "en",
    );
    expect(container.querySelector("[data-columns]")).toHaveAttribute("data-columns", "1");
  });

  // `data-columns` is a count fed to CSS, not a badge: it has to track the
  // number of columns actually rendered, or a regression that drops a column
  // while leaving the attribute stale would pass unnoticed.
  it("data-columns يطابق عدد الأعمدة المرسومة فعليًا", () => {
    const { container } = renderWithIntl(
      <MegaPanel
        id="p"
        item={aboutItem}
        open
        columns={aboutItem.children!}
        feature={null}
        currentPath="/"
      />,
      "en",
    );
    const panel = container.querySelector("[data-columns]")!;
    const headings = panel.querySelectorAll('[role="heading"][aria-level="2"], h2');
    expect(panel).toHaveAttribute("data-columns", String(aboutItem.children!.length));
    expect(headings).toHaveLength(aboutItem.children!.length);
  });

  // Same discipline for the one-column case: closing up the grid must not
  // mean the column itself silently disappears.
  it("لوحة بعمود واحد ترسم عمودًا واحدًا فقط", () => {
    const { container } = renderWithIntl(
      <MegaPanel
        id="p"
        item={mediaItem}
        open
        columns={mediaItem.children!}
        feature={null}
        currentPath="/"
      />,
      "en",
    );
    const panel = container.querySelector("[data-columns]")!;
    const headings = panel.querySelectorAll("h2");
    expect(headings).toHaveLength(1);
  });

  // `data-open` is the only signal `nav-float`'s CSS reads to decide whether
  // the panel is visible; a regression that stops setting it would pass a
  // test that only checked the region existed.
  it("data-open يعكس حالة الفتح", () => {
    const closed = renderWithIntl(
      <MegaPanel
        id="p"
        item={mediaItem}
        open={false}
        columns={mediaItem.children!}
        feature={null}
        currentPath="/"
      />,
      "en",
    );
    expect(closed.container.querySelector("[data-columns]")).toHaveAttribute("data-open", "false");
    closed.unmount();

    const opened = renderWithIntl(
      <MegaPanel
        id="p"
        item={mediaItem}
        open
        columns={mediaItem.children!}
        feature={null}
        currentPath="/"
      />,
      "en",
    );
    expect(opened.container.querySelector("[data-columns]")).toHaveAttribute("data-open", "true");
  });

  it("فتحة البطاقة المميزة تعرض المحتوى المُمرَّر", () => {
    renderWithIntl(
      <MegaPanel
        id="p"
        item={mediaItem}
        open
        columns={mediaItem.children!}
        feature={<div data-testid="feature-card">Featured</div>}
        currentPath="/"
      />,
      "en",
    );
    expect(screen.getByTestId("feature-card")).toBeInTheDocument();
  });

  it("يمرر currentPath إلى الأعمدة — aria-current على الرابط المطابق فقط", () => {
    renderWithIntl(
      <MegaPanel
        id="p"
        item={aboutItem}
        open
        columns={aboutItem.children!}
        feature={null}
        currentPath="/about/board-members"
      />,
      "en",
    );
    expect(screen.getByRole("link", { name: /Board of Directors/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("id اللوحة يطابق ما يُمرَّر — يوصله زر الإفصاح عبر aria-controls", () => {
    const { container } = renderWithIntl(
      <MegaPanel
        id="about-panel"
        item={aboutItem}
        open
        columns={aboutItem.children!}
        feature={null}
        currentPath="/"
      />,
      "en",
    );
    expect(container.querySelector("#about-panel")).toBeInTheDocument();
  });
});
