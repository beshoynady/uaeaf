# Chapter 8 — Component Inventory

## Level 1: Foundation Components

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L1 of 8) | **Last Updated:** This Session | **Document Owner:** Project Owner

## Depends On / Used By

| Depends On                                                                                                                                                                                       | Used By                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Chapter 2 (all PR-XXX) · Chapter 3 (`DT-*`) · Chapter 4 (Typography) · Chapter 5 (Grid/Motion) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens — the only permitted consumption source) | All subsequent levels (L2-L8) · Chapter 11/12 (Patterns) · Chapter 20 (Templates) |

## Scope

**Covers:** L1 Foundation components only (Button, Icon Button, Link, Typography Components, Icon, Divider, Avatar, Badge, Chip, Spinner, Skeleton) — the simplest building blocks that do not depend on any other component.

**Does Not Cover:** L2-L8 (documented later in separate files/sections under the same chapter number).

## Definitions

| Term        | Definition                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Anatomy** | The visual structure of a component — the sub-parts it consists of (example: Button = Container + Label + optional Icon) |
| **Variant** | An alternative version of the same component intended for a different purpose (Primary/Secondary/Ghost)                  |
| **State**   | A temporary interactive condition of the same component (Hover/Disabled/Loading) — not considered a Variant              |

## Purpose

This section is the first practical application of all rules established in Chapters 1-7 — every decision here (color, motion, spacing) consumes an existing token; no new design decisions are introduced.

---

## ADR-0012: Component Architecture Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Authority**               | Engineering Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Context**                 | The project uses React + Tailwind + shadcn/ui (Chapter 0 Technical Architecture); an architectural decision is required for the internal structure of components before documenting each individual component                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Decision**                | Every component **MUST** separate the **Behavior Layer** (logic and accessibility) from the **Presentation Layer** (visual appearance). When a suitable Radix Primitive is available (Dialog, Popover, Dropdown Menu, Tabs...), it **MUST** be used as the foundation of the Behavior Layer. When no official Primitive exists (such as Button, Typography, and Divider), the component **MUST** rely on native semantic HTML elements or Radix `Slot` (`asChild`), while fully complying with the accessibility standards in Chapter 6. All visual styling **MUST** consume Semantic Tokens (Chapter 7) only — no component may contain hardcoded visual values within its logic |
| **Alternatives Considered** | Building every component from scratch without a Behavior library — Rejected (duplicates accessibility solutions already provided by Radix where available and violates PR-008 Built to Scale)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Why This Decision**       | Separates the Behavior Layer from the Presentation Layer, leverages Radix Primitives where available, and uses native semantic HTML elements when no official Primitive exists — ensuring WCAG compliance (Chapter 6) without coupling the design system to a single library                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Risks**                   | Radix does not cover every required component (such as L8 sports-specific components) — Mitigation: custom components are built manually but **MUST** follow the same accessibility standards documented in Chapter 6                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Consequences**            | Every "Related Components" section below references the Radix primitive used when applicable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Naming Rule:** Every component is identified using `CMP-{NAME}-{NUMBER}` (Chapter 3/7 naming standard) — example: `CMP-BUTTON-001`.

---

# CMP-BUTTON-001 — Button

