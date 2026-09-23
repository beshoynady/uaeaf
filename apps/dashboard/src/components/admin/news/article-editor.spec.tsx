import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { ArticleEditor } from "./article-editor";
import type { ArticleEditorResponse } from "@/lib/admin/article-editor";

const replace = vi.fn();
const refresh = vi.fn();

// `Link` too, since the create screen gained a way back to the list and a
// cancel: the real one needs the router context this test does not mount.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

/**
 * The form as an author works it.
 *
 * The rich-text half is deliberately absent: it is reached through
 * `lazy-rich-text`, a dynamic import, and what this file is about is the form
 * around it — the required fields, the address, and what each of the two modes
 * actually sends.
 */
vi.mock("@/components/admin/rich-text/lazy-rich-text", () => ({
  LazyBilingualRichText: () => <div data-testid="rich-text" />,
}));

/**
 * The shell is stubbed to expose what the editor hands it.
 *
 * What matters here is the save BODY and whether the form is dirty — the shell
 * itself is covered by its own tests, and rendering it for real would pull in
 * the status and version panels and their reads.
 */
const shell = vi.hoisted(() => ({ body: null as null | (() => Record<string, unknown>), dirty: false }));

vi.mock("@/components/admin/editorial-editor/editor-shell", () => ({
  EditorShell: ({
    dirty,
    body,
    children,
  }: {
    dirty: boolean;
    body: () => Record<string, unknown>;
    children: (state: { disabled: boolean; clearFailure: () => void }) => React.ReactNode;
  }) => {
    shell.body = body;
    shell.dirty = dirty;
    return <div data-testid="shell">{children({ disabled: false, clearFailure: () => {} })}</div>;
  },
}));

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const RECORD: ArticleEditorResponse = {
  _id: "a1",
  title: { ar: "بطولة", en: "Championship" },
  slug: "championship-2026",
  category: "General",
  topic: null,
  sourceOutlet: null,
  sourceUrl: null,
  tags: [],
  coverMediaId: null,
  body: { ar: paragraph("نص"), en: paragraph("Text") },
  authorDisplayName: { ar: "المحرر", en: "The desk" },
  seo: null,
  publicationState: "Draft",
  archived: false,
  publishDate: null,
  updatedAt: "2026-09-21T08:00:00.000Z",
};

const renderEditor = (props: Partial<Parameters<typeof ArticleEditor>[0]> = {}) =>
  renderWithIntl(
    <ToastProvider>
      <ArticleEditor
        record={null}
        takenSlugs={[]}
        images={[]}
        canEdit
        canReadMedia
        locale="ar"
        {...props}
      />
    </ToastProvider>,
    "ar",
  );

const fetchMock = vi.fn();

