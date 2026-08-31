# Chapter 5 — Grid, Layout & Motion

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

## Depends On / Used By

| Depends On                                                                                                                       | Used By                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Chapter 2 (PR-002 Performance, PR-005 Motion, PR-006 Responsiveness) · Chapter 3 (`DT-BREAKPOINT-*`, `DT-GRID-*`, `DT-MOTION-*`) | Chapter 7 (Semantic Motion Tokens) · Chapter 8/10 (Components) · Chapter 20 (Page Templates) |

## Scope

**Covers:** Grid system, Containers, Breakpoints, Motion principles, timing and easing curves, and Responsive Reflow.
**Does not cover:** Layout of a specific component (→ Chapter 8), full-page layout (→ Chapter 20).

## Definitions

| Term             | Definition                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Breakpoint**   | A screen width at which the number of columns or the layout changes                                              |
| **Gutter**       | The horizontal spacing between grid columns                                                                      |
| **Container**    | The wrapper element that defines the maximum content width                                                       |
| **Easing Curve** | A mathematical curve describing the acceleration/deceleration of motion over time                                |
| **Choreography** | A coordinated timing sequence for the motion of multiple elements (rather than arbitrary independent animations) |

## Purpose

This chapter is the single reference for how content is distributed spatially (Grid) and temporally (Motion) — all subsequent layouts or motion (Chapter 8+) MUST reference this chapter rather than duplicate its rules.

---

## ADR-0008: Grid System Strategy

| Field                       | Details                                                                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                          |
| **Authority**               | Engineering Decision (based on PR-006)                                                                                                                                                                            |
| **Context**                 | The system serves two distinct experience layers (Chapter 0 ADR-0001) with radically different content demands (visual Hero vs. dense Data Grid)                                                                  |
| **Decision**                | A unified 12-column grid across the entire system, with the effective number of columns changing by Breakpoint (4/8/12), instead of two separate grids for the two layers                                         |
| **Alternatives Considered** | Separate grid for each experience layer — rejected because it violates PR-009 (Consistency Through Tokens) and doubles the complexity of Chapter 21 (Tailwind Mapping)                                            |
| **Why This Decision**       | 12 columns is the most mathematically flexible standard (divisible by 2, 3, 4, and 6), and is sufficient for both the most complex Data Grid in the Dashboard and the simplest Hero on the public website         |
| **Risks**                   | A unified grid may encourage visually identical layouts for both layers despite their different audiences. **Mitigation:** §5.4 explicitly documents different usage rules for each layer on top of the same grid |
| **Consequences**            | Every `DT-GRID-*` token and Chapter 20 (Templates) MUST adhere to a maximum of 12 columns without exception                                                                                                       |

## ADR-0009: Motion System Strategy

| Field                       | Details                                                                                                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                      |
| **Authority**               | Product Decision (based on PR-005 and PR-002)                                                                                                                                                                                 |
| **Context**                 | Motion is required as part of the identity (Chapter 0), but MUST NOT negatively impact Core Web Vitals (Chapter 0 §Design Goals)                                                                                              |
| **Decision**                | A motion system based exclusively on two CSS properties: `transform` and `opacity` (GPU-accelerated) for any repeated or interactive motion; other properties (`width`, `top`, `margin`) **MUST NOT** be animated directly    |
| **Alternatives Considered** | Using heavy motion libraries (such as the full GSAP library) for every interaction — rejected due to Bundle Size cost (PR-002); permitted only for rare, complex Hero animations and loaded via Lazy Loading                  |
| **Why This Decision**       | `transform`/`opacity` are the only properties that do not force the browser to recalculate layout (Layout/Reflow) — supporting stable 60fps performance                                                                       |
| **Risks**                   | A non-compliant design team may request animation on other properties (`height`, for example) because they are "easier." **Mitigation:** §5.11 Anti-Patterns documents the correct alternative (`scaleY` instead of `height`) |
| **Consequences**            | Every Component (Chapter 8) and Motion Token (Chapter 3 §3.4) MUST comply with this constraint without exception                                                                                                              |

---

## 5.1 Grid Philosophy