| Section                  | Details                                                                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | The primary clickable action in any interface — the most frequently used interactive element across the entire system                                                                                                                                                 |
| **Anatomy**              | Container (background + optional borders) ← Label (text, consumes `typography.label` from Chapter 7) ← Optional Icon (right or left depending on RTL/LTR)                                                                                                             |
| **Variants**             | `Primary` (background `color.semantic.success`) · `Secondary` (border without background) · `Ghost` (no background or border) · `Danger` (`color.semantic.danger` — for deletion/cancellation only, Chapter 1 ADR-0004) · `Icon-only`                                 |
| **Sizes**                | `sm` (32px height) · `md` (40px, default) · `lg` (48px)                                                                                                                                                                                                               |
| **States**               | Default · Hover (darkens color through `color.semantic.success.hover` token) · Focus (`a11y.focus.ring`) · Active · Disabled (`opacity.disabled` from Chapter 3) · Loading (Spinner replaces the Label while width remains unchanged)                                 |
| **Content Rules**        | Button text must use a clear action verb ("Publish", not "OK") — follows Chapter 9 (to be referenced when written)                                                                                                                                                    |
| **Behavior**             | A maximum of one `Primary` button per screen section (Chapter 2 §PR-001 Anti-Pattern)                                                                                                                                                                                 |
| **Keyboard Interaction** | `Enter`/`Space` activates the button · `Tab` reaches it in logical order (Chapter 6 §6.3)                                                                                                                                                                             |
| **Accessibility**        | Always a real `<button>` element (Chapter 6 §6.13 Anti-Pattern: no `<div onClick>`) · `aria-busy` during Loading · `aria-disabled` when focus needs to be retained for explanatory purposes                                                                           |
| **Responsive Behavior**  | On mobile, primary action buttons in forms **SHOULD** span the full width (`w-full`) to improve touch target size (Chapter 6 §6.7: 44px)                                                                                                                              |
| **Design Tokens Used**   | `color.semantic.success/danger` · `typography.label` · `motion.transition.default` (Chapter 5) · `a11y.focus.ring` · `radius.sm` (Chapter 3)                                                                                                                          |
| **Do & Don't**           | Do: use a clear action verb · Don't: do not use Danger as a regular button (Chapter 1 ADR-0004)                                                                                                                                                                       |
| **QA Checklist**         | ☐ Is it a real `<button>` element? ☐ Is the Focus Ring visible? ☐ Does Loading preserve the width? ☐ Is there no more than one Primary button in the section?                                                                                                         |
| **Related Components**   | Implementation Reference: Native `<button>` + Radix `Slot` (`asChild`) + shadcn/ui Button Pattern (there is no official Radix Primitive named Button, unlike Dialog/Popover/Dropdown — technical correction) · Icon Button (CMP-ICONBUTTON-001) · Link (CMP-LINK-001) |

### Component API Contract

*Pattern reference for all interactive L1 components — the same format should be followed for any subsequent component.*

| Property                 | Type                                        | Required | Default     |
| ------------------------ | ------------------------------------------- | -------- | ----------- |
| `variant`                | `'primary'\|'secondary'\|'ghost'\|'danger'` | Yes      | `'primary'` |
| `size`                   | `'sm'\|'md'\|'lg'`                          | No       | `'md'`      |
| `disabled`               | `boolean`                                   | No       | `false`     |
| `loading`                | `boolean`                                   | No       | `false`     |
| `iconLeft` / `iconRight` | `ReactNode`                                 | No       | `undefined` |

**Composition Rules:** Allowed: `Icon + Text` · `Text` only · `Icon Only` (`aria-label` mandatory). **MUST NOT:** `Icon Left + Icon Right + Text` together in the same button (unnecessary visual complexity — PR-001).

**State Priority:** When multiple states conflict, `Loading` overrides `Hover` and `Active` (the user cannot interact with an operation currently in progress), but the **Focus Ring MUST** remain visible if the button is still the active keyboard element. `Disabled` overrides all other interactive states without exception.

**Disabled Behavior (Precisely Defined):** `disabled` **MUST** apply all three together, not just opacity: `cursor: not-allowed` + `pointer-events: none` + `opacity: var(--opacity-disabled)` (Chapter 3).

**Loading Behavior (CLS Detail):** Width **MUST** remain fixed · Height **MUST** remain fixed · Label **MUST NOT** jump or suddenly disappear (the Spinner replaces the text position while preserving the space reserved for it).

**RTL Behavior:** `iconLeft` in LTR automatically becomes positioned to the right of the text in RTL (not literally "Left" — the name is semantic and refers to logical visual ordering via `inset-inline-start`, Chapter 6 §CSS Logical Properties), and vice versa for `iconRight`.

**Animation Reference:** Hover/Focus transitions **MUST** use `motion.transition.default` (`DT-MOTION-DURATION-BASE` + `DT-MOTION-EASING-STANDARD`, Chapter 5 §5.6) — **MUST NOT** use generic `transition: all` (violates ADR-0009 GPU-only).

**Error Prevention (Product Rules):**

* `Danger` variant **MUST NOT** be used inside a celebratory Hero section.
* `Ghost` **MUST NOT** be used as the only primary action on a screen.
* `Secondary` **MUST NOT** be used for a deletion action (use `Danger` only).

