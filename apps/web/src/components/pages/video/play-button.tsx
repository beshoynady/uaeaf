/**
 * The one play affordance, at three sizes.
 *
 * -- Why it is a span and not a button -------------------------------------
 *
 * Every place this is drawn, the whole card or the whole backdrop is already
 * the control: a card has one stretched link, and the featured backdrop is one
 * button. A nested button inside either would be a second tab stop over the
 * same action, and a keyboard reader would press Enter twice to do one thing.
 * So this draws the affordance and the ancestor owns the press -- which is why
 * it is `pointer-events-none`: a pointer aiming at the triangle must reach the
 * control behind it.
 *
 * The two rings loop rather than running once. They are an invitation, not an
 * entrance, and `prefers-reduced-motion` removes them entirely
 * (`video-system.css`) -- the disc itself does not move, so the affordance is
 * unchanged for a reader who stopped the motion.
 */

const SIZES = { sm: 44, md: 64, lg: 104 } as const;

export const PlayButton = ({
  size = "md",
  /** Green fill instead of the resting glass. The card hands this down on
   *  hover; it is never a state this component decides for itself. */
  filled = false,
  /** The looping rings. Off on a card, where forty of them would be a
   *  fairground; on for the one featured video and the one broadcast. */
  pulsing = false,
}: {
  size?: keyof typeof SIZES;
  filled?: boolean;
  pulsing?: boolean;
}) => {
  const px = SIZES[size];

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none relative inline-flex items-center justify-center"
      style={{ inlineSize: px, blockSize: px }}
    >
      {pulsing ? (
        <>
          <span
            className="vs-pulse-ring absolute inset-0 rounded-full"
            style={{ border: "1px solid rgba(255,255,255,0.55)" }}
          />
          <span
            className="vs-pulse-ring vs-pulse-second absolute inset-0 rounded-full"
            style={{ border: "1px solid rgba(255,255,255,0.35)" }}
          />
        </>
      ) : null}

      {/* The resting disc is dark, not a white wash.
          A translucent white disc with a white triangle is invisible over a
          pale still — measured on the homepage against a light image, where
          the whole affordance disappeared. The thumbnail is an uncontrolled
          photograph, so the control cannot assume a dark one: a dark scrim
          with a white rim reads on both, and the white glyph then has a ground
          of its own rather than borrowing the photo's. */}
      <span
        className="absolute inset-0 rounded-full transition-[background-color,box-shadow] duration-[var(--motion-duration-fast)]"
        style={{
          background: filled ? "var(--vs-green)" : "rgba(10,12,11,0.46)",
          boxShadow: filled
            ? "none"
            : "inset 0 0 0 1px rgba(255,255,255,0.55), 0 2px 18px -4px rgba(0,0,0,0.6)",
          backdropFilter: filled ? undefined : "blur(4px)",
        }}
      />

      {/* Nudged so the triangle sits optically centred: a geometrically
          centred one reads as off-centre towards its flat edge.

          It is NOT mirrored in Arabic. A play triangle is a transport control,
          not a directional arrow -- it points the way tape runs, which is the
          same on every player in every language. The approved design draws it
          pointing the same way on the Arabic composition. */}
      <svg
        viewBox="0 0 24 24"
        focusable="false"
        className="relative"
        style={{ inlineSize: px * 0.36, blockSize: px * 0.36, transform: "translateX(6%)" }}
      >
        <path d="M8 5.2 19 12 8 18.8V5.2Z" fill={filled ? "var(--vs-on-green)" : "#FFFFFF"} />
      </svg>
    </span>
  );
};
