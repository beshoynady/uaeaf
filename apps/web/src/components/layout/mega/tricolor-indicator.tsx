/**
 * Active nav item's underline: the federation's three-ink gradient, 3px.
 * `data-surface` is load-bearing — `--brand-tricolor` resolves to nothing
 * without it (surfaces.css `:root, [data-surface]`).
 *
 * In the row the trigger fills the header's height, so the underline is taken
 * out of the flow and pinned to its bottom edge — the header's own bottom edge
 * — rather than trailing the label. That is where the design draws it, and it
 * lets the label stay optically centred in the row.
 *
 * That pinning is a rule in `motion.css`, not a utility here: `data-surface`
 * above carries `[data-surface]{position:relative}` from an unlayered
 * stylesheet, and unlayered declarations beat every layer — so `xl:absolute`
 * written here would be overruled silently and the underline would stay in the
 * flow with nothing reporting it.
 */
export const TricolorIndicator = ({ active }: { active: boolean }) => (
  <span
    aria-hidden="true"
    data-surface="base"
    data-state={active ? "on" : "rest"}
    className="nav-indicator h-[var(--border-width-ring)] w-6 shrink-0 rounded-full bg-[image:var(--brand-tricolor)] xl:w-full"
  />
);
