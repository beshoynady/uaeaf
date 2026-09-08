import type { ReactNode } from "react";

/**
 * The indicator row above the administration screens.
 *
 * Each tile answers a question an administrator would otherwise answer by
 * reading the whole table. A tile earns its place only if it names something
 * actionable — "39 active accounts" is context, "2 accounts can sign in and
 * see nothing" is a task.
 *
 * `tone` marks the two that mean work, and it is carried by a rule under the
 * tile, never by the figure's colour: measured on the light surface, the
 * warning hue reaches 2.45:1 and would fail WCAG 1.4.3 as text (see
 * components/auth/status-message.tsx for the full measurement and the token
 * conflict behind it). The tone is redundant with the note beneath the
 * figure, so nothing is carried by colour alone (Chapter 6 §6.2).
 */
export type StatTone = "neutral" | "attention" | "critical";

const TONE_RULE: Record<StatTone, string> = {
  neutral: "transparent",
  attention: "var(--color-semantic-warning)",
  critical: "var(--color-semantic-error)",
};

export interface StatTile {
  key: string;
  label: string;
  value: number;
  /** One line saying what the figure means or what to do about it. */
  note: ReactNode;
  tone?: StatTone;
}

export function StatTiles({ tiles, caption }: { tiles: readonly StatTile[]; caption: string }) {
  return (
    <section aria-label={caption} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          style={{ borderBottomColor: TONE_RULE[tile.tone ?? "neutral"] }}
          className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] border-b-[3px] bg-[color:var(--color-surface-raised)] px-4 py-3"
        >
          <p className="text-caption text-[color:var(--color-text-secondary)]">{tile.label}</p>
          <p className="text-h4 font-bold tabular-nums text-[color:var(--color-text-primary)]">
            {tile.value}
          </p>
          <p className="text-caption text-[color:var(--color-text-muted)]">{tile.note}</p>
        </div>
      ))}
    </section>
  );
}
