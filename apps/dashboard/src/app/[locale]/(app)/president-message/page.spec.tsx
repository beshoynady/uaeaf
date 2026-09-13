import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactElement } from "react";
import arabic from "../../../../../messages/ar.json";
import type { PermissionGrant } from "@/lib/auth/permissions";
import type { EditorialState } from "@/lib/admin/editorial-state";

/**
 * The enforcement half of the pair.
 *
 * `navigation.spec.ts` covers the other half — that the link is hidden — and
 * hiding a link stops nothing: the URL can be typed, bookmarked, or shared.
 * This asserts the screen itself decides, on the server, before any of the
 * message reaches the browser.
 */
const readGrants = vi.fn<() => Promise<PermissionGrant[]>>();
const fetchAsUser = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  readGrants: () => readGrants(),
  fetchAsUser: (path: string) => fetchAsUser(path) as unknown,
}));

// The editor is the only screen that needs TipTap, and this file is about who
// gets past the door — not about the editor behind it.
vi.mock("@/components/admin/rich-text/lazy-rich-text", () => ({
  LazyBilingualRichText: () => <div data-testid="rich-text" />,
}));

// The real catalogue, reached through the client provider below, so a missing
// key fails here the way it would on the screen.
vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  // `unknown` at the leaf: a namespace may nest (`PresidentMessage.icon`), so
  // claiming every value is a string is a type error rather than a
  // simplification.
  getTranslations: async (namespace: string) => (key: string) => {
    const value = (arabic as Record<string, Record<string, unknown>>)[namespace]?.[key];
    return typeof value === "string" ? value : `${namespace}.${key}`;
  },
}));

const { default: PresidentMessagePage } = await import("./page");

const RECORD = {
  _id: "msg-1",
  heroImageId: null,
  heroTitle: { ar: "كلمة", en: "Message" },
  heroSubtitle: { ar: "المنصب", en: "Role" },
  featuredImageId: null,
  pullQuote: null,
  messageBody: { ar: null, en: null },
  valuesTitle: null,
  values: [],
  signatoryName: { ar: "اسم", en: "Name" },
  signatoryTitle: { ar: "منصب", en: "Title" },
  seo: null,
  publicationState: "Published",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-12T00:00:00.000Z",
};

/** A second row in the same collection — what a test record looks like from
 *  this screen's side. Created later than `RECORD`, which is what decides
 *  which of the two the bare URL opens. */
const LATER = {
  ...RECORD,
  _id: "msg-2",
  createdAt: "2026-09-20T00:00:00.000Z",
};

/** The status panel's own read. Its content is covered by
 *  `status-panel.spec.tsx`; here it only has to be a well-formed state, so
 *  that what this file is about — who gets through the door — is what fails
 *  when it fails. */
const EDITORIAL: EditorialState = {
  publicationState: "Published",
  mode: "direct",
  blockedReason: null,
  publishedAt: null,
  publishedBy: null,
  workflowInstanceId: null,
  workflowStatus: null,
  currentStepId: null,
  canEdit: true,
  availableActions: ["save"],
  blockedByReadiness: [],
  updatedAt: "2026-09-12T00:00:00.000Z",
  publishBlockers: [],
  workflow: null,
  history: [],
};

/** The editor is open when its own saved/unsaved line is on screen. Asserted
 *  by that line rather than by `role="status"`: the status panel beside it is
 *  a live region too, and a query that matches either would pass on the wrong
 *  one. */
const editorIsOpen = () => screen.queryByText(arabic.PresidentMessage.allSaved);

async function open(grants: PermissionGrant[], search: Record<string, string> = {}) {
  readGrants.mockResolvedValue(grants);
  const element = (await PresidentMessagePage({
    params: Promise.resolve({ locale: "ar" }),
    searchParams: Promise.resolve(search),
  })) as ReactElement;

  return render(
    // Both providers come from the `(app)` layout in production; the page is
    // rendered here on its own, so the harness supplies them.
    <NextIntlClientProvider locale="ar" messages={arabic}>
      <ToastProvider>{element}</ToastProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  readGrants.mockReset();
  fetchAsUser.mockReset();
  fetchAsUser.mockImplementation((path: string) => Promise.resolve(defaultFetch(path)));
});

function defaultFetch(path: string): unknown {
  if (path === "/president-message-page") return [RECORD];
  if (path.endsWith("/editorial-state")) return EDITORIAL;
  return [];
}

describe("who the route opens for", () => {
  it.each([
    ["an editor", [{ resourceType: "presidentMessagePage", action: "Update" }]],
    ["an approver", [{ resourceType: "workflowInstances", action: "Approve" }]],
  ])("opens for %s", async (_who, grants) => {
    await open(grants);

    expect(editorIsOpen()).toBeInTheDocument();
  });

  /**
   * Reading the message is deliberately not enough — the screen exists to
   * change it or to decide on a change (owner decision 2026-09-12). This is
   * narrower than the rest of the dashboard, where any action on a resource
   * opens its screen.
   */
  it.each([
    ["holds only Read on the message", [{ resourceType: "presidentMessagePage", action: "Read" }]],
    ["holds only Read on workflows", [{ resourceType: "workflowInstances", action: "Read" }]],
    ["holds something unrelated", [{ resourceType: "users", action: "Update" }]],
    ["holds nothing at all", []],
  ])("refuses someone who %s", async (_who, grants) => {
    await open(grants);

    expect(screen.getByText(arabic.Common.accessDenied)).toBeInTheDocument();
    expect(editorIsOpen()).toBeNull();
  });

  /** The decision is made before the record is asked for, so a refused
   *  reader's browser is never sent the message at all. */
  it("does not even fetch the message for someone it refuses", async () => {
    await open([{ resourceType: "presidentMessagePage", action: "Read" }]);

    expect(fetchAsUser).not.toHaveBeenCalled();
  });
});

