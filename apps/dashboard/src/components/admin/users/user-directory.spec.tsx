import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
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
    // The provider comes from the `(app)` layout in production; the directory
    // is rendered here on its own, so the harness supplies it.
    <ToastProvider>
      <UserDirectory
        users={USERS}
        roles={ROLES}
        actorUserId="noor"
        canAssign
        canCreate={false}
        people={[]}
        locale="ar"
        {...over}
      />
    </ToastProvider>,
    over.locale,
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

    // Scoped to the live line. The same sentence also sits inside the
    // confirmation dialog, which is mounted but closed, and getByText does not
    // skip hidden content the way getByRole does. The reader sees one of them.
    expect(
      screen.getByText(/سيُنهى فورًا كل جلسة مفتوحة لهذا الحساب/, { selector: "[aria-live]" }),
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
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "عطّل الحساب" }));

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

  /** The panel stays open after a save, because it holds a second form. So
   *  without a word for it, "did that save?" has no answer on this screen. */
  it("announces saved roles, naming whose they are", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));
    await user.click(screen.getByRole("checkbox", { name: /محرّر/ }));
    await user.click(screen.getByRole("button", { name: "حفظ الأدوار" }));

    const region = await screen.findByRole("region", { name: "إشعارات الإجراءات" });
    expect(await within(region).findByText("حُفظت الأدوار")).toBeInTheDocument();
    expect(within(region).getByText(/سالم/)).toBeInTheDocument();
  });

  /**
   * The warning before the click says sessions WILL end; this says they DID.
   * Signing someone out of every device is the kind of consequence that has
   * to be confirmed after the fact, not only predicted before it.
   */
  it("confirms afterwards that the suspension ended the account's sessions", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));
    await user.selectOptions(screen.getByLabelText("حالة الحساب"), "Deactivated");
    await user.click(screen.getByRole("button", { name: "تطبيق الحالة" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "عطّل الحساب" }));

    const region = await screen.findByRole("region", { name: "إشعارات الإجراءات" });
    expect(await within(region).findByText("تغيّرت حالة الحساب")).toBeInTheDocument();
    expect(within(region).getByText(/أُنهيت كل جلساته المفتوحة/)).toBeInTheDocument();
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

/**
 * The access panel holds two forms, and closing it used to throw away the
 * first one's unsaved ticks: applying a status closed the whole panel, so did
 * the roles form's own Cancel, so did the row's toggle and opening another
 * row, and a filter that hid the row unmounted it. The screen already computed
 * that there was something to lose, and closed anyway.
 */
describe("the access panel keeps unsaved role changes", () => {
  it("keeps the role ticks when the account's status is applied", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    const user = userEvent.setup();
    renderDirectory();

    const salem = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(salem).getByRole("button", { name: "تعديل الوصول" }));
    await user.click(screen.getByRole("checkbox", { name: /محرّر/ }));
    // Suspended to Active ends no session, so it applies without a confirmation.
    await user.selectOptions(screen.getByLabelText("حالة الحساب"), "Active");
    await user.click(screen.getByRole("button", { name: "تطبيق الحالة" }));

    await screen.findByText("تغيّرت حالة الحساب");
    expect(screen.getByRole("checkbox", { name: /محرّر/ })).toBeChecked();
  });

  it("will not close the panel, or open another, while roles are unsaved", async () => {
    const user = userEvent.setup();
    renderDirectory();

    const salem = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(salem).getByRole("button", { name: "تعديل الوصول" }));
    await user.click(screen.getByRole("checkbox", { name: /محرّر/ }));

    const close = within(salem).getByRole("button", { name: "إغلاق" });
    expect(close).toBeDisabled();
    // Described by the line that already says what is unsaved, so a screen
    // reader hears why the control is refused, not only that it is.
    expect(close).toHaveAccessibleDescription(/إضافة/);
    const hind = screen.getByRole("row", { name: /هند/ });
    expect(within(hind).getByRole("button", { name: "تعديل الوصول" })).toBeDisabled();
  });

  it("discards only the role changes when they are cancelled, and stays open", async () => {
    const user = userEvent.setup();
    renderDirectory();

    const salem = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(salem).getByRole("button", { name: "تعديل الوصول" }));
    await user.click(screen.getByRole("checkbox", { name: /محرّر/ }));
    await user.click(screen.getByRole("button", { name: "إلغاء" }));

    expect(screen.getByRole("checkbox", { name: /محرّر/ })).not.toBeChecked();
    expect(screen.getByLabelText("حالة الحساب")).toBeInTheDocument();
    expect(within(salem).getByRole("button", { name: "إغلاق" })).toBeEnabled();
  });

  it("keeps the account being edited on screen when a filter would hide it", async () => {
    const user = userEvent.setup();
    renderDirectory();

    const salem = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(salem).getByRole("button", { name: "تعديل الوصول" }));
    await user.click(screen.getByRole("checkbox", { name: /محرّر/ }));
    // Salem is suspended: this filter would take the row, and the panel
    // holding the tick, off the page.
    await user.selectOptions(screen.getByLabelText("تصفية حسب الحالة"), "Active");

    expect(screen.getByRole("checkbox", { name: /محرّر/ })).toBeChecked();
  });
});

