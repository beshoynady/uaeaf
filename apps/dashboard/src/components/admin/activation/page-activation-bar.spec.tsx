import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { PageActivationBar } from "./page-activation-bar";

/**
 * The control that takes a page on and off the internet — every page, since
 * ADR-0102 §D2 generalised it out of the About screen.
 *
 * Five things are worth a test, and they are the five that would not announce
 * themselves if they broke: the control is absent without the publish grant
 * rather than disabled, the press asks before it acts, the request names the
 * state being switched *to*, a failed request says so instead of leaving the
 * editor believing the page changed, and the two upstream shapes are addressed
 * correctly — a singleton page has no record id and a workflow-governed one
 * does.
 *
 * The refusal itself is not here — a hidden button stops nobody who can reach
 * the API. `about-activation-guard.spec.ts` and
 * `page-activation-routes.spec.ts` pin the grant on the routes.
 */

/** The dialog's own confirm labels, so a test presses the button it means to
 *  rather than whichever one happens to be last in the DOM. */
const CONFIRM = { on: "تفعيل الصفحة", off: "إيقاف الصفحة" } as const;

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const mount = (props: {
  isActive: boolean;
  canPublish: boolean;
  entity?: string;
  recordId?: string | null;
  saved?: boolean;
}) =>
  renderWithIntl(
    <ToastProvider>
      <PageActivationBar
        entity={props.entity ?? "aboutFederationPage"}
        pageName="نبذة عن الاتحاد"
        recordId={props.recordId === undefined ? "rec-1" : props.recordId}
        isActive={props.isActive}
        canPublish={props.canPublish}
        saved={props.saved}
      />
    </ToastProvider>,
    "ar",
  );

const okFetch = () => {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
});

describe("the page on/off bar", () => {
  it("offers no control without the publish grant, and still states the page's condition", () => {
    mount({ isActive: true, canPublish: false });

    expect(screen.queryByRole("button")).toBeNull();
    // The bar is a status region either way: an editor who cannot publish
    // still needs to know whether what they are writing is live.
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("offers the control with the grant", () => {
    mount({ isActive: true, canPublish: true });

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("offers no control for a page that has never been saved", () => {
    // There is no row to switch. A control here would fail upstream with a 404
    // and read to the editor as a broken screen.
    mount({ isActive: true, canPublish: true, saved: false });

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("asks before it acts, and sends nothing until the reader confirms", async () => {
    const fetchMock = okFetch();

    mount({ isActive: false, canPublish: true });
    await userEvent.click(screen.getByRole("button"));

    expect(fetchMock).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: CONFIRM.on }));
  });

  it("sends the state it is switching to, not the one it is in", async () => {
    const fetchMock = okFetch();

    mount({ isActive: true, canPublish: true });
    await userEvent.click(screen.getByRole("button"));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: CONFIRM.off }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/page-activation/aboutFederationPage");
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    // Read at the moment the request is made, not captured when the dialog
    // opened (CLAUDE.md §31).
    expect(body).toEqual({ recordId: "rec-1", isActive: false });
  });

  it("sends no record id for a singleton page", async () => {
    const fetchMock = okFetch();

    // One row, no `:id` upstream. A record id in the body would be a second way
    // to name the row there is only one of, and the route refuses it.
    mount({ isActive: true, canPublish: true, entity: "athletesPage", recordId: null });
    await userEvent.click(screen.getByRole("button"));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: CONFIRM.off }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/page-activation/athletesPage");
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ isActive: false });
  });

  it("says so when the request never reaches the API, rather than reporting success", async () => {
    // A dropped connection rejects the `fetch` itself. Without the catch this
    // surfaced as an unhandled rejection and the dialog simply span.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));

    mount({ isActive: false, canPublish: true });
    await userEvent.click(screen.getByRole("button"));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: CONFIRM.on }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });
});
