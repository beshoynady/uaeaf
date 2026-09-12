import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * CMP-CONFIRMATIONDIALOG-001's two emphatic rules.
 *
 * jsdom implements none of `<dialog>`'s methods, so `vitest.setup.ts` shims
 * them. That matters for how these tests are written: anything the shim
 * supplies is the shim being tested, not a browser. So each rule is asserted
 * twice where it can be — once against the structure that makes the browser
 * behave (which is shim-free and is the actual guarantee), and once against
 * the behaviour, which is marked where it leans on the shim.
 *
 * Not covered here at all, and verified by opening the page: the top layer,
 * the backdrop, the focus trap, and the inertness of everything behind it.
 */
function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const result = render(
    <ConfirmDialog
      open
      title="استرجاع النسخة ٣"
      confirmLabel="استرجاع"
      cancelLabel="إلغاء"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    >
      يعيد هذا النص كمسودة. لا يُنشر شيء.
    </ConfirmDialog>,
  );
  return { ...result, onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("opens as a modal, named and described by its own content", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "استرجاع النسخة ٣" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("يعيد هذا النص كمسودة");
  });

  it("renders nothing visible while closed", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // "MUST NOT be accidentally confirmed by a default-focused action."
  //
  // The guarantee itself: a modal focuses its first focusable descendant, so
  // being first in the DOM is what puts the safe button under the reader's
  // first keystroke. Asserted on the structure, which no shim supplies.
  it("makes Cancel the first focusable thing in the dialog", () => {
    const { container } = renderDialog();

    const focusable = container.querySelectorAll("button, [href], input, select, textarea, [tabindex]");
    expect(focusable[0]).toHaveAccessibleName("إلغاء");
  });

  // "`Enter` MUST NOT automatically confirm irreversible actions."
  //
  // Also structural: `Enter` confirms implicitly only when something can be
  // implicitly submitted. There is no form here and no submit button, so
  // there is nothing for it to reach.
  it("contains nothing that Enter could implicitly submit", () => {
    const { container } = renderDialog();

    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    expect(container.querySelector("[autofocus]")).toBeNull();
  });

  it("cancels rather than confirms when Enter is pressed on open", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    // Leans on the shim's "focus the first focusable descendant" rule, which
    // is the browser rule the structural test above actually relies on.
    await user.keyboard("{Enter}");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("confirms when the action itself is pressed", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole("button", { name: "استرجاع" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // Dismissible, per CMP-DIALOG-001 — this is not a Blocking Dialog. The
  // `cancel` event Escape fires comes from the shim here.
  it("cancels on Escape", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows the action first and the way out second, whichever is focused", () => {
    renderDialog();

    const confirm = screen.getByRole("button", { name: "استرجاع" });
    const cancel = screen.getByRole("button", { name: "إلغاء" });
    // Cancel is first in the DOM so it takes focus; `order` puts the action
    // first on screen.
    expect(cancel.compareDocumentPosition(confirm)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(confirm.className).toContain("order-1");
    expect(cancel.className).toContain("order-2");
  });

  it("locks both buttons while the confirmed action runs", () => {
    renderDialog({ busy: true });

    expect(screen.getByRole("button", { name: "استرجاع" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeDisabled();
  });

  it("ignores Escape while the action runs, so a half-done operation is not abandoned", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog({ busy: true });

    await user.keyboard("{Escape}");

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("uses the destructive variant when told the action removes something", () => {
    renderDialog({ tone: "destructive", confirmLabel: "حذف" });

    expect(screen.getByRole("button", { name: "حذف" }).className).toMatch(/--color-semantic-error/);
  });
});
