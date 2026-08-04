# Chapter 3 — Design Tokens (Token Architecture Specification)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Numbering Note:** The primary decision is numbered **ADR-0006** (not ADR-0005 as previously proposed) to avoid conflict with the existing ADR-0005 in Chapter 1.

## Depends On / Used By

| Depends On                                  | Used By                                |
| ------------------------------------------- | -------------------------------------- |
| Chapter 1 (Raw Values) · Chapter 2 (PR-009) | Chapters 4, 5, 6, 7, 8, 10, 12, 20, 21 |

## Scope

**Covers:** The complete token architecture, naming conventions, lifecycle, governance, testing, constraints, and export pipeline.

**Does Not Cover:** The complete set of final semantic values (→ Chapter 7), or implementation within an actual component (→ Chapter 8).

## Definitions

| Term                | Definition                                                                 |
| ------------------- | -------------------------------------------------------------------------- |
| **Primitive Token** | An absolute raw value with no functional meaning                           |
| **Brand Token**     | A Primitive Token renamed with brand-specific meaning                      |
| **Semantic Token**  | A token with functional meaning — it must not consume a Primitive directly |
| **Component Token** | A token specific to a single component                                     |
| **Runtime Token**   | The actual value available in the browser (CSS Custom Property)            |
| **Dead Token**      | A token that is defined but is not actually used anywhere in the codebase  |

## Purpose

This chapter answers the question: **How is the entire system built through Design Tokens?** Any mistake here will propagate into every subsequent chapter.

---

## ADR-0006: Multi-Layer Token Architecture

| Field                       | Details                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                  | Accepted                                                                                                                                         |
| **Authority**               | Engineering Decision (based on PR-009)                                                                                                           |
| **Context**                 | The system requires a single source of visual truth that serves Figma, React, and Tailwind together                                              |
| **Decision**                | A five-layer architecture: Primitive → Brand → Semantic → Component → Runtime, with each layer consuming only the layer preceding it             |
| **Alternatives Considered** | Two layers only — rejected (directly couples components to the brand). A single flat layer — rejected (loses traceability to the official value) |
| **Why This Decision**       | An industry-standard approach (Material Design 3, IBM Carbon, Atlassian) that separates "meaning" from "value"                                   |
| **Risks**                   | Potential over-engineering for a small project; justified by the 10-year vision. **Mitigation:** §Token Rules with clear code examples           |
| **Consequences**            | Chapters 7 and 8 must follow these layers exactly                                                                                                |

---

## 3.1 Token Philosophy

We use **Tokens rather than free-form values** for four reasons:

1. A single source of truth
2. Theming capability
3. Auditability
4. A shared language between design and code

## 3.2 Token Hierarchy

```text
Primitive          Brand               Semantic                Component            Runtime (CSS)
green.500     →     brand.primary  →    color.success      →    button.primary.bg  → --button-primary-bg
(#00843D)           (=green.500)        (=brand.primary)        (=color.success)      (#00843D)
```

## 3.3 Naming Convention

Format:

`{category}.{property}.{variant?}.{state?}`

Examples:

`color.brand.primary`
`space.4`
`radius.md`
`motion.duration.fast`

**Figma ↔ Code Alignment (MUST):** A Figma Variable named `color/brand/primary` **MUST** correspond exactly to `color.brand.primary` in code (replacing `/` with `.` only, with no other changes). This prevents divergence between design and implementation.

---

## 3.4 Token Categories (Complete List)

| Category                       | Example                        | Identifier                        |
| ------------------------------ | ------------------------------ | --------------------------------- |
| Color                          | `color.brand.primary`          | DT-COLOR-*                        |
| Typography Family              | `font.family.arabic`           | DT-FONT-FAMILY-*                  |
| Font Weight                    | `font.weight.bold`             | DT-FONT-WEIGHT-*                  |
| Font Size                      | `font.size.h1`                 | DT-FONT-SIZE-*                    |
| Line Height                    | `font.lineHeight.body`         | DT-LINE-HEIGHT-*                  |
| Letter Spacing                 | `font.letterSpacing.display`   | DT-LETTER-SPACING-*               |
| Radius                         | `radius.md`                    | DT-RADIUS-*                       |
| Border Width/Style             | `border.width.default`         | DT-BORDER-*                       |
| Elevation / Shadow             | `elevation.2` / `shadow.lg`    | DT-ELEVATION-* / DT-SHADOW-*      |
| Blur / Opacity                 | `blur.glass` / `opacity.hover` | DT-BLUR-* / DT-OPACITY-*          |
| Breakpoints / Grid             | `breakpoint.lg`                | DT-BREAKPOINT-* / DT-GRID-*       |
| Motion (Duration/Easing)       | `motion.duration.base`         | DT-MOTION-*                       |
| Z-index                        | `zIndex.modal`                 | DT-ZINDEX-*                       |
| Icon / Avatar Size             | `icon.size.md`                 | DT-ICON-SIZE-* / DT-AVATAR-SIZE-* |
| Container Width / Aspect Ratio | `container.maxWidth`           | DT-CONTAINER-* / DT-ASPECT-*      |

