# Chapter 8 — Component Inventory

## Level 4: Feedback Components (Feedback Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L4 of 8) | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                                                               | Used By                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Chapter 5 (Motion) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Button, Icon, Spinner) · Chapter 8 L2 (§F.3 Error Handling, §F.10 Submission) · Chapter 8 Global Governance | L5-L8 · Chapter 11 (UX Patterns) · Chapter 13 (CMS Workflow) |

## Scope

**Covers:** L4 as a complete **Feedback Foundation** (definition, taxonomy, severity, lifecycle, priority, queueing, accessibility, motion, focus, persistence, auto-dismissal, blocking, asynchronous validation, analytics boundaries, composition) + 17 feedback components.

**Does not cover:** Individual field messages (Error/Success Message → L2 §F.3), or the actual wording/content of individual messages (→ Chapter 9).

## Definitions

| Term                  | Definition                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Feedback**          | Any system communication to the user about the outcome of an action or a state — including success, failure, waiting, and warning |
| **Blocking Feedback** | Feedback that prevents any further interaction until the user responds to it (Critical Dialog)                                    |
| **Escalation Level**  | The degree of “interruption strength” for a feedback type, ranging from the lightest (Tooltip) to the strongest (Blocking Dialog) |

## Purpose

The **Feedback Foundation** is the single contract governing every system message across the platform — every component below **MUST** reference it and **MUST** be selected according to the appropriate escalation level rather than personal preference.

---

## ADR-0016: Feedback Escalation Model

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Authority**               | Product Decision (based on PR-001 Clarity Over Decoration)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Context**                 | 17 feedback components are expected across significantly different urgency levels. Without a clear hierarchy, each developer may choose a component based on personal preference, resulting in inconsistent experiences (e.g., Toast for a critical error, Dialog for a simple confirmation).                                                                                                                                                                                                                                                                                  |
| **Decision**                | A strict escalation hierarchy is established in order of interruption strength. The **lowest level sufficient for the situation MUST** be selected: `Tooltip → Inline Validation (L2 §F.3) → Alert → Toast → Banner → Dialog → Blocking Dialog`. Explicit rules: **MUST NOT** use Dialog when Alert is sufficient · **MUST NOT** use Toast for an error that prevents task completion · **MUST NOT** use Tooltip to display an error (visually unstable and not reliably accessible via touch) · **MUST NOT** use Banner to confirm a simple operation (excessive prominence). |
| **Alternatives Considered** | Leaving component selection to each team’s judgment based on the situation — rejected because it is a primary source of inconsistency in user experiences across large systems (direct observation from document review).                                                                                                                                                                                                                                                                                                                                                      |
| **Why This Decision**       | Direct application of PR-001 (Clarity Over Decoration, Chapter 2) — excessive escalation causes distraction, while insufficient escalation can hide critical information; a single rule resolves the appropriate level for every situation.                                                                                                                                                                                                                                                                                                                                    |
| **Risks**                   | Edge cases may not clearly map to a single level (e.g., an important but non-blocking warning). Mitigation: §FB.3 Severity is independent of §Escalation — severity (content criticality) and escalation (presentation strength) are separate dimensions that can be combined flexibly.                                                                                                                                                                                                                                                                                        |
| **Consequences**            | Every component below **MUST** explicitly declare its level on the escalation hierarchy in its documentation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

---

# Feedback Foundation — Shared Sections

### FB.1 Feedback Definition

**Feedback MUST** be limited to communicating a state or outcome to the user — it **MUST NOT** be used to request new data input (that belongs to L2) or for navigation (that belongs to L3).

### FB.2 Feedback Taxonomy

| Type              | Description                                                          | Examples                                             |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| **Passive**       | Information available only upon request; does not interrupt          | Tooltip                                              |
| **Informational** | Appears automatically but does not block interaction                 | Toast, Banner, Inline Message                        |
| **Blocking**      | Blocks interaction until the user responds                           | Dialog, Blocking Dialog                              |
| **System**        | General application state rather than feedback for a specific action | Loading State, Empty State, Error State (page level) |
| **Async**         | Accompanies an ongoing non-instant operation                         | Progress Bar, Circular Progress                      |

### FB.3 Feedback Severity

Independent of escalation (§ADR-0016):

`Info` · `Success` · `Warning` · `Error` · `Neutral`

