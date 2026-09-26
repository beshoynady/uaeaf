/**
 * One file, sent with real progress.
 *
 * `XMLHttpRequest` rather than `fetch`, deliberately: `fetch` reports nothing
 * until the response arrives, so forty photos on a venue's connection would
 * sit at 0% and then jump to done. `xhr.upload.onprogress` reports the bytes as
 * they leave, which is the only honest progress bar there is. It is a platform
 * API, so no dependency is bought for it.
 *
 * Through the existing `/api/admin/media-assets/upload` route handler, never to
 * the API directly: the access token is httpOnly and the API has no CORS.
 */

export type UploadResult = { ok: true; body: unknown } | { ok: false; code: string };

/** The subset of `XMLHttpRequest` this uses — narrow so a test can hand in a
 *  fake without building the whole interface. */
export interface UploadRequest {
  open(method: string, url: string): void;
  send(body: FormData): void;
  abort(): void;
  status: number;
  responseText: string;
  upload: { onprogress: ((event: ProgressEvent) => void) | null };
  onload: ((event: ProgressEvent) => void) | null;
  onerror: ((event: ProgressEvent) => void) | null;
  onabort: ((event: ProgressEvent) => void) | null;
}

const UPLOAD_PATH = "/api/admin/media-assets/upload";

const codeOf = (text: string): string => {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && typeof (parsed as { code?: unknown }).code === "string") {
      return (parsed as { code: string }).code;
    }
  } catch {
    // Not JSON: a proxy's HTML page or an empty 502. The status alone decides.
  }
  return "serviceUnavailable";
};

export const sendUpload = (
  form: FormData,
  onProgress: (fraction: number) => void,
  create: () => UploadRequest = () => new XMLHttpRequest(),
  signal?: AbortSignal,
): Promise<UploadResult> =>
  new Promise((resolve) => {
    const request = create();
    request.open("POST", UPLOAD_PATH);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(1);
        let body: unknown = null;
        try {
          body = JSON.parse(request.responseText);
        } catch {
          body = null;
        }
        resolve({ ok: true, body });
        return;
      }
      resolve({ ok: false, code: codeOf(request.responseText) });
    };
    // The browser never reached the server: offline, a dropped connection.
    // Reported as the unreachable service, which is what it is to the editor.
    request.onerror = () => resolve({ ok: false, code: "serviceUnavailable" });
    request.onabort = () => resolve({ ok: false, code: "aborted" });

    signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(form);
  });
