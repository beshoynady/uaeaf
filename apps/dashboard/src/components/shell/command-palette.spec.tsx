import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import arabic from "../../../messages/ar.json";
import { renderWithIntl } from "@/test/render";
import type { NavItem } from "@/lib/navigation";
import { CommandPalette, normalizeForSearch } from "./command-palette";

const { Shell, Nav } = arabic;

const items: NavItem[] = [
  { key: "overview", href: "/", requires: null },
  { key: "roles", href: "/roles", requires: null },
  {
    key: "news",
    href: "/news",
    requires: null,
    children: [
      { key: "newsList", href: "/news", requires: null },
    ],
  },
  {
    key: "usersAccess",
    href: "/approval-policies",
    requires: null,
    children: [{ key: "approvalPolicies", href: "/approval-policies", requires: null }],
  },
];

const dialog = () => document.querySelector("dialog") as HTMLDialogElement;
const results = () => within(dialog()).queryAllByRole("link").map((link) => link.textContent ?? "");

describe("normalizeForSearch", () => {
  it("matches a word however its alef is written", () => {
    // Arabic is typed with and without hamza interchangeably; "الادوار"
    // finding nothing because the label says "الأدوار" is a search that fails
    // the reader for a keystroke they never think about.
    expect(normalizeForSearch("الأدوار")).toBe(normalizeForSearch("الادوار"));
    expect(normalizeForSearch("إعتماد")).toBe(normalizeForSearch("اعتماد"));
  });

  it("ignores diacritics and case", () => {
    expect(normalizeForSearch("الرُّؤية")).toBe(normalizeForSearch("الرؤية"));
    expect(normalizeForSearch("Users")).toBe("users");
  });
});

describe("CommandPalette", () => {
  it("names its keyboard shortcut to assistive technology", () => {
    renderWithIntl(<CommandPalette items={items} />);

    const trigger = screen.getByRole("button", { name: Shell.searchScreens });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K");
  });

  it("opens on Ctrl+K with the search field ready", async () => {
    renderWithIntl(<CommandPalette items={items} />);

    await userEvent.keyboard("{Control>}k{/Control}");

    expect(dialog().open).toBe(true);
    expect(screen.getByRole("searchbox", { name: Shell.searchScreens })).toHaveFocus();
  });

  it("opens on ⌘K as well", async () => {
    renderWithIntl(<CommandPalette items={items} />);

    await userEvent.keyboard("{Meta>}k{/Meta}");

    expect(dialog().open).toBe(true);
  });

  it("offers only the screens it was given, each under its group", async () => {
    // The items arrive filtered by the reader's permissions, so the search
    // never offers a screen the menu hides.
    renderWithIntl(<CommandPalette items={items} />);
    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));

    expect(results()).toHaveLength(4);
    expect(within(dialog()).getByRole("link", { name: new RegExp(Nav.approvalPolicies) })).toHaveTextContent(Nav.usersAccess);
  });

  it("narrows the screens as the reader types", async () => {
    renderWithIntl(<CommandPalette items={items} />);
    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));

    await userEvent.type(screen.getByRole("searchbox"), "الادوار");

    expect(results()).toEqual([Nav.roles]);
  });

  it("says plainly when nothing matches", async () => {
    renderWithIntl(<CommandPalette items={items} />);
    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));

    await userEvent.type(screen.getByRole("searchbox"), "كرة");

    expect(results()).toEqual([]);
    expect(within(dialog()).getByText(Shell.searchNoResults.replace("{query}", "كرة"))).toBeInTheDocument();
  });

  it("moves from the field into the results with the down arrow", async () => {
    renderWithIntl(<CommandPalette items={items} />);
    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));

    await userEvent.keyboard("{ArrowDown}");
    expect(within(dialog()).getAllByRole("link")[0]).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    expect(within(dialog()).getAllByRole("link")[1]).toHaveFocus();

    await userEvent.keyboard("{ArrowUp}");
    expect(within(dialog()).getAllByRole("link")[0]).toHaveFocus();
  });

  it("closes on Escape", async () => {
    renderWithIntl(<CommandPalette items={items} />);
    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));

    await userEvent.keyboard("{Escape}");

    expect(dialog().open).toBe(false);
  });

  it("opens again after the browser closed it on its own", async () => {
    // Chrome may close a modal itself (its close watcher), without the
    // `cancel` the component listens for. The component must hear that
    // close, or it still believes it is open and the button does nothing.
    renderWithIntl(<CommandPalette items={items} />);
    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));

    act(() => dialog().close());
    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));

    expect(dialog().open).toBe(true);
  });

  it("closes on the first Escape even with text in the field", async () => {
    // In a search field Chrome spends the first Escape clearing the text and
    // never cancels the dialog. Handled here, one Escape closes it.
    renderWithIntl(<CommandPalette items={items} />);
    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));
    await userEvent.type(screen.getByRole("searchbox"), "الادوار");

    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => {
      screen.getByRole("searchbox").dispatchEvent(escape);
    });

    expect(escape.defaultPrevented).toBe(true);
    expect(dialog().open).toBe(false);
  });

  it("starts empty the next time it opens", async () => {
    renderWithIntl(<CommandPalette items={items} />);
    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));
    await userEvent.type(screen.getByRole("searchbox"), "الادوار");
    await userEvent.keyboard("{Escape}");

    await userEvent.click(screen.getByRole("button", { name: Shell.searchScreens }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(results()).toHaveLength(4);
  });
});