**Component Maturity:** `Stable` (v1.0)

---

# CMP-ICONBUTTON-001 — Icon Button

| Section                  | Details                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | A compact secondary action without visible text (e.g., closing a Modal or opening an options menu)                                                                                  |
| **Anatomy**              | Circular/square Container ← Icon only (no Label)                                                                                                                                    |
| **Variants**             | Ghost (default) · Filled (for stronger visual emphasis)                                                                                                                             |
| **Sizes**                | `sm` (32×32) · `md` (40×40) · `lg` (48×48) — aligned with Chapter 6 §6.7 touch-target requirements as a minimum                                                                     |
| **States**               | Same as Button (Default/Hover/Focus/Active/Disabled)                                                                                                                                |
| **Content Rules**        | No visible text; **MUST** always have a descriptive `aria-label`                                                                                                                    |
| **Behavior**             | Used only when the icon is semantically clear (an "X" icon for closing is universally understandable); if the icon is not clear, a Tooltip (CMP documented later) **MUST** be added |
| **Keyboard Interaction** | Same as Button                                                                                                                                                                      |
| **Accessibility**        | `aria-label` is mandatory (Chapter 6 §6.4 Accessible Names) — without it, this is a direct Anti-Pattern                                                                             |
| **Responsive Behavior**  | Size does not change between screens — minimum 44×44px remains fixed                                                                                                                |
| **Design Tokens Used**   | Same as Button + `icon.size.md` (Chapter 3)                                                                                                                                         |
| **Do & Don't**           | Do: always add `aria-label` · Don't: do not use it for an important primary action (use Button with a Label)                                                                        |
| **QA Checklist**         | ☐ Is `aria-label` present? ☐ Is the size ≥44×44px?                                                                                                                                  |
| **Related Components**   | Button (CMP-BUTTON-001) · Tooltip (documented in L4 Feedback)                                                                                                                       |

---

# CMP-LINK-001 — Link

| Section                  | Details                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Navigation between pages/resources — not an action (the fundamental distinction from Button)                                             |
| **Anatomy**              | Text only ← Underline on Hover (not by default, to preserve PR-001 Clarity)                                                              |
| **Variants**             | `Inline` (inside a text paragraph) · `Standalone` (standalone link, e.g. "Read more")                                                    |
| **Sizes**                | Inherits the size of surrounding text (no independent size)                                                                              |
| **States**               | Default · Hover (underline + subtle color change) · Focus · Visited (optional, `SHOULD NOT` be used for frequently revisited news links) |
| **Content Rules**        | Link text must describe the destination, not "Click here"                                                                                |
| **Behavior**             | **MUST** always be a real `<a href>` element, not `<span onClick>` (violates Semantic HTML)                                              |
| **Keyboard Interaction** | `Enter` activates it · `Tab` reaches it                                                                                                  |
| **Accessibility**        | A link opening a new tab **MUST** announce this (`aria-label` includes "opens in a new window")                                          |
| **Responsive Behavior**  | No change — text flows naturally                                                                                                         |
| **Design Tokens Used**   | `color.text.link` (Semantic — Chapter 7 §7.2 inherited from `color.text.primary`)                                                        |
| **Do & Don't**           | Do: use a real `<a>` · Don't: do not design a Link to look like a Button or vice versa (confuses the user about the action type)         |
| **QA Checklist**         | ☐ Is it a real `<a>` with a valid `href`? ☐ Is it visually clear that it is a link rather than a button?                                 |
| **Related Components**   | Button (CMP-BUTTON-001) — visual distinction between them is mandatory                                                                   |

---

# CMP-TYPOGRAPHY-001 — Heading / Text Components