Each severity **MUST** be mapped to a defined `color.semantic.*` token (Chapter 7), with no arbitrary colors.

### FB.4 Feedback Lifecycle

```text
Triggered → Displayed → (Interacted | Auto-dismissed | Timed-out) → Removed
```

### FB.5 Feedback Priority

When multiple feedback messages occur simultaneously, the **mandatory priority order** is:

`Blocking > System > Informational > Passive`

Higher-priority feedback **MUST** appear before or above lower-priority feedback, rather than simply being displayed according to arrival time.

### FB.6 Feedback Queueing

Feedback of the same type (multiple Toasts) **MUST** be queued rather than visually stacked on top of one another — **SHOULD** allow a maximum of 3 visible Toasts at the same time; remaining items wait in the queue.

### FB.7 Accessibility

Direct application of Chapter 6:

* **MUST** use `role="alert"` for Blocking/Error feedback or `role="status"` for Informational feedback.
* **MUST** use an appropriate `aria-live` value (`assertive` for critical feedback, `polite` for normal feedback).
* Dialog/Blocking Dialog **MUST** implement a complete Focus Trap (Chapter 6 §6.3).
* Feedback **MUST NOT** rely on color alone (Chapter 6 §6.2 — an icon accompanies every Severity).

### FB.8 Motion

Motion values are derived exclusively from Chapter 5 §5.6:

* Toast/Banner entry-exit ≈ 150–220ms
* Dialog/Modal open-close ≈ 220ms (`DT-MOTION-DURATION-BASE`)
* Tooltip/Popover ≈ 100ms

### FB.9 Focus Management

Blocking Feedback (Dialog) **MUST** move focus inside itself immediately upon appearing and restore focus to the triggering element when closed.

This follows the same pattern as Chapter 8 L3 §N.12, but applies to an Overlay rather than a Route.

### FB.10 Persistence

Toast/Snackbar **MUST NOT** persist across page reloads because they are inherently temporary states.

Banner **MAY** remain until manually dismissed, including across sessions, for persistent system warnings.

### FB.11 Auto-dismiss Contract

Toast/Snackbar **SHOULD** automatically dismiss after 4–6 seconds by default.

The countdown **MUST** pause when the pointer is hovering over it or when it has keyboard focus (Chapter 6: content must not be missed because of a rigid timeout).

Error/Blocking feedback **MUST NOT** auto-dismiss — explicit user interaction is always required.

### FB.12 Blocking Contract

Blocking Dialog **MUST** prevent any interaction with the rest of the interface (Backdrop + Focus Trap + **MUST NOT** close when clicking outside if it represents a critical, irreversible action).

This differs from a standard Dialog, which may be dismissible by clicking outside or pressing `Esc`.

### FB.13 Async Feedback Contract

For operations that take time (Progress Bar, file upload from L2):

**MUST** explicitly specify whether the operation is:

* `Determinate` — known percentage/progress
* `Indeterminate` — unknown duration

`Indeterminate` **MUST NOT** be presented as a fabricated percentage.

### FB.14 Feedback Analytics Boundary

Following the same principle as Chapter 8 L3 §N.16:

Any feedback component **MUST NOT** send Analytics directly.

It only emits events such as:

`onShow` / `onDismiss` / `onAction`

The application decides what to do with those events.

### FB.15 Composition

```text
<Feedback>
  ├── Icon (reflects Severity, §FB.3)
  ├── Title (optional depending on type)
  ├── Message
  ├── Actions (optional button(s))
  └── Dismiss Control (optional depending on §FB.11/§FB.12)
```

### FB.16 Feedback Deduplication Contract

Duplicate feedback — the same message occurring repeatedly in succession, e.g. `"Network Error" ×8` — **MUST** be merged rather than visually repeated.

**SHOULD** display a counter next to the same item, such as:

`Network Error (×8)`

instead of creating 8 separate Toast elements.

This integrates directly with §FB.6 Queueing.

### FB.17 Feedback Replacement Policy

Feedback representing successive states of the same operation (`Uploading...` → `Upload Complete`) **MUST** replace the same display slot rather than creating a new element beside the previous one:

```text
Pending Feedback → Resolved Feedback → Replace Same Slot
```

No additional standalone Feedback element should be created.

### FB.18 Feedback Ownership — Who Removes the Message?

