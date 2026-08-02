# Chapter 8 — Global Component Governance

### (Applied to Every Component in L1–L8 Without Exception — A Single Reference Instead of Repetition)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Section Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

## Depends On / Used By

| Depends On                                                                                                                      | Used By                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Chapter 3 (§Lifecycle, §Versioning — same logic applied here to components instead of tokens) · Chapter 22 (General Governance) | Every component in L1 (retroactively) and L2–L8 (as soon as they are documented) — by reference, not repetition |

## Purpose

Instead of repeating Versioning/Testing/Performance/Analytics rules inside every component across the dozens of components coming in L2–L8, this section provides a single centralized reference.

**Every "Related Governance" section in any subsequent component MUST reference this section only**, and MUST NOT reproduce its contents.

---

## G.1 Component Versioning Policy

Follows the same logic as Chapter 3 §3.6, but applied to components instead of tokens:

| Type      | Example                                                  | Impact                                                           |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| **Patch** | Fixing a visual bug in `Button` without changing its API | No Breaking Change                                               |
| **Minor** | Adding a new `variant` to `Button`                       | Backward Compatible — existing components continue to work as-is |
| **Major** | Removing a `variant` or changing a Property name         | **Breaking Change** — requires a Migration Guide (§G.6)          |

## G.2 Component Lifecycle

```text
Experimental → Stable → Deprecated → Removed
```

Fully aligned with Chapter 3 §3.5 (Proposal→Review→Approved→Deprecated→Removed), with terminology adapted for components.

**Experimental:** For internal use only; the API may change without notice.
**Stable:** API is locked; changes require a Major Version.
**Deprecated:** Remains functional with a warning, with a two-release grace period (same timeline as Chapter 3).

## G.3 Performance Budget (Per Component, General)

| Constraint                                          | Value                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Maximum DOM Nodes per Component                     | No fixed number — **SHOULD** keep the Root Structure as minimal as possible, **MUST NOT** include unnecessary wrapper elements. DOM complexity **MUST** be proportional to the component's responsibility (a simple Button ≈3 elements, while Dialog/Table/Tree View/Calendar/Combobox are inherently complex and are not subject to the same ceiling) |
| Images inside any Component (Avatar, Card, Gallery) | Lazy Loading **MUST** be enforced (except the first above-the-fold image)                                                                                                                                                                                                                                                                              |
| Any Animation inside a Component                    | GPU-only (`transform`/`opacity` — Chapter 5 ADR-0009), without exception                                                                                                                                                                                                                                                                               |
| Additional Bundle Size per New Component            | Simple components (Button, Badge, Icon) **SHOULD** be <5KB compressed. Inherently complex components (Table, Calendar, Rich Text Editor) **MUST** explicitly justify any larger size in their documentation (no single fixed ceiling fits all) — reviewed in Chapter 3 §3.13 CI                                                                        |

**Note:** Performance Budgets in this table **SHOULD** be reviewed periodically as the system grows (integrated with Chapter 3 §3.15 Quarterly Audit) — they are not considered permanent, immutable values.

## G.4 Testing Contract (Per Component, General)

| Test Type          | Tool                        | Required?                       |
| ------------------ | --------------------------- | ------------------------------- |
| Unit Test          | Jest / Vitest               | MUST                            |
| Interaction Test   | Storybook Play Function     | MUST for interactive components |
| Visual Regression  | Chromatic (or equivalent)   | MUST                            |
| Accessibility Test | axe-core (Chapter 6 §6.10)  | MUST                            |
| RTL Test           | Dedicated Arabic screenshot | MUST                            |

## G.5 Analytics & Telemetry Contract

Every interactive component **MUST** provide standardized integration points (with no tracking logic inside the presentation layer itself — preserving ADR-0012):

* DOM attributes: `data-component`, `data-variant`, `data-testid` **MUST** always be present for any interactive component.
* Standardized callbacks (`onInteraction` optional) MUST be used instead of directly invoking an Analytics service from inside the component — the higher-level Application layer decides what to do with the event.
* **Components MUST NOT** depend on any specific Analytics provider (no Google Analytics, Mixpanel, or PostHog inside component code) — the component **only emits events**, while the consumer that connects them to an external provider belongs to the Application layer.
* **Public Events MUST** remain stable across Minor releases — any change to an Event name or Payload structure **is considered a Breaking Change** and is subject to §G.1, just like any change to the component's public API. *(Internal Events that are not exposed as part of the public contract are not subject to the same restriction.)*

## G.6 Migration Rules

For any Breaking Change (§G.1), the following **MUST** be documented:

```text
Deprecated:    GhostButton (legacy standalone component)
Replacement:   <Button variant="ghost" />
Removal:       v3.0.0
```

Follows the same timeline as Chapter 3 §Token Deprecation Policy (two releases deprecated, one warning release, then Removal).

## G.7 Storybook Requirements

Every component **SHOULD** have a Storybook identifier in the format `{component}/{variant}` (example: `button/primary`, `button/loading`) — Chapter 8 L1 §Design↔Code Mapping.

## G.8 Documentation Requirements

Every new component (L2–L8) **MUST** follow the same 14-section template (Chapter 8 Introduction) + **MUST** reference this section (G.1–G.12) instead of repeating any of its requirements.

## G.9 State Management Contract

Every interactive component **SHOULD** support both patterns where logically appropriate:

* **Controlled Mode:** State (`value`, `checked`, `open`, `selected`) is managed by the parent.
* **Uncontrolled Mode:** State is managed internally (`defaultValue`, `defaultChecked`) for quick usage.

**Rule (MUST):** Any controlled Prop (`value`, `checked`, `open`, `selected`) **MUST** always have a corresponding Callback (`onChange`, `onCheckedChange`, `onOpenChange`) — no controlled Prop without a notification Callback, preventing API inconsistencies between components.