/**
 * Suspending or deactivating an account ends every session its holder has, on
 * every device, at once. That is asked about first, the way archiving a role
 * is; reactivating ends nothing and is not.
 */
describe("changing an account's status", () => {
  it("asks before ending every session the account holds", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));
    await user.selectOptions(screen.getByLabelText("حالة الحساب"), "Deactivated");
    await user.click(screen.getByRole("button", { name: "تطبيق الحالة" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/سالم/);
    expect(dialog).toHaveTextContent(/كل جلسة مفتوحة/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /** The confirming button names the act that happens, not its category, the
   *  way "Archive role" does. A category such as "Change status" reads the
   *  same in front of a suspension and a deactivation. */
  it.each([
    { locale: "ar", account: "هند", status: "Suspended", confirm: "أوقف الحساب" },
    { locale: "ar", account: "سالم", status: "Deactivated", confirm: "عطّل الحساب" },
    { locale: "en", account: "Hind", status: "Suspended", confirm: "Suspend account" },
    { locale: "en", account: "Salem", status: "Deactivated", confirm: "Deactivate account" },
  ] as const)("names the $status act on the confirming button ($locale)", async ({ locale, account, status, confirm }) => {
    const words = {
      ar: { edit: "تعديل الوصول", field: "حالة الحساب", apply: "تطبيق الحالة" },
      en: { edit: "Edit access", field: "Account status", apply: "Apply status" },
    }[locale];
    const user = userEvent.setup();
    renderDirectory({ locale });

    const row = screen.getByRole("row", { name: new RegExp(account) });
    await user.click(within(row).getByRole("button", { name: words.edit }));
    await user.selectOptions(screen.getByLabelText(words.field), status);
    await user.click(screen.getByRole("button", { name: words.apply }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: confirm })).toBeInTheDocument();
  });

  it("changes nothing when the confirmation is cancelled", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));
    await user.selectOptions(screen.getByLabelText("حالة الحساب"), "Deactivated");
    await user.click(screen.getByRole("button", { name: "تطبيق الحالة" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "إلغاء" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  /** A boundary guard, not a red test: it passes before the change and must
   *  keep passing after it, so the confirmation stays scoped to changes that
   *  actually end sessions. */
  it("does not ask before reactivating an account, which ends nothing", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));
    await user.selectOptions(screen.getByLabelText("حالة الحساب"), "Active");
    await user.click(screen.getByRole("button", { name: "تطبيق الحالة" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the apply button's name while the change is sent, and marks it busy", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const user = userEvent.setup();
    renderDirectory();

    const row = screen.getByRole("row", { name: /سالم/ });
    await user.click(within(row).getByRole("button", { name: "تعديل الوصول" }));
    await user.selectOptions(screen.getByLabelText("حالة الحساب"), "Active");
    await user.click(screen.getByRole("button", { name: "تطبيق الحالة" }));

    expect(screen.getByRole("button", { name: "تطبيق الحالة" })).toHaveAttribute("aria-busy", "true");
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