| Section                  | Details                                                                                                                                  |         |                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------ |
| **Purpose**              | Applies the Chapter 4 type scale as reusable React components instead of manually writing CSS throughout the interface                   |         |                                |
| **Anatomy**              | `<Heading level={1-6}>` renders `<h1>-<h6>` automatically · `<Text variant="body                                                         | caption | label">`renders`<p>`or`<span>` |
| **Variants**             | Matches the levels defined exactly in Chapter 4 §4.4 (Display XL → Overline)                                                             |         |                                |
| **Sizes**                | No independent size — size is determined by the variant only                                                                             |         |                                |
| **States**               | No interactive states (static display element)                                                                                           |         |                                |
| **Content Rules**        | Follows Chapter 4 §4.6 Reading Rules and Chapter 9 (later)                                                                               |         |                                |
| **Behavior**             | `<Heading>` **MUST** preserve the correct semantic hierarchy (do not place `<h3>` directly after `<h1>` without `<h2>`) — Chapter 6 §6.4 |         |                                |
| **Keyboard Interaction** | Not applicable (non-interactive)                                                                                                         |         |                                |
| **Accessibility**        | Correct hierarchy **MUST** be maintained — fundamental for screen-reader heading navigation (Landmark Navigation)                        |         |                                |
| **Responsive Behavior**  | Automatically follows the Desktop/Mobile paired values from Chapter 4 §4.4 via `clamp()` or Breakpoint                                   |         |                                |
| **Design Tokens Used**   | All `typography.*` Semantic Tokens (Chapter 7 §7.5)                                                                                      |         |                                |
| **Do & Don't**           | Do: maintain hierarchy · Don't: do not use `<Heading>` merely to obtain a visually large font size (use `<Text size="lg">` instead)      |         |                                |
| **QA Checklist**         | ☐ Is the hierarchy logical? ☐ Is there no free/custom font size outside Chapter 4 §4.4?                                                  |         |                                |
| **Related Components**   | Almost every other component consumes this component internally                                                                          |         |                                |

---

# CMP-ICON-001 — Icon

| Section                  | Details                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Compact visual representation of a concept or action (Chapter 1 §8 Icons is the initial reference — detailed here)                                      |
| **Anatomy**              | SVG with a fixed 1.5px stroke width (Lucide Icons library)                                                                                              |
| **Variants**             | `Outline` (default, aligned with the modern visual language) — no `Filled` except for exceptional "selected/active" states                              |
| **Sizes**                | 16 / 20 / 24 / 32px only — no custom sizes (same logic as §4.4 Type Scale)                                                                              |
| **States**               | Inherits the surrounding text color (`currentColor`) — no independent icon-specific color                                                               |
| **Content Rules**        | Never place text inside the icon                                                                                                                        |
| **Behavior**             | Directional icons (next/back arrows) automatically mirror in RTL; non-directional icons (medal, clock) do not mirror (Chapter 6 §6.9 general principle) |
| **Keyboard Interaction** | Non-interactive by itself (used inside Button/Icon Button)                                                                                              |
| **Accessibility**        | A standalone functional icon **MUST** have an `aria-label` (Chapter 6 §6.8) · A decorative icon **MUST** use `aria-hidden="true"`                       |
| **Responsive Behavior**  | No change                                                                                                                                               |
| **Design Tokens Used**   | `icon.size.*` (Chapter 3 `DT-ICON-SIZE-*`)                                                                                                              |
| **Do & Don't**           | Do: use Lucide exclusively to ensure consistent stroke weight · Don't: do not mix icons from different libraries (breaks PR-009 Consistency)            |
| **QA Checklist**         | ☐ Is it exclusively from Lucide? ☐ Is `aria-hidden` or `aria-label` correct for the context?                                                            |
| **Related Components**   | Custom sports components (L8) build on the same icon system                                                                                             |

---

# CMP-DIVIDER-001 — Divider

