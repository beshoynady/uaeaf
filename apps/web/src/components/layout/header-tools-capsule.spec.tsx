import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { HeaderToolsCapsule } from "./header-tools-capsule";

describe("كبسولة الأدوات", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-switching");
    localStorage.clear();
  });

  // `getAllByRole("button")` cannot see the language control — it is a real
  // navigation `Link` (role `link`, asserted below), not a button acting in
  // place — so order is read from `data-tool` directly, on all three.
  it("ثلاثة عناصر بترتيب بحث ثم لغة ثم وضع", () => {
    const { container } = renderWithIntl(<HeaderToolsCapsule layout="row" onOpenSearch={vi.fn()} />);
    const names = Array.from(container.querySelectorAll("[data-tool]")).map((node) =>
      node.getAttribute("data-tool"),
    );
    expect(names).toEqual(["search", "language", "theme"]);
  });

  it("مفتاح الوضع switch باسم ثابت", () => {
    renderWithIntl(<HeaderToolsCapsule layout="row" onOpenSearch={vi.fn()} />, "en");
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked");
    expect(toggle).toHaveAccessibleName("Dark mode");
  });

  it("زر البحث يعلن اختصاره ويستدعي الفاتح", async () => {
    const onOpenSearch = vi.fn();
    renderWithIntl(<HeaderToolsCapsule layout="row" onOpenSearch={onOpenSearch} />, "en");
    const search = screen.getByRole("button", { name: /search/i });
    expect(search).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K");
    await userEvent.click(search);
    expect(onOpenSearch).toHaveBeenCalledOnce();
  });

  it("مبدل اللغة يسمي الوجهة بحرفها ويحمل lang", () => {
    renderWithIntl(<HeaderToolsCapsule layout="row" onOpenSearch={vi.fn()} />, "ar");
    const language = screen.getByRole("link", { name: /English/ });
    expect(language).toHaveAttribute("lang", "en");
    expect(language).toHaveAttribute("hrefLang", "en");
  });

  // Step 4c: while the device's high-contrast setting overrides `data-theme`,
  // the switch still reports the STORED preference, not the applied attribute.
  it("المفتاح يعرض المحفوظ لا المطبَّق تحت التباين العالي", () => {
    localStorage.setItem("uaeaf-theme", "dark");
    document.documentElement.setAttribute("data-theme", "high-contrast");
    renderWithIntl(<HeaderToolsCapsule layout="row" onOpenSearch={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });
});
