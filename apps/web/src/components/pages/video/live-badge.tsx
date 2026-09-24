/**
 * The mark that a broadcast is running right now.
 *
 * The dot pulses every 1.8s (`video-system.css`). The pulse is decoration on
 * top of a word: a reader who cannot see the animation, or who asked for it to
 * stop, still reads "مباشر الآن", so nothing about the state is carried by
 * motion alone (WCAG 1.4.1 -- colour and movement are never the only channel).
 */
export const LiveBadge = ({ label, className = "" }: { label: string; className?: string }) => (
  // A nested surface, not a colour. `brand-red` publishes its own ground and
  // its own ink, both settled and measured in ADR-0098 §8.3 — so the badge
  // asks for the surface and inherits the pair, instead of naming a ramp step
  // and re-deciding the contrast on it (Chapter 7 §7.7: roles, not steps).
  <span
    data-surface="brand-red"
    className={`inline-flex items-center gap-2 rounded-[var(--radius-full)] px-3 py-1.5 text-caption font-bold ${className}`}
  >
    <span
      aria-hidden="true"
      className="vs-live-dot inline-block rounded-full"
      style={{ inlineSize: 8, blockSize: 8, background: "currentColor" }}
    />
    {label}
  </span>
);
