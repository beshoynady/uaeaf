# UAEAF Enterprise Design System Framework — Changelog

Versioning follows Chapter 22 §1 (ADR-0034): **Patch** for wording that does not change meaning, **Minor** for added content that breaks no previous decision, **Major** for any change that invalidates one. Every entry names the governing ADR; per Chapter 22 §Don't, no frozen chapter changes without one.

This file was created at v1.1.0. The v1.0.0 baseline is recorded in `00-MASTER-INDEX.md`.

---

## v1.1.0 — 2026-09-24 — Minor

**Governing ADR:** [`ADR-0098-Brand-UI-Kit-Surfaces-And-Accents.md`](./ADR-0098-Brand-UI-Kit-Surfaces-And-Accents.md)
**Authority:** Product Owner Decision, 2026-09-24
**Phase:** Documentation only. No token, no component and no application file is touched by this release — the token and library phases the ADR authorises are separate and not yet built.

### Why Minor and not Major

Twenty-four amendments, and all but two of them **scope** an existing rule to the case it was actually written for rather than invalidating it. The two exceptions are recorded in place, beside the evidence they overturn, rather than deleted:

- **A27** (ADR-0059 D2) — an owner instruction fixes the ink surface across themes, reversing a decision that had been made on a measurement. The measurement stays on the page, and the mitigation it implies is made mandatory.
- **A14** (Chapter 27 §21) — colour photography becomes the default grade, displacing the desaturation instruction. Recorded as a documented deviation with its evidence.

Neither invalidates a decision that anything is built on today, so neither forces a Major bump.

### Added

| Item | Where | ADR |
| --- | --- | --- |
| **R3 — identity colour**, a third colour category beside role colour and categorical colour, defined by three prohibitions rather than by a permission | `ADR-0065` D1 | D1 |
| **`motion.duration.orbit`** — the scale's eighth value and its first *cycle period*; every existing duration is one-way, and a revolution has no end state | `03-Design-Tokens.md` §3.14 | D5 |
| **§12.15 — Brand Presence, the Operational Dose**, with a four-item prohibition list. The dashboard previously had no recorded identity rule at all | `12-Dashboard-Patterns.md` | D6 |
| **Regulations & Policies** as a page with its own colour personality and its own register row | `03-Design-Tokens.md` §3.34.2; `ADR-0060` D1 | A9, A28 |
| **Version register and version-history table** | `00-MASTER-INDEX.md`; `22-Governance.md` §1 | A21, A22 |
| **This changelog** | `CHANGELOG.md` | — |

### Changed — scoped, with the original rule left in force

| # | File | Section | The rule, before | After |
| --- | --- | --- | --- | --- |
| A1 | `00-01-Introduction-BrandIdentity.md` | ADR-0001 Do & Don't | "Do not impose one layer's decoration on the other" | Scoped to the harm ADR-0001's own Risks row names — decoration that slows task completion. Two named doses replace a blanket bar |
| A2 | `00-01` | ADR-0038 matrix, "General accent element" | ❌ Rejected (dividers, icon tinting, decorative fills) | Rejected **for red placed alone**. The tricolour accent, where red never appears alone, is governed by R3 |
| A3 | `00-01` | ADR-0038 Repetition & Fatigue Rule | One red element per instance; one red state per viewport | Both caps count **semantic** red (`live`/`achievement`). A register or a tricolour edge carries no signal to dilute |
| A4 | `00-01` | ADR-0005 Why / Consequences | "supports automatic RTL mirroring"; a Chapter 8 Brand Pattern component | **The ascent angle never mirrors** (Guide §9.1). The component is delivered as `BrandStreaks`, six weeks late |
| A5 | `00-01` | ADR-0005 Decision | 5–10% opacity field; full fill for heroes | Unchanged for a repeating field. Three bounded placements are a separate case |
| A7 | `03-Design-Tokens.md` | §3.14 Motion Durations | "7 values only" | "8 values only", adding `orbit`. **`ambient`'s restriction and its single authorised use are untouched** |
| A8 | `03-Design-Tokens.md` | §3.34.1 | Green "Explicitly NOT a full-section background wash"; Red "or a section background" | Marked **superseded by ADR-0059 D2/D3** — which happened on 2026-09-08 and was never recorded here, leaving a retired prohibition reading as live for sixteen days |
| A9 | `03-Design-Tokens.md` | §3.34.2 Policies row | "White + Green only; Red virtually absent" | Green for Regulations, red for Policies, per category and never per item (ADR-0065 D3) |
| A12 | `27-Brand-Visual-Language.md` | §13 | "No gratuitous hover-bounce" | The two bounded rotations are not gratuitous: each stops at its boundary, and for the live one the motion ending *is* the information |
| A13 | `27` | §20 bullet 1 | "never a flat color or gradient standing in for a photograph" | Scoped to heroes meant to be photographic. **Bullet 2 unamended and promoted** into Chapter 12's hardest prohibition |
| A14 | `27` | §21 bullet 3 | "Desaturate everything except skin tones and the single green accent" | **Colour photography is the default**; desaturation becomes an opt-in campaign variant. Documented deviation, evidence given |
| A15 | `27` | §24 | Never a repeating pattern above 5% in content-bearing areas | Unchanged for a field. Three bounded figures, at most three per page, are the section's own stated preference |
| A16 | `27` | §25 | "No secondary pattern system" | Stands in full. The mesh has no motif, repeat or edge — it is a ground tint, so the prohibition is not engaged |
| A17 | `27` | §28 | "Gradients exist for exactly one purpose: scrims" | **Two purposes.** With two load-bearing constraints: no direct green→red blend, and a gradient carrying text is measured at its lightest point |
| A18 | `27` | §39.2 | "No gratuitous gradient meshes" | The operative word is *gratuitous*. A bounded, tokenised, two-colour mesh is governed |
| A19 | `27` | §40.4 | "Green exactly once per composition, never as a wash" | Governs green as a **role** colour. Rarity is satisfied site-wide (ADR-0065 D2b), not by starving each page |
| A20 | `27` | Do & Don't | "Green as a background wash"; "a second pattern language" | Both retained, scoped per A19 and A16 |
| A23 | `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` | §5, §13, §18 | 70–80/15–20/≤5; motion levels; "do NOT default to a generic gradient" | Ratio marked superseded (a pre-existing inconsistency, corrected here); the two rotation roles added; the governed grounds distinguished from a *generic* gradient |
| A24 | `UAEAF-VISUAL-GOVERNANCE-INDEX.md` | §1, §2 | — | Rows for the registers, the three colour categories, the two doses, and `orbit` |
| A25 | `ADR-0065` | D1 | R1, R2 | R3 added. R1 and R2 unchanged, and R2 still removes every case it was written against |
| A26 | `ADR-0065` | D2 role table | Green "Never: card fills, section headings, panel tints"; Red "Never: CTA buttons" | **Unamended, verbatim.** A footnote records why R3 does not reach them |
| A27 | `ADR-0059` | D2 | Black register varies by theme (pure black is 1.12:1 on the dark page — "no boundary at all") | Owner instruction fixes it. **The measurement stays**, and a non-surface boundary cue becomes mandatory wherever it is used |
| A28 | `ADR-0060` | D1 | Twelve pages, policies not among them | Thirteenth row added; the twelve are unchanged |

