import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import type { RoleResponse, UserResponse } from "@/lib/api/types";
import { UserDirectory } from "./user-directory";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

const ROLES: RoleResponse[] = [
  {
    _id: "r-editor",
    name: { en: "Editor", ar: "محرّر" },
    description: null,
    permissionIds: [],
    isSystemRole: false,
  },
  {
    _id: "r-super",
    name: { en: "Super Admin", ar: "مسؤول عام" },
    description: null,
    permissionIds: [],
    isSystemRole: true,
  },
];

function user(id: string, over: Partial<UserResponse> = {}): UserResponse {
  return {
    id,
    name: { en: id, ar: id },
    email: `${id}@uaeaf.ae`,
    roleIds: [],
    personId: null,
    accountStatus: "Active",
    lastLogin: null,
    photoId: null,
    preferredLanguage: null,
    preferredTheme: null,
    ...over,
  };
}

const USERS: UserResponse[] = [
  user("noor", { name: { en: "Noor", ar: "نور" }, roleIds: ["r-editor"] }),
  user("salem", { name: { en: "Salem", ar: "سالم" }, accountStatus: "Suspended" }),
  user("hind", { name: { en: "Hind", ar: "هند" }, roleIds: ["r-gone"], accountStatus: "Deactivated" }),
];

function renderDirectory(over: Partial<Parameters<typeof UserDirectory>[0]> = {}) {
  return renderWithIntl(
    <UserDirectory
      users={USERS}
      roles={ROLES}
      actorUserId="noor"
      canAssign
      canCreate={false}
      people={[]}
      locale="ar"
      {...over}
    />,
  );
}

describe("UserDirectory", () => {
  it("names each role instead of counting them", () => {
    // The count answered "does this person have access at all", which the
    // status column already answers. The name answers what they can do.
    renderDirectory();
    // Scoped to the table: the role filter's own options carry the same
    // words, and matching those would prove nothing about the row.
    expect(within(screen.getByRole("table")).getByText("محرّر")).toBeInTheDocument();
  });

  it("shows a role id that no longer resolves as archived rather than dropping it", () => {
    // Archiving a role does not clear it from the users who held it, so this
    // is a real state the directory has to be able to display.
    renderDirectory();
    expect(screen.getByText("دور مؤرشف")).toBeInTheDocument();
  });

  it("renders the deactivated status the API actually produces", () => {
    // This rendered a raw message key until the union was corrected on
    // 2026-09-08 — the type listed `Inactive`, which the API never emits.
    renderDirectory();
    expect(within(screen.getByRole("table")).getByText("معطّل")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    renderDirectory();

    await user.selectOptions(screen.getByLabelText("تصفية حسب الحالة"), "Suspended");
    expect(screen.getByText("سالم")).toBeInTheDocument();
    expect(screen.queryByText("نور")).toBeNull();
  });

  it("filters to the accounts holding no role at all", async () => {
    const user = userEvent.setup();
    renderDirectory();

    await user.selectOptions(screen.getByLabelText("تصفية حسب الدور"), "none");
    expect(screen.getByText("سالم")).toBeInTheDocument();
    expect(screen.queryByText("نور")).toBeNull();
  });

  it("searches name and email together", async () => {
    const user = userEvent.setup();
    renderDirectory();

    await user.type(screen.getByPlaceholderText(/ابحث بالاسم أو البريد/), "salem@");
    expect(screen.getByText("سالم")).toBeInTheDocument();
    expect(screen.queryByText("هند")).toBeNull();
  });

  it("opens on your own row but refuses both self-edits inside", async () => {
    // The API refuses a self role-assignment AND a self status change. The
    // panel is where both refusals are stated — a disabled row button would
    // leave the reason nowhere on the page.
    const user = userEvent.setup();
    renderDirectory();

    const ownRow = screen.getByRole("row", { name: /نور/ });
    await user.click(within(ownRow).getByRole("button", { name: "تعديل الوصول" }));

    expect(screen.getByText("لا يمكنك تعديل أدوار حسابك بنفسك")).toBeInTheDocument();
    expect(screen.getByText("لا يمكنك تغيير حالة حسابك بنفسك. اطلب ذلك من مسؤول آخر.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حفظ الأدوار" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "تطبيق الحالة" })).toBeDisabled();
  });

  it("offers the three account states the API accepts", async () => {
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));

    const select = screen.getByLabelText("حالة الحساب");
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "نشط",
      "موقوف",
      "معطّل",
    ]);
  });

  it("warns that a suspension ends every live session before it is applied", async () => {
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /هند/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));
    await user.selectOptions(screen.getByLabelText("حالة الحساب"), "Suspended");

    expect(
      screen.getByText(/سيُنهى فورًا كل جلسة مفتوحة لهذا الحساب/),
    ).toBeInTheDocument();
  });

  it("sends the chosen status to the account's own route", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "salem" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));
    await user.selectOptions(screen.getByLabelText("حالة الحساب"), "Deactivated");
    await user.click(screen.getByRole("button", { name: "تطبيق الحالة" }));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/admin/users/salem/status");
    expect(JSON.parse(init.body as string)).toEqual({ accountStatus: "Deactivated" });
  });

  it("sends the whole resulting role list, because the API replaces rather than merges", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "salem" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));
    await user.click(screen.getByRole("checkbox", { name: /محرّر/ }));
    await user.click(screen.getByRole("button", { name: "حفظ الأدوار" }));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/admin/users/salem/roles");
    expect(JSON.parse(init.body as string)).toEqual({ roleIds: ["r-editor"] });
  });

  it("does not offer an archived role for assignment", async () => {
    // The API stores a role id without checking it exists, so offering one
    // would write a reference that grants nothing.
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /هند/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));

    expect(screen.getAllByRole("checkbox")).toHaveLength(ROLES.length);
  });

  it("hides the editing controls when the user may only read", () => {
    renderDirectory({ canAssign: false });

    expect(screen.queryByRole("button", { name: "تعديل الوصول" })).toBeNull();
    expect(screen.getByText("عرض فقط")).toBeInTheDocument();
  });
});

describe("UserDirectory — creating an account", () => {
  it("offers the form only to someone who may create accounts", () => {
    // `users:Create` is a separate grant from `users:Update`. Showing the
    // button without it would let an administrator fill a whole form and
    // discover the refusal at the end.
    renderDirectory({ canCreate: false });
    expect(screen.queryByRole("button", { name: "حساب جديد" })).not.toBeInTheDocument();

    cleanup();
    renderDirectory({ canCreate: true });
    expect(screen.getByRole("button", { name: "حساب جديد" })).toBeInTheDocument();
  });

  it("opens the form in place, above the list it adds to", async () => {
    const user = userEvent.setup();
    renderDirectory({ canCreate: true });

    await user.click(screen.getByRole("button", { name: "حساب جديد" }));

    expect(screen.getByLabelText("البريد الإلكتروني")).toBeInTheDocument();
    // The directory stays on screen — it is the context the decision to
    // create the account was made in.
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
