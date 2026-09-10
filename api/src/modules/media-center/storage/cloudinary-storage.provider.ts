import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { StorageProvider, StoredObject, UploadRequest } from './storage-provider.js';

/** The two uploader calls this provider makes, named structurally so the
 *  class can be constructed with a stand-in and exercised without a
 *  network. Matches the shape of `cloudinary.v2.uploader`. */
export interface CloudinaryUploader {
  upload(file: string, options: Record<string, unknown>): Promise<CloudinaryUploadResult>;
  upload_stream: unknown;
  destroy(publicId: string, options: Record<string, unknown>): Promise<{ result: string }>;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

/** Injection token for the uploader, so the module binds the real SDK and a
 *  test binds a fake without either knowing about the other. */
export const CLOUDINARY_UPLOADER = Symbol('CLOUDINARY_UPLOADER');

/**
 * Cloudinary behind the `StorageProvider` seam.
 *
 * Uploads go through the buffer-as-data-URI form rather than
 * `upload_stream`. The streaming form saves holding the encoded copy in
 * memory, which matters when uploads are unbounded — here they are capped at
 * 10 MB before this class is reached (`assertUploadable`), so the ceiling is
 * a known ~13 MB string on a request that already holds the 10 MB buffer.
 * Against that, the callback-to-promise bridge `upload_stream` needs is a
 * place for an unhandled rejection to hide, and this path has none.
 */
@Injectable()
export class CloudinaryStorageProvider implements StorageProvider {
  private readonly logger = new Logger(CloudinaryStorageProvider.name);

  constructor(@Inject(CLOUDINARY_UPLOADER) private readonly uploader: CloudinaryUploader) {}

  async upload(request: UploadRequest): Promise<StoredObject> {
    let result: CloudinaryUploadResult;
    try {
      result = await this.uploader.upload(dataUri(request.buffer), {
        folder: request.folder,
        public_id: publicIdFor(request.originalName),
        // Never `auto`: it lets the provider decide from the bytes, and a
        // file that is not an image would then be stored as a raw object
        // and served back as whatever it actually is. The type is already
        // verified locally; this states it rather than re-deriving it.
        resource_type: 'image',
        // The record is the index of what exists. Letting the provider
        // silently reuse an existing object would make two records point
        // at one file, and purging either would break the other.
        overwrite: false,
        unique_filename: true,
      });
    } catch (cause) {
      // The editor did nothing wrong, so this is not a 4xx. Logged with the
      // cause because the provider's message is the only diagnosis there is.
      this.logger.error(`Upload to Cloudinary failed: ${describe(cause)}`);
      throw new ServiceUnavailableException('The image store is unavailable. Try again shortly.');
    }

    return {
      url: result.secure_url,
      storageKey: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      mimeType: mimeTypeOf(result.format),
    };
  }

  async destroy(storageKey: string): Promise<void> {
    let outcome: { result: string };
    try {
      outcome = await this.uploader.destroy(storageKey, {
        resource_type: 'image',
        // Without this the CDN keeps serving the deleted object from edge
        // caches, so a purge would not actually take it out of circulation.
        invalidate: true,
      });
    } catch (cause) {
      // Raised, never swallowed: the caller hard-deletes the record once
      // this resolves, and a silent failure here is precisely how an
      // orphaned object starts consuming quota with nothing pointing at it.
      this.logger.error(`Destroying ${storageKey} failed: ${describe(cause)}`);
      throw new ServiceUnavailableException('The image store is unavailable. Try again shortly.');
    }

    // `not found` is the converged state, not an error: an object removed
    // upstream by hand must still let its record be purged.
    if (outcome.result !== 'ok' && outcome.result !== 'not found') {
      this.logger.warn(`Destroying ${storageKey} returned "${outcome.result}".`);
    }
  }
}

const dataUri = (buffer: Buffer) => `data:application/octet-stream;base64,${buffer.toString('base64')}`;

/**
 * A readable, URL-safe identifier derived from the editor's filename.
 *
 * The filename reaches a public URL, so nothing of it survives that would
 * need escaping — and the random suffix is not decoration: two editors
 * uploading `photo.jpg` on the same day must not contend for one identifier.
 */
function publicIdFor(originalName: string): string {
  const stem = originalName.replace(/\.[^.]+$/, '');
  const slug =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image';
  return `${slug}-${randomBytes(4).toString('hex')}`;
}

/** Cloudinary reports a format (`png`, `jpg`), not a media type. `jpg` is
 *  the one that is not simply `image/` plus the format. */
const mimeTypeOf = (format: string) =>
  format === 'jpg' ? 'image/jpeg' : `image/${format.toLowerCase()}`;

const describe = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));
