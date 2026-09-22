import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { MessageInbox } from "./message-inbox";
import type { ContactMessage, MessageStatus } from "@/lib/admin/contact-messages";

/**
 * The messages screen (owner request 2026-09-22): the messages sent through
 * the public contact form, newest first, one open at a time (PT-LISTDETAIL-001
 * as an inbox, ADR-0089 D2).
 */

const message = (over: Partial<ContactMessage>): ContactMessage => ({
  _id: "6aaa8685b455d12b5c80d0d1",
  messageType: "Inquiry",
  senderName: "سارة",
  senderEmail: "sara@example.com",
  senderPhone: "+971 50 000 0000",
  subject: "موعد البطولة",
  messageBody: "متى تبدأ بطولة الدولة؟",
  status: "New",
  createdAt: "2026-09-22T08:00:00.000Z",
  ...over,
});

const INBOX = [
  message({}),
  message({ _id: "6aaa8685b455d12b5c80d0d2", senderName: "خالد", subject: "شكوى تسجيل", messageType: "Complaint", status: "New" }),
  message({ _id: "6aaa8685b455d12b5c80d0d3", senderName: "منى", subject: null, status: "Resolved" }),
];

const render = ({
  messages = INBOX,
  canUpdate = true,
  onStatusChange = vi.fn(async () => true),
}: {
  messages?: ContactMessage[];
  canUpdate?: boolean;
  onStatusChange?: (id: string, status: MessageStatus) => Promise<boolean>;
} = {}) => {
  renderWithIntl(
    <ToastProvider>
      <MessageInbox messages={messages} canUpdate={canUpdate} onStatusChange={onStatusChange} />
    </ToastProvider>,
  );
  return { onStatusChange, user: userEvent.setup() };
};

const list = () => screen.getByRole("region", { name: "الرسائل الواردة" });
const row = (name: RegExp) => within(list()).getByRole("button", { name });
const toasts = () => screen.findByRole("region", { name: "إشعارات الإجراءات" });

describe("MessageInbox", () => {
  it("lists every message in the order given, each row naming its sender, subject and status in words", () => {
    render();

    const names = within(list())
      .getAllByRole("button")
      .map((button) => button.textContent ?? "");
    for (const part of ["سارة", "موعد البطولة", "جديدة"]) expect(names[0]).toContain(part);
    expect(names[1]).toContain("خالد");
    // A message without a subject is still findable by what it says.
    for (const part of ["منى", "بلا موضوع", "تم الحل"]) expect(names[2]).toContain(part);
  });

  it("opens nothing until a message is chosen", () => {
    // Choosing one for the reader would mark it read without anyone reading it.
    const { onStatusChange } = render();

    expect(screen.getByText("اختر رسالة من القائمة لعرضها.")).toBeInTheDocument();
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it("names each filter's count, taken over every message", async () => {
    const { user } = render();
    const filters = screen.getByRole("group", { name: "تصفية حسب الحالة" });

    expect(within(filters).getByRole("button", { name: "الكل (3)" })).toBeInTheDocument();
    expect(within(filters).getByRole("button", { name: "جديدة (2)" })).toBeInTheDocument();

    await user.click(within(filters).getByRole("button", { name: "تم الحل (1)" }));

    expect(within(list()).getAllByRole("button")).toHaveLength(1);
    // The counts do not change with the filter.
    expect(within(filters).getByRole("button", { name: "جديدة (2)" })).toBeInTheDocument();
  });

  it("shows the whole message when a row is chosen", async () => {
    const { user } = render();

    await user.click(row(/خالد/));

    const detail = screen.getByRole("article");
    expect(within(detail).getByRole("heading", { name: "شكوى تسجيل" })).toBeInTheDocument();
    expect(within(detail).getByText("شكوى")).toBeInTheDocument();
    expect(within(detail).getByText("sara@example.com")).toBeInTheDocument();
    expect(within(detail).getByText("متى تبدأ بطولة الدولة؟")).toBeInTheDocument();
    expect(row(/خالد/).getAttribute("aria-current")).toBe("true");
  });

  it("keeps an address left to right without pulling it away from its label", async () => {
    // Seen live: `dir="ltr"` on the whole value cell moved the email and the
    // phone to the far side of their cells in Arabic, away from their labels.
    const { user } = render();
    await user.click(row(/منى/));

    for (const value of ["sara@example.com", "+971 50 000 0000"]) {
      const text = within(screen.getByRole("article")).getByText(value);
      expect(text.getAttribute("dir")).toBe("ltr");
      expect(text.closest("dd")?.hasAttribute("dir")).toBe(false);
    }
  });

  it("marks a new message read when it is opened, and says so", async () => {
    const { user, onStatusChange } = render();

    await user.click(row(/سارة/));

    expect(onStatusChange).toHaveBeenCalledWith("6aaa8685b455d12b5c80d0d1", "InProgress");
    expect(await within(await toasts()).findByText("عُلّمت الرسالة كمقروءة")).toBeInTheDocument();
    await waitFor(() => expect(row(/سارة/).textContent).toMatch(/قيد المعالجة/));
  });

  it("leaves a message that is not new as it is when it is opened", async () => {
    const { user, onStatusChange } = render();

    await user.click(row(/منى/));

    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it("moves a message to the status chosen at once, and says so", async () => {
    const { user, onStatusChange } = render();
    await user.click(row(/منى/));

    const status = screen.getByRole("group", { name: "حالة الرسالة" });
    expect(within(status).getByRole("button", { name: "تم الحل" }).getAttribute("aria-pressed")).toBe("true");
    await user.click(within(status).getByRole("button", { name: "مؤرشفة" }));

    expect(onStatusChange).toHaveBeenCalledWith("6aaa8685b455d12b5c80d0d3", "Closed");
    expect(await within(await toasts()).findByText("نُقلت الرسالة إلى «مؤرشفة»")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(status).getByRole("button", { name: "مؤرشفة" }).getAttribute("aria-pressed")).toBe("true"),
    );
  });

  it("keeps the status and says so when the change is refused", async () => {
    const { user } = render({ onStatusChange: vi.fn(async () => false) });
    await user.click(row(/منى/));

    const status = screen.getByRole("group", { name: "حالة الرسالة" });
    await user.click(within(status).getByRole("button", { name: "مؤرشفة" }));

    expect(await within(await toasts()).findByText("تعذّر تغيير حالة الرسالة")).toBeInTheDocument();
    expect(within(status).getByRole("button", { name: "تم الحل" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("lets a reader without the update grant read, and change nothing", async () => {
    // The API would refuse the write; offering it would be a control that lies.
    const { user, onStatusChange } = render({ canUpdate: false });

    await user.click(row(/سارة/));

    expect(onStatusChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "حالة الرسالة" })).toBeNull();
    expect(within(screen.getByRole("article")).getByText("جديدة")).toBeInTheDocument();
  });

  it("keeps the open message listed when the filter no longer matches it", async () => {
    // Opening a new message under "New" moves it on; dropping its row at that
    // moment would leave the reader on a message the list no longer shows.
    const { user } = render();
    await user.click(within(screen.getByRole("group", { name: "تصفية حسب الحالة" })).getByRole("button", { name: "جديدة (2)" }));

    await user.click(row(/سارة/));

    await waitFor(() => expect(row(/سارة/).textContent).toMatch(/قيد المعالجة/));
    expect(row(/سارة/).getAttribute("aria-current")).toBe("true");
  });

  it("says so when there are no messages at all", () => {
    render({ messages: [] });

    expect(screen.getByText("لم تصل أي رسالة بعد.")).toBeInTheDocument();
  });
});
