/**
 * Active nav item's underline: the federation's three-ink gradient, 3px.
 * `data-surface` is load-bearing — `--brand-tricolor` resolves to nothing
 * without it (surfaces.css `:root, [data-surface]`).
 */
export const TricolorIndicator = ({ active }: { active: boolean }) => (
  <span
    aria-hidden="true"
    data-surface="base"
    data-state={active ? "on" : "rest"}
    className="nav-indicator h-[var(--border-width-ring)] w-6 shrink-0 rounded-full bg-[image:var(--brand-tricolor)] xl:w-full"
  />
);