describe("when there is no message to edit", () => {
  /**
   * Refused and absent are different states and must not share a message.
   * A record nobody has created yet is not a permission problem, and telling
   * an administrator with every grant that they are denied sends them to
   * look in the wrong place entirely.
   */
  it("says the API refused when it refused", async () => {
    fetchAsUser.mockImplementation((path: string) =>
      Promise.resolve(path === "/president-message-page" ? null : defaultFetch(path)),
    );

    await open([{ resourceType: "presidentMessagePage", action: "Update" }]);

    expect(screen.getByText(arabic.Common.accessDenied)).toBeInTheDocument();
  });

  it("says the record does not exist when the list comes back empty", async () => {
    fetchAsUser.mockImplementation((path: string) =>
      Promise.resolve(path === "/president-message-page" ? [] : []),
    );

    await open([{ resourceType: "presidentMessagePage", action: "Update" }]);

    expect(screen.getByText(arabic.PresidentMessage.notCreatedTitle)).toBeInTheDocument();
    expect(screen.queryByText(arabic.Common.accessDenied)).toBeNull();
  });
});

/**
 * The collection holds more than one row as soon as anyone creates a test
 * record to rehearse publishing on, and two rows make "which one is this
 * screen editing?" a question the URL has to be able to answer.
 */
describe("which record the screen edits", () => {
  const EDITOR = [{ resourceType: "presidentMessagePage", action: "Update" }];

  function listReturns(records: unknown[]) {
    fetchAsUser.mockImplementation((path: string) =>
      Promise.resolve(path === "/president-message-page" ? records : defaultFetch(path)),
    );
  }

  it("opens the record the URL names", async () => {
    listReturns([RECORD, LATER]);

    await open(EDITOR, { record: "msg-2" });

    expect(fetchAsUser).toHaveBeenCalledWith("/president-message-page/msg-2/editorial-state");
  });

  /**
   * The dangerous failure, and the reason this is not a silent fallback: an
   * editor who opened a test record by id and was quietly handed the real
   * message would publish the federation's front page believing it was a
   * rehearsal.
   */
  it("refuses to substitute another record when the named one is not there", async () => {
    listReturns([RECORD, LATER]);

    await open(EDITOR, { record: "ghost" });

    expect(screen.getByText(arabic.PresidentMessage.recordNotFoundTitle)).toBeInTheDocument();
    expect(editorIsOpen()).toBeNull();
  });

  /** Oldest first, not "whatever the database returned first": natural order
   *  is not a contract, and the bare URL must keep opening the record that
   *  was there before any test row was added. */
  it("edits the oldest record when the URL names none", async () => {
    listReturns([LATER, RECORD]);

    await open(EDITOR);

    expect(fetchAsUser).toHaveBeenCalledWith("/president-message-page/msg-1/editorial-state");
  });
});

describe("the image library", () => {
  /**
   * The API returns raw records — `_id`, and PDFs alongside photographs —
   * and the picker keys every tile by `id`. Forwarded unmapped, the grid
   * renders and selects nothing, with no error anywhere. Asserted through
   * the chosen thumbnail: it resolves only when the record's stored id
   * matches an option's id.
   */
  it("hands the picker options it can actually match the stored image to", async () => {
    fetchAsUser.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/media-assets"
          ? [
              {
                _id: "portrait-1",
                caption: { ar: "صورة الرئيس", en: "The president" },
                file: { url: "https://cdn.example/p.jpg", mimeType: "image/jpeg" },
              },
            ]
          : path === "/president-message-page"
            ? [{ ...RECORD, featuredImageId: "portrait-1" }]
            : defaultFetch(path),
      ),
    );

    await open([{ resourceType: "presidentMessagePage", action: "Update" }]);

    expect(screen.getByRole("img", { name: "صورة الرئيس" })).toBeInTheDocument();
  });

  /** `mediaAssets:Read` is its own grant. Refused, it is an absence — the
   *  picker offers upload only, rather than an empty grid that reads as a
   *  broken screen. */
  it("opens the screen even when the media library is refused", async () => {
    fetchAsUser.mockImplementation((path: string) =>
      Promise.resolve(path === "/media-assets" ? null : defaultFetch(path)),
    );

    await open([{ resourceType: "presidentMessagePage", action: "Update" }]);

    expect(editorIsOpen()).toBeInTheDocument();
  });
});

describe("the status panel", () => {
  it("is drawn beside the editor, reading the record's own state", async () => {
    await open([{ resourceType: "presidentMessagePage", action: "Update" }]);

    expect(fetchAsUser).toHaveBeenCalledWith("/president-message-page/msg-1/editorial-state");
    expect(
      screen.getByRole("complementary", { name: arabic.Editorial.panelTitle }),
    ).toBeInTheDocument();
  });

  /** Losing the panel is losing a panel, not the screen. An editor whose
   *  account may change the message but not read its status still has the
   *  form, and is not sent an access notice for the whole page. */
  it("is left out, and the editor kept, when the state is refused", async () => {
    fetchAsUser.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith("/editorial-state") ? null : defaultFetch(path)),
    );

    await open([{ resourceType: "presidentMessagePage", action: "Update" }]);

    expect(editorIsOpen()).toBeInTheDocument();
    expect(screen.queryByRole("complementary")).toBeNull();
  });
});
