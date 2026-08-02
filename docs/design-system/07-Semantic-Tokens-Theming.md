# Chapter 7 — Semantic Tokens & Theming

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

## Depends On / Used By

| Depends On                                                                                                                                                                                       | Used By                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Chapter 1 (Raw Values) · Chapter 2 (PR-009) · Chapter 3 (Layer Architecture, `DT-*`) · Chapter 4 (`DT-FONT-*`) · Chapter 5 (`DT-MOTION-*`, `DT-GRID-*`) · Chapter 6 (Accessibility Requirements) | Chapter 8/10 (Components — the only permitted consumers) · Chapter 12 (Dashboard) · Chapter 21 (Tailwind Mapping) |

## Scope

**Covers:** The complete Semantic Token layer, Theme System (Light/Dark/High Contrast), theme switching mechanism, validation rules, and dependencies.
**Does not cover:** Raw values themselves (→ Chapter 3), or token consumption inside an actual component (→ Chapter 8).

## Definitions

| Term                 | Definition                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Semantic Token**   | A token that carries functional meaning (`color.text.primary`) rather than a value or appearance (`green.500`) — this chapter is its sole source of creation |
| **Theme**            | A complete set of Runtime values for every Semantic Token, activated through a single attribute (`data-theme`)                                               |
| **Theme Resolution** | The process by which the browser determines which Runtime value is actually used based on the active theme                                                   |
| **Fallback Chain**   | The sequence of fallback values used if a token is not defined in a particular theme                                                                         |

## Purpose

This chapter is the **architectural bridge** between the Foundation Layer (Chapters 1–6) and the Component Layer (Chapter 8+). Every design value after this chapter **MUST** pass through here — no component may communicate directly with Chapter 1 or Chapter 3.

---

## ADR-0011: Semantic Token Strategy

| Field                       | Details                                                                                                                                                                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                               |
| **Authority**               | Engineering Decision (direct implementation of ADR-0006, Chapter 3)                                                                                                                                                                                                    |
| **Context**                 | Chapter 3 established the 5-layer architecture theoretically; this chapter implements the third layer (Semantic) in full, with its rules and values, for the first time                                                                                                |
| **Decision**                | Every Semantic Token **MUST** be derived from exactly one Brand Token (no direct mixing from Primitives), and **MUST** be defined in three parallel versions: **Light**, **Dark**, and **High Contrast** — never only two versions                                     |
| **Alternatives Considered** | Two themes only (Light/Dark) with a Contrast Toggle implemented as a CSS filter layer over them — rejected (Chapter 6 Backlog Note) because automatic contrast filtering produces unpredictable color results and violates Chapter 1 (Brand Identity Accuracy)         |
| **Why This Decision**       | Three independent themes (no automatic inversion) ensure that each theme is "designed" rather than "calculated," consistent with the original Discovery decision (Chapter 0: "No automatic color transformation; each mode must have an independently designed Theme") |
| **Risks**                   | Three themes = 3× the size of color definitions. Mitigation: §7.5 clarifies that most non-color tokens (spacing, motion) do not change between themes; only color and shadow tokens actually require three versions                                                    |
| **Consequences**            | Every Semantic Token in §7.5 **MUST** have 3 Runtime values; absence of any one of them **MUST** stop the Build (§7.6)                                                                                                                                                 |

---

## 7.1 Semantic Token Creation Rules

| Rule                                                                                                                                           | Type     |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| A Semantic Token **MUST** be derived from one Brand Token (`color.semantic.success = color.brand.primary`)                                     | MUST     |
| A Semantic Token **MUST NOT** reference a Primitive directly (`color.semantic.success = green.500` is prohibited)                              | MUST NOT |
| Every new Semantic Token **MUST** pass through the Chapter 3 §3.5 lifecycle (Proposal → Review → Approved)                                     | MUST     |
| A Semantic Token name **MUST** describe its **function**, not its appearance (`color.text.primary` is correct, `color.dark-gray` is incorrect) | MUST     |

## 7.2 Alias, Inheritance, Fallback

**Alias:** A shortened alternative name used internally by build tools only (Chapter 3 §3.20) — it does not appear in production code.

**Inheritance:** A child Semantic Token **MAY** inherit from a higher-level Semantic Token if it is not explicitly defined (e.g., `color.text.link` inherits from `color.text.primary` if no dedicated link color is specified).

**Fallback Chain:** If a token is missing from a particular theme, it **MUST** fall back through this sequence:

`Theme-Specific Value → Semantic Default (Light) → Brand Token → Build Error`

There must never be a silent undefined value (prevents silent visual errors).

---

## 7.3 Theme System: Light / Dark / High Contrast

### Light Theme (Default)

```css
:root {
  --color-text-primary: var(--color-brand-black-900);      /* #000000 directly */
  --color-surface-base: var(--color-white);
  --color-border-default: var(--color-gray-200);
}
```

### Dark Theme

```css
[data-theme="dark"] {
  --color-text-primary: var(--color-gray-25);
  --color-surface-base: var(--color-gray-950);
  --color-border-default: var(--color-gray-800);
  /* Logo: monochrome white only — Chapter 1 ADR-0002 */
}
```

### High Contrast Theme (Closes Chapter 6 Backlog Item)

```css
[data-theme="high-contrast"] {
  --color-text-primary: #000000;         /* Maximum contrast, no gradient */
  --color-surface-base: #FFFFFF;
  --color-border-default: #000000;       /* Stronger borders than default (2px instead of 1px via DT-BORDER-WIDTH) */
  --a11y-focus-ring-width: 3px;          /* Wider than normal mode (2px) */
}
```

