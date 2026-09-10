/**
 * Asking the image host for the size and format each viewport needs.
 *
 * `next/image` builds a `srcset` by calling a loader once per candidate
 * width, but its default loader routes through this application's own
 * optimizer, which cannot touch a remote host without that host being
 * declared build-time. The images here live on a CDN that resizes and
 * re-encodes on request, so the cheaper and more honest answer is to let it:
 * this loader writes the width into the URL and lets the CDN do the work.
 *
 * The difference is not marginal. The contact hero is a 1,639,225-byte PNG
 * as stored; `f_auto,q_auto` returns 150,658 bytes of WebP to a browser that
 * accepts one, and `w_384` returns 10,584. All three are the same object,
 * measured against the live CDN.
 */

const HOST = "res.cloudinary.com";

/** Where a delivery URL's transformation segment goes: directly after
 *  `/image/upload/`, before the optional version and the public id. */
const UPLOAD = "/image/upload/";

/** True only for a delivery URL on the transforming host.
 *
 *  Parsed rather than pattern-matched: `res.cloudinary.com.example.test`
 *  contains the host as a substring and is a different origin entirely, so a
 *  `startsWith`/`includes` test would hand a third party's URL to a rewrite
 *  that assumes our own. */
export function isCloudinaryUrl(src: string): boolean {
  if (!src.startsWith("http")) return false;
  try {
    return new URL(src).hostname === HOST;
  } catch {
    return false;
  }
}

/** An existing transformation segment, so a URL is re-sized rather than
 *  double-transformed. Cloudinary reads a second segment as part of the
 *  public id and answers 404, so replacing is the only correct move. */
const TRANSFORMATION = /^[a-z]{1,3}_[^/]*$/;

export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!isCloudinaryUrl(src)) {
    // A local path, or a reference stored before this host was adopted.
    // Rewriting it would turn a working image into a 404.
    return src;
  }

  const cut = src.indexOf(UPLOAD);
  if (cut === -1) return src;

  const head = src.slice(0, cut + UPLOAD.length);
  const tail = src.slice(cut + UPLOAD.length);

  const segments = tail.split("/");
  // `q_auto` rather than a fixed number unless the caller asked: the CDN
  // picks a quality per image from its own content, which beats one value
  // chosen here for photographs and flat graphics alike.
  const transformation = `f_auto,q_${quality ?? "auto"},w_${width}`;

  const rest = TRANSFORMATION.test(segments[0]) ? segments.slice(1) : segments;
  return `${head}${transformation}/${rest.join("/")}`;
}