### Examined and deliberately not changed

`06-Accessibility-Government-Compliance.md` in any part · WCAG 2.1 AA as the acceptance floor · `focus-visible` and `color.focus.*` (WCAG 1.4.11, ≥ 3:1 — the tricolour is never a substitute for the focus ring) · Chapter 5 §5.8 `prefers-reduced-motion` and §5.9 no-layout-shift · ADR-0009's `transform`/`opacity` rule · Chapter 3 §3.14's `ambient` restriction · ADR-0051's structural separation of `color.brand.secondary` from `color.error.*` · CSS logical properties · Chapter 1's Logo Misuse rules and the mirroring prohibition (sourced from the federation's own guide, outside any project ADR's reach) · PR-001 including its four-colour hero cap, which `PageHero` meets exactly · ADR-0063's `color.text.link` · ADR-0088's two accent roles and the guard that keeps them unused · Chapter 8 L3's `aria-current="page"` · Chapter 27 §23 (no grunge, noise or paper texture) and §22 (text over image at 4.5:1).

Full list with reasons: `ADR-0098` §10.

### Blocked on owner decision — Phase B cannot start without these

Five values in the approved specification conflict with a value already measured in the token layer. None is resolved by this release; each is recorded with its measurement in `ADR-0098` §8.

| # | Item | Conflict | Recommendation |
| --- | --- | --- | --- |
| 8.1 | `surface-canvas: #F4F4F4` | A cool grey, against the `neutral-warm` architecture ADR-0051 adopted; the same role is already held by the page ground `#FAFAF8` | Bind to the existing ground |
| 8.2 | `surface-brand-green: #00843D → #00502A` | Lightest point is `green.500` at **4.81:1** for white text — "no room for a second tier", and the kit requires a muted tier on every surface | Start the ramp at `green.700` (`#005226`, 9.40:1 / 6.49:1) |
| 8.3 | `surface-brand-red: #C8102E → #7A0A1C` | Lightest point is `red.500` at **5.88:1**; the muted tier does not fit | Start at `red.600` (`#A00D25`, 8.14:1 / 4.85:1) |
| 8.4 | `surface-ink: #0B0B0B`, theme-invariant | Reverses ADR-0059 D2 (pure black is **1.12:1** on the dark page ground) and misses Chapter 27 §20's green whisper | Owner's call between three options; the mandatory edge cue applies whichever is chosen |
| 8.5 | Green link text ≈ `#006B32` | **Already solved.** ADR-0063 repointed `color.text.link` to `green.600` `#006B31` — one hex digit away — measured at 6.38:1 | Use the existing token. **Closed, not open** |

### Pending Figma Back-Sync

Figma is read-only for this project at present. Nine groups of visual states created by this release have no corresponding Figma frame and are listed in `ADR-0098` §11. Per Protocol §13, the rotations exist as specification and CSS only — **Figma cannot execute live motion**, and no frame in the list is to be drawn until the owner confirms write access is restored.
