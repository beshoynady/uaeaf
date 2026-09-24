import type { ReactNode } from "react";
import { StatCard, type StatTone as CardTone } from "@uaeaf/brand-ui";

/**
 * The indicator row above the administration screens.
 *
 * Each tile answers a question an administrator would otherwise answer by
 * reading the whole table. A tile earns its place only if it names something
 * actionable — "39 active accounts" is context, "2 accounts can sign in and
 * see nothing" is a task.
 *
 * Drawn with the shared library's `StatCard` (ADR-0098, Chapter 12 §12.15):
 * the tone is the card's inline-start edge, never the figure's colour —
 * measured on the light surface, the warning hue reaches 2.45:1 and would fail
 * WCAG 1.4.3 as text (see components/auth/status-message.tsx). The tone is
 * redundant with the note beneath the figure, so nothing is carried by colour
 * alone (Chapter 6 §6.2).
 */
export type StatTone = "neutral" | "attention" | "critical";

/**
 * `critical` has no counterpart in the library's tone set, which names roles
 * (`action`, `attention`, `positive`, `live`) and carries no error edge. It
 * folds into `attention` — the one warning-family tone — rather than being
 * drawn with a local error border beside the library's own, which would put
 * two border systems in one row. The distinction is still in the note text.
 */
const CARD_TONE: Record<StatTone, CardTone> = {
  neutral: "neutral",
  attention: "attention",
  critical: "attention",
};

export interface StatTile {
  key: string;
  label: string;
  value: number;
  /** One line saying what the figure means or what to do about it. */
  note: ReactNode;
  tone?: StatTone;
}

export const StatTiles = ({ tiles, caption }: { tiles: readonly StatTile[]; caption: string }) => (
  <section aria-label={caption}>
    {/* A list, so a screen reader announces how many figures the row holds. */}
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {tiles.map((tile) => (
        <li key={tile.key} className="flex">
          <StatCard
            className="flex-1"
            value={String(tile.value)}
            label={tile.label}
            detail={tile.note}
            tone={CARD_TONE[tile.tone ?? "neutral"]}
          />
        </li>
      ))}
    </ul>
  </section>
);
