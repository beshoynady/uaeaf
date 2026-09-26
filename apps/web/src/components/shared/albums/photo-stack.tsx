import Image from "next/image";
import { Surface } from "@uaeaf/brand-ui";
import { altOf } from "@/lib/api/media";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import type { PhotoStackProps } from "./types";
import "./albums.css";

/**
 * An album's first photographs as a fanned stack (CMP-PHOTOSTACK-001).
 *
 * Three layers: the front photograph, and two folded behind it towards the
 * inline end. On hover, and on focus inside the card around it, the layers
 * take the front in turn; at every other time the stack is still
 * (ADR-0099 D2), so a grid of eight cards is eight still pictures until a
 * reader engages one of them.
 *
 * Fewer photographs draw fewer layers — one stands alone, two make a pair —
 * rather than repeating a photograph to fill a slot, which would show the same
 * picture twice side by side. No photograph at all draws a quiet kit surface
 * with a picture glyph, sized exactly as the stack would be, so the card's
 * height does not depend on whether an editor has uploaded yet.
 *
 * Server Component: the motion is CSS on `:hover` / `:focus-within`, and there
 * is no state.
 */

const MAX_LAYERS = 3;

/*
 * The width asked of the CDN for one layer. The card is at most ~300px wide
 * in the four-column desktop grid and ~360px in the phone's single column, so
 * 720 covers both at 2x without sending a hero-sized file to a thumbnail.
 */
const LAYER_WIDTH = 720;

const layerSrc = (url: string) =>
  isCloudinaryUrl(url) ? cloudinaryLoader({ src: url, width: LAYER_WIDTH }) : url;

export const PhotoStack = ({
  photos,
  locale,
  sizes = "(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 300px",
  overlay,
  className,
}: PhotoStackProps) => {
  const layers = photos.slice(0, MAX_LAYERS);

  return (
    <div
      className={["photo-stack", className].filter(Boolean).join(" ")}
      data-layers={layers.length}
    >
      {layers.length === 0 ? (
        <Surface kind="canvas" mesh as="div" className="photo-stack__empty">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.75" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
        </Surface>
      ) : (
        // Drawn back to front, so the resting front photograph is the last one
        // painted and its edge covers the folded layers' near edges.
        [...layers.keys()].reverse().map((slot) => {
          const photo = layers[slot];
          return (
            <div key={photo.id} className="photo-stack__layer" data-slot={slot}>
              <Image
                src={layerSrc(photo.file.url)}
                // Only the front photograph is described. The folded two are
                // slivers a sighted reader cannot make out either, and three
                // descriptions per card down a grid of eight is noise.
                alt={slot === 0 ? altOf(photo, locale) : ""}
                fill
                sizes={sizes}
                unoptimized
                className="object-cover"
              />
            </div>
          );
        })
      )}
      {overlay ? <div className="photo-stack__overlay">{overlay}</div> : null}
    </div>
  );
};