| Component     | Responsible for Removal                   |
| ------------- | ----------------------------------------- |
| Toast         | Automatically by the system (§FB.11)      |
| Banner        | User (manual dismissal)                   |
| Dialog        | User (explicit action)                    |
| Progress      | The operation itself (completion/failure) |
| Loading State | Data Loader upon receiving the response   |

### FB.19 Retry Contract

For any failure that is retryable (Offline, Timeout, Server Error 500, Chunk Load Error — integrated with Chapter 8 L3 §N.18):

**MUST** explicitly define whether retrying:

* repeats **the exact same operation**, or
* starts **a new independent operation**.

No implicit behavior may differ from one failure case to another or from one developer implementation to another.

### FB.20 Feedback Stacking & Z-Order Contract

The `DT-ZINDEX-*` tokens (Chapter 3) define the **values**.

This section defines the **interaction policy** between feedback types when they coexist, which is more important than numerical ordering alone:

```text
Blocking Dialog (absolute highest) ↑
Dialog/Modal ↑
Command Palette/Drawer ↑
Popover ↑
Tooltip ↑
Toast ↑
Banner (outside the stack, part of page flow)
```

**Explicit interaction rules (MUST):**

* `Toast` **MUST NOT** receive focus ever.
* `Tooltip` **MUST NOT** be displayed above an open `Dialog` and should be automatically hidden.
* `Popover` **MUST** automatically close when its parent `Dialog` closes.

### FB.21 Feedback Interruptibility Contract

When high-priority feedback appears while lower-priority feedback is active (e.g., a Toast is running and a Blocking Dialog appears):

The automatic timers (§FB.11) of the lower-priority feedback **MUST** be temporarily suspended rather than silently continuing.

Critical example:

A Snackbar containing an `"Undo"` button **MUST NOT** expire while a Dialog is blocking its visibility; otherwise, the user may lose the opportunity to undo without being aware of it.

### FB.22 Feedback Source Boundary

Every feedback event **MUST** carry internal metadata identifying its source (`source`).

This metadata is not intended for user display; it is intended for the system for logging, analytics, routing (§FB.19), and diagnostics.

```text
source: 'validation' | 'api' | 'navigation' | 'permission' | 'realtime' | 'background-job' | 'offline' | 'system'
```

This **MUST** be available for every event emitted through §FB.14 Analytics Boundary.

### FB.23 Feedback Rate Limiting

Unlike §FB.16 Deduplication, which handles identical messages, this section addresses the **volume** of different events occurring within a short period.

Example: a live stream of tournament result updates generating dozens of events within seconds.

The Feedback Manager **MUST** enforce a maximum creation rate for non-blocking feedback.

Excess events **MAY** be merged into a single summarized message, such as:

> **12 new updates**

instead of displaying every event individually.

### FB.24 Cross-Tab Synchronization

Feedback that is **critical at the session level** rather than page-specific **MUST** synchronize across all open tabs belonging to the same authenticated session.

Examples:

* Session Expired
* Forced Logout
* Maintenance Mode
* Permission Revoked

**MUST NOT** display the warning in one tab while the other tabs continue operating silently as if nothing happened.

### FB.25 Feedback Idempotency

To prevent duplicate messages caused by genuinely duplicated server events — for example, a WebSocket sending the same event twice — this provides more reliable protection than text comparison (§FB.16), which may fail when wording varies slightly.

Every feedback event **SHOULD** carry a unique `eventId`, and the Feedback Manager **MUST** ignore any `eventId` that has already been processed.

---

# Passive / Overlay Feedback

## CMP-TOOLTIP-001 — Tooltip

**Escalation Level:** Lowest.

**Purpose:** Provides additional clarification when hovering over or focusing on an element, such as explaining an ambiguous icon.

**MUST NOT** contain information that is necessary to complete the task because it is not guaranteed to appear reliably on touch devices.

### Delay Contract — Prevents Flicker

* `Hover Delay` ≈ 500ms before appearing — prevents an intrusive immediate appearance when the pointer briefly passes over the element.
* `Focus Delay` = 0ms — appears immediately when focused via keyboard; waiting here harms accessibility.
* `Dismiss Delay` ≈ 0–100ms — disappears quickly when the pointer leaves.

**Related Governance:** FB.2 (Passive), FB.8 (100ms appearance motion), Chapter 6 (keyboard alternative through Focus, not Hover only).

## CMP-POPOVER-001 — Popover

**Purpose:** Additional interactive content associated with an element. Similar to a Tooltip, but contains interactive elements rather than text only.

