import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { probeImage, type ProbedImage } from './image-probe.js';

/**
 * What the upload path accepts, and why each limit is where it is.
 *
 * Every ceiling below is the storage provider's own documented limit rather
 * than a number chosen here. Restating them locally is the point: a file the
 * provider would reject is rejected before its bytes are sent, so the editor
 * gets a sentence naming the problem instead of a failed request that has
 * already spent the bandwidth and, on a metered plan, part of the quota.
 */

/** Cloudinary's per-image ceiling on the plans this platform uses. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Cloudinary's megapixel ceiling. Width × height, not file size: a highly
 *  compressed 30-megapixel photograph passes the byte check and still fails
 *  upstream, because the limit upstream is on what has to be decoded. */
export const MAX_PIXELS = 25_000_000;

/** The shortest edge a picture may have and still be a page image. Below
 *  this it is an icon or a thumbnail, and stretching one across a hero band
 *  produces the kind of defect that reaches the site rather than the
 *  editor. */
export const MIN_EDGE = 200;

/**
 * The shortest edge an icon may have (owner request 2026-09-21/22).
 *
 * `MIN_EDGE` is a quality floor for page images and says so: below it a
 * picture "is an icon". A social channel's own icon is exactly that, drawn at
 * 44px, so it gets its own floor: twice the largest size it is drawn at, the
 * rule ADR-0086 D4 applies to logos (drawn above half its source, a mark
 * blurs on a dense screen). Only this floor differs — the formats and both
 * ceilings are the security half of this gate and apply to icons unchanged.
 */
export const ICON_MIN_EDGE = 88;

/** What an upload is for. Only an icon has a rule of its own. */
export type UploadPurpose = 'page' | 'icon';

/** The three formats `probeImage` can verify from bytes. SVG is absent by
 *  decision, not omission: it is a script-bearing document, and nothing in
 *  the platform needs a vector upload. */
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** The parts of an uploaded file this domain reads.
 *
 *  Declared structurally rather than imported from the HTTP layer's types:
 *  the service and this gate care about bytes, a length and a name, and
 *  binding them to one framework's file object would put a web concern
 *  inside the domain and make every test construct one. Same reasoning as
 *  the `StorageProvider` seam. */
export interface UploadCandidate {
  buffer: Buffer;
  size: number;
  originalname: string;
}

/**
 * Passes a candidate or throws, and returns what the file really is.
 *
 * The returned type and dimensions come from the bytes, never from the
 * request: `mimetype` on a multipart part is the browser's claim, derived
 * from the file extension, so a renamed file reports whatever its new name
 * implies. Everything downstream — the stored `mimeType`, the `width` and
 * `height` on the record, the responsive URLs built from them — uses the
 * probed values instead.
 *
 * @throws UnsupportedMediaTypeException when the bytes are not a PNG, JPEG
 * or WebP, including when they are unreadable or the upload is empty.
 * @throws PayloadTooLargeException when the file exceeds the provider's
 * per-image ceiling.
 * @throws BadRequestException when the dimensions are outside the usable
 * range at either end.
 */
export const assertUploadable = (
  file: UploadCandidate,
  { purpose = 'page' }: { purpose?: UploadPurpose } = {},
): ProbedImage => {
  const name = file.originalname;

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new PayloadTooLargeException(
      `"${name}" is ${mb(file.size)} MB; the limit is ${mb(MAX_UPLOAD_BYTES)} MB.`,
    );
  }

  const probed = probeImage(file.buffer);
  if (!probed) {
    throw new UnsupportedMediaTypeException(
      `"${name}" is not a readable ${ACCEPTED_TYPES.map(shortName).join(', ')} image.`,
    );
  }

  const minEdge = purpose === 'icon' ? ICON_MIN_EDGE : MIN_EDGE;
  if (probed.width < minEdge || probed.height < minEdge) {
    throw new BadRequestException(
      `"${name}" is ${probed.width}×${probed.height}; the shortest edge must be at least ${minEdge}px.`,
    );
  }

  if (probed.width * probed.height > MAX_PIXELS) {
    throw new BadRequestException(
      `"${name}" is ${probed.width}×${probed.height}, over the ${MAX_PIXELS / 1_000_000} megapixel limit.`,
    );
  }

  return probed;
};

const mb = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

const shortName = (mimeType: string) => mimeType.replace('image/', '').toUpperCase();
