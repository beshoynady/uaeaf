import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAlbumUploads } from "./use-album-uploads";
import type { UploadRequest } from "./upload-transport";

/**
 * The queue as a running thing: at most three in flight, the next one starting
 * as a slot frees, and a failed file going round again on retry — each driven
 * through a fake XMLHttpRequest the test answers by hand.
 */
type Fake = UploadRequest & { answer: (status: number, body: unknown) => void };

const harness = () => {
  const requests: Fake[] = [];
  const create = () => {
    const request = {
      status: 0,
      responseText: "",
      upload: { onprogress: null },
      onload: null,
      onerror: null,
      onabort: null,
      open: () => undefined,
      send: () => undefined,
      abort: () => undefined,
      answer: (status: number, body: unknown) => {
        request.status = status;
        request.responseText = JSON.stringify(body);
        request.onload?.(new ProgressEvent("load"));
      },
    } as Fake;
    requests.push(request);
    return request;
  };
  return { requests, create };
};

const photo = (id: string) => ({
  _id: id,
  albumId: "album",
  displayOrder: 0,
  altText: { ar: "a", en: "a" },
  caption: { ar: "c", en: "c" },
  file: { url: `https://cdn/${id}.jpg`, mimeType: "image/jpeg" },
});

const files = (count: number) =>
  Array.from({ length: count }, (_, index) => new File(["x"], `p${index}.jpg`, { type: "image/jpeg" }));

describe("useAlbumUploads", () => {
  it("sends three at a time and starts the next as each finishes", async () => {
    const { requests, create } = harness();
    const onUploaded = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderHook(() =>
      useAlbumUploads({ albumId: "album", albumTitle: { ar: "أ", en: "A" }, photoCount: 0, onUploaded, onSettled, createRequest: create }),
    );

    act(() => result.current.add(files(5)));
    expect(requests).toHaveLength(3);
    expect(result.current.items.filter((item) => item.status === "uploading")).toHaveLength(3);

    await act(async () => requests[0].answer(201, photo("p0")));
    expect(requests).toHaveLength(4);
    expect(onUploaded).toHaveBeenCalledTimes(1);

    await act(async () => {
      for (const request of requests.slice(1)) request.answer(201, photo(`id${requests.indexOf(request)}`));
    });
    await act(async () => requests[4].answer(201, photo("p4")));

    expect(result.current.items.every((item) => item.status === "done")).toBe(true);
    // Once per batch, not once per file.
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed file with its reason and sends it again on retry, with the same number", async () => {
    const { requests, create } = harness();
    const { result } = renderHook(() =>
      useAlbumUploads({
        albumId: "album",
        albumTitle: { ar: "أ", en: "A" },
        photoCount: 4,
        onUploaded: vi.fn(),
        onSettled: vi.fn(),
        createRequest: create,
      }),
    );

    act(() => result.current.add(files(1)));
    await act(async () => requests[0].answer(502, { code: "serviceUnavailable" }));

    const failed = result.current.items[0];
    expect(failed).toMatchObject({ status: "failed", error: "serviceUnavailable", retryable: true, position: 5 });

    act(() => result.current.retry(failed.key));
    expect(requests).toHaveLength(2);
    await act(async () => requests[1].answer(201, photo("p0")));
    expect(result.current.items[0]).toMatchObject({ status: "done", position: 5 });
  });
});
