import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ToastProvider } from "@/components/ui/toast";
import type { ReactElement } from "react";
import arabic from "../../../../../messages/ar.json";
import type { PermissionGrant } from "@/lib/auth/permissions";

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
  updatedAt: "2026-09-12T00:00:00.000Z",
};

async function open(grants: PermissionGrant[]) {
  readGrants.mockResolvedValue(grants);
  const element = (await PresidentMessagePage({
    params: Promise.resolve({ locale: "ar" }),
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
  fetchAsUser.mockImplementation((path: string) =>
    Promise.resolve(path === "/president-message-page" ? [RECORD] : []),
  );
});

describe("who the route opens for", () => {
  it.each([
    ["an editor", [{ resourceType: "presidentMessagePage", action: "Update" }]],
    ["an approver", [{ resourceType: "workflowInstances", action: "Approve" }]],
  ])("opens for %s", async (_who, grants) => {
    await open(grants);

    expect(screen.getByRole("status")).toBeInTheDocument();
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
    expect(screen.queryByRole("status")).toBeNull();
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
      Promise.resolve(path === "/president-message-page" ? null : []),
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

describe("the image library", () => {
  /** `mediaAssets:Read` is its own grant. Refused, it is an absence — the
   *  picker offers upload only, rather than an empty grid that reads as a
   *  broken screen. */
  it("opens the screen even when the media library is refused", async () => {
    fetchAsUser.mockImplementation((path: string) =>
      Promise.resolve(path === "/president-message-page" ? [RECORD] : null),
    );

    await open([{ resourceType: "presidentMessagePage", action: "Update" }]);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
