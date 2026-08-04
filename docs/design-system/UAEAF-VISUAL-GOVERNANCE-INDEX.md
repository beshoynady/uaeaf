# UAEAF — Visual Governance Index

**Purpose:** Single navigational entry point across every existing source that governs visual/creative decisions on this project. This index does not restate rules — it points to the one authoritative place each rule already lives, per the root `CLAUDE.md` source-of-truth hierarchy (explicit instructions → Design System → ADRs → Homepage spec → IA → Figma → implementation → skills → general best practice).

Read this before starting any visual/design task, alongside `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` (the full persistent protocol this index summarizes — section numbers below refer to that file's canonical 22-section structure) and `UAEAF-DESIGN-CRITIQUE-JURY-PROTOCOL.md` (governs how proposals — including the Product Owner's own — are evaluated before implementation, and defines Jury Mode for "review this" requests).

---

## 1. Color Governance

- **Brand colors (raw values):** `00-01-Introduction-BrandIdentity.md` — ADR-0001–0005 (Green `#00843D`, Red `#C8102E`, Black/Neutral).
- **Token architecture (Primitive→Brand→Semantic→Component→Runtime):** `03-Design-Tokens.md` §3.1–3.2.
- **Usage hierarchy (70–80% neutral / 15–20% green / ≤5% red) + per-page color personality table:** `03-Design-Tokens.md` §3.34 (**ADR-0050**) — the binding rule.
- **Protocol summary:** `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §5.
- **Photography color grading (warm highlight / cool-green shadow), gradient rules:** `27-Brand-Visual-Language.md` §20–22, §28 (Draft status — creative-direction only, does not override ADR-0050 or Chapter 1).

## 2. Page Personality System

- **Categories (Cinematic / Editorial / Service-Trust / Institutional / Sport-Performance):** Protocol §4, cross-referenced with `03-Design-Tokens.md` §3.34.2.
- **Motion level per personality (Quiet/Editorial/Cinematic):** Protocol §13 — travels together with color personality, not decided independently.
- **Page template assembly (which components compose which page):** `20-Page-Templates.md`.

## 3. RTL / LTR Rules

- **Architecture (single route, `dir` attribute switch in production; separate twin frames in Figma):** `19-Calendar-Localization.md` §3–4; Protocol §8.
- **Logical properties / RTL accessibility mechanics:** `06-Accessibility-Government-Compliance.md`.
- **Logo mirroring prohibition:** `00-01-Introduction-BrandIdentity.md` (Logo Misuse rules) + Protocol §9.

## 4. Image & Mirroring Rules

- **Photography direction (crop/light/lens/composition per content type):** `27-Brand-Visual-Language.md` §4–19 (Draft — creative calibration, not yet formally approved).
- **Intentional crop / full-bleed / overlap conventions:** Protocol §7.
- **What may never be mirrored (logos, federation/UAE marks, club/sponsor logos):** Protocol §9 — absolute rule, no exceptions.

## 5. Figma Agent Rules

- **Figma AI/Agent is an assistant, never the Design Authority; reject any suggestion conflicting with governance; priority order 1-7:** Protocol §11. No dedicated Design System chapter — this is the first formalization of this rule.

## 6. Skills Usage Rules

- **Which installed skill applies to which domain:** root `CLAUDE.md` §21 (Figma/ui-ux-pro-max/frontend-design/wcag-audit-patterns/web-design-guidelines/nextjs-seo).
- **Skills supplement, never override, this project's own Design System:** root `CLAUDE.md` §21, reaffirmed in Protocol §12.

## 7. Motion Rules

- **Motion tokens (duration/easing values):** `05-Grid-Layout-Motion.md`.
- **Per-page motion level (Quiet/Editorial/Cinematic/Sport/Service) and the "Figma can't execute live motion, document the spec instead" disclosure rule:** Protocol §13; conversational origin in memory `feedback_global_visual_motion_direction` (session-originated, not yet promoted into a numbered Design System chapter — candidate for a future ADR if it proves durable).
- **Signature motion device (diagonal-wipe transition) proposal:** `27-Brand-Visual-Language.md` §32–34 (Draft, unapproved).

## 8. Accessibility Rules

- **Full WCAG/government compliance chapter:** `06-Accessibility-Government-Compliance.md`.
- **Touch target minimum (44×44), focus token, contrast:** `06-Accessibility-Government-Compliance.md` + `08-L1-Foundation-Components.md` (`a11y/focus/ring`); Protocol §14–15.

## 9. Responsive Rules

- **Breakpoints, grid collapse behavior:** `05-Grid-Layout-Motion.md`.
- **Per-screen responsive classification (Mobile First / Mobile First+Tabular / Tablet Friendly):** `docs/product/01-Information-Architecture.md` §"Responsive Design Approach" table.
- **Protocol summary:** §16.

## 10. Component Rules

- **Full component inventory (L1–L8):** `08-L1` through `08-L8` chapters.
- **Global component governance (variant/state/lifecycle rules):** `08-Global-Component-Governance.md`.
- **Prefer instance override → master fix → new component, in that order; never silently patch when the master is wrong:** `08-Global-Component-Governance.md` + Protocol §10 (source-level editing) and §14 (interaction states).

## 11. Visual Asset Rules

- **Decorative pattern / graphic device (diagonal lines):** `00-01-Introduction-BrandIdentity.md` ADR-0005 — first actually implemented as a Figma component this session (`Brand Pattern / Diagonal Lines`, Components page).
- **What to avoid (generic gradients, blobs, glassmorphism, decorative noise):** Protocol §18.

## 12. Page Creation Workflow

- **Phase 0–5 sequence (Governance Review → Personality → Concept → Figma → QA → Documentation):** Protocol §19.
- **This project's own audit-first phasing (Audit → Apply, one category at a time):** root `CLAUDE.md` §20.
- **Visual QA checklist:** Protocol §20 (extends `CLAUDE.md` §25 Final Verification).
- **Governance conflict resolution procedure:** Protocol §21.
- **Mandatory Governance Check report before starting any new page brief (9-point list):** Protocol §22 — the check to run and report before touching Figma on any future page request.

---

## Known Tension to Watch

`03-Design-Tokens.md` §3.34 (ADR-0050) and `27-Brand-Visual-Language.md` (Draft) both discuss color/photography roles. They are currently consistent (ADR-0050 is the accepted token-governance layer; Chapter 27 remains an unapproved creative-direction proposal), but if Chapter 27 is ever formally approved, re-diff it against ADR-0050 explicitly rather than assuming they still agree. Protocol §21 governs exactly this scenario.

## Related Memory (session-level, not yet promoted to a numbered chapter)

- `feedback_color_hierarchy_governance` — the conversational origin of ADR-0050.
- `feedback_global_visual_motion_direction` — the conversational origin of the per-page motion-level system.
- `reference_visual_governance_protocol` — pointer to this file and the Protocol, for future-session recall.
- `project_olympic_qa_frontend_reference` — external calibration evidence (not a rule).
