import { generatedAltText, generatedCaption } from "./generated-alt";
import type { LocalizedText } from "./types";

/**
 * The upload queue, as data.
 *
 * Pure on purpose: which file starts next, what a file is sent with and what
 * a refused file says are all decisions, and a decision buried in a React
 * effect is one no test can reach. `use-album-uploads.ts` only wires these to
 * state and to the transport.
 */

/**
 * How many files are in flight at once.
 *
 * Three: enough that one slow file does not stall the batch, few enough that a
 * venue's shared connection is not split forty ways — every file would then
 * crawl, and the first to finish would finish last. Browsers also cap
 * connections per host at six, and the dashboard's own navigation needs some.
 */
export const UPLOAD_CONCURRENCY = 3;

/**
 * Mirrors the API's `ACCEPTED_TYPES` and `MAX_UPLOAD_BYTES`
 * (`api/src/modules/media-center/media-assets/upload/upload-constraints.ts`).
 *
 * The API stays the authority and refuses these again. They are checked here
 * only so a 30 MB file or a PDF is refused before its bytes are sent, rather
 * than after a progress bar has run to the end for nothing.
 */
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type UploadStatus = "queued" | "uploading" | "done" | "failed";

/** Refusals known before sending, and therefore not worth a retry. */
export type PrecheckRefusal = "wrongType" | "tooLarge";

export interface UploadItem {
  key: string;
  file: File;
  /** The photo's number in the generated alternative text — fixed when the
   *  file is queued, so a retry keeps the number it was given. */
  position: number;
  status: UploadStatus;
  /** 0..1 */
  progress: number;
  /** A write-error code, or a precheck refusal. */
  error: string | null;
  /** False for a refusal that the same file will always meet again. */
  retryable: boolean;
}

export const precheck = (file: File): PrecheckRefusal | null => {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return "wrongType";
  if (file.size > MAX_UPLOAD_BYTES) return "tooLarge";
  return null;
};

/** Whether a file still owes the album a photo: waiting, sending, or failed
 *  in a way a retry could fix. */
const pending = (item: UploadItem): boolean =>
  item.status === "queued" || item.status === "uploading" || (item.status === "failed" && item.retryable);

/**
 * New files, queued behind whatever is already there.
 *
 * Numbered after the photos the album already has and the files still owed to
 * it, so two batches dropped one after the other do not both start at
 * "صورة 1".
 */
export const enqueue = (
  current: readonly UploadItem[],
  files: readonly File[],
  album: { photoCount: number },
  keyFor: (file: File, index: number) => string,
): UploadItem[] => {
  const owed = current.filter(pending).length;
  const added = files.map((file, index): UploadItem => {
    const refusal = precheck(file);
    return {
      key: keyFor(file, index),
      file,
      position: album.photoCount + owed + index + 1,
      status: refusal ? "failed" : "queued",
      progress: 0,
      error: refusal,
      retryable: refusal === null,
    };
  });
  return [...current, ...added];
};

/** The files to start now: queued ones, in the order they were added, up to
 *  the free slots. */
export const nextToStart = (items: readonly UploadItem[], limit: number = UPLOAD_CONCURRENCY): string[] => {
  const running = items.filter((item) => item.status === "uploading").length;
  const free = Math.max(0, limit - running);
  return items
    .filter((item) => item.status === "queued")
    .slice(0, free)
    .map((item) => item.key);
};

/** Whether nothing is waiting or in flight — the moment to re-read the album
 *  once, rather than after every file. */
export const isSettled = (items: readonly UploadItem[]): boolean =>
  items.every((item) => item.status === "done" || item.status === "failed");

/**
 * The multipart body for one photo.
 *
 * The bilingual fields travel as JSON text — every multipart part is a string,
 * and the API parses these two before validating (`ParseJsonFieldsInterceptor`).
 *
 * No `displayOrder`, although the DTO names one. A multipart part is text, the
 * global `ValidationPipe` has no implicit conversion, and `@IsInt()` refuses the
 * string "4" — every upload would be a 400. The API stores 0 when it is
 * absent, and the board sends the album's complete order once the batch
 * settles, which is the one write that can place every new photo at the end.
 */
export const buildUploadForm = (item: UploadItem, albumId: string, albumTitle: LocalizedText): FormData => {
  const form = new FormData();
  form.set("file", item.file);
  form.set("albumId", albumId);
  form.set("altText", JSON.stringify(generatedAltText(albumTitle, item.position)));
  form.set("caption", JSON.stringify(generatedCaption(albumTitle)));
  return form;
};
