# Brand UI Kit — Phases B → F Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the UAEAF expressive identity layer once, as a shared UI library both applications read, and apply it to the public site, the dashboard, and a rebuilt Regulations & Policies page.

**Architecture:** Five surfaces publish a fixed set of on-surface CSS custom properties through `data-surface`; every component reads them from the cascade and takes no background-aware prop. The library is a new internal workspace `packages/brand-ui` with no external dependency — motion is CSS, graphics are inline SVG. Tokens bind to what ADR-0059 D2 already built wherever a counterpart exists.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 (CSS-first, `@source`) · next-intl · the zero-dependency token pipeline at `packages/design-tokens/scripts/build.mjs` · Vitest.

**Spec:** the original task prompt (Brand UI Kit — Surfaces & Accents) plus the follow-up that settles ADR-0098 §8. Governing decision record: `docs/design-system/ADR-0098-Brand-UI-Kit-Surfaces-And-Accents.md`.

## Global Constraints

- **No Git command, ever.** Work on `main`, leave everything uncommitted (root `CLAUDE.md` §33).
- **No new external dependency.** The internal workspace is allowed. No Framer Motion, no GSAP — `motion` is already in `apps/web` and gains no new usage here.
- **No schema change, no backend change.**
- CSS logical properties are mandatory. Physical `left`/`right` only where the property is not logical (gradient angle, `transform-origin`), and then resolved once at system level from `[dir]`.
- Colours, gradients, durations and border widths come from tokens. No hex, no `ms`, no `px` border width written inside a component.
- `focus-visible` stays a solid-colour ring at ≥ 3:1 (WCAG 1.4.11). The tricolour is never a focus indicator.
- Every motion stops under `prefers-reduced-motion: reduce`; borders stay visible and static.
- Arrow functions for every new function (root `CLAUDE.md` §30.1). English comments, explaining WHY.
- Protected, do not touch: the footer's real map iframe · live-broadcast logic (expected-end + manual stop) · sidebar collapse persistence and its `--motion-duration-fast` timing · the structure of `color.topic.*`.
- Settled decisions from ADR-0098 §8: `surface-canvas` → existing page ground; brand gradients start at `#00843D` / `#C8102E` with **white-only** text; `surface-ink` = `#0B0B0B` fixed in all themes and never without a non-surface edge cue; links use `color.text.link`.

## Review Focus

Five things the spec implies and no task's happy path exercises. Each has a test pinned to the task that owns the code.

1. **A gradient surface with a muted-text token pointing at anything but pure white.** The whole reason `green.500` is admissible as a ground is that exactly one text tier fits on it. Owned by Task B4.
2. **`Surface kind="ink"` rendered with neither an accent bar nor a mesh.** In dark theme its ground is ~1.1:1 against the page, so the section silently stops being a section. Owned by Task B5.
3. **A green surface rendered adjacent to a red one.** 1.15:1 — they read as one band, and a reviewer cannot catch it. Owned by Task B6.
4. **Two continuously rotating borders in one view, or a live border on a card whose broadcast has ended.** Owned by Task C7.
5. **An empty date or file size rendered as a dash.** A dash is a value a reader must interpret; absent data must be absent. Owned by Task C14.

---

## File Structure

### Phase B — tokens (`packages/design-tokens/`)
- Modify `tokens/primitive/colors.json` — add `color.ink.500` (`#0B0B0B`), the one new primitive value.
- Modify `tokens/primitive/motion.json` — add `motion.duration.orbit`, the first cycle period.
- Modify `tokens/primitive/border.json` — add the two brand border widths.
- Create `tokens/semantic/surfaces.json` — the five surfaces and their on-surface sets, per theme, as one theme-invariant shape plus per-theme overrides in the three `colors.*.json` files.
- Modify `tokens/semantic/colors.{light,dark,high-contrast}.json` — the per-theme on-surface values and the tricolour middle step.
- Modify `tokens/component/` — `brand-border.json` (widths, tones), `brand-accent.json` (bar heights).
- Create `packages/design-tokens/css/surfaces.css` — the `[data-surface]` blocks that publish the on-surface set, and the one place the gradient angle resolves from `[dir]`.

