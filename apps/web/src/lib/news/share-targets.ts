/**
 * Where an article can be shared to, and the address that does it.
 *
 * ── Why a URL scheme and not a library ─────────────────────────────────────
 *
 * Every one of these is a documented share endpoint that takes the page's
 * address in a query parameter. A share library would add a dependency, ship a
 * tracker, and do the same string concatenation (owner constraint 2026-09-21
 * §9).
 *
 * ── Why Instagram is not here ──────────────────────────────────────────────
 *
 * Figma draws six buttons and one of them is Instagram, which has no
 * share-a-link endpoint at all — the platform accepts media from its own apps
 * and nothing else. A button that opens a window where the reader's link is
 * not present is worse than an absent button, so it is left out and recorded
 * as a scope conflict rather than drawn dead.
 *
 * ── Why "copy" is in the same list ─────────────────────────────────────────
 *
 * Because it is what the reader is choosing between: a row of five ways to
 * pass a story on. It carries no URL, which is exactly what marks it out to
 * the component that renders it.
 */

export const SHARE_TARGETS = ["copy", "whatsapp", "x", "facebook", "linkedin"] as const;
export type ShareTarget = (typeof SHARE_TARGETS)[number];

/**
 * The address that opens a share window, or null for the one that does not.
 *
 * Both the link and the headline are encoded: a headline contains spaces,
 * Arabic, and sometimes an ampersand, and an unencoded one truncates the
 * parameter at the first `&` — silently, with the rest of the title gone.
 */
export const shareHref = (target: ShareTarget, url: string, title: string): string | null => {
  const link = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  switch (target) {
    case "whatsapp":
      // WhatsApp takes one `text` field, so the headline and the link travel
      // together in it rather than in two parameters it would ignore.
      return `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
    case "x":
      return `https://twitter.com/intent/tweet?url=${link}&text=${text}`;
    case "facebook":
      // Facebook reads the headline and picture from the page's own Open
      // Graph tags, so only the address is sent.
      return `https://www.facebook.com/sharer/sharer.php?u=${link}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${link}`;
    case "copy":
      return null;
  }
};
