import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { CreateUserForm } from "./create-user-form";
import type { PersonOption } from "./create-user-form";
import type { RoleResponse } from "@/lib/api/types";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const mock = vi.fn(async (_url: string, _init: RequestInit) => response);
  vi.stubGlobal("fetch", mock);
  return mock;
}

const roles: RoleResponse[] = [
  {
    _id: "a".repeat(24),
    name: { ar: "محرّر", en: "Editor" },
    description: null,
    permissionIds: [],
    isSystemRole: false,
  },
];

const people: PersonOption[] = [{ id: "b".repeat(24), name: { ar: "نورة", en: "Noura" } }];

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("الاسم بالعربية"), "سارة");
  await user.type(screen.getByLabelText("الاسم بالإنجليزية"), "Sara");
  await user.type(screen.getByLabelText("البريد الإلكتروني"), "Sara@UAEAF.ae");
  await user.type(screen.getByLabelText("كلمة المرور الأولية"), "correct horse battery staple");
}

function render(extra: Partial<React.ComponentProps<typeof CreateUserForm>> = {}) {
  return renderWithIntl(
    <CreateUserForm roles={roles} people={people} locale="ar" onDone={vi.fn()} onCancel={vi.fn()} {...extra} />,
  );
}

describe("CreateUserForm", () => {
  it("creates the account, its roles and its personnel link in one request", async () => {
    // One request because it is one intent. Assigning the roles separately
    // would leave an account with no access if the second call failed —
    // which looks provisioned in the directory and is not.
    const fetchMock = stubFetch(new Response(JSON.stringify({ id: "u1" }), { status: 201 }));
    const user = userEvent.setup();
    render();

    await fillRequired(user);
    await user.click(screen.getByRole("checkbox", { name: /محرّر/ }));
    await user.selectOptions(screen.getByLabelText("الربط بسجلّ موظّف"), people[0].id);
    await user.click(screen.getByRole("button", { name: "إنشاء الحساب" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/users");
    expect(JSON.parse(init.body as string)).toEqual({
      name: { ar: "سارة", en: "Sara" },
      email: "Sara@UAEAF.ae",
      password: "correct horse battery staple",
      roleIds: [roles[0]._id],
      personId: people[0].id,
    });
  });

  it("allows an account with no role and no link", async () => {
    // A legitimate state — an account created ahead of the decision about
    // what it should be able to do.
    const fetchMock = stubFetch(new Response("{}", { status: 201 }));
    const user = userEvent.setup();
    render();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "إنشاء الحساب" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.roleIds).toEqual([]);
    expect(body.personId).toBeNull();
  });

  it("refuses to submit a half-filled bilingual name", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 201 }));
    const user = userEvent.setup();
    render();

    await user.type(screen.getByLabelText("الاسم بالعربية"), "سارة");
    await user.type(screen.getByLabelText("البريد الإلكتروني"), "sara@uaeaf.ae");
    await user.type(screen.getByLabelText("كلمة المرور الأولية"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "إنشاء الحساب" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("says a taken email is taken, rather than reporting a generic conflict", async () => {
    stubFetch(new Response(JSON.stringify({ code: "conflict" }), { status: 409 }));
    const user = userEvent.setup();
    render();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "إنشاء الحساب" }));

    expect(await screen.findByText(/مسجّل بالفعل/)).toBeInTheDocument();
  });

  it("hides the personnel picker, with a reason, when the list is unavailable", async () => {
    // `federationPersonnel:Read` is a separate grant. Rendering an empty
    // select would read as "there are no people", which is a different
    // statement and a false one.
    render({ people: null });

    expect(screen.queryByLabelText("الربط بسجلّ موظّف")).not.toBeInTheDocument();
    expect(screen.getByText(/صلاحية منفصلة/)).toBeInTheDocument();
  });
});