### Phase B — guards (`apps/web/src/lib/design-system/`)
- Create `brand-surface-contract.spec.ts` — decisions 8.2 (white-only text) and 8.4 (ink edge cue), plus the full colour × surface contrast matrix.
- Create `surface-adjacency-contract.spec.ts` — no green surface adjacent to a red one, checked by reading page sources.
- Modify `token-contract.spec.ts` — the new tokens exist in all three themes.

### Phase C — the library (`packages/brand-ui/`)
```
package.json · tsconfig.json · vitest.config.mts · index.ts
surface/       surface.tsx  photo-surface.tsx  surface.css
accent/        brand-accent-bar.tsx  tricolor-divider.tsx  brand-streaks.tsx  brand-border.tsx  accent.css
controls/      button.tsx  icon-button.tsx  filter-chip.tsx  search-field.tsx  controls.css
content/       section-heading.tsx  page-hero.tsx  document-card.tsx  link-tile.tsx  cta-band.tsx
               empty-state.tsx  stat-highlight.tsx  athlete-result-badge.tsx  content.css
```
One file per component; one stylesheet per group, because a group's rules share the surface variables they read.

### Phase C — the Brand Kit page (`apps/web/src/app/[locale]/brand-kit/`)
- `page.tsx` — `notFound()` in production, `noindex`, absent from the sitemap.
- `components/` — one section per component group, plus the theme/direction switch.

### Phases D–F — application
- `apps/web/src/components/` — the homepage sections named in the usage matrix, the header, the footer.
- `apps/dashboard/src/components/shell/` — the accent bar and the sidebar indicator.
- `apps/web/src/app/[locale]/about/regulations-and-policies/` — the rebuilt page.

---

## Task list

### Phase B
- **B1** Record the §8 decisions in ADR-0098 as final. Docs only.
- **B2** The token mapping table: every token in the spec against its existing counterpart. Goes in the report.
- **B3** Add the three new primitives (`color.ink.500`, `motion.duration.orbit`, the brand border widths) and rebuild.
- **B4** The five surfaces and their on-surface sets + **the white-only guard** (Review Focus 1).
- **B5** `surfaces.css`, the `[data-surface]` mechanism, the RTL angle resolution + **the ink edge-cue guard** (Review Focus 2).
- **B6** **The adjacency guard** (Review Focus 3).

### Phase C
- **C1** The workspace, linked to both apps. **Stop and ask if linking needs more than workspaces + `@source` + (if required) `transpilePackages`.**
- **C2–C6** `Surface`, `PhotoSurface`, `BrandAccentBar`, `TricolorDivider`, `BrandStreaks`, the hover-draw-line utility.
- **C7** `BrandBorder` + **the one-rotation-per-view guard** (Review Focus 4).
- **C8–C11** `Button`, `IconButton`, `FilterChip`, `SearchField`.
- **C12–C19** `SectionHeading`, `PageHero`, `DocumentCard` (+ **the absent-data guard**, Review Focus 5), `LinkTile`, `CtaBand`, `EmptyState`, `StatHighlight`, `AthleteResultBadge`.
- **C20** The Brand Kit page.

### Phases D, E, F
Per the usage matrix in the original prompt §5-D, the Operational dose in §5-E and Chapter 12 §12.15, and the page composition in §5-F — with the settled correction that the policies page's red CTA is a **card inside `surface-canvas`**, never a full-bleed band beside the green section.

---

## Verification (final only)

Full suites in `apps/web`, `apps/dashboard`, `packages/*`; `npx tsc --noEmit` as its own step (ts-jest/vitest do not type-check); a real browser pass at the Chapter 5 breakpoints in AR and EN, light and dark; LCP before and after on the homepage and the policies page; `/simplify` on changed files then re-run their tests.
