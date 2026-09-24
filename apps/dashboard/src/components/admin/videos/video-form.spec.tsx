import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminVideo, ResolvedVideo } from "@/lib/admin/videos/types";

/**
 * Adding a video is meant to be one paste.
 *
 * The editor pastes a link; the platform, the shape, the title and the picture
 * arrive by themselves, and what is left is the part only a person can decide —
 * the Arabic wording and the category.
 *
 * The case that shapes this screen is the one where that fails. Instagram and
 * Facebook need a Meta token this deployment may not have, and any platform
 * can rate-limit. An editor meeting either must get a form to fill, not an
 * error about a token they cannot obtain.
 *
 * Inherited from `add-video-drawer.spec.tsx` when the drawer became a page:
 * every assertion there is here, against the form that replaced it, plus the
 * ones a page has and an overlay did not.
 */
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: unknown }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const toastShow = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ show: toastShow, dismiss: vi.fn() }) }));

const { VideoForm } = await import("./video-form");

const resolved: ResolvedVideo = {
  platform: "youtube",
  externalId: "abc",
  kind: "video",
  title: "100m final — UAE Championship",
  thumbnailUrl: "https://i.ytimg.com/vi/abc/hq.jpg",
};

const record: AdminVideo = {
  id: "6ab42297b8010ed304b0bf5a",
  title: { ar: "نهائي 100 متر", en: "100m final" },
  category: "championships",
  kind: "video",
  platform: "youtube",
  url: "https://www.youtube.com/watch?v=abc",
  externalId: "abc",
  thumbnailId: null,
  status: "published",
  publishedAt: "2026-03-15T10:00:00.000Z",
};

/** Answers the resolve call, and records every write so a test can read what
 *  the form actually sent. */
