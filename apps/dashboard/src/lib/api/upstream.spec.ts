import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callUpstream, UpstreamError, upstreamUrl } from "./upstream";

const ORIGINAL_API_URL = process.env.UAEAF_API_URL;

beforeEach(() => {
  process.env.UAEAF_API_URL = "http://localhost:3000";
});

afterEach(() => {
  process.env.UAEAF_API_URL = ORIGINAL_API_URL;
  vi.unstubAllGlobals();
});

describe("upstreamUrl", () => {
  it("prefixes the configured base with the API's own /api/v1 mount point", () => {
    expect(upstreamUrl("/auth/login")).toBe("http://localhost:3000/api/v1/auth/login");
  });

  it("tolerates a trailing slash on the configured base", () => {
    process.env.UAEAF_API_URL = "http://localhost:3000/";
    expect(upstreamUrl("/users/me")).toBe("http://localhost:3000/api/v1/users/me");
  });

  it("throws when the base URL is not configured", () => {
    // Fails loudly at the first call rather than quietly issuing requests to
    // "undefined/api/v1/..." — a misconfigured deployment should be obvious
    // in the logs, not appear as a mysterious login failure.
    delete process.env.UAEAF_API_URL;
    expect(() => upstreamUrl("/users/me")).toThrow(/UAEAF_API_URL/);
  });
});

describe("callUpstream", () => {
  function stubFetch(response: Response) {
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("sends JSON and parses the JSON response", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ accessToken: "a", refreshToken: "r" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await callUpstream<{ accessToken: string }>("/auth/login", {
      method: "POST",
      body: { email: "a@b.ae", password: "x" },
    });

    expect(result.accessToken).toBe("a");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/api/v1/auth/login");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ email: "a@b.ae", password: "x" }));
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
  });

  it("passes a multipart body through untouched", async () => {
    // An upload is the one write whose body is not JSON. Serializing it, or
    // setting a content-type by hand, both break it: `fetch` has to generate
    // the multipart boundary itself, which it only does when the body is a
    // FormData and no content-type is set.
    const fetchMock = stubFetch(new Response(JSON.stringify({ _id: "1" }), { status: 201 }));
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array([1, 2, 3])]), "hero.png");
    form.set("altText", '{"ar":"ب","en":"A"}');

    await callUpstream("/media-assets/upload", { method: "POST", form, accessToken: "t" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBe(form);
    expect(new Headers(init.headers).get("content-type")).toBeNull();
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer t");
  });

  it("attaches the bearer token when one is supplied", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));

    await callUpstream("/users/me", { accessToken: "token-123" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer token-123");
  });

  it("sends no authorization header when there is no token", async () => {
    // A missing token must mean "anonymous", never "Bearer undefined" —
    // which the API would reject with a confusing 401 rather than the
    // intended public-route behaviour.
    const fetchMock = stubFetch(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));

    await callUpstream("/auth/login", { method: "POST", body: {} });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).has("authorization")).toBe(false);
  });

  it("forwards a PUT, which the singleton content pages are saved with", async () => {
    // Every `*-page` route upstream is `GET` + `PUT` — the row is upserted,
    // not patched, because there is exactly one of it and it may not exist
    // yet.
    const fetchMock = stubFetch(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));

    await callUpstream("/news-page", { method: "PUT", body: { heroTitle: { ar: "أ", en: "N" } } });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/api/v1/news-page");
    expect(init.method).toBe("PUT");
  });

  it("returns null for a 204, rather than trying to parse an empty body", async () => {
    stubFetch(new Response(null, { status: 204 }));

    await expect(callUpstream("/auth/logout", { method: "POST", body: {} })).resolves.toBeNull();
  });

  it("throws UpstreamError carrying the status and the API's own message", async () => {
    stubFetch(
      new Response(JSON.stringify({ statusCode: 401, message: "Invalid credentials." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(callUpstream("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 401,
      apiMessage: "Invalid credentials.",
    });
  });

  it("still throws UpstreamError when the error body is not JSON", async () => {
    // A 502 from a proxy in front of the API returns HTML, not JSON. That
    // must not surface as a JSON parse error that hides the real status.
    stubFetch(new Response("<html>Bad Gateway</html>", { status: 502 }));

    const error = await callUpstream("/users/me").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBe(502);
  });

  it("never caches — an admin list must not be served stale from a prior request", async () => {
    const fetchMock = stubFetch(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));

    await callUpstream("/roles", { accessToken: "t" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.cache).toBe("no-store");
  });
});

describe("UpstreamError.apiCode", () => {
  it("reads the machine-readable code the API stamps on every error", () => {
    // Added 2026-09-08. `message` stays for humans reading a log; `code` is
    // what this app is allowed to branch on.
    expect(new UpstreamError(403, { code: "systemRole", message: "..." }).apiCode).toBe(
      "systemRole",
    );
  });

  it("is null when the body carries no code", () => {
    expect(new UpstreamError(403, { message: "..." }).apiCode).toBeNull();
    expect(new UpstreamError(502, "<html>bad gateway</html>").apiCode).toBeNull();
    expect(new UpstreamError(504, null).apiCode).toBeNull();
  });

  it("is null when the code is not a string", () => {
    expect(new UpstreamError(403, { code: 7 }).apiCode).toBeNull();
  });
});