### 3.4.1 Token File Structure

```text
tokens/
├── primitive/
│   ├── colors.json
│   ├── spacing.json
│   └── radius.json
├── brand/
│   └── brand.json
├── semantic/
│   ├── colors.json
│   └── typography.json
├── component/
│   ├── button.json
│   └── card.json
└── build/
    └── tokens.json          ← final exported output (Style Dictionary output)
```

### 3.4.2 JSON Specification (Real Examples)

**Primitive:**

```json
{ "color": { "green": { "500": { "value": "#00843D" } } } }
```

**Brand (references the Primitive using an alias/reference):**

```json
{ "color": { "brand": { "primary": { "value": "{color.green.500}" } } } }
```

**Semantic:**

```json
{ "color": { "semantic": { "success": { "value": "{color.brand.primary}" } } } }
```

**Component:**

```json
{ "button": { "primary": { "background": { "value": "{color.semantic.success}" } } } }
```

---

## 3.5 Token Lifecycle

```text
Proposal → Review → Approved → Deprecated → Removed
```

| Stage      | Owner                  | What Happens                                                                                      |
| ---------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| Proposal   | Any Developer/Designer | Proposes a token with a clear rationale                                                           |
| Review     | Project Owner          | Verifies §Token Rules and confirms no equivalent existing token exists (see §3.5.1 Decision Tree) |
| Approved   | Project Owner          | Added to `tokens.json` and made available in Figma Variables                                      |
| Deprecated | Project Owner          | Marked with `@deprecated` and a replacement; remains functional during a grace period             |
| Removed    | Project Owner          | Removed after the grace period expires and zero remaining usage has been confirmed                |

### 3.5.1 Token Decision Tree (For a Developer Who Needs a New Value)

```text
Does a token already exist that meets the requirement?
 ├─ Yes → Use it directly
 └─ No → Can an existing Semantic Token be extended to cover the new state?
          ├─ Yes → Modify it (Review required)
          └─ No → Open a new Proposal (§3.5)
```

This prevents uncontrolled token proliferation (see §3.14 Token Constraints).

### 3.5.2 Deprecated Example (Implementation)

```text
Deprecated:    color.success.old         (v1.2.0)
Replacement:   color.semantic.success    (use this instead)
Removal:       Planned for v2.0.0
```

---

## 3.6 Token Versioning

**Patch (`1.0.x`):** A non-breaking addition.
**Minor (`1.x.0`):** Deprecation with a warning.
**Major (`x.0.0`):** Actual removal (Breaking Change, requiring a Migration Guide with a ready-to-use search/replace command).

### Token Deprecation Policy

| Stage                                               | Duration                    |
| --------------------------------------------------- | --------------------------- |
| Deprecated (working + warning)                      | Two complete Minor releases |
| Intensive Warning (Build emits an explicit warning) | One release before removal  |
| Removal                                             | Next Major release          |

---

## 3.7 Token Ownership

The **Project Owner** (currently the sole owner — Chapter 22) provides final approval for any Proposal, Deprecation, or Removal.

**Primitive/Brand layer tokens**, because they are tied to the official identity, **MUST NOT** be modified without approval from the Federation itself.

---

## 3.8 Token Dependency Graph

```text
Brand Token (Ch.1) → Semantic Token (Ch.7) → Component Token (Ch.8) → Tailwind Theme (Ch.21) → React Component
```

---

## 3.9 Token Export Pipeline

```text
Figma Variables → Style Dictionary → tokens.json → CSS Custom Properties → Tailwind Theme → shadcn/ui → React Components
```

`tokens.json` is the **single automated source of truth** — both Figma and Tailwind "read" from it.

---

## 3.10 Token Rules