const stubFetch = (resolve: () => ResolvedVideo | null, writes: { path: string; body: unknown }[]) => {
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path === "/api/admin/videos/resolve") {
      const answer = resolve();
      return new Response(answer === null ? "null" : JSON.stringify(answer), {
        status: answer === null ? 422 : 200,
        headers: { "content-type": "application/json" },
      });
    }
    writes.push({ path, body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
};

const setup = (
  options: { resolve?: () => ResolvedVideo | null; record?: AdminVideo | null } = {},
) => {
  const writes: { path: string; body: unknown }[] = [];
  stubFetch(options.resolve ?? (() => resolved), writes);

  render(
    <VideoForm
      record={options.record ?? null}
      canPublish
      canDelete
      associationOptions={[]}
      locale="ar"
    />,
  );
  return { writes, user: userEvent.setup() };
};

const pasteUrl = (user: ReturnType<typeof userEvent.setup>, url: string) =>
  user.type(screen.getByLabelText("videoUrlLabel"), url);

beforeEach(() => {
  push.mockReset();
  toastShow.mockReset();
});

describe("VideoForm — adding", () => {
  it("fills both language titles from the one the platform returned", async () => {
    // Seeded into both so neither starts empty, and each stays independently
    // editable — the Arabic wording is the federation's, not YouTube's.
    const { user } = setup();

    await pasteUrl(user, "https://www.youtube.com/watch?v=abc");

    await waitFor(() => {
      expect(screen.getByLabelText("titleArLabel")).toHaveValue("100m final — UAE Championship");
    });
    expect(screen.getByLabelText("titleEnLabel")).toHaveValue("100m final — UAE Championship");
  });

  it("shows the card exactly as the site will draw it", async () => {
    const { user } = setup();

    await pasteUrl(user, "https://www.youtube.com/watch?v=abc");

    // The preview replaces the "paste a link" placeholder once there is
    // something to draw.
    await waitFor(() => expect(screen.queryByText("previewEmpty")).toBeNull());
  });

  it("says a link is unsupported, and shows no preview for it", async () => {
    const { user } = setup({ resolve: () => null });

    await pasteUrl(user, "https://evil.test/watch?v=a");

    await waitFor(() => expect(screen.getByText("resolveUnsupported")).toBeInTheDocument());
    expect(screen.getByText("previewEmpty")).toBeInTheDocument();
  });

  it("asks the editor to fill in what the platform would not give", async () => {
    // Not an error: the link is good and the video can be added. Only the
    // title and picture have to come from a person.
    const { user } = setup({
      resolve: () => ({ fallback: true, platform: "instagram", externalId: "XYZ", kind: "reel" }),
    });

    await pasteUrl(user, "https://www.instagram.com/reel/XYZ/");

    await waitFor(() => expect(screen.getByText("fallbackNotice")).toBeInTheDocument());
    // Still addable — the fields are there to fill.
    expect(screen.getByLabelText("titleArLabel")).toBeInTheDocument();
  });

  it("refuses to publish without an Arabic title", async () => {
    // Arabic is the federation's primary language; a published video without
    // one shows a blank card to most of its audience.
    const { user, writes } = setup({
      resolve: () => ({ fallback: true, platform: "tiktok", externalId: "7", kind: "reel" }),
    });

    await pasteUrl(user, "https://www.tiktok.com/@uaeaf/video/7");
    await waitFor(() => expect(screen.getByText("fallbackNotice")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "publish" }));

    expect(writes).toHaveLength(0);
    expect(screen.getAllByText("errTitleArRequired").length).toBeGreaterThan(0);
  });

  it("refuses to save with no link at all", async () => {
    const { user, writes } = setup();

    await user.click(screen.getByRole("button", { name: "saveDraft" }));

    expect(writes).toHaveLength(0);
  });

  it("saves a draft with the resolved link and the editor's words", async () => {
    const { user, writes } = setup();

    await pasteUrl(user, "https://www.youtube.com/watch?v=abc");
    // Wait for the resolve to land before overwriting what it filled in,
    // otherwise the clear races the seeding and the field ends up seeded.
    await waitFor(() =>
      expect(screen.getByLabelText("titleArLabel")).toHaveValue("100m final — UAE Championship"),
    );
    await user.clear(screen.getByLabelText("titleArLabel"));
    await user.type(screen.getByLabelText("titleArLabel"), "نهائي 100 متر");
    await user.click(screen.getByRole("button", { name: "saveDraft" }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].path).toBe("/api/admin/videos");
    expect(writes[0].body).toMatchObject({
      status: "draft",
      externalPlatform: "youtube",
      externalId: "abc",
      kind: "video",
      title: { ar: "نهائي 100 متر" },
    });
  });

  it("returns to the list and says so once the video exists", async () => {
    const { user, writes } = setup();

    await pasteUrl(user, "https://www.youtube.com/watch?v=abc");
    await waitFor(() => expect(screen.getByLabelText("titleArLabel")).not.toHaveValue(""));
    await user.click(screen.getByRole("button", { name: "publish" }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(push).toHaveBeenCalledWith("/videos");
    expect(toastShow).toHaveBeenCalledWith(expect.objectContaining({ title: "createdToast" }));
  });

  it("hides the championship field while there is nothing to link to", () => {
    // Championships and events are not built. An empty select is a control
    // that looks operable and is not.
    setup();

    expect(screen.queryByLabelText("associationLabel")).toBeNull();
  });
});

describe("VideoForm — editing", () => {
  it("opens with the stored values in both languages", () => {
    setup({ record });

    expect(screen.getByLabelText("titleArLabel")).toHaveValue("نهائي 100 متر");
    expect(screen.getByLabelText("titleEnLabel")).toHaveValue("100m final");
  });

  it("will not let the link be changed, and says why", () => {
    // `UpdateVideoDto` carries no `externalUrl`, and it should not: changing
    // the link swaps what every visitor is watching under a title and a date
    // that still describe the old one.
    setup({ record });

    expect(screen.getByLabelText("videoUrlLabel")).toBeDisabled();
    expect(screen.getByText("urlReadOnlyHint")).toBeInTheDocument();
  });

  it("sends only the fields the API accepts on a patch", async () => {
    const { user, writes } = setup({ record });

    await user.clear(screen.getByLabelText("titleEnLabel"));
    await user.type(screen.getByLabelText("titleEnLabel"), "100m final, men");
    await user.click(screen.getByRole("button", { name: "saveChanges" }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].path).toBe(`/api/admin/videos/${record.id}`);
    // Both languages travel together: a patch carrying one would erase the
    // other, which is what `titlePair` upstream refuses outright.
    expect(writes[0].body).toMatchObject({
      title: { ar: "نهائي 100 متر", en: "100m final, men" },
      status: "published",
    });
    expect(writes[0].body).not.toHaveProperty("externalUrl");
  });

  it("does not re-resolve a link that cannot change", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    render(<VideoForm record={record} canPublish canDelete associationOptions={[]} locale="ar" />);

    // Long enough to clear the resolve debounce, if one had been scheduled.
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(calls).not.toContain("/api/admin/videos/resolve");
  });

  it("asks before deleting, because nothing brings the row back", async () => {
    const { user, writes } = setup({ record });

    await user.click(screen.getByRole("button", { name: "deleteVideo" }));
    expect(writes).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "confirmDelete" }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].path).toBe(`/api/admin/videos/${record.id}`);
  });
});
