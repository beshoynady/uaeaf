import type { ViewerPhoto } from "@/lib/albums/photo-window";

/**
 * The album viewer's "next page", with the guard its author asked for.
 *
 * `AlbumViewer` calls `onRequestMore` from an effect whenever its render
 * window reaches the photos loaded so far — so it can call again, for the
 * same page, before the first request has answered. Each call would append
 * the same forty photos a second time.
 *
 * The guard is a single in-flight slot. While a page is being read, every
 * further request is refused outright rather than queued: the one in flight
 * already asks for the next page, and once it lands the viewer's own effect
 * runs again with the new count and asks for the page after it if needed. The
 * slot is released in `finally`, so a failed read does not leave the album
 * stuck; the next move of the viewer simply asks again.
 *
 * Plain module, no React: the policy is tested on its own, and the component
 * that uses it only holds the photos.
 */

export interface PhotoPage {
  /** The offset this page was read from — the number of photos held when it
   *  was asked for. */
  skip: number;
  photos: ViewerPhoto[];
  /** The album's photo count as of this read. */
  total: number;
}

export type ReadPhotoPage = (
  skip: number,
) => Promise<{ photos: ViewerPhoto[]; total: number } | null>;

/** `null` when there is nothing to fetch, a read is already in flight, or the
 *  read failed. */
export type RequestPhotoPage = (
  loaded: number,
  total: number,
) => Promise<PhotoPage | null>;

export const createPhotoPager = (read: ReadPhotoPage): RequestPhotoPage => {
  let inFlight = false;

  return async (loaded, total) => {
    if (inFlight || loaded >= total) return null;
    inFlight = true;
    try {
      const page = await read(loaded);
      return page && page.photos.length > 0 ? { skip: loaded, ...page } : null;
    } catch {
      // A failed read is "no page this time", never an error on a public page.
      return null;
    } finally {
      inFlight = false;
    }
  };
};

/**
 * The held photos with a page appended — only if the page starts exactly
 * where they end. A page for an offset already passed (or not yet reached)
 * is dropped, so no ordering of answers can duplicate or skip a photo.
 */
export const appendPhotoPage = (
  held: readonly ViewerPhoto[],
  page: PhotoPage,
): readonly ViewerPhoto[] =>
  page.skip === held.length ? [...held, ...page.photos] : held;
