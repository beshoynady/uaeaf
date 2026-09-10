/**
 * The seam between the media domain and wherever the bytes actually live.
 *
 * `mediaAssets.file` has carried `storageKey` alongside `url` since the
 * collection was written, with a comment naming exactly this: `url` is what
 * gets served, `storageKey` is what a change of storage backend would have
 * to move. This interface is the other half of that decision — nothing in
 * `MediaAssetsService` names a provider, so replacing one is a new class and
 * a changed binding rather than an edit to the domain.
 */

/** What a provider gives back once the bytes are stored. */
export interface StoredObject {
  /** The canonical delivery URL, HTTPS. */
  url: string;
  /** The provider-relative identifier, and the only handle by which this
   *  object can later be destroyed. */
  storageKey: string;
  /** Read back from the provider rather than from our own probe, so the
   *  record describes what is actually stored — a provider is free to
   *  normalise on ingest, and a record that disagrees with the object is
   *  worse than no record. */
  width: number;
  height: number;
  bytes: number;
  mimeType: string;
}

export interface UploadRequest {
  buffer: Buffer;
  /** Groups the object on the provider. Uploads from a page editor and from
   *  the media library land in different folders so the provider's own
   *  console stays navigable. */
  folder: string;
  /** The editor's filename, used only to derive a readable identifier. */
  originalName: string;
}

export interface StorageProvider {
  upload(request: UploadRequest): Promise<StoredObject>;
  /** Removes the object permanently. Must succeed silently when the object
   *  is already gone: purging a record whose object was removed by hand
   *  upstream has to converge, not fail forever. */
  destroy(storageKey: string): Promise<void>;
}

/** Nest has no interface types at runtime; this is the injection token. */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/** Where each kind of upload is filed on the provider. */
export const STORAGE_FOLDERS = {
  /** Content images uploaded from a page's own admin screen. */
  pages: 'uaeaf/pages',
  /** Images uploaded into the media library and its albums. */
  library: 'uaeaf/library',
} as const;

export type StorageFolder = (typeof STORAGE_FOLDERS)[keyof typeof STORAGE_FOLDERS];