The grid is a tool for discipline, not decoration — any element positioned outside the grid lines **MUST** be a deliberate, documented decision (e.g., a full-bleed Hero image), not an oversight.

## 5.2 Breakpoint System

| Breakpoint |       Width | Effective Columns | Gutter |                       Margin | DT Token            |
| ---------- | ----------: | ----------------: | -----: | ---------------------------: | ------------------- |
| `xs`       |      ≤639px |                 4 |   16px |                         16px | `DT-BREAKPOINT-XS`  |
| `sm`       |   640–767px |                 4 |   16px |                         24px | `DT-BREAKPOINT-SM`  |
| `md`       |  768–1023px |                 8 |   24px |                         32px | `DT-BREAKPOINT-MD`  |
| `lg`       | 1024–1279px |                12 |   24px |                         48px | `DT-BREAKPOINT-LG`  |
| `xl`       | 1280–1535px |                12 |   32px |                         64px | `DT-BREAKPOINT-XL`  |
| `2xl`      |     ≥1536px |                12 |   32px | Auto (Container constrained) | `DT-BREAKPOINT-2XL` |

## 5.3 Container & Columns

**Maximum Container:** 1440px for the Public Experience — prevents text from expanding to an unreadable width on very large screens. **Fluid (100%)** for the Dashboard with a fixed Sidebar (Operational Experience) — uses the full available space for dense data presentation (PR-006).

## 5.4 Grid Usage Rules (by Experience Layer)

| Context                                       | Rule                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Public Experience (Hero, Editorial Pages)     | Maximum 1440px Container, prioritizing comfortable reading; fewer columns are actually used (2–3 content columns within the 12-column grid) |
| Operational Experience (Dashboard, Data Grid) | Full Fluid Width, maximizing the number of columns where possible to display multiple data points side by side                              |

## 5.5 Motion Philosophy

Directly tied to PR-005 (Chapter 2): every motion **MUST** explain a state change. See Chapter 2 §Conflict Resolution Framework — motion loses first whenever it conflicts with clarity or performance.

## 5.6 Motion Tokens Mapping

```text
DT-MOTION-DURATION-BASE (220ms) + DT-MOTION-EASING-STANDARD
    ↓
motion.transition.default (Semantic Token — Chapter 7)
    ↓
Modal Component Enter/Exit Animation (Chapter 8)
```

| Token                         | Value                            | Usage                                    |
| ----------------------------- | -------------------------------- | ---------------------------------------- |
| `DT-MOTION-DURATION-INSTANT`  | 100ms                            | Simple Hover                             |
| `DT-MOTION-DURATION-FAST`     | 150ms                            | Focus, Toggle                            |
| `DT-MOTION-DURATION-BASE`     | 220ms                            | Modal, Drawer open/close                 |
| `DT-MOTION-DURATION-SLOW`     | 320ms                            | Full-page transition                     |
| `DT-MOTION-DURATION-SLOWER`   | 480ms                            | Hero celebratory animations only         |
| `DT-MOTION-EASING-STANDARD`   | `cubic-bezier(0.4,0,0.2,1)`      | Default state for all motion             |
| `DT-MOTION-EASING-DECELERATE` | `cubic-bezier(0,0,0.2,1)`        | Entering elements                        |
| `DT-MOTION-EASING-ACCELERATE` | `cubic-bezier(0.4,0,1,1)`        | Exiting elements                         |
| `DT-MOTION-EASING-SPRING`     | `cubic-bezier(0.34,1.56,0.64,1)` | Celebratory moments only (medal, record) |

## 5.7 Motion Choreography