**Related Governance:** Builds on the same foundation as Menu (Chapter 8 L3).

---

# Informational Feedback

## CMP-ALERT-001 — Alert

**Escalation Level:** After Inline Validation.

**Purpose:** An inline message within the page flow, rather than a floating element — typically a warning or message placed above a form or section.

**Variants:** Based on FB.3:

`Info / Success / Warning / Error / Neutral`

### Scope

The scope **MUST** be explicitly declared for every usage:

* `Field Group` — above a group of fields
* `Section` — above a page section
* `Page` — across the entire page
* `Panel` — inside a subordinate panel/card

Defining the scope prevents inconsistencies in size and placement between different implementations of the same component.

**Related Governance:** FB.7 (`role="alert"` for critical types).

## CMP-BANNER-001 — Banner

**Escalation Level:** After Toast.

**Purpose:** A wide message displayed at the top of the page for a persistent, general state such as scheduled maintenance or a connection outage.

**Difference from Alert:** Banner operates at the page/application level, while Alert is embedded within a specific section.

**Related Governance:** FB.10 (may persist across sessions).

## CMP-TOAST-001 — Toast

**Escalation Level:** After Alert.

**Purpose:** A transient, non-blocking notification, such as `"Saved successfully"`.

**MUST NOT** be used for an error that prevents task completion (ADR-0016).

**Related Governance:** FB.6 (Queueing), FB.11 (Auto-dismiss), FB.14.

## CMP-SNACKBAR-001 — Snackbar

**Purpose:** A special form of Toast that always includes an Undo action, such as:

> `"Player deleted. Undo?"`

**Difference from Toast:** Snackbar always contains an action button; Toast may contain text only.

**Related Governance:** Builds on CMP-TOAST-001 and FB.11 (the timer pauses when hovering over the Undo button).

---

# Blocking Feedback

## CMP-DIALOG-001 — Dialog

**Escalation Level:** After Banner.

**Purpose:** A general dialog requiring focused attention but remaining dismissible, either by clicking outside or pressing `Esc`.

**Related Governance:** FB.9 (Focus Management), Chapter 6 §6.3.

## CMP-CONFIRMATIONDIALOG-001 — Confirmation Dialog

**Purpose:** A specialized Dialog used to confirm an impactful action, such as deleting a club.

**Anatomy:** Message + Confirmation Button (Chapter 8 L1: may use the `Danger` variant depending on severity, ADR-0004) + Cancel Button.

**Behavior:** A destructive action such as deletion **MUST** only be executed after explicit confirmation and **MUST NOT** be accidentally confirmed by a default-focused action.

`Enter` **MUST NOT** automatically confirm irreversible actions.

**Related Governance:** Builds on CMP-DIALOG-001.

## CMP-MODAL-001 — Modal

**Escalation Level:** Higher than a simple Dialog.

**Purpose:** A window containing larger content or a complete form, such as registering a player from within the dashboard without leaving the current page.

**Difference from Dialog:** A Modal typically contains complex interaction, such as a complete L2 form, whereas a Dialog is intended for a simple message or decision.

**Related Governance:** FB.9, Chapter 8 L2 §F.10 (Form Submission Contract when containing a form).

## CMP-BLOCKINGDIALOG-001 — Blocking Dialog

**Escalation Level:** Absolute highest.

**Purpose:** A rare state that prevents all interaction until mandatory user response, such as session expiration or a critical system failure.

**MUST NOT** be dismissible by clicking outside or pressing `Esc` (FB.12).

**Related Governance:** Full FB.12 contract. Must be used with extreme restraint as the final level in ADR-0016.

## CMP-DRAWER-001 — Drawer (as Feedback / Detailed Content)

**Purpose:** A side panel used to display additional details without leaving the current context, such as quick player details from a list.

**Note:** The navigation Drawer is documented in Chapter 8 L3 (CMP-NAVDRAWER-001). This is a different use case: content/details rather than navigation.

**Related Governance:** FB.9, Chapter 5 §5.10.1 (Safe Area).

---

# Async Feedback

## CMP-PROGRESSBAR-001 — Progress Bar

**Purpose:** A linear visual representation of an ongoing operation, such as file upload (Chapter 8 L2).

**Variants:**

* `Determinate` — known percentage
* `Indeterminate` — continuous animation with unknown duration (FB.13)

