/**
 * The mark that a broadcast is running right now.
 *
 * The dot pulses every 1.8s (`video-system.css`). The pulse is decoration on
 * top of a word: a reader who cannot see the animation, or who asked for it to
 * stop, still reads "مباشر الآن", so nothing about the state is carried by
 * motion alone (WCAG 1.4.1 -- colour and movement are never the only channel).
 */
export const LiveBadge = ({ label, className = "" }: { label: string; className?: string }) => (
  <span
    className={`inline-flex items-center gap-2 rounded-[var(--vs-radius-pill)] px-3 py-1.5 text-caption font-bold ${className}`}
    style={{ background: "var(--vs-live)", color: "var(--vs-live-ink)" }}
  >
    <span
      aria-hidden="true"
      className="vs-live-dot inline-block rounded-full"
      style={{ inlineSize: 8, blockSize: 8, background: "currentColor" }}
    />
    {label}
  </span>
);