| Rule                                                                                       | Requirement |
| ------------------------------------------------------------------------------------------ | ----------- |
| No Hardcoded values/colors directly in code                                                | MUST NOT    |
| No Component may consume a Primitive directly                                              | MUST NOT    |
| Every Component must consume Semantic or Component Tokens only                             | MUST        |
| Any new token must pass through the complete §3.5 lifecycle                                | MUST        |
| Primitive/Brand Tokens may only be modified after dual review (Project Owner + Federation) | MUST        |
| New tokens may be proposed by any contributor                                              | MAY         |

### 3.10.1 Token Priority Resolution (When Multiple Options Exist for the Same Component)

```text
Does a dedicated Component Token exist (e.g. button.primary.bg)?
 ├─ Yes → Use it (highest priority)
 └─ No → Is there an appropriate Semantic Token (e.g. color.semantic.success)?
          ├─ Yes → Use it
          └─ No → Using a Brand Token directly from a component = prohibited (MUST NOT) → Open a Proposal
```

---

## 3.11 Token Performance

Approximately **150–200 root-level CSS Custom Properties** are expected.

Theme switching between Light/Dark **MUST** be performed through `data-theme` on `<html>` only (CSS-only), **MUST NOT** use runtime JavaScript. This ensures zero FOUC.

### 3.11.1 Runtime Theme Flow

```text
Light Mode:  Semantic Tokens → Runtime Mapping A → CSS Variables (:root)
Dark Mode:   Semantic Tokens → Runtime Mapping B → CSS Variables ([data-theme="dark"])
```

The same Semantic Token names are used in both modes — only the actual Runtime value changes according to `data-theme`. No Component is aware of the difference.

---

## 3.12 AI Considerations

The AI Assistant (Chapter 16) may suggest new tokens when it detects repeated Hardcoded values and checks for similarity against existing tokens to prevent duplication before any Proposal is submitted.

**Human-in-the-Loop is mandatory** — no token may be approved automatically without human review (§3.5).

---

## 3.13 Token Testing (CI Pipeline)

```text
Commit → Stylelint (prevents Hardcoded Colors) → ESLint (Token Import Rules) → Build (Style Dictionary) → Visual Regression Test → Contrast Test (WCAG, Chapter 6) → Merge
```

Any Commit that violates §3.10 (Hardcoded value) **MUST** be automatically rejected by CI before human review.

---

## 3.14 Token Constraints (Hard Limits to Prevent Chaos)

| Category                       | Maximum                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Elevation Levels               | 5 levels only (Chapter 6)                                                    |
| Spacing Scale                  | Values defined within the 8pt scale only — no arbitrary value such as `13px` |
| Radius Scale                   | 6 values only (`none/xs/sm/md/lg/xl/full`)                                   |
| Color Shades per Primary Color | Maximum 10 shades (`50→900`)                                                 |
| Motion Durations               | 5 values only (`instant/fast/base/slow/slower`)                              |

**Documented Exception (Project Owner, §3.7):** `color.gray` is allowed a maximum of **14 shades** (instead of 10), due to its extensive use across Light/Dark Mode. Additional values are required at both ends: `25` is close to white for extremely light Light-mode surfaces, while `950` is close to black for extremely dark Dark-mode surfaces — see Chapter 7 §7.3 examples `--color-gray-25` and `--color-gray-950`.

This exception applies to `color.gray` only; every other primary color (Brand/Semantic) remains limited to 10 shades.

---

## 3.15 Token Audit (Quarterly)

Every three months, a mandatory review must cover:

* Unused Tokens (defined but unused)
* Duplicate Tokens (identical values under different names)
* Dead Tokens
* Semantic Tokens not used by any Component

Results must be documented as a **Ticket** in the project's tracking system (outside the scope of this document).

---

## 3.16 Security

Design Tokens **MUST NOT** contain any client-specific information, secrets, sensitive external links, or API keys.

Their content is strictly limited to visual values such as **colors, dimensions, and timings**.

---

## Implementation Mapping — From Design to Code

```text
[Figma: Variable "color/brand/primary" = #00843D]
        ↓ Style Dictionary (reads through Tokens Studio Plugin/API)
[tokens.json: { "color": { "brand": { "primary": { "value": "#00843D" } } } } ]
        ↓ Style Dictionary Build
[CSS: :root { --color-brand-primary: #00843D; }]
        ↓ tailwind.config.js
[Tailwind Utility: bg-brand-primary]
        ↓ shadcn/ui Button variant="primary"
[React: <Button variant="primary">Publish</Button>]
```

---

## 3.17 Future (v2.0) — Platform Tokens

Not implemented now; registered for future consideration only:

