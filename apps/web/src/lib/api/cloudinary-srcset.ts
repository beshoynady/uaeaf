import { cloudinaryLoader, isCloudinaryUrl } from "./cloudinary-loader";

/**
 * Building a `srcset` for a picture the image host can resize.
 *
 * `next/image` builds one of these itself, by calling a `loader` per
 * candidate width — but `loader` is a function, and the pages that render
 * these images are server components: passing a function into the client
 * component `next/image` renders fails the build outright ("Functions cannot
 * be passed directly to Client Components"). A string crosses that boundary
 * without complaint, so the srcset is assembled here instead and handed to a
 * plain `<img>`.
 *
 * The saving is the reason any of this exists: the contact hero is stored as
 * a 1,639,225-byte PNG and comes back as 150,658 bytes of WebP at full width
 * and 10,584 at the narrowest step, measured against the live CDN.
 */

/** The candidate widths offered to the browser.
 *
 *  These are Chapter 5's breakpoints and their 2× retina counterparts, not a
 *  generic ladder: every one of them is a width some layout in this codebase
 *  actually resolves to, so no request is spent on a size nothing asks for. */
export const CDN_WIDTHS = [384, 640, 768, 1024, 1280, 1536, 1920, 2560] as const;

/**
 * @param src the stored delivery URL.
 * @param intrinsicWidth the picture's real width, when known. Candidates
 * above it are dropped: upscaling costs bytes and adds no detail.
 * @returns a `srcset` value, or `""` when the host cannot transform this URL
 * — the caller then renders `src` alone rather than a list of 404s.
 */
export function cloudinarySrcSet(src: string, intrinsicWidth?: number): string {
  if (!isCloudinaryUrl(src)) return "";

  const usable = intrinsicWidth
    ? CDN_WIDTHS.filter((width) => width <= intrinsicWidth)
    : [...CDN_WIDTHS];

  // A picture narrower than every candidate still needs one entry, or the
  // browser is handed an empty attribute and nothing to choose from.
  const widths = usable.length > 0 ? usable : [CDN_WIDTHS[0]];

  return widths.map((width) => `${cloudinaryLoader({ src, width })} ${width}w`).join(", ");
}
