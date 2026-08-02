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
