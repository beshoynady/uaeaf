import type { AnchorHTMLAttributes, ReactNode } from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { MessagesBell } from "./messages-bell";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * The header's bell (owner request 2026-09-22): how many contact messages are
 * still new, and the way to them.
 */
describe("MessagesBell", () => {
  it("names the count in words and opens the messages", () => {
    renderWithIntl(<MessagesBell count={3} />);

    const bell = screen.getByRole("link", { name: "الرسائل، 3 رسائل جديدة" });
    expect(bell.getAttribute("href")).toBe("/messages");
    expect(bell.textContent).toContain("3");
  });

  it("draws no count when nothing is new, and still opens the messages", () => {
    renderWithIntl(<MessagesBell count={0} />);

    const bell = screen.getByRole("link", { name: "الرسائل، لا رسائل جديدة" });
    expect(bell.textContent).toBe("");
  });

  it("keeps a large count to a width the header can hold", () => {
    renderWithIntl(<MessagesBell count={250} />);

    expect(screen.getByRole("link", { name: "الرسائل، 250 رسالة جديدة" }).textContent).toBe("99+");
  });

  it("reads in English under the English locale", () => {
    renderWithIntl(<MessagesBell count={1} />, "en");

    expect(screen.getByRole("link", { name: "Messages, 1 new message" })).toBeInTheDocument();
  });
});
