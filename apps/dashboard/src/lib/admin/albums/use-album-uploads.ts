"use client";

import { useEffect, useRef, useState } from "react";
import { buildUploadForm, enqueue, isSettled, nextToStart } from "./upload-queue";
import { sendUpload } from "./upload-transport";
import { toAlbumPhoto } from "./to-admin-album";
import type { UploadItem } from "./upload-queue";
import type { AlbumPhoto, LocalizedText } from "./types";

/**
 * The upload queue, wired to state and to the transport.
 *
 * -- How files start --------------------------------------------------------
 *
 * One effect watches the queue. Whenever a slot is free and a file is waiting
 * it starts the next one, so a finished file hands its slot on without anyone
 * scheduling it. `started` is the guard against starting a file twice: the
 * effect can run again before React has re-rendered the file as uploading.
 *
 * -- Retry --------------------------------------------------------------------
 *
 * A failed file goes back to `queued` with its original number, and the same
 * effect picks it up. Nothing else about it changes — it is the same photo,
 * asked for again.
 */
export const useAlbumUploads = ({
  albumId,
  albumTitle,
  photoCount,
  onUploaded,
  onSettled,
  createRequest,
}: {
  albumId: string;
  albumTitle: LocalizedText;
  photoCount: number;
  /** Each photo as it lands, so the grid grows while the batch runs. */
  onUploaded: (photo: AlbumPhoto) => void;
  /** Once per batch, when nothing is waiting or in flight and at least one
   *  file landed. */
  onSettled: () => void;
  /** The transport's request factory; a test passes a fake. */
  createRequest?: Parameters<typeof sendUpload>[2];
}) => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const started = useRef(new Set<string>());
  const landedSinceSettle = useRef(false);
  const sequence = useRef(0);

  // Read inside the async completion, where the props captured at start may
  // be stale — the handler must call the current ones.
  const latest = useRef({ onUploaded, onSettled, albumTitle });
  latest.current = { onUploaded, onSettled, albumTitle };

  const patch = (key: string, change: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));

  const start = async (item: UploadItem) => {
    patch(item.key, { status: "uploading", progress: 0, error: null });
    const result = await sendUpload(
      buildUploadForm(item, albumId, latest.current.albumTitle),
      (progress) => patch(item.key, { progress }),
      createRequest,
    );
    started.current.delete(item.key);

    const photo = result.ok ? toAlbumPhoto(result.body) : null;
    if (result.ok && photo) {
      landedSinceSettle.current = true;
      patch(item.key, { status: "done", progress: 1 });
      latest.current.onUploaded(photo);
      return;
    }
    // A 2xx without a readable photo is not a success the grid can draw.
    patch(item.key, { status: "failed", error: result.ok ? "serviceUnavailable" : result.code });
  };

  useEffect(() => {
    for (const key of nextToStart(items)) {
      if (started.current.has(key)) continue;
      const item = items.find((entry) => entry.key === key);
      if (!item) continue;
      started.current.add(key);
      void start(item);
    }

    if (items.length > 0 && isSettled(items) && landedSinceSettle.current) {
      landedSinceSettle.current = false;
      latest.current.onSettled();
    }
    // `start` is recreated every render and reads only refs and its argument;
    // listing it would re-run the effect on every render for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const add = (files: readonly File[]) => {
    if (files.length === 0) return;
    setItems((current) =>
      enqueue(current, files, { photoCount }, (file) => {
        sequence.current += 1;
        return `${sequence.current}:${file.name}:${file.size}`;
      }),
    );
  };

  const retry = (key: string) =>
    setItems((current) =>
      current.map((item) =>
        item.key === key && item.status === "failed" && item.retryable
          ? { ...item, status: "queued", progress: 0, error: null }
          : item,
      ),
    );

  /** Takes the finished rows away. Failed ones stay until retried or
   *  dismissed one by one: clearing a failure is how it gets forgotten. */
  const clearDone = () => setItems((current) => current.filter((item) => item.status !== "done"));

  const dismiss = (key: string) =>
    setItems((current) => current.filter((item) => item.key !== key || item.status === "uploading"));

  return { items, add, retry, clearDone, dismiss };
};
