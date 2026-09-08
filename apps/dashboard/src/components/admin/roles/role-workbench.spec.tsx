import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import type { PermissionResponse, RoleResponse, UserResponse } from "@/lib/api/types";
import { RoleWorkbench } from "./role-workbench";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

const PERMISSIONS: PermissionResponse[] = [
  { _id: "p1", name: { en: "Read users", ar: "" }, resourceType: "users", action: "Read" },
  { _id: "p2", name: { en: "Create users", ar: "" }, resourceType: "users", action: "Create" },
  { _id: "p3", name: { en: "Delete albums", ar: "" }, resourceType: "albums", action: "Delete" },
];

const ROLES: RoleResponse[] = [
  {
    _id: "r-editor",
    name: { en: "Editor", ar: "محرّر" },
    description: { en: "Writes and edits", ar: "يكتب ويحرّر" },
    permissionIds: ["p1"],
    isSystemRole: false,
  },
  {
    _id: "r-super",
    name: { en: "Super Admin", ar: "مسؤول عام" },
    description: null,
    permissionIds: ["p1", "p2", "p3"],
    isSystemRole: true,
  },
];

const USERS: UserResponse[] = [
  {
    id: "u1",
    name: { en: "Noor", ar: "نور" },
    email: "noor@uaeaf.ae",
    roleIds: ["r-editor"],
    personId: null,
    accountStatus: "Active",
    lastLogin: null,
    photoId: null,
    preferredLanguage: null,
    preferredTheme: null,
  },
];

const ALL_GRANTS = [
  { resourceType: "users", action: "Read" },
  { resourceType: "users", action: "Create" },
  { resourceType: "albums", action: "Delete" },
];

function renderWorkbench(over: Partial<Parameters<typeof RoleWorkbench>[0]> = {}) {
  return renderWithIntl(
    <RoleWorkbench
      roles={ROLES}
      permissions={PERMISSIONS}
      users={USERS}
      actorGrants={ALL_GRANTS}
      locale="ar"
      {...over}
    />,
  );
}

describe("RoleWorkbench", () => {
  it("opens on the first role with its current grants already ticked", () => {
    renderWorkbench();

    expect(screen.getByRole("checkbox", { name: "قراءة — users" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "إنشاء — users" })).not.toBeChecked();
  });

  it("renders an em dash, not a checkbox, for a pair the catalogue does not define", () => {
    // albums has only Delete. An unchecked box under Create would invite a
    // click asking for a permission that guards no route.
    renderWorkbench();

    expect(screen.queryByRole("checkbox", { name: "إنشاء — albums" })).toBeNull();
    expect(screen.getAllByLabelText("غير موجودة لهذا المورد").length).toBeGreaterThan(0);
  });

  it("keeps save shut until something actually changes", async () => {
    const user = userEvent.setup();
    renderWorkbench();

    expect(screen.getByRole("button", { name: "حفظ التغييرات" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "إنشاء — users" }));
    expect(screen.getByRole("button", { name: "حفظ التغييرات" })).toBeEnabled();
  });

  it("says how many people a change will reach, and that it is immediate", () => {
    renderWorkbench();
    expect(screen.getByText(/سيسري على مستخدم واحد في طلبه التالي/)).toBeInTheDocument();
  });

  it("sends the whole resulting list, because the API replaces rather than merges", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ _id: "r-editor" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWorkbench();

    await user.click(screen.getByRole("checkbox", { name: "إنشاء — users" }));
    await user.click(screen.getByRole("button", { name: "حفظ التغييرات" }));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/admin/roles/r-editor/permissions");
    expect(JSON.parse(init.body as string).permissionIds.sort()).toEqual(["p1", "p2"]);
  });

  it("locks a system role completely rather than letting the API refuse the save", async () => {
    const user = userEvent.setup();
    renderWorkbench();

    await user.click(screen.getByRole("button", { name: /مسؤول عام/ }));

    expect(screen.getByText("دور نظام — للعرض فقط")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "قراءة — users" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "حفظ التغييرات" })).toBeNull();
  });

  it("cannot tick a permission the signed-in administrator does not hold", () => {
    renderWorkbench({ actorGrants: [{ resourceType: "users", action: "Read" }] });

    expect(screen.getByRole("checkbox", { name: "إنشاء — users" })).toBeDisabled();
  });

  it("explains, before the click, why a role holding an un-held permission cannot be saved", async () => {
    // assertGrantable walks the whole submitted list, so the save would 403
    // with a message that names no permission. Naming them here is the
    // difference between a dead end and an instruction.
    const user = userEvent.setup();
    renderWorkbench({
      roles: [{ ...ROLES[0], permissionIds: ["p1", "p3"] }],
      actorGrants: [{ resourceType: "users", action: "Read" }],
    });

    expect(screen.getByText("لا يمكنك حفظ هذا الدور")).toBeInTheDocument();
    expect(screen.getByText("albums:Delete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حفظ التغييرات" })).toBeDisabled();

    // Unticking is still allowed even though ticking never was — that is the
    // only way out of the state.
    await user.click(screen.getByRole("checkbox", { name: "حذف — albums" }));
    expect(screen.getByRole("button", { name: "حفظ التغييرات" })).toBeEnabled();
  });

  it("surfaces the API's own refusal rather than a generic failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: "systemRole" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const user = userEvent.setup();
    renderWorkbench();

    await user.click(screen.getByRole("checkbox", { name: "إنشاء — users" }));
    await user.click(screen.getByRole("button", { name: "حفظ التغييرات" }));

    expect(await screen.findByText("هذا دور نظام ولا يقبل التعديل.")).toBeInTheDocument();
  });

  it("still lists the roles when the catalogue is out of reach", () => {
    // permissions:Read is a separate grant from roles:Read.
    renderWorkbench({ permissions: [] });

    expect(screen.getByText("كتالوج الصلاحيات غير متاح لك")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /محرّر/ })).toBeInTheDocument();
  });

  it("says holder counts are unavailable rather than reporting them as zero", () => {
    renderWorkbench({ users: [] });

    const facts = screen.getByRole("region", { name: "تفاصيل الدور" });
    expect(within(facts).getByText("غير متاح")).toBeInTheDocument();
  });

  it("filters the matrix by resource", async () => {
    const user = userEvent.setup();
    renderWorkbench();

    await user.type(screen.getByPlaceholderText(/ابحث في الموارد/), "albums");
    expect(screen.queryByRole("checkbox", { name: "قراءة — users" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "حذف — albums" })).toBeInTheDocument();
  });
});
