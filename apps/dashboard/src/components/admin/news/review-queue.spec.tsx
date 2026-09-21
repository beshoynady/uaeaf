import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewQueue, type ReviewItem } from "./review-queue";
import type { Article } from "@/lib/admin/articles";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const article = (n: number): Article => ({
  _id: `a${n}`,
  title: { ar: `عنوان ${n}`, en: `Headline ${n}` },
  slug: `headline-${n}`,
  category: "General",
  coverMediaId: null,
  body: { ar: {}, en: {} },
  authorDisplayName: { ar: "الإعلام", en: "Media" },
  publishDate: null,
  publicationState: "Draft",
  archived: false,
});

const item = (n: number, published = false): ReviewItem => ({
  instanceId: `i${n}`,
  article: article(n),
  publishedTitle: published ? { ar: `منشور ${n}`, en: `Published ${n}` } : null,
  submittedAt: "2026-09-20T09:00:00.000Z",
});

describe("ReviewQueue", () => {
  it("says so plainly when nothing is waiting", () => {
    render(<ReviewQueue items={[]} locale="ar" onDecide={vi.fn()} />);

    expect(screen.getByText("reviewEmpty")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("draws one row per waiting review and nothing else", () => {
    // The queue is the server's: this renders what it was handed, and never
    // filters. A worklist assembled in the browser is a worklist whose
    // correctness depends on the browser.
    render(<ReviewQueue items={[item(1), item(2)]} locale="ar" onDecide={vi.fn()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("offers refusal and change-request as two distinct decisions", () => {
    render(<ReviewQueue items={[item(1)]} locale="ar" onDecide={vi.fn()} />);

    expect(screen.getByRole("button", { name: "reviewApprove" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "reviewReject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "reviewRequestChanges" })).toBeInTheDocument();
  });

  it("refuses to submit either refusal without a reason", async () => {
    const onDecide = vi.fn();
    render(<ReviewQueue items={[item(1)]} locale="ar" onDecide={onDecide} />);

    await userEvent.click(screen.getByRole("button", { name: "reviewReject" }));
    await userEvent.click(screen.getByRole("button", { name: "confirm" }));

    // A refusal with no reason gives the author nothing to act on, which makes
    // the review a gate rather than a conversation.
    expect(onDecide).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("reasonRequired");
  });

  it("sends the reason with the decision once one is given", async () => {
    const onDecide = vi.fn().mockResolvedValue(undefined);
    render(<ReviewQueue items={[item(1)]} locale="ar" onDecide={onDecide} />);

    await userEvent.click(screen.getByRole("button", { name: "reviewRequestChanges" }));
    await userEvent.type(screen.getByRole("textbox"), "تحتاج مصدرًا ثانيًا");
    await userEvent.click(screen.getByRole("button", { name: "confirm" }));

    expect(onDecide).toHaveBeenCalledWith("i1", "requestChanges", "تحتاج مصدرًا ثانيًا");
  });

  it("asks for no reason when approving", async () => {
    const onDecide = vi.fn().mockResolvedValue(undefined);
    render(<ReviewQueue items={[item(1)]} locale="ar" onDecide={onDecide} />);

    await userEvent.click(screen.getByRole("button", { name: "reviewApprove" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "confirm" }));
    expect(onDecide).toHaveBeenCalledWith("i1", "approve", "");
  });

  it("re-checks the reason at the confirming press, not when the dialog opened", async () => {
    const onDecide = vi.fn().mockResolvedValue(undefined);
    render(<ReviewQueue items={[item(1)]} locale="ar" onDecide={onDecide} />);

    await userEvent.click(screen.getByRole("button", { name: "reviewReject" }));
    await userEvent.type(screen.getByRole("textbox"), "نص");
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.click(screen.getByRole("button", { name: "confirm" }));

    // Checked where the action happens, reading the value as it stands now:
    // a reason typed and then deleted is no reason.
    expect(onDecide).not.toHaveBeenCalled();
  });

  it("shows what is published beside what is proposed", () => {
    render(<ReviewQueue items={[item(1, true)]} locale="ar" onDecide={vi.fn()} />);

    // The reviewer is deciding on a CHANGE, so both sides are on the screen.
    // Scoped to the comparison, because the proposed headline also appears as
    // the row's own heading — which is correct, and would make a bare text
    // query ambiguous.
    const comparison = screen.getByText("comparePrevious").closest("dl");
    expect(comparison).not.toBeNull();
    expect(comparison).toHaveTextContent("منشور 1");
    expect(comparison).toHaveTextContent("عنوان 1");
  });

  it("says plainly when there is no published version to compare against", () => {
    render(<ReviewQueue items={[item(1)]} locale="ar" onDecide={vi.fn()} />);

    expect(screen.getByText("compareNone")).toBeInTheDocument();
  });
});
