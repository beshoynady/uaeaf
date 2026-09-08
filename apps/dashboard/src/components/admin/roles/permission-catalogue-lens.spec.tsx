import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { PermissionCatalogueLens } from "./permission-catalogue-lens";
import type { PermissionResponse, RoleResponse } from "@/lib/api/types";

/**
 * The second lens on the same relation.
 *
 * Roles and permissions are one bipartite graph, and the old `/permissions`
 * screen was a degenerate projection of it: a flat list that could say what
 * a permission *is* but never who holds it. Merging the two screens (the
 * approved IA defines one, "Roles & Permissions") only counts as a merge if
 * that content survives — so this lens carries it and answers the question
 * the flat table could not.
 */
const PERMISSIONS: PermissionResponse[] = [
  { _id: "p1", name: { en: "Read athletes", ar: "قراءة الرياضيين" }, resourceType: "athletes", action: "Read" },
  { _id: "p2", name: { en: "Delete athletes", ar: "حذف الرياضيين" }, resourceType: "athletes", action: "Delete" },
  { _id: "p3", name: { en: "Export users", ar: "تصدير المستخدمين" }, resourceType: "users", action: "Export" },
];

const ROLES: RoleResponse[] = [
  { _id: "r1", name: { en: "Super Admin", ar: "مسؤول عام" }, description: null, permissionIds: ["p1", "p2"], isSystemRole: true },
  { _id: "r2", name: { en: "Editor", ar: "محرّر" }, description: null, permissionIds: ["p1"], isSystemRole: false },
] as RoleResponse[];

function render(over: Partial<React.ComponentProps<typeof PermissionCatalogueLens>> = {}) {
  return renderWithIntl(
    <PermissionCatalogueLens
      permissions={PERMISSIONS}
      roles={ROLES}
      selectedRoleId="r2"
      locale="ar"
      {...over}
    />,
  );
}

describe("PermissionCatalogueLens", () => {
  it("lists every permission by its bilingual name", () => {
    render();

    expect(screen.getByText("قراءة الرياضيين")).toBeInTheDocument();
    expect(screen.getByText("تصدير المستخدمين")).toBeInTheDocument();
  });

  it("says how many roles hold each permission", () => {
    render();

    const row = screen.getByRole("row", { name: /قراءة الرياضيين/ });
    // Western digits, not Arabic-Indic: every Arabic frame in the documented
    // design (`docs/design-specs/`) sets figures as 1974, 1,240+, +30%.
    expect(within(row).getByText("الأدوار: 2")).toBeInTheDocument();
  });

  it("names a permission nobody holds, rather than showing a blank", () => {
    // A permission no role carries guards a route nobody can reach. The old
    // flat catalogue could not surface that at all.
    render();

    const row = screen.getByRole("row", { name: /تصدير المستخدمين/ });
    expect(within(row).getByText("لا دور")).toBeInTheDocument();
  });

  it("marks what the selected role holds", () => {
    render();

    const held = screen.getByRole("row", { name: /قراءة الرياضيين/ });
    const notHeld = screen.getByRole("row", { name: /حذف الرياضيين/ });

    expect(held).toHaveAttribute("data-selected-role-holds", "true");
    expect(notHeld).toHaveAttribute("data-selected-role-holds", "false");
  });

  it("filters on the technical identifier as well as the label", async () => {
    const user = userEvent.setup();
    render();

    await user.type(screen.getByRole("searchbox"), "users");

    expect(screen.getByText("تصدير المستخدمين")).toBeInTheDocument();
    expect(screen.queryByText("قراءة الرياضيين")).not.toBeInTheDocument();
  });

  it("says so when a search matches nothing", async () => {
    const user = userEvent.setup();
    render();

    await user.type(screen.getByRole("searchbox"), "zzzz");

    expect(screen.getByText("لا صلاحيات مطابقة.")).toBeInTheDocument();
  });

  it("renders without a selected role", () => {
    // Someone holding `permissions:Read` but not `roles:Read` reaches this
    // screen with a catalogue and no roles at all.
    render({ selectedRoleId: null, roles: [] });

    expect(screen.getByText("قراءة الرياضيين")).toBeInTheDocument();
    expect(screen.getAllByText("لا دور")).toHaveLength(3);
  });
});