beforeEach(() => {
  shell.body = null;
  shell.dirty = false;
  replace.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const headline = () => screen.getByLabelText(/Headline.*English|العنوان.*الإنجليزية/i);

/** The save button, under either language's copy. Named "save as draft" since
 *  2026-09-23: the API creates every article as a Draft, and the old "create"
 *  suggested a publish. */
const saveButton = () => screen.getByRole("button", { name: /حفظ كمسودة|Save as draft/ });

describe("writing a new article", () => {
  it("answers a press with the first missing field rather than refusing it", async () => {
    renderEditor();

    // The button stays live. A disabled one states that something is wrong
    // and refuses to say what — and cannot be focused, so a screen-reader
    // user tabbing to it finds nothing at all.
    expect(saveButton()).toBeEnabled();

    await userEvent.click(saveButton());

    // Nothing was sent, and the author is standing on the first thing to fix.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText(/Headline.*Arabic|العنوان.*العربية/i));
  });

  it("rests on General, the shelf an unfiled article belongs to", () => {
    // Checked because a screenshot of the create screen appeared to show
    // "UAEAF in the Media" preselected. The stored default is `General`
    // (`emptyArticleDraft`) and the select carries no placeholder option, so
    // what a fresh form shows is the first option — this pins that they agree.
    renderEditor({ record: null });

    const category = screen.getByLabelText(/Category|التصنيف/i) as HTMLSelectElement;
    expect(category.value).toBe("General");
  });

  it("says how many fields are still outstanding", () => {
    renderEditor();

    // The count and the jump target come from one ordered list, so the bar
    // cannot say "3 left" and send the author to a field that is fine.
    expect(screen.getByRole("status")).toHaveTextContent(/\d|واحد|حقل/);
  });


  it("does not call a blank form a form full of mistakes", () => {
    renderEditor();

    // Two alerts read out on arrival, before anyone has typed anything,
    // spends the colour that should mean "you did something wrong" on the
    // ordinary state of a new article. The disabled button already says the
    // form is not ready.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says what is missing once the author has written in that field", async () => {
    renderEditor();

    await userEvent.type(headline(), "X");
    await userEvent.clear(headline());

    expect(await screen.findByRole("alert")).toHaveTextContent(/العنوان مطلوب|headline is required/);
  });

  it("suggests an address from the English headline", async () => {
    renderEditor();

    await userEvent.type(headline(), "National Championship 2026");

    // English only, and only as a starting point: transliterating Arabic
    // produces an address no reader recognises and no editor can check.
    expect(screen.getByLabelText(/الرابط|Address/)).toHaveValue("national-championship-2026");
  });

  it("stops suggesting once the author has written an address", async () => {
    renderEditor();

    const slug = screen.getByLabelText(/الرابط|Address/);
    await userEvent.type(slug, "our-own-address");
    await userEvent.type(headline(), "Something Else");

    // The address is part of a page's identity. A headline correction that
    // silently moved a page would break every link already pointing at it.
    expect(slug).toHaveValue("our-own-address");
  });

  it("refuses an address another article already holds", async () => {
    renderEditor({ takenSlugs: ["championship-2026"] });

    await userEvent.type(screen.getByLabelText(/الرابط|Address/), "championship-2026");

    expect(screen.getByLabelText(/الرابط|Address/)).toHaveAccessibleDescription(
      expect.stringMatching(/يستخدمه خبر آخر|already uses/),
    );
  });

  it("says a raced address was claimed rather than failing silently", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ code: "slugTaken" }),
    });
    renderEditor({ record: null });

    // `takenSlugs` was read when the page loaded, and another author can claim
    // an address between then and this click. The server decides it at the
    // moment of the write, which is the only moment the answer is true.
    await fillRequired();
    await userEvent.click(saveButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(/حجز محرر آخر|claimed this address/);
    expect(replace).not.toHaveBeenCalled();
  });

  it("opens the created article's own editor", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _id: "new-1" }) });
    renderEditor({ record: null });

    await fillRequired();
    await userEvent.click(saveButton());

    // Straight into the editor for the article that now exists, so the author
    // continues where the review and the history are rather than being
    // returned to a list to find their own work.
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/news/new-1"));
  });

  it("sends every required field, not only the ones that were typed in", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _id: "new-1" }) });
    renderEditor({ record: null });

    await fillRequired();
    await userEvent.click(saveButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe("/api/admin/articles");
    // `category` was never touched, and the API requires it.
    expect(JSON.parse(init.body)).toMatchObject({ category: "General", slug: "a-headline", topic: "records" });
  });

  it("will not send one until a topic is chosen, and says so at the field", async () => {
    renderEditor({ record: null });

    await fillRequired({ topic: null });
    await userEvent.click(saveButton());

    // Refused, and the author is on the topic rather than looking at a
    // button that has stopped responding.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(topicField());

    await userEvent.selectOptions(topicField(), "nationalTeam");
    await userEvent.click(saveButton());
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("the topic of an article that exists", () => {
  it("leaves an unclassified article editable, and says it has no topic", async () => {
    renderEditor({ record: RECORD });

    expect(topicField()).toHaveAccessibleDescription(expect.stringMatching(/بلا موضوع|no topic/));
    await userEvent.clear(screen.getByLabelText(/الرابط|Address/));
    await userEvent.type(screen.getByLabelText(/الرابط|Address/), "renamed");
    // Saved without one: the API accepts an old article as it is.
    expect(shell.body?.()).toEqual({ slug: "renamed" });
  });

  it("sends the topic once one is chosen", async () => {
    renderEditor({ record: RECORD });

    await userEvent.selectOptions(topicField(), "community");

    expect(shell.body?.()).toEqual({ topic: "community" });
  });

  it("offers no empty choice once an article has a topic, so it cannot be cleared", () => {
    renderEditor({ record: { ...RECORD, topic: "training" } });

    const values = Array.from((topicField() as HTMLSelectElement).options).map((option) => option.value);
    expect(values).toEqual(["nationalTeam", "training", "youth", "international", "community", "records"]);
  });
});

describe("editing an article that exists", () => {
  it("opens clean", () => {
    renderEditor({ record: RECORD });

    // An article with no cover and no search overrides reads back as an empty
    // string and an empty block. Compared against the stored nulls they must
    // still be equal, or opening a record offers to save it untouched.
    expect(shell.dirty).toBe(false);
  });

  it("sends only what changed", async () => {
    renderEditor({ record: RECORD });

    await userEvent.clear(screen.getByLabelText(/الرابط|Address/));
    await userEvent.type(screen.getByLabelText(/الرابط|Address/), "championship-final");

    // Two people may have this screen open. A save posting every field would
    // have the second overwrite the first's work with the values their own
    // form was loaded with.
    expect(shell.body?.()).toEqual({ slug: "championship-final" });
  });

  it("does not offer its own address as taken", () => {
    renderEditor({ record: RECORD, takenSlugs: [] });

    // The loader excludes the article's own address. A headline correction
    // must not report the page's own URL as a collision.
    expect(screen.getByLabelText(/الرابط|Address/)).not.toHaveAccessibleDescription(
      expect.stringMatching(/يستخدمه خبر آخر|already uses/),
    );
  });

  it("never sends the publication state, however the form is edited", async () => {
    renderEditor({ record: RECORD });

    await userEvent.type(headline(), " Final");

    // Publishing is a separate act behind a separate permission. A draft
    // carrying `publicationState` would publish on every save.
    expect(Object.keys(shell.body?.() ?? {})).not.toContain("publicationState");
    expect(Object.keys(shell.body?.() ?? {})).not.toContain("archived");
  });
});

/** The three fields with no default, filled the way an author would. */
const topicField = () => screen.getByLabelText(/^الموضوع|^Topic/);

const fillRequired = async ({ topic = "records" }: { topic?: string | null } = {}) => {
  await userEvent.type(headline(), "A headline");
  await userEvent.type(screen.getByLabelText(/العنوان.*العربية|Headline.*Arabic/i), "عنوان");
  await userEvent.type(screen.getByLabelText(/اسم الكاتب.*الإنجليزية|Byline.*English/i), "The desk");
  await userEvent.type(screen.getByLabelText(/اسم الكاتب.*العربية|Byline.*Arabic/i), "المحرر");
  if (topic) await userEvent.selectOptions(topicField(), topic);
};