### Cancellation Contract

For long-running operations that can be cancelled, such as uploading a large file:

```text
Uploading → Cancel (explicit user action) → Cancelled → Dismiss
```

The Cancel button **MUST** remain visible throughout the operation rather than being hidden.

The `Cancelled` state **MUST** be visually distinct from `Failed`:

* `Cancelled` = user intentionally stopped the operation.
* `Failed` = system or operational failure.

The FB.19 Retry behavior does not apply to `Cancelled` in the same way it applies to `Failed`.

**Related Governance:** FB.13, FB.18 (the operation itself is responsible for removal), Chapter 5 (GPU-only animation for `Indeterminate`).

## CMP-CIRCULARPROGRESS-001 — Circular Progress

**Purpose:** A circular version of the Progress Bar, used within compact spaces such as a loading button (Chapter 8 L1).

**Related Governance:** Builds on the same logic as CMP-PROGRESSBAR-001.

---

# System Feedback — Page Level

## CMP-EMPTYSTATE-001 — Empty State

**Purpose:** Represents a `"No content yet"` state, such as an empty club list before any club has been added.

**Anatomy:** Illustration/Icon + Message + Suggested Action (e.g., `"Add Your First Club"` button).

**Related Governance:** FB.15, Chapter 9 (Message Copy).

## CMP-ERRORSTATE-001 — Error State

**Purpose:** A page-level loading failure state, not an individual field error (that belongs to L2 §F.3).

**Difference from Alert:** Error State replaces the content entirely, while Alert is added above or within the existing content.

**Related Governance:** Integrates with Chapter 8 L3 §N.18 (Navigation Failure Contract) when the cause is a navigation failure.

## CMP-SUCCESSSTATE-001 — Success State

**Purpose:** A page-level success state, such as confirming completion of a major registration process.

**Related Governance:** FB.15.

## CMP-LOADINGSTATE-001 — Loading State (Page Level)

**Purpose:** The initial loading state for an entire page before data becomes available.

Uses Skeleton (Chapter 8 L1) rather than Spinner to establish expectations around the shape of the incoming content (Chapter 0 Discovery: preferred for content with a predictable structure).

**Related Governance:** Builds on CMP-SKELETON-001 (Chapter 8 L1) and Chapter 8 L3 §N.13 (Loading Navigation) when the state results from navigation.

---

# Do & Don't — L4 General

**Do:**

* Choose the lowest escalation level sufficient for the situation (ADR-0016) before beginning any design.
* Map every Severity to a defined Semantic Token (FB.3).

**Don't:**

* Do not use Dialog when Alert is sufficient.
* Do not use Toast for a blocking error.
* Do not use Tooltip to display an error.

---

# Success Metrics

* 17/17 L4 components explicitly classified on the escalation hierarchy (ADR-0016).
* 0 cases where Toast is used for an error that prevents task completion (verified in Chapter 23.7 reviews).
* 100% of Blocking Feedback implements a complete Focus Trap (FB.9).
* 0 feedback instances rely solely on color for differentiation (FB.7).
* 0 duplicate messages displayed visually without deduplication (FB.16).
* 100% of cancellable long-running operations expose a visible Cancel button (Progress Cancellation).
* 0 Toast components receive focus (FB.20).
* 100% of Auto-dismiss timers are actually suspended when higher-priority feedback appears (FB.21).
* 100% of emitted feedback events contain a `source` field (FB.22).
* 0 violations of the maximum feedback creation rate without aggregation (FB.23).
* 100% of session-critical feedback is synchronized across all open tabs (FB.24).
* 0 duplicate messages caused by an already-processed `eventId` (FB.25).

## References

**Normative:** Chapter 2 (PR-001) · Chapter 6 · Chapter 8 Global Governance

**Implementation:** Radix UI (Dialog, Toast, Tooltip, Popover primitives) · WAI-ARIA APG (Alert, Dialog patterns)

**Informative:** WCAG 2.2

## Related Chapters

Chapter 8 L1 (Button, Icon, Spinner, Skeleton) · Chapter 8 L2 (§F.3, §F.10) · Chapter 8 L3 (§N.12 Focus, §N.18 Failure) · Chapter 9 (Message Copy) · Chapter 11 (UX Patterns)

---

*End of L4 Feedback (Feedback Foundation FB.1-FB.25 + 17 components). Next: L5 Data Display Components.*
