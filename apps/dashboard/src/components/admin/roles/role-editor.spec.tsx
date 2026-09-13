import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { RoleEditor } from "./role-editor";
import type { RoleResponse } from "@/lib/api/types";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const mock = vi.fn(async (_url: string, _init: RequestInit) => response);
  vi.stubGlobal("fetch", mock);
  return mock;
}

const ok = () => new Response(JSON.stringify({ _id: "x" }), { status: 200 });

const role: RoleResponse = {
  _id: "a".repeat(24),
  name: { ar: "محرّر", en: "Editor" },
  description: { ar: "يحرّر", en: "Edits" },
  permissionIds: [],
  isSystemRole: false,
};

describe("RoleEditor — creating", () => {
  it("refuses to submit until the name exists in both languages", async () => {
    // The API rejects a half-filled bilingual name, and a role whose Arabic
    // name is blank renders as an empty row in every list that shows it.
    const fetchMock = stubFetch(ok());
    const user = userEvent.setup();
    renderWithIntl(
      <ToastProvider>
        <RoleEditor mode="create" onDone={vi.fn()} onCancel={vi.fn()} />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText("اسم الدور بالعربية"), "مراجع");
    await user.click(screen.getByRole("button", { name: "إنشاء الدور" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("مطلوب");
  });

  it("creates the role with no permissions", async () => {
    // Deliberate: creation names the role, the matrix grants it. Doing both
    // at once would put a 164-box matrix inside a creation form.
    const fetchMock = stubFetch(ok());
    const user = userEvent.setup();
    renderWithIntl(
      <ToastProvider>
        <RoleEditor mode="create" onDone={vi.fn()} onCancel={vi.fn()} />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText("اسم الدور بالعربية"), "مراجع");
    await user.type(screen.getByLabelText("اسم الدور بالإنجليزية"), "Reviewer");
    await user.click(screen.getByRole("button", { name: "إنشاء الدور" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] ;
    expect(url).toBe("/api/admin/roles");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      name: { ar: "مراجع", en: "Reviewer" },
      permissionIds: [],
    });
  });

  /** The panel closes on success, which says something happened but not what
   *  — and a new role with no permissions needs the reader sent to the next
   *  step, not left guessing. */
  it("announces the new role, and what is still missing from it", async () => {
    stubFetch(ok());
    const user = userEvent.setup();
    renderWithIntl(
      <ToastProvider>
        <RoleEditor mode="create" onDone={vi.fn()} onCancel={vi.fn()} />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText("اسم الدور بالعربية"), "مراجع");
    await user.type(screen.getByLabelText("اسم الدور بالإنجليزية"), "Reviewer");
    await user.click(screen.getByRole("button", { name: "إنشاء الدور" }));

    const region = await screen.findByRole("region", { name: "إشعارات الإجراءات" });
    expect(await within(region).findByText("أُنشئ الدور")).toBeInTheDocument();
  });

  it("names the failure rather than reporting a generic one", async () => {
    stubFetch(new Response(JSON.stringify({ code: "forbidden" }), { status: 403 }));
    const user = userEvent.setup();
    renderWithIntl(
      <ToastProvider>
        <RoleEditor mode="create" onDone={vi.fn()} onCancel={vi.fn()} />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText("اسم الدور بالعربية"), "مراجع");
    await user.type(screen.getByLabelText("اسم الدور بالإنجليزية"), "Reviewer");
    await user.click(screen.getByRole("button", { name: "إنشاء الدور" }));

    expect(await screen.findByText(/لا تملك الصلاحية/)).toBeInTheDocument();
  });
});

describe("RoleEditor — editing", () => {
  it("starts from what is stored", () => {
    renderWithIntl(
      <ToastProvider>
        <RoleEditor mode="edit" role={role} onDone={vi.fn()} onCancel={vi.fn()} />
      </ToastProvider>,
    );

    expect(screen.getByLabelText("اسم الدور بالعربية")).toHaveValue("محرّر");
    expect(screen.getByLabelText("الوصف بالإنجليزية")).toHaveValue("Edits");
  });

  it("sends the name and the description together", async () => {
    // One request, because they are one edit. The route carries both from
    // 2026-09-08; before that a description could only be set at creation.
    const fetchMock = stubFetch(ok());
    const user = userEvent.setup();
    renderWithIntl(
      <ToastProvider>
        <RoleEditor mode="edit" role={role} onDone={vi.fn()} onCancel={vi.fn()} />
      </ToastProvider>,
    );

    await user.clear(screen.getByLabelText("الوصف بالعربية"));
    await user.type(screen.getByLabelText("الوصف بالعربية"), "يراجع");
    await user.click(screen.getByRole("button", { name: "حفظ البيانات" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] ;
    expect(url).toBe(`/api/admin/roles/${role._id}/name`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      name: { ar: "محرّر", en: "Editor" },
      description: { ar: "يراجع", en: "Edits" },
    });
  });

  it("clears the description when both halves are emptied", async () => {
    // Null, not an empty pair: `@MinLength(1)` on each half means blank
    // strings are a 400, and "no description" is a real state.
    const fetchMock = stubFetch(ok());
    const user = userEvent.setup();
    renderWithIntl(
      <ToastProvider>
        <RoleEditor mode="edit" role={role} onDone={vi.fn()} onCancel={vi.fn()} />
      </ToastProvider>,
    );

    await user.clear(screen.getByLabelText("الوصف بالعربية"));
    await user.clear(screen.getByLabelText("الوصف بالإنجليزية"));
    await user.click(screen.getByRole("button", { name: "حفظ البيانات" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] ;
    expect(JSON.parse(init.body as string).description).toBeNull();
  });

  /** Named for what actually happened. The two modes of this form are two
   *  different events, and one shared "saved" would report a creation as an
   *  edit. */
  it("announces saved details rather than a creation", async () => {
    stubFetch(ok());
    const user = userEvent.setup();
    renderWithIntl(
      <ToastProvider>
        <RoleEditor mode="edit" role={role} onDone={vi.fn()} onCancel={vi.fn()} />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText("اسم الدور بالعربية"), "!");
    await user.click(screen.getByRole("button", { name: "حفظ البيانات" }));

    const region = await screen.findByRole("region", { name: "إشعارات الإجراءات" });
    expect(await within(region).findByText("حُفظت البيانات")).toBeInTheDocument();
    expect(within(region).queryByText("أُنشئ الدور")).toBeNull();
  });
});