When multiple elements animate together (e.g., statistics cards appearing on scroll), a small sequential delay (**Stagger**) of 40–80ms between each element **SHOULD** be used — creating an organized rather than chaotic feel. **MUST NOT** exceed 600ms in total stagger duration (as this slows the user's perception of content — PR-002).

## 5.8 Reduced Motion Strategy

Every motion **MUST** be wrapped with:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

The functionality (showing/hiding the element) **MUST** continue to work immediately without animation rather than being disabled entirely.

## 5.9 Performance Budget for Motion

See ADR-0009 — `transform`/`opacity` only for repeated animations. Any animation that produces a measured **Layout Shift** (Chapter 0: CLS < 0.1) **MUST NOT** be approved.

## 5.10 Responsive Layout Patterns

| Pattern  | Rule                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Stacking | Elements placed side-by-side at `lg`+ **MUST** stack vertically at `xs`/`sm` in a logical order (most important first)                     |
| Reflow   | Complex tables (Chapter 8) **SHOULD** transform into cards (Card List) below `md`, rather than using a horizontal table with hidden Scroll |
| Hero     | Hero height **MUST NOT** exceed 90vh on mobile to avoid completely hiding the content below it on initial load                             |

## 5.10.1 Safe Area Support (PWA)

Pages **MUST** respect safe areas on modern devices (Dynamic Island, Home Indicator) using:

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

This is mandatory for any fixed element (Sticky Header/Footer, Floating Accessibility Button — Chapter 6).

## 5.10.2 Layout Layering (Z-Index Strategy)

The numeric values are defined in Chapter 3 (`DT-ZINDEX-*`); this section documents **usage order only**:

```text
Content (z-base)
   ↓
Sticky Header (z-sticky)
   ↓
Dropdown (z-dropdown)
   ↓
Drawer (z-drawer)
   ↓
Modal Backdrop → Modal (z-modal-backdrop / z-modal)
   ↓
Popover (z-popover)
   ↓
Toast (z-toast)
   ↓
Tooltip (z-tooltip) ← highest layer always
```

**Rule (MUST):** No new component (Chapter 8) may create its own z-index value outside this sequence — this prevents future stacking and Stacking Context Bugs.

## 5.10.3 Layout QA Checklist

☐ No unintended horizontal Overflow at any Breakpoint
☐ No Horizontal Scroll outside components intentionally designed for it (Carousel)
☐ The grid (§5.2) does not break at any screen width
☐ Hero does not exceed 90vh on mobile (§5.10)
☐ CLS remains below 0.1 (Chapter 0)
☐ Safe Area (§5.10.1) is applied to every fixed element
☐ Layer ordering follows §5.10.2 without custom z-index values

---

**Do:** Use `transform: scale()` instead of directly changing `width`/`height` · Use moderate Stagger (§5.7)

**Don't / ❌ Anti-Patterns:**

* Directly animate `height` to open an Accordion — correct alternative: `transform: scaleY()` with `transform-origin: top`
* Animate `top`/`left` for a moving element — alternative: `transform: translate()`
* More than 3 unrelated animations running simultaneously (distracting, violates PR-001)
* Grid exceeding 12 columns in any context

## 5.12 Layout & Motion Checklist

☐ Does the layout adhere to the columns in §5.2 without breaking?
☐ Does every animation use `transform`/`opacity` only?
☐ Has `prefers-reduced-motion` been tested?
☐ Is the Stagger (if present) less than 600ms overall?
☐ Does the complex table have a Card alternative below `md`?

## 5.13 Testing

Visual Regression for every Breakpoint (§5.2) · Actual FPS measurement for any new animation (target ≥55fps, Chapter 2 §PR-005 KPI) · Automated CLS check after any new animation is added to production.

## 5.14 Foundations Completion — Grid Tokens, Dark-Mode Elevation, Reduced Motion (ADR-0052)

### ADR-0052: Promoting §5.2/§5.8 From Documented Rule to Implemented Token/Build Behavior

| Field | Details |
| --- | --- |
| **Status** | Accepted |
| **Authority** | Engineering Decision, filling gaps flagged during ADR-0051's Phase 1 audit (§5.2's grid table, §5.8's reduced-motion rule, and the dark-mode elevation principle implied by the UAEAF Digital UI Brand Guide v1.0 §11.1 existed as *documentation* but had no corresponding token/build artifact) |
| **Context** | §5.2 already tabulated columns/gutter/margin per breakpoint and §5.8 already specified the exact `prefers-reduced-motion` CSS pattern — but neither existed as an actual `packages/design-tokens` token or generated CSS rule. `semantic/elevation.json` was theme-invariant, so Dark Mode reused the same low-opacity light-mode shadow values, which barely register against a dark surface — a real gap, not previously documented at all. |
| **Decision** | (1) Promote §5.2's table into a new `primitive/grid.json` (`grid.columns/gutter/margin.{xs-2xl}`, plus `grid.dashboard.columns` for the fixed desktop-first Operational grid per §5.4/§3 Container rule) — no new numbers, only tokenizing already-approved values. (2) Move `elevation.card/card-hover/dropdown/modal` out of the theme-invariant `semantic/elevation.json` into each `semantic/colors.{light,dark,high-contrast}.json`, with Dark using markedly higher shadow opacity (0.4–0.55 vs Light's 0.06–0.12) and High Contrast using `none` (elevation communicated by solid borders only, consistent with its existing philosophy). (3) Implement §5.8's exact CSS pattern for the first time in `scripts/build.mjs`'s generated `base.css`, plus a token-level `--motion-duration-*: 0ms` override as defense-in-depth for any future JS reading the custom property directly. |
| **Alternatives Considered** | Inverting Dark elevation shadows to a lighter/white glow — rejected, not how any existing surface in this system signals elevation and would be a new, undocumented pattern. Leaving reduced-motion as documentation-only until a real animated component exists — rejected: the build pipeline can enforce it globally today at zero cost, and doing so now means no future component can ship without it by omission. |
| **Why This Decision** | Same principle already established for color (Brand Guide v1.0 §11.1: surfaces adapt per theme, identity values don't) extended to elevation, which had never had that principle actually applied. |
| **Risks** | The exact Dark elevation opacities (0.4/0.45/0.45/0.55) are a reasonable, common-practice starting point, not independently user-tested — flagged for visual QA once real dark-mode surfaces exist to check against. |
| **Consequences** | `packages/design-tokens/tokens/semantic/elevation.json` no longer defines `elevation.card` etc. directly (theme-specific files do) — any future consumer must resolve elevation through the theme-scoped semantic layer, not the old shared file. |

**Verification:** `node scripts/build.mjs` succeeds; `build/css/light.css` → `--elevation-card: 0px 1px 2px rgba(0,0,0,0.06)`, `dark.css` → `rgba(0,0,0,0.4)`, `high-contrast.css` → `none`; `build/css/base.css` ends with the `@media (prefers-reduced-motion: reduce)` block (universal `*` reset + token zeroing); `--grid-columns-lg: 12` etc. present in `base.css`.

### 5.14.1 Registry Additions

```text
DT-GRID-001 · Grid columns/gutter/margin per breakpoint · Status: Active · v1.0 · Owner: Design System · References: [ADR-0052] · Promotes §5.2 from documentation to token (DT-GRID-* identifier reserved since Chapter 3 §3.4)
DT-ELEVATION-002 · Theme-aware elevation (Light/Dark/HC) · Status: Active · v1.0 · Owner: Design System · References: [ADR-0052] · Fix: Dark no longer reuses Light's shadow opacity
DT-MOTION-005 · prefers-reduced-motion build implementation · Status: Active · v1.0 · Owner: Design System · References: [ADR-0052] · Implements §5.8 for the first time
```

## Accessibility Considerations

See Chapter 6 for full details; here: every interactive animation **MUST** have a static alternative (Static State) that works without motion and provides the same full functionality.

## AI Considerations

In the future (Chapter 16), AI may suggest Choreography sequences (§5.7) automatically based on content priority — but they must always remain subject to human review and adjustment.

## Success Metrics

* 0 animations on properties other than `transform`/`opacity` in the codebase (enforced via Stylelint Rule)
* Animation FPS ≥55 in every test
* CLS <0.1 maintained after every new animation addition
* 100% of animations are effectively disabled with `prefers-reduced-motion`

## References

Material Design Motion System · Chapter 2 (PR-002, PR-005) · Chapter 0 (Core Web Vitals Targets)

## Related Chapters

Chapter 2 (PR-002/PR-005/PR-006) · Chapter 3 (`DT-BREAKPOINT-*`, `DT-MOTION-*`) · Chapter 7 (Semantic Motion Tokens) · Chapter 8 (Practical Implementation) · Chapter 20 (Full-Page Layouts)

---

*End of Chapter 5. Next Chapter: Chapter 6 — UAE Digital Accessibility & Government Compliance.*