| Section                  | Details                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | A subtle visual separator between content groups without relying solely on whitespace                                                                       |
| **Anatomy**              | Horizontal/vertical line with `DT-BORDER-WIDTH-DEFAULT` thickness                                                                                           |
| **Variants**             | `Horizontal` (default) · `Vertical` (e.g. inside a Toolbar)                                                                                                 |
| **Sizes**                | None (stretches across the container's width/height)                                                                                                        |
| **States**               | No states (static element)                                                                                                                                  |
| **Content Rules**        | No content                                                                                                                                                  |
| **Behavior**             | Purely decorative — no interactive function                                                                                                                 |
| **Keyboard Interaction** | Not applicable                                                                                                                                              |
| **Accessibility**        | `role="separator"` or `aria-hidden="true"` depending on whether it is semantic (separates logical sections) or purely decorative                            |
| **Responsive Behavior**  | No change                                                                                                                                                   |
| **Design Tokens Used**   | `border.default` (Chapter 7)                                                                                                                                |
| **Do & Don't**           | Do: use it for clear logical separation · Don't: do not use it as a replacement for Spacing (Chapter 3 §Spacing) merely because the space "feels too small" |
| **QA Checklist**         | ☐ Is `aria-hidden` or `role="separator"` appropriate for the context?                                                                                       |
| **Related Components**   | Used inside Card, List, Menu (later)                                                                                                                        |

---

# CMP-AVATAR-001 — Avatar

| Section                  | Details                                                                                                                                                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Visual representation of a person (athlete, coach, staff member) — photo or fallback initials                                                                                                                                                                                |
| **Anatomy**              | Circular Container (`radius.full`) ← Image or Fallback (initials + colored background)                                                                                                                                                                                       |
| **Variants**             | `Photo` · `Initials Fallback` (when the photo is unavailable) · `Icon Fallback` (for generic cases without a specific identity)                                                                                                                                              |
| **Sizes**                | `xs` (24px) · `sm` (32px) · `md` (40px) · `lg` (56px) · `xl` (96px, for detailed athlete profile pages) · `2xl` (160px, ADR-0045 — institutional leadership portraits only: Federation President, Board Chairman; **not** for athlete/coach/referee profiles, which stop at `xl`)                                                                                                                                                                      |
| **States**               | No interactive states by itself (may be placed inside a clickable button)                                                                                                                                                                                                    |
| **Content Rules**        | Initials Fallback: first two letters of the full name                                                                                                                                                                                                                        |
| **Behavior**             | If the image fails to load, it **MUST** automatically transition to the Fallback smoothly (never display a broken-image icon). **Official Fallback Chain:** `Photo` → (load failure/404) → `Initials Fallback` → (no name available) → `Icon Fallback` (generic person icon) |
| **Keyboard Interaction** | Not applicable (unless inside an interactive element)                                                                                                                                                                                                                        |
| **Accessibility**        | Descriptive `alt` text for the actual athlete image (athlete's name) — Chapter 6 §6.8                                                                                                                                                                                        |
| **Responsive Behavior**  | Aspect ratio does not change, only size varies according to context                                                                                                                                                                                                          |
| **Design Tokens Used**   | `radius.full` · Fallback background colors from `color.avatar.*` (Semantic, derived from Brand — scope to be finalized in Chapter 7 later if variation is needed)                                                                                                            |
| **Do & Don't**           | Do: always provide a Fallback · Don't: never display a broken image                                                                                                                                                                                                          |
| **QA Checklist**         | ☐ Does the Fallback actually work when the image is missing? ☐ Is the `alt` descriptive?                                                                                                                                                                                     |
| **Related Components**   | Athlete Card (L8) directly consumes this component                                                                                                                                                                                                                           |

---

# CMP-BADGE-001 — Badge

| Section                  | Details                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Small status indicator attached to another element (notification count, "New" status)                                                                                  |
| **Anatomy**              | Small rounded Container ← number, dot, or very short text                                                                                                              |
| **Variants**             | `Dot` (dot only, no number) · `Numeric` (number, capped at "99+" above 99) · `Status` (short text such as "New") · `Live` (Chapter 1 ADR-0038 — dot/pulse + mandatory text label, `color.semantic.live`) · `Achievement` (Chapter 1 ADR-0038 — text label only, `color.semantic.achievement`, max one per parent card) |
| **Sizes**                | Generally `sm` only — Badge is inherently small                                                                                                                        |
| **States**               | No interactive states                                                                                                                                                  |
| **Content Rules**        | Very short text (one word or a number). `Live`/`Achievement` variants **MUST** always carry a text label — never color/dot alone (Chapter 1 ADR-0038 §Accessibility). |
| **Behavior**             | Anchored to the corner of its parent element (e.g. Icon Button) without breaking the layout. `Live`/`Achievement` variants render inline within the card, not corner-anchored, and are capped at one red-toned badge per component instance (Chapter 1 ADR-0038 §Repetition Rule). |
| **Keyboard Interaction** | Not applicable                                                                                                                                                         |
| **Accessibility**        | **MUST** be announced through the parent element's `aria-label` ("Notifications, 5 new") rather than as a separate element without context                             |
| **Responsive Behavior**  | No change                                                                                                                                                              |
| **Design Tokens Used**   | `color.semantic.danger` (urgent notifications) · `color.semantic.info` (Chapter 3 §3.33.2/Chapter 7 §7.9.2) · `color.semantic.live` / `color.semantic.achievement` (Chapter 1 ADR-0038, Chapter 7 §7.9.2) |
| **Do & Don't**           | Do: always associate it semantically with the parent element · Don't: never make it the sole source of information (Chapter 6 §6.2 — do not rely on color/shape alone) · Don't: never use `Live`/`Achievement` together on the same parent (Chapter 1 ADR-0038) |
| **QA Checklist**         | ☐ Is it associated with the parent `aria-label`?                                                                                                                       |
| **Related Components**   | Icon Button, Tab (L3), Chip                                                                                                                                            |

---

# CMP-CHIP-001 — Chip

| Section                  | Details                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Compact label that can be displayed or removed (active filter, athlete's event/category classification)                          |
| **Anatomy**              | Fully rounded Container (`radius.full`) ← Text ← Optional remove icon                                                            |
| **Variants**             | `Static` (display only) · `Removable` (with X button) · `Selectable` (toggleable as a filter)                                    |
| **Sizes**                | `sm` · `md`                                                                                                                      |
| **States**               | Default · Selected (filled background) · Disabled                                                                                |
| **Content Rules**        | Short text (one or two words)                                                                                                    |
| **Behavior**             | `Removable` **MUST** emit a clear removal event with immediate visual confirmation (no delay)                                    |
| **Keyboard Interaction** | `Selectable`: `Enter`/`Space` toggles state; `Removable`: `Backspace` when focused (common pattern for tag inputs)               |
| **Accessibility**        | `Selectable` **MUST** have `aria-pressed` reflecting its state; remove button **MUST** have `aria-label="Remove {tag name}"`     |
| **Responsive Behavior**  | A group of Chips **SHOULD** wrap (`flex-wrap`) rather than overflow horizontally with hidden scrolling                           |
| **Design Tokens Used**   | `color.semantic.*` according to state · `radius.full`                                                                            |
| **Do & Don't**           | Do: provide a clear `aria-label` for every remove button · Don't: do not use it as a replacement for Button for a primary action |
| **QA Checklist**         | ☐ Are `aria-pressed`/`aria-label` correct? ☐ Does wrapping work instead of Overflow?                                             |
| **Related Components**   | Filter Bar (L7) heavily consumes Chip                                                                                            |

---

# CMP-SPINNER-001 — Spinner / Loader

| Section                  | Details                                                                                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Short-duration loading indicator (less than ~2 seconds expected) — see Chapter 5 §Skeleton for preference toward longer loading states                                                                                                        |
| **Anatomy**              | Continuously rotating circle                                                                                                                                                                                                                  |
| **Variants**             | `Inline` (inside a button) · `Standalone` (centered within a loading area)                                                                                                                                                                    |
| **Sizes**                | `sm` (16px, inside a button) · `md` (24px) · `lg` (40px)                                                                                                                                                                                      |
| **States**               | One continuous animation only — no other states                                                                                                                                                                                               |
| **Content Rules**        | Usually no text; **MAY** include accompanying text for longer operations ("Loading...")                                                                                                                                                       |
| **Behavior**             | Continuous `Infinite Loop` — the only permitted exception to the "no endless motion" rule (Chapter 5 §Anti-Patterns), because it communicates an actual ongoing waiting state                                                                 |
| **Keyboard Interaction** | Not applicable                                                                                                                                                                                                                                |
| **Accessibility**        | `role="status"` + `aria-live="polite"` (Chapter 6 §6.4 Live Regions) — animation **MUST** be visually disabled under `prefers-reduced-motion` while remaining visible and static (it must not disappear; the function remains understandable) |
| **Responsive Behavior**  | No change                                                                                                                                                                                                                                     |
| **Design Tokens Used**   | `motion.duration.*` (continuous rotation) · `color.semantic.info`                                                                                                                                                                             |
| **Do & Don't**           | Do: use it for short operations only · Don't: do not use it for full-page or table loading (use Skeleton)                                                                                                                                     |
| **QA Checklist**         | ☐ Is `role="status"` present? ☐ Does it remain static under Reduced Motion?                                                                                                                                                                   |
| **Related Components**   | Skeleton (CMP-SKELETON-001) — preferred alternative for longer loading                                                                                                                                                                        |

---

# CMP-SKELETON-001 — Skeleton

| Section                  | Details                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**              | Approximate preview of content shape during loading — reduces perceived waiting compared with an empty Spinner (Chapter 0 Discovery: preferred for content with a predictable shape) |
| **Anatomy**              | Gray rectangles/circles with a subtle pulse that mimic the actual upcoming content (text, image, card)                                                                               |
| **Variants**             | `Text Line` · `Avatar Circle` · `Card Block` · `Table Row`                                                                                                                           |
| **Sizes**                | Exactly match the dimensions of the expected real content (no arbitrary sizing)                                                                                                      |
| **States**               | One continuous pulse only                                                                                                                                                            |
| **Content Rules**        | No actual content                                                                                                                                                                    |
| **Behavior**             | **MUST** be immediately replaced by the actual content without a layout shift (CLS, Chapter 0) — dimensions **MUST** exactly match the space occupied by the incoming content        |
| **Keyboard Interaction** | Not applicable                                                                                                                                                                       |
| **Accessibility**        | `aria-busy="true"` on the parent container while it is displayed; the pulse **MUST** be disabled under Reduced Motion (remaining as a static gray shape)                             |
| **Responsive Behavior**  | Matches the actual content layout at every Breakpoint                                                                                                                                |
| **Design Tokens Used**   | `color.surface.skeleton` (Semantic) · `motion.duration.slow` for the pulse                                                                                                           |
| **Do & Don't**           | Do: exactly match dimensions to prevent CLS · Don't: do not use Skeleton for operations under one second (use Spinner or nothing)                                                    |
| **QA Checklist**         | ☐ Do dimensions match the real content? ☐ Is there zero CLS on replacement? ☐ Is `aria-busy` present?                                                                                |
| **Related Components**   | Spinner (for short loading) · Table, Card (consume it later in L5)                                                                                                                   |

---

# Component Relationship Graph (L1 → Subsequent Levels)

```text
Button
  ├── Icon Button (shares Anatomy/States)
  ├── Split Button (L4, future)
  └── Menu Button (L5, future)

Typography Components
  ├── Card (L5)
  ├── Table (L5)
  ├── Dialog (L4)
  └── Hero (Chapter 20)

Avatar
  ├── Athlete Card (L8)
  ├── Coach Card (L8)
  └── Comment/Activity Feed (L7)

Icon
  └── Consumed inside almost every interactive component (Button, Chip, Badge, Alert...)
```

## Visual Density (by Experience Layer — Chapter 0 ADR-0001)

| Component | Public Experience              | Operational Experience (Dashboard)     |
| --------- | ------------------------------ | -------------------------------------- |
| Badge     | `Normal` (comfortable spacing) | `Compact` (higher information density) |
| Chip      | `md` default                   | `sm` default                           |
| Button    | `md`/`lg` (visual prominence)  | `sm`/`md` (space efficiency)           |

## Component Maturity States

Every component carries a maturity state:

* **Stable** — production-ready; this entire level is currently stable.
* **Experimental** — under testing; not recommended for production.
* **Deprecated** — has a replacement and is within a grace period, following the logic of Chapter 3 §Token Deprecation Policy but applied to components.

All L1 components are currently: **Stable v1.0**.

---

## ADR-0045: Avatar Scale Extension — "2xl" for Institutional Leadership Portraits

**Trigger (verbatim intent):** while building the President's Message static page, a portrait was needed at 160px — larger than the documented `xl` (96px) ceiling — and the same need immediately recurred for the Board of Directors page (Chairman feature). Two independent pages hitting the same undocumented value confirmed this is a real, recurring size class, not a one-off exception.

| Field | Details |
| --- | --- |
| **Status** | Accepted |
| **Authority** | Product Decision (Project Owner, this session), in response to a confirmed recurring content requirement |
| **Context** | `CMP-AVATAR-001` (this chapter) tops out at `xl` (96px), sized for "detailed athlete profile pages." Institutional leadership portraits (Federation President, Board Chairman) are used in a different context — a single, prominent, editorially-curated feature within a static page header, not a dense profile/list context — and read as under-scaled at 96px relative to the surrounding H1/H3 typography already used on those pages. |
| **Decision** | Add one new Avatar size, `2xl` = 160px, scoped explicitly to institutional leadership portraits (Federation President, Board Chairman/Vice-Chairman feature positions). `xs`/`sm`/`md`/`lg`/`xl` remain unchanged and continue to govern athlete/coach/referee/club-logo contexts (`CMP-ATHLETECARD-001`, `CMP-COACHCARD-001`, `CMP-REFEREECARD-001`). Regular board members (non-Chairman) in a grid use `xl` (96px), not `2xl` — `2xl` is reserved for the single featured leadership portrait per page, preserving the visual hierarchy the Chairman-feature layout depends on. |
| **Alternatives Considered** | (A) Cap leadership portraits at `xl` (96px) — rejected: already shipped at 96px it visibly under-weights the Chairman/President relative to the page's own H1 (40px) and H3 (24px) scale, undermining the "institutional trust" quality bar (Chapter 15 §Visual Quality Bar). (B) Treat it as a one-off, undocumented exception on two pages only — rejected: this is exactly the ADR-0041-style pattern this framework exists to prevent; a value used twice without documentation becomes silent scale drift. (C) A fully custom, unscaled "Hero Portrait" image component outside the Avatar family — rejected: unnecessary complexity for a single size-token gap; the existing Avatar anatomy (circular container, fallback chain, alt-text rule) already fits this use case unchanged. |
| **Why This Decision** | Extends the existing scale by one deliberate step rather than inventing a parallel component; keeps the Fallback chain, accessibility rule, and token binding (`radius.full`) identical to every other Avatar size — the only change is the numeric ceiling, scoped narrowly enough that it cannot drift into general UI use. |
| **Risks** | Scope creep — a future editor or designer reaches for `2xl` for a non-leadership use case (e.g. a featured athlete). **Mitigation:** the size's documented scope ("institutional leadership portraits only") is explicit in the Sizes row above; any such usage outside that scope is a governance violation to flag on sight, not a precedent to follow. |
| **Consequences** | The President's Message page portrait (already shipped at 160px) is now retroactively compliant, no rework needed. The Board of Directors page Chairman-feature portrait uses `2xl` per this ADR; the Board Grid's regular member cards use `xl` (96px) per `CMP-BOARDMEMBERCARD-001` (Chapter 8 L8, ADR-0046). |

---

# Design ↔ Code Mapping

### *(Prepares for Chapter 21)*

```text
Figma Component ("Button / Primary")
    ↓
Storybook ID ("button/primary", "button/loading", "button/danger")
    ↓
React Component (<Button variant="primary" />)
    ↓
npm Package (@uaeaf/ui)
```

Every L1 component **SHOULD** have a Storybook ID matching its name using the `{component}/{variant}` format to ensure traceability between design and implementation.

---

# Do & Don't — L1 General

**Do:** Before creating any new component, first check whether L1 already contains what you need · follow the exact 14-section template for every new component.

**Don't:** Do not create a duplicate component for an existing function (PR-011 Backlog Note — Chapter 2) · do not violate ADR-0012 (every component must maintain separate Headless + Tokens layers).

---

# Success Metrics

* 11/11 L1 components completed using the full template
* 0 use of hardcoded CSS values inside any Component
* 100% of Components use Semantic Tokens only (no direct Primitive/Brand usage — Chapter 7 §7.7)
* 100% of interactive components pass the Chapter 6 §6.12 QA Checklist

---

# References

Native HTML Elements · Radix UI Primitives · Radix `Slot` · shadcn/ui · Lucide Icons · WAI-ARIA Authoring Practices · WCAG 2.2 · Chapters 1-7 (the entire foundation)

## Related Chapters

All Chapters 1-7 (direct consumption) · L2 Forms (depends on Button/Icon) · Chapter 9 (detailed Content Rules, later)

---

*End of L1 Foundation Components (11/11). Next: L2 Forms Components.*
