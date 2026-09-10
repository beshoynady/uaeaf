/**
 * The single place this app talks to the NestJS API.
 *
 * Server-side only, by design (owner decision D1, 2026-09-07). The browser
 * never calls the API directly, so `UAEAF_API_URL` is deliberately NOT a
 * `NEXT_PUBLIC_` variable — the API's origin is not something the client
 * bundle needs to know, and the API has no CORS configuration precisely
 * because nothing cross-origin is meant to reach it.
 */

/** Mirrors api/src/common/constants/api-versioning.constant.ts
 *  (`API_GLOBAL_PREFIX` + `API_DEFAULT_VERSION`). Kept as one literal
 *  because the two apps are separate deployables and cannot import across
 *  the boundary; a version bump on the API is a deliberate, coordinated
 *  change to this line. */
const API_MOUNT_PATH = "/api/v1";

/** Carries the upstream status through to the route handler, so the BFF can
 *  translate the API's own failure into an HTTP status the browser sees
 *  rather than collapsing everything into a 500. */
export class UpstreamError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown,
    /** The upstream response headers. Carried because some failures say
     *  something in a header that the body does not — `Retry-After` on a
     *  lockout or a throttled request is the case this exists for. Defaults
     *  to empty so a hand-constructed error stays a two-argument call. */
    readonly headers: Headers = new Headers(),
  ) {
    super(`Upstream API responded ${status}`);
    this.name = "UpstreamError";
  }

  /**
   * The API's machine-readable error code.
   *
   * Every error response carries one from 2026-09-08 (`ApiExceptionFilter`
   * stamps it, defaulting from the status). It is the only part of an error
   * body this app is allowed to branch on: the message beside it is prose,
   * and prose gets reworded.
   *
   * Null for an older API build, or for a failure that never reached the API
   * at all — a proxy's HTML error page, an empty 502.
   */
  get apiCode(): string | null {
    if (typeof this.payload === "object" && this.payload !== null && "code" in this.payload) {
      const code = (this.payload as { code: unknown }).code;
      if (typeof code === "string") {
        return code;
      }
    }
    return null;
  }

  /** The API's own `message` field when it sent one. NestJS uses this for
   *  every HttpException, and some of those messages are meaningful to the
   *  user (a locked account is deliberately distinguishable from bad
   *  credentials — see AuthService.login). */
  get apiMessage(): string | null {
    if (typeof this.payload === "object" && this.payload !== null && "message" in this.payload) {
      const message = (this.payload as { message: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
      // class-validator returns an array of messages for a failed DTO.
      if (Array.isArray(message) && typeof message[0] === "string") {
        return message[0];
      }
    }
    return null;
  }
}

export function upstreamUrl(path: string): string {
  const base = process.env.UAEAF_API_URL;
  if (!base) {
    throw new Error("UAEAF_API_URL is not configured — see apps/dashboard/.env.example.");
  }
  return `${base.replace(/\/$/, "")}${API_MOUNT_PATH}${path}`;
}

export interface UpstreamRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** A multipart body, passed through as-is. Used only by the image upload,
   *  which is the one administration write that carries a file rather than
   *  JSON. Mutually exclusive with `body`. */
  form?: FormData;
  accessToken?: string;
}

/**
 * @throws {UpstreamError} for any non-2xx response.
 * @returns the parsed JSON body, or `null` for a 204.
 */
export async function callUpstream<T = unknown>(
  path: string,
  request: UpstreamRequest = {},
): Promise<T> {
  const headers = new Headers({ accept: "application/json" });
  // Deliberately not set for a multipart body: `fetch` generates the
  // boundary and writes the header itself, and a hand-set content-type
  // leaves the boundary out, which the server cannot parse.
  if (request.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (request.accessToken) {
    headers.set("authorization", `Bearer ${request.accessToken}`);
  }

  const response = await fetch(upstreamUrl(path), {
    method: request.method ?? "GET",
    headers,
    body: request.form ?? (request.body === undefined ? undefined : JSON.stringify(request.body)),
    // Every call here is either a mutation or an administrator reading live
    // state. A cached role list would show an editor permissions that were
    // revoked minutes ago — worse than a slow page.
    cache: "no-store",
  });

  const payload = await readBody(response);

  if (!response.ok) {
    throw new UpstreamError(response.status, payload, response.headers);
  }
  return payload as T;
}

/** 204 has no body at all, and an upstream failure may return HTML rather
 *  than JSON — neither should surface as a parse error that hides the
 *  status the caller actually needs. */
async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
