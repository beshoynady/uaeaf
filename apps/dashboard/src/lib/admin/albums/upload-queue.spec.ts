import { describe, expect, it, vi } from "vitest";
import { buildUploadForm, enqueue, isSettled, nextToStart, precheck, UPLOAD_CONCURRENCY } from "./upload-queue";
import { sendUpload } from "./upload-transport";
import type { UploadRequest } from "./upload-transport";
import type { UploadItem } from "./upload-queue";

const file = (name: string, type = "image/jpeg", size = 1000) => new File([new Uint8Array(size)], name, { type });
const key = (f: File, index: number) => `${index}:${f.name}`;

describe("enqueue", () => {
  it("numbers new files after the album's photos and anything still owed", () => {
    const first = enqueue([], [file("a.jpg"), file("b.jpg")], { photoCount: 5 }, key);
    expect(first.map((item) => item.position)).toEqual([6, 7]);
    // A second batch while the first is still running continues the count.
    const second = enqueue(first, [file("c.jpg")], { photoCount: 5 }, key);
    expect(second.map((item) => item.position)).toEqual([6, 7, 8]);
  });

  it("refuses the wrong type and an oversize file before sending, and offers no retry for them", () => {
    const items = enqueue([], [file("doc.pdf", "application/pdf"), file("big.jpg", "image/jpeg", 11 * 1024 * 1024)], { photoCount: 0 }, key);
    expect(items.map((item) => [item.status, item.error, item.retryable])).toEqual([
      ["failed", "wrongType", false],
      ["failed", "tooLarge", false],
    ]);
  });

  it("accepts exactly the three types the API accepts", () => {
    expect(precheck(file("a.png", "image/png"))).toBeNull();
    expect(precheck(file("a.webp", "image/webp"))).toBeNull();
    expect(precheck(file("a.gif", "image/gif"))).toBe("wrongType");
  });
});

describe("nextToStart — limited concurrency", () => {
  const item = (k: string, status: UploadItem["status"]): UploadItem => ({
    key: k,
    file: file(`${k}.jpg`),
    position: 1,
    status,
    progress: 0,
    error: null,
    retryable: true,
  });

  it("starts no more than the limit at once, in the order they were added", () => {
    const items = ["a", "b", "c", "d", "e"].map((k) => item(k, "queued"));
    expect(UPLOAD_CONCURRENCY).toBe(3);
    expect(nextToStart(items)).toEqual(["a", "b", "c"]);
  });

  it("fills only the free slots", () => {
    const items = [item("a", "uploading"), item("b", "uploading"), item("c", "queued"), item("d", "queued")];
    expect(nextToStart(items)).toEqual(["c"]);
  });

  it("is settled only when nothing waits or runs", () => {
    expect(isSettled([item("a", "done"), item("b", "failed")])).toBe(true);
    expect(isSettled([item("a", "done"), item("b", "queued")])).toBe(false);
  });
});

describe("buildUploadForm", () => {
  it("sends the album, the generated bilingual fallback as JSON text, and no displayOrder", () => {
    const [item] = enqueue([], [file("a.jpg")], { photoCount: 2 }, key);
    const form = buildUploadForm(item, "66f0a1b2c3d4e5f607182901", { ar: "بطولة", en: "Meet" });
    expect(form.get("albumId")).toBe("66f0a1b2c3d4e5f607182901");
    expect(JSON.parse(String(form.get("altText")))).toEqual({ ar: "بطولة — صورة 3", en: "Meet — Photo 3" });
    expect(JSON.parse(String(form.get("caption")))).toEqual({ ar: "بطولة", en: "Meet" });
    // A multipart "3" would fail `@IsInt()` upstream and refuse every upload.
    expect(form.has("displayOrder")).toBe(false);
  });
});

/** A stand-in for XMLHttpRequest that the test drives by hand. */
const fakeRequest = () => {
  const request: UploadRequest & { sent: FormData | null; url: string } = {
    sent: null,
    url: "",
    status: 0,
    responseText: "",
    upload: { onprogress: null },
    onload: null,
    onerror: null,
    onabort: null,
    open: (_method, url) => {
      request.url = url;
    },
    send: (body) => {
      request.sent = body;
    },
    abort: () => request.onabort?.(new ProgressEvent("abort")),
  };
  return request;
};

describe("sendUpload — progress without a dependency", () => {
  it("reports real byte progress from xhr.upload and resolves with the created photo", async () => {
    const request = fakeRequest();
    const progress = vi.fn();
    const pending = sendUpload(new FormData(), progress, () => request);

    expect(request.url).toBe("/api/admin/media-assets/upload");
    request.upload.onprogress?.(new ProgressEvent("progress", { lengthComputable: true, loaded: 25, total: 100 }));
    expect(progress).toHaveBeenLastCalledWith(0.25);

    request.status = 201;
    request.responseText = JSON.stringify({ _id: "x" });
    request.onload?.(new ProgressEvent("load"));
    await expect(pending).resolves.toEqual({ ok: true, body: { _id: "x" } });
    expect(progress).toHaveBeenLastCalledWith(1);
  });

  it("carries the route handler's refusal code, and names a dropped connection as unreachable", async () => {
    const refused = fakeRequest();
    const first = sendUpload(new FormData(), vi.fn(), () => refused);
    refused.status = 403;
    refused.responseText = JSON.stringify({ code: "forbidden" });
    refused.onload?.(new ProgressEvent("load"));
    await expect(first).resolves.toEqual({ ok: false, code: "forbidden" });

    const dropped = fakeRequest();
    const second = sendUpload(new FormData(), vi.fn(), () => dropped);
    dropped.onerror?.(new ProgressEvent("error"));
    await expect(second).resolves.toEqual({ ok: false, code: "serviceUnavailable" });
  });
});
