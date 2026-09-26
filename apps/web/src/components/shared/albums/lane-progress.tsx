import type { CSSProperties } from "react";

import "./viewer.css";

export interface LaneProgressProps {
  /** Zero-based position of the current photo. */
  index: number;
  /** Photos in the album, not photos loaded so far. */
  total: number;
  className?: string;
}

/**
 * A 4px running lane filled to `(index + 1) / total` in the tricolour.
 *
 * `aria-hidden`: the counter beside the slider already states the position in
 * words, and a progressbar role here would announce the same fact twice with a
 * percentage nobody asked for.
 *
 * The fill is scaled, not resized, so moving it costs a composite and no
 * layout (ADR-0009); it grows from the reading start through `--dirx`.
 */
export const LaneProgress = ({ index, total, className }: LaneProgressProps) => {
  const progress = total > 0 ? Math.min(1, (index + 1) / total) : 0;
  return (
    <div className={["av-lane", className].filter(Boolean).join(" ")} aria-hidden="true">
      <div className="av-lane__fill" style={{ "--av-progress": progress } as CSSProperties} />
    </div>
  );
};