Expand `tokens.json` to also export tokens for native platforms such as **iOS/SwiftUI, Android/Jetpack Compose, Flutter, and React Native** through the same Style Dictionary Pipeline.

The architecture in §3.9 is intentionally designed to support this expansion without requiring structural rework.

---

## 3.18 Token Status (Separate from Lifecycle)

**Lifecycle (§3.5)** describes the token's journey; **Status** describes its current state.

A token may be Approved while its Status is Experimental:

`Active` · `Experimental` · `Deprecated` · `Legacy` · `Removed`

---

## 3.19 Token Metadata (Machine-Readable)

Every token **MUST** carry the following structure:

```json
{
  "name": "color.brand.primary",
  "value": "#00843D",
  "type": "color",
  "status": "active",
  "owner": "Design System",
  "created": "2026-07-28",
  "references": ["PR-009", "ADR-0006"],
  "relatedComponents": ["button", "navbar", "badge"]
}
```

---

## 3.20 Alias Tokens

An optional shortcut layer may exist between the Primitive and a short alias name:

`primary` (Alias) → `brand.primary` (Brand) → `green.500` (Primitive)

Aliases **MAY** be used within build files only; the final production code **MUST** always consume the full semantic name.

---

## 3.21 Token Documentation Template

A fixed template must be used for every token in the Registry (§3.24):

**ID · Name · Description · Value · Usage · Do · Don't · Related Components · Introduced Version · Deprecated Version**

---

## 3.22 Token Decision Record (TDR)

Similar to an ADR, but for individual tokens — it answers **"Why this value?"** even years later:

```text
TDR-001
Token: radius.xl (24px)
Decision: Add a 24px value to the scale
Reason: Hero cards (Chapter 8) require a more pronounced radius than radius.lg without reaching radius.full
Alternative Rejected: radius.lg + additional padding — does not produce the same visual character
```

---

## 3.23 Token Migration Examples

```text
Before:    bg-green-500
After:     bg-brand-primary
Final:     bg-success
```

Each step must be documented as a separate TDR.

---

## 3.24 Token Registry

Official centralized registry:

`DT-COLOR-001 · Primary Green · Status: Active · v1.0 · Owner: Design System · References: [PR-009, ADR-0006] · Related Components: [Button, Badge]`

---

## 3.25 Token Coverage

| Component Family                           |                   Token Coverage (Instead of Hardcoded Values) |
| ------------------------------------------ | -------------------------------------------------------------: |
| Buttons / Cards / Tables / Forms / Dialogs |                                                           100% |
| Charts                                     | ≥90% (External libraries may require a dedicated token bridge) |

---

## 3.26 Token Lint Rules

| Rule                      | Description                                              | Severity |
| ------------------------- | -------------------------------------------------------- | -------- |
| No Hardcoded Colors       | Prevents direct Hex/RGB values                           | Error    |
| No Direct Primitive Usage | Prevents a Component from consuming a Primitive directly | Error    |
| No Magic Radius/Spacing   | Prevents values outside the §3.14 scale                  | Warning  |
| Unused Token              | Token is defined but has no usage                        | Warning  |

---

## 3.27 Token Consumers Map

| Layer         | Used By                  |
| ------------- | ------------------------ |
| Primitive     | Brand                    |
| Brand         | Semantic                 |
| Semantic      | Component                |
| Component     | React (through Tailwind) |
| Runtime (CSS) | Browser directly         |

---

## 3.28 Token Change Impact

Before modifying a Brand/Semantic token, all affected components **MUST** be identified first.

Example: `brand.primary` may simultaneously affect **Buttons, Cards, Navbar, Links, Badges, Hero, and Charts**.

This impact analysis must be performed through a textual search of token usages before any Approval.

---

## 3.29 Token Visual Review

After every new Build, screenshots of every major component **SHOULD** be compared before and after (Visual Regression), even if the Component code itself has not changed, because changing a token alone can produce unexpected visual differences.

---

## 3.30 Token Deprecation Dashboard

A tracking dashboard **MUST** be built before the first actual Deprecation.

It must display:

* Deprecated tokens
* Remaining usages
* Affected components
* Planned removal date

---

## 3.31 Token Analytics (Future)

As part of Chapter 16, extract:

* Most/least-used tokens
* Duplicates
* Conflicts

This data will feed the §3.15 Quarterly Audit with actual usage metrics.

---

## 3.32 Machine-Readable Specification

`tokens.json` **SHOULD** comply with the **W3C Design Tokens Community Group Format** and be validated against `tokens.schema.json` as part of the §3.13 CI Pipeline before Build.