*(Components that do not expose mutable state — such as Divider or Skeleton — are inherently exempt from this requirement, rather than requiring a separately justified exception.)*

## G.10 Ref Contract

Every interactive component **MUST** expose a reference to its primary DOM element through the officially supported Ref mechanism in React — mandatory without exception, enabling integration with external libraries (manual Focus Management, measurements, Animation Libraries).

*(Current implementation: `React.forwardRef` — Chapter 21 documents the technical details; this section remains valid even if the Ref mechanism changes in future React versions.)*

## G.11 Composition Contract

Every component **MUST** expose `children` whenever composition has meaningful functional value.

**Compound Components** (example: `<Tabs><Tabs.List><Tabs.Trigger/></Tabs.List></Tabs>`) **SHOULD** be preferred over deeply nested Prop stacking.

Each individual component (L2–L8) adds only its component-specific composition rules on top of this general contract and does not repeat it.

## G.12 Accessibility Contract

Every interactive component **MUST**:

* Support full keyboard navigation.
* Expose an accessible name (Accessible Name).
* Provide correct ARIA semantics when no semantic HTML alternative exists.
* Maintain a visible Focus Indicator at all times.
* Fully support RTL.
* Respect `prefers-reduced-motion`.
* Meet the WCAG 2.2 AA requirements defined in Chapter 6.

**Rule (MUST NOT):** The accessibility requirements here **MUST NOT** be excluded or overridden by any individual component implementation for any reason, including design considerations — this contract is mandatory without local exceptions, and any subsequent component references this section instead of rewriting the same rules.

**Critical Principle:** Accessibility Defects **MUST** be treated as Functional Defects in the product — not as optional UX enhancements that can be postponed. A button without a visible Focus Indicator is a broken button, to the same degree as a button that does not respond to clicks.

---

## Governance Change Policy

Any modification to this section (G.1–G.12 or any ADR in Chapter 8) **MUST** go through a new ADR or a documented modification to an existing ADR.

Component authors (those writing L2–L8 documentation) **MUST NOT** modify these governance rules directly while documenting a component — governance evolves only through formal Architecture Decision Records, not incidental changes made during day-to-day work.

---

## ADR-0013: Component Layering Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Authority**               | Engineering Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Context**                 | Chapter 8 contains dozens of components across 8 levels (Chapter 0 Discovery: approved Taxonomy); readers need to understand *why* this ordering exists before diving into the details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Decision**                | Levels are ordered according to **Dependency Direction**, not ease or production priority: every subsequent level **MAY** consume any component from a preceding level, and **MUST NOT** be consumed by a preceding level. Dependencies are strictly one-directional. **Cross-level dependencies MUST remain Acyclic — circular dependencies between component levels are strictly prohibited.** **Shared logic MUST move downward, never upward** — if an L7 component needs logic that is also needed by an L3 component, that logic **MUST NOT** be duplicated in L7 or imported from it; instead, it **MUST** be moved to a lower level (L1 or L2) so both can consume it |
| **Full Map**                | `L1 Foundation` (Button, Icon, Typography, Badge, Avatar...) → `L2 Forms` (Input, Select, Checkbox...) → `L3 Navigation` (Tabs, Breadcrumb, Pagination...) → `L4 Feedback` (Alert, Toast, Dialog, Tooltip...) → `L5 Data Display` (Card, Table, List, Accordion...) → `L6 Media/Overlay` → `L7 Enterprise/Composite` → `L8 UAEAF Domain Components`                                                                                                                                                                                                                                                                                                                           |
| **Alternatives Considered** | Ordering by production priority (most frequently used first) — rejected because it does not guarantee dependency readiness (e.g., documenting Data Table in L1 before Button means documenting a component that depends on a component not yet documented)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Why This Decision**       | Ensures that whenever a component is documented, **everything it depends on is already documented and stable** — no unresolved Forward References                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Risks**                   | An L8 (Sports) component may require a capability that does not exist in L1–L7 — Mitigation: add it as a new L1–L7 component **after Architecture Review** (not through an individual developer decision), then consume it in L8 rather than building it directly inside L8                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Consequences**            | Documentation order **MUST** follow L1→L8 without skipping levels; L5 cannot be documented before L2 even if it is easier. Shared Logic **MUST NOT** be created inside a higher level if it can be reused at a lower level — any cross-level reuse requirement **MUST** result in extracting the component/logic to the appropriate lower level, rather than duplicating it or importing it in reverse                                                                                                                                                                                                                                                                        |

---

## Do & Don't

**Do:** Reference this section from every new component instead of copying it · Apply §G.3 Performance Budget from the initial design stage · Follow the L1→L8 order (ADR-0013) when documenting any new level

**Don't:** Do not repeat Versioning/Testing/Analytics governance explanations inside individual component documentation.

## Success Metrics

* 100% of L2+ components reference this section instead of duplicating it.
* 0 components without `data-testid`.
* 100% of interactive components fully support keyboard navigation.
* 0 circular dependencies between component levels (ADR-0013).
* 0 duplicated Governance clauses (G.1–G.12) inside individual component documentation in L2–L8.

## References

**Normative References** *(enforce the rules):** Chapter 3 (§3.5, §3.6) · Chapter 6 (Accessibility) · Chapter 22 (General Governance)

**Implementation References** *(describe the current implementation):** React · Radix UI Primitives · shadcn/ui · Storybook

**Informative References** *(normative background, not a direct source of rules here):** WAI-ARIA Authoring Practices · WCAG 2.2 (the original source summarized by Chapter 6)

## Related Chapters

Every subsequent component section (L2–L8) depends directly on this section.

---

*This section concludes the general governance framework for Chapter 8 before moving to the documentation of L2 Forms Components.*

