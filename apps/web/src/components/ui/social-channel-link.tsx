import Image from "next/image";
import { FOCUS } from "@/components/ui/interactive";
import { CARD } from "@/components/ui/surface";
import { isExternalMedia } from "@/lib/api/media";
import type { SocialChannel } from "@/lib/social-channels";

/**
 * One of the federation's channels, as a button.
 *
 * Shared because there are now three placements — the footer, the contact page
 * and the newsroom's sidebar — and the artwork logic underneath them is
 * forty lines of three-way branching that had already been copied once. A
 * third copy is what the shared-components rule exists to prevent: three
 * copies drift into three buttons, and a reader sees the third as a different
 * kind of thing.
 *
 * What is shared is the link's semantics and its picture. What is NOT shared
 * is the shell's radius and its response — the footer draws these at
 * `radius.lg` with its own nudge and the contact page at `radius.md` with
 * `.lift` — so those arrive through `className` and each placement keeps
 * exactly the composition it had.
 *
 * ── The three kinds of channel ─────────────────────────────────────────────
 *
 * An editor's uploaded icon stands on a card, because the image may be
 * transparent and a brand colour would be one they did not choose. A platform
 * the site ships artwork for wears its own brand ground — third-party identity
 * rather than a UAEAF palette value, which is colour as identification and not
 * as decoration (ADR-0065 R2). A platform with neither is still shown, named
 * by the editor's own word, because dropping it would hide something saved in
 * the panel.
 *
 * ── 44px, everywhere ───────────────────────────────────────────────────────
 *
 * The touch-target gate (IA §12) holds in all three placements. A known
 * channel is a square; an unknown one is a pill that has to grow to fit a
 * word, so it takes a minimum rather than a fixed size.
 */
export const SocialChannelLink = ({
  channel,
  className = "",
}: {
  channel: SocialChannel;
  /** The shell's radius and hover response, which belong to the placement. */
  className?: string;
}) => (
  <a
    href={channel.href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={channel.name}
    className={`flex items-center justify-center overflow-hidden ${FOCUS} ${className} ${
      channel.icon
        ? `size-11 ${CARD}`
        : channel.known
          ? `size-11 ${channel.known.className}`
          : `min-h-11 min-w-11 ${CARD} px-3 text-label font-bold text-[color:var(--color-text-primary)]`
    }`}
  >
    {channel.icon ? (
      // The editor's own artwork, whole: `object-contain` so a logo that is
      // not square is shown entire rather than cropped.
      <Image
        src={channel.icon.file.url}
        alt=""
        width={44}
        height={44}
        unoptimized={isExternalMedia(channel.icon.file.url)}
        aria-hidden="true"
        className="size-11 object-contain"
      />
    ) : channel.known ? (
      // X and TikTok export as complete button artwork rather than a glyph, so
      // they fill the button; the rest are glyphs on a brand-coloured ground.
      <Image
        src={channel.known.icon}
        alt=""
        width={channel.known.fullBleed ? 44 : 20}
        height={channel.known.fullBleed ? 44 : 20}
        aria-hidden="true"
        className={channel.known.fullBleed ? "size-11 object-cover" : "size-5 object-contain"}
      />
    ) : (
      <span aria-hidden="true">{channel.name.slice(0, 2)}</span>
    )}
  </a>
);