Any file that fails structural validation **MUST NOT** enter the pipeline.

---

## 3.33 Color System Expansion v1.1 (ADR-0039)

### ADR-0039: Digital Color System Expansion

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Authority**               | Product Decision (Project Owner, Chapter 22 §2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Context**                 | §3.14 already reserved a 14-shade allowance for `color.gray` and Chapter 7 §7.3 already referenced runtime variables such as `--color-gray-25`/`--color-gray-950`, and Chapter 8 L1 §CMP-BADGE-001 already referenced `color.semantic.info` — but no chapter had ever published the actual hex values for the gray scale, nor defined `info`/`warning` semantics at all. A verification pass for the Homepage found these gaps blocking real contrast measurement. This ADR closes them.                                                                            |
| **Decision**                | Publish the full `color.gray` primitive scale (12 of the 14 shades reserved by §3.14's exception; 2 remain available for future intermediate steps) and add two new Brand-Support primitive/brand color pairs — **Support Info** (institutional navy, not a generic SaaS blue) and **Support Warning** (amber, kept visually distinct from Medal Gold per SP.5) — each following the same 500-reference-value + derived-scale methodology as ADR-0003. These remain **Brand-Support tokens**, governed by §3.5 Token Lifecycle like any Brand token — they are not additions to the three official identity colors in Chapter 1, which stay Green/Red/Black exactly as defined.                                       |
| **Alternatives Considered** | Deriving "info" from a tint of Federation Green — rejected: would make green mean both "success/primary action" and "neutral information," reintroducing the same ambiguity problem ADR-0004 solves for red. Leaving Info/Warning undefined and letting implementers pick ad hoc values — rejected: this is precisely the gap that produced the club-badge color inconsistency flagged by the prior audit.                                                                                                                                                            |
| **Why This Decision**       | A government/enterprise product needs Info and Warning semantics independent of Success (green) and Danger (red); defining them once, centrally, with published hex values and contrast data, prevents every future screen from inventing its own.                                                                                                                                                                                                                                                                                                                    |
| **Risks**                   | Adding colors always risks "palette creep." **Mitigation:** exactly two new Brand-Support hues are added (Info, Warning) — no third color is introduced without a new ADR, and §3.14's 10-shade-per-color ceiling still applies to both.                                                                                                                                                                                                                                                                                                                              |
| **Consequences**            | Chapter 7 §7.9 maps these primitives into Light/Dark/High-Contrast Semantic Tokens. Chapter 8 components referencing `color.semantic.info`/`color.semantic.warning` (already present in L1 §CMP-BADGE-001) now resolve to a real, contrast-verified value instead of a dangling reference.                                                                                                                                                                                                                                                                            |

### 3.33.1 Neutral Scale — `color.gray` (Corrected: a Full 12-Shade Live Scale Already Existed)

**Correction to this ADR's own first draft:** an initial verification pass (via `get_variable_defs` scoped to individual Homepage node subtrees) only surfaced the handful of variables actually *consumed* by the sections it happened to check, and this ADR originally, incorrectly, treated that partial result as "the live palette" and proposed a parallel scale alongside it. A follow-up pass reading the Figma file's **Variable Collections directly** (`figma.variables.getLocalVariableCollectionsAsync`) found a complete, already-published `Primitive` collection with a full `color/gray/25…1000` scale (12 steps), plus `Brand` and three `Semantic/*` (Light/Dark/High Contrast) collections already implementing most of Chapter 7's architecture — none of which had been reflected in this chapter before now. This section is corrected to document that real system, per §3.15 (no Dead Tokens) and this project's documentation-sync policy.

**Live `color.gray` primitive scale (unchanged by this ADR, documented here for the first time):**

| Step | Hex | Step | Hex |
| --- | --- | --- | --- |
| 25 | `#FBFBFB` | 500 | `#757C8A` |
| 50 | `#F7F7F8` | 600 | `#595E69` |
| 100 | `#EEEFF1` | 700 | `#42454D` |
| 200 | `#DEE0E3` | 800 | `#2A2D32` |
| 300 | `#C2C5CB` | 900 | `#1A1B1E` |
| 400 | `#9CA1AB` | 950 | `#101113` |
| | | 1000 | `#000000` |

**Live `Semantic/Light` neutral aliases (unchanged by this ADR except `border.strong`, corrected below):**

| Semantic Token | Aliases To | Hex | Contrast on white |
| --- | --- | --- | --- |
| `color/text/primary` | `gray/1000` | `#000000` | 21:1 |
| `color/text/secondary` | `gray/600` | `#595E69` | 6.50:1 — passes AA |
| `color/text/disabled` | `gray/400` | `#9CA1AB` | 2.59:1 — exempt (disabled state, WCAG 1.4.3) |
| `color/surface/base`, `color/surface/raised` | `gray/0` | ~white | — (both currently identical, no elevation distinction yet — Known Constraint, not fixed by this ADR) |
| `color/border/default` | `gray/200` | `#DEE0E3` | 1.32:1 — decorative only, acceptable |
| `color/border/strong` | ~~`gray/400`~~ **corrected to `gray/500`** | ~~`#9CA1AB` (2.59:1, fails)~~ → **`#757C8A` (4.19:1, passes)** | **Real, confirmed defect, fixed in Figma this session** — `border/strong` was measured aliasing `gray/400` at 2.59:1, failing WCAG 1.4.11 (≥3:1 non-text). Repointed to `gray/500` (4.19:1) in the Semantic/Light collection directly. Dark/High-Contrast modes were not touched (no dark-mode Homepage frame exists to verify against — flagged, not silently assumed fixed). |

No new neutral tokens were needed — the live 12-step scale already covers text/surface/border needs; this ADR's only real neutral change is the `border.strong` fix above.

### 3.33.2 Support Info — Corrected an Existing Mis-Aliased Token, Not a New One

**Correction:** `color/semantic/info` already existed as a token (Semantic/Light, Dark, and High Contrast collections) — but was found, on inspection, aliasing `gray/600` (`#595E69`), i.e. plain secondary-text gray, not a distinct hue. This is a real defect: an "info" state indistinguishable from ordinary secondary text has no signal value. Fixed by adding a genuinely new primitive and re-pointing the alias.

`color/info/500` — **TDR-003** (new Primitive)

```text
500 value:  #0B4A66 (institutional navy — deliberately deep/muted, not a bright SaaS blue, to stay visually subordinate to Federation Green/Red)
300 value:  #4FA3C7 (color/info/300 — Dark/High-Contrast-safe variant, 6.66:1 on gray.950; the 500 value only reaches 1.97:1 against a dark surface and MUST NOT be used as dark-mode text/icon color)
Contrast:   500 on white = 9.61:1 (passes AAA)
Reason:     color/semantic/info existed but resolved to an indistinguishable-from-text-secondary gray; general informational UI (non-error, non-success notices, filter/help hints) needs a real, distinct hue
Approved By: Project Owner (§3.7)
Applied:    color/semantic/info now aliases color/info/500 (Light, High Contrast) / color/info/300 (Dark) — fixed directly in the Figma Variables this session
```

### 3.33.3 Support Warning — Corrected a Real Governance Conflict, Not a New Token

**Correction:** `color/semantic/warning` already existed too — but was found aliasing `gold/600` (a shade of the *same primitive family* as Medal Gold, `color/brand/medal/gold`). This is exactly the collision Chapter 8 L8 §SP.5 warns against: "[medal colors] MUST have a consistent visual treatment using dedicated tokens rather than general Semantic colors, to avoid conflict" — here it ran the other direction, with Warning silently borrowing the medal family. Fixed the same way as Info: new dedicated primitive, re-pointed alias.

`color/warning/500` and `color/warning/700` — **TDR-004** (new Primitives)

```text
500 value:  #B8720E (fills/large-text/icon use only — 3.85:1 on white, passes 3:1 non-text/large-text, fails 4.5:1 normal text)
700 value:  #8A5A00 (normal-text/icon-requiring-AA use — 5.93:1 both directions)
Reason:     color/semantic/warning existed but resolved to gold/600, colliding with the Medal Gold family per SP.5's explicit anti-conflict rule
Approved By: Project Owner (§3.7)
Alternative Rejected: Leaving warning aliased to gold/600 — rejected, this is the exact conflict SP.5 already forbids
Applied:    color/semantic/warning now aliases color/warning/700 (Light, High Contrast — AA-safe for text) / color/warning/500 (Dark) — fixed directly in the Figma Variables this session
```

### 3.33.4 Registry Additions (§3.24 format)

```text
DT-COLOR-003 · Support Info (Navy) · Status: Active · v1.1 · Owner: Design System · References: [ADR-0039, TDR-003] · Related Components: [Badge, Alert, Callout] · Fix: re-pointed existing color/semantic/info alias, was gray/600
DT-COLOR-004 · Support Warning (Amber) · Status: Active · v1.1 · Owner: Design System · References: [ADR-0039, TDR-004] · Related Components: [Badge, Alert, FormField] · Fix: re-pointed existing color/semantic/warning alias, was gold/600
DT-COLOR-005 · Semantic Live (Federation Red role) · Status: Active · v1.1 · Owner: Design System · References: [Chapter 1 ADR-0038] · Related Components: [Badge] · New token, created in all 3 Semantic collections
DT-COLOR-006 · Semantic Achievement (Federation Red role) · Status: Active · v1.1 · Owner: Design System · References: [Chapter 1 ADR-0038] · Related Components: [Badge, AthleteCard] · New token, created in all 3 Semantic collections
DT-BORDER-002 · border/strong contrast fix · Status: Active · v1.1 · Owner: Design System · References: [ADR-0039] · Fix: re-pointed alias from gray/400 (2.59:1, failed) to gray/500 (4.19:1, passes) in Semantic/Light only — Dark/HC unverified, flagged
```

Document version bump per Chapter 22 §1: this is a **Minor** change (new content, no prior decision invalidated).

---

## 3.34 Color Usage Hierarchy & Per-Page Visual Personality (ADR-0050)

### ADR-0050: Brand Palette Is a Foundation, Not a Uniform Application Rule

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Authority**               | Product Owner Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Context**                 | UAEAF's official identity has exactly three colors (Chapter 1: Green, Red, Black/Neutral). Several pages built this session applied brand color as a literal, uniform ratio per section (e.g. a fully flat green or black hero on every page regardless of that page's content personality), which — while technically token-compliant — produces a "poster," not an enterprise product. This ADR does not add colors; it governs *how much of the UI surface* the existing three-color identity is allowed to occupy, and clarifies that photography/gradient/typography/composition/motion carry the remaining visual weight.                                                                            |
| **Decision**                | (1) Each of the three identity colors is assigned a **functional role**, not a decorative one (§3.34.1). (2) A page's overall color surface **SHOULD** trend toward **roughly 70–80% neutral, 15–20% Federation Green, ≤5% Federation Red** — approximate proportions, not a literal per-pixel quota, enforced by design review rather than tooling. (3) Every page/section is assigned one of the **content-personality categories** in §3.34.2, which governs both its color proportion and its hero strategy — not every page gets the same treatment. (4) A page's Hero is where boldness is allowed, but boldness **SHOULD** come from photography, gradients derived from `brand/primary`, cropping, masking, large typography, motion, and a *small* red accent — **not** from filling the entire hero surface with one flat brand color as the default move. A flat brand-color hero (as built for the Contact Us page earlier this session) remains an acceptable *occasional* choice for a "Quiet/Service" page specifically, not the universal hero pattern for every page. (5) The global governing sentence (§3.34.3) is binding for all future page work.                                                                                                                                        |
| **Alternatives Considered** | Mandating a strict pixel-counted color ratio enforced by a linter — rejected, impossible to define objectively for photography-heavy pages and would produce false failures. Leaving color proportion undocumented / "designer's taste" — rejected, this is exactly what produced the flat-color-per-section pattern this ADR corrects.                                                                                                                                                                                                                                                                                                                                                                        |
| **Why This Decision**       | A national federation's digital identity needs to read as *premium and institutional* first, with brand color as a recognition signal rather than a wash — matching how the token architecture (§3.2 Primitive → Brand → Semantic) already separates "the three official values" from "everything the UI actually renders," which this ADR makes an explicit usage rule rather than leaving implicit.                                                                                                                                                                                                                                                                                                       |
| **Risks**                   | "Approximate ratio, not a hard rule" could be read as unenforceable. **Mitigation:** §3.34.2's per-page table gives a concrete, checkable default per page type; any page visibly dominated by a flat brand-color fill outside the "Quiet/Service" category should be flagged in QA per §Final Verification (root CLAUDE.md §24), not treated as compliant merely because it uses governed tokens.                                                                                                                                                                                                                                                                                                            |
| **Consequences**            | The Contact Us page's current flat-black hero (built earlier this session, before this ADR) is **not automatically wrong** — Contact is categorized "Service/Trust" below, where a restrained, mostly-neutral hero is the default — but the flat black fill should be reassessed against §3.34.2's "Neutral, Green CTA only, Red only for errors" guidance in the next revision pass. No other already-built page is modified by this ADR alone; each page is brought into alignment individually as work continues, per [[project_flat_color_graphic_direction]].                                                                                                                                            |

### 3.34.1 Functional Role per Identity Color

| Color | Token | Functional Role | Explicitly NOT |
| --- | --- | --- | --- |
| 🟢 Federation Green | `brand/primary` | Primary buttons, important links, active/selected states, status indicators, sparing accents | A full-section background wash |
| ⚪ White / Neutral | `color/surface/*`, `color/text/*`, gray scale (§3.33.1) | Dominant surface — cards, main content areas, whitespace, text on dark backgrounds. **Owns the largest visual area on every page.** | Treated as "leftover space" rather than the primary surface |
| 🔴 Federation Red / Accent | `brand/secondary`, `color/semantic/danger` | Rare highlights, competitive/results emphasis, error/critical states, small Hero accents | A standard CTA color (already prohibited, Chapter 1 §Do & Don't) or a section background |

### 3.34.2 Per-Page Color Personality (Default Assignments)

| Page / Content Type | Personality | Color Treatment | Hero Strategy |
| --- | --- | --- | --- |
| Board of Directors, Committees, Policies, Strategic Plan | Quiet / Institutional | White + Green only; Red virtually absent | Typography-led or portrait-led, minimal color |
| Championships, Results, live/major events | Dynamic / Athletic | Green-dominant accents, Red for highlights/urgency | Photography + motion + countdowns, boldest register on the site |
| Clubs (Directory + Profile) | Editorial / Community | White + Green; club identity marks | Photography/crest-led, horizontal movement, hover interaction |
| News / Media Centre | Editorial | Neutral background, Green typography accents, large imagery, Red only for rare highlights | One dominant image + supporting list (already established this session, §Chapter 27 precedent) |
| Contact Us | Service / Trust | Neutral-dominant; Green reserved for CTA/links; Red only for form error states | Restrained — typography/whitespace-led by default; a flat dark hero is an acceptable occasional exception for this category specifically, not elsewhere |
| Homepage | Cinematic (highest register) | Full range available, still Green-sparingly per §3.34.1 | Photography/motion-led, the site's single boldest moment |

This table extends, and must be read together with, the page-level motion/art-direction assignments already established in the Global Visual & Motion Direction policy (Quiet/Editorial/Cinematic levels) — color personality and motion level travel together per page, they are not independent decisions.

### 3.34.3 Global Governing Rule (Binding Text)

> **English:** The UAEAF digital experience MUST derive its visual identity from the federation's approved brand palette while avoiding uniform color application across all pages. Brand colors SHALL establish recognition and hierarchy, while neutral surfaces, photography, typography, composition, depth, motion, and contextual accents SHALL provide visual variation according to the purpose and content of each page.

> **العربية:** يجب أن تستمد التجربة الرقمية لـ UAEAF هويتها من لوحة الألوان الرسمية للاتحاد، دون تطبيق الألوان بنفس الأسلوب أو النسبة على جميع الصفحات. تُستخدم ألوان الهوية لبناء التعرّف البصري والهرمية، بينما توفر الخلفيات المحايدة، والتصوير، والطباعة، والتكوين، والعمق، والحركة، والعناصر السياقية التنوع البصري بما يتناسب مع وظيفة ومحتوى كل صفحة.

### 3.34.4 Registry Addition

```text
DT-GOVERNANCE-001 · Color Usage Hierarchy · Status: Active · v1.2 · Owner: Design System · References: [ADR-0050] · Applies to: every page template (Chapter 20)
```

Document version bump per Chapter 22 §1: this is a **Minor** change (new governing rule, no prior token value changed).

---

## Do & Don't

**Do:**

* Use the §3.5.1 Decision Tree before requesting any new token.
* Follow §3.3 exactly.

**Don't:**

* Break §3.10, even temporarily.
* Bypass the limits defined in §3.14.

## Success Metrics

* **0 Hardcoded Hex Colors** (automatically checked in §3.13)
* **Duplicate Tokens < 2%**
* **Unused Tokens < 5%** (measured in §3.15)
* **Build Time < 5s**
* **Theme Switch < 16ms** (one frame @60fps)
* **100% of new tokens** pass the complete §3.5 lifecycle

## References

Style Dictionary (Amazon) · Material Design 3 Token System · IBM Carbon Design Tokens · W3C Design Tokens Community Group Format (`tokens.schema.json` validation)

## Related Chapters

Chapter 1 · Chapter 2 (PR-009) · Chapter 6 (Runtime Theme) · Chapter 7 (Complete Semantic Tokens) · Chapter 21 (Detailed Tailwind Implementation)

---

*End of Chapter 3 — Complete Enterprise-Level Specification. Next Chapter: Chapter 4 — Typography System.*