**Decision:** High Contrast is an **independently manually designed theme**, not the result of an automatic contrast filter applied over Light/Dark — it is activated from the Floating Accessibility Panel (Chapter 6 §6.9) as a third Theme option, not merely a "Toggle."

---

## 7.4 Theme Resolution & Switching

```text
User Preference (saved locally/in account — Chapter 6 §6.9)
    ↓
data-theme attribute on <html>
    ↓
CSS Cascade automatically resolves the values (Runtime Tokens from §7.3)
    ↓
No React tree re-render (Chapter 3 §3.11 — CSS-only Switching)
```

**Rule (MUST):** Switching between the three themes **MUST** happen exclusively by changing the `data-theme` attribute; **MUST NOT** use any JavaScript logic to recalculate color values at runtime.

---

## 7.5 DT-* → Semantic Mapping (Examples Across All Categories)

| Category                                       | Primitive/Brand (Chapter 3)           | Semantic Token (This Chapter) | Usage                                                                                |
| ---------------------------------------------- | ------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| **Color**                                      | `brand.primary` (green.500)           | `color.semantic.success`      | Success states, primary buttons                                                      |
| **Color**                                      | `brand.secondary` (red.500)           | `color.semantic.danger`       | Delete, error, critical warning                                                      |
| **Typography**                                 | `DT-FONT-SIZE-H1` (Chapter 4)         | `typography.heading.page`     | Page headings                                                                        |
| **Motion**                                     | `DT-MOTION-DURATION-BASE` (Chapter 5) | `motion.transition.overlay`   | Modal and Drawer enter/exit                                                          |
| **Elevation**                                  | `DT-SHADOW-MD` (Chapter 3)            | `elevation.card.hover`        | Card Hover state                                                                     |
| **Border**                                     | `DT-BORDER-WIDTH-DEFAULT`             | `border.input.default`        | Input field borders                                                                  |
| **State**                                      | `color.semantic.danger`               | `state.error.background`      | Error message background                                                             |
| **Accessibility** *(closes Chapter 6 Backlog)* | `DT-BORDER-WIDTH-*`                   | `a11y.focus.ring`             | Visible focus ring for every interactive element                                     |
| **Accessibility**                              | —                                     | `a11y.motion.reduced`         | Semantic Boolean reflecting `prefers-reduced-motion` for components (Chapter 5 §5.8) |

---

## 7.6 Token Validation & Dependency Rules

| Rule                                                              | Automated Validation (integrated with Chapter 3 §3.13 CI) |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| Every Semantic Token has 3 values (Light/Dark/High Contrast)      | Build **MUST** fail if any value is missing               |
| No Circular Reference (Semantic A → Semantic B → Semantic A)      | Automatically checked before Build                        |
| Every Semantic Token has exactly one Brand reference              | Lint Rule                                                 |
| No Semantic Token without usage in any Component for two releases | Reported in Chapter 3 §3.15 Quarterly Audit               |

---

## 7.7 Component Consumption Rule (The Most Important Rule in This Chapter)

```text
Component (Chapter 8) → Semantic Token (This Chapter) only
Component MUST NOT → Brand Token (Chapter 1) directly
Component MUST NOT → Primitive Token (Chapter 3) directly ever
```

**Prohibited Example:**

```jsx
<Button style={{ background: 'var(--color-green-500)' }}>  {/* ❌ Direct Primitive */}
```

**Correct Example:**

```jsx
<Button className="bg-semantic-success">  {/* ✅ Semantic only */}
```

---

## 7.8 Implementation Mapping (Tailwind / CSS Variables / React)

```text
tokens/semantic/colors.json (Chapter 3 §3.4.1 File Structure)
    ↓ Style Dictionary Build (per theme: light.css / dark.css / high-contrast.css)
CSS: [data-theme="X"] { --color-semantic-success: ...; }
    ↓ tailwind.config.js
theme.colors.semantic.success = 'var(--color-semantic-success)'
    ↓
Tailwind Utility: bg-semantic-success, text-semantic-success
    ↓
React Component (Chapter 8) consumes the class only
```

## Do & Don't

**Do:** Create every new value as a Semantic Token first, even if it appears temporary · Test every new token across all three themes together.

**Don't:** Never consume Brand/Primitive tokens directly from any Component regardless of the reason (§7.7) · Never forget the High Contrast version when adding a new color token.

## Accessibility Considerations

The High Contrast Theme (§7.3) is the actual implementation of the Chapter 6 accessibility commitment; `a11y.*` tokens (§7.5) ensure that every subsequent component (Chapter 8) automatically inherits accessibility rules without redefining them in each component.

## Performance Considerations

Three themes = three pre-built CSS files (no Runtime computation) — switching has zero runtime computation cost (Chapter 3 §3.11), with only a slightly larger build size (acceptable, outside the Critical Path).

## AI Considerations

When AI (Chapter 16) proposes a new Semantic Token, it **MUST** propose all three values together (Light/Dark/High Contrast), not just one — any incomplete proposal is automatically rejected under §7.6.

## Success Metrics

* 100% of Semantic Tokens have complete values for all 3 themes (automatically verified)
* 0 cases of direct Primitive/Brand consumption inside any Component
* 0 Circular References in the token tree

## References

Chapter 1, 2, 3, 4, 5, 6 (the complete foundation on which this chapter is built) · Material Design Theming · IBM Carbon Theming

## Related Chapters

This chapter is consumed by every subsequent component chapter (8, 10, 12) — it is the only mandatory gateway.

---

*End of Chapter 7 — Backbone (Foundation + Semantic Bridge, Chapters 0–7) fully completed. Next: Chapter 8 — Component Inventory.*
