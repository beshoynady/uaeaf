# Chapter 8 — Component Inventory

## Level 3: Navigation Components (Navigation Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L3 of 8) | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                      | Used By                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Chapter 5 (Motion Tokens) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Icon, Button) · Chapter 8 Global Governance | L4-L8 · Chapter 11 (UX Patterns) · Chapter 12 (Dashboard Navigation) · Chapter 20 (Page Templates) |

## Scope

**Covers:** L3 as a complete **Navigation Foundation**, including navigation definition, taxonomy, states, routing contract, keyboard interaction, responsiveness, accessibility, motion, persistence, and composition, plus 14 individual navigation components.

**Does Not Cover:** Page content itself (→ L5 Data Display), or multi-step navigation patterns composed at the application level (→ Chapter 11).

---

## Definitions

| Term                | Definition                                                                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Navigation**      | Any UI element whose purpose is to move between different application states, pages, or sections — **not** to perform an action on the current data.                                                                                                   |
| **Current Route**   | An abstract representation of the user's current location within the application (a logical path, not necessarily a browser URL).                                                                                                                      |
| **Roving Tabindex** | A WAI-ARIA interaction pattern where only one item within a group (e.g., a menu or tab list) has `tabindex="0"` at any given time, while the remaining items have `-1`; navigation between them occurs using directional arrow keys rather than `Tab`. |

## Purpose

The **Navigation Foundation** is the single contract governing navigation behavior across the entire platform. Every component below **MUST** reference this foundation and **MUST NOT** redefine State, Keyboard, or Accessibility behavior independently.

---

# ADR-0015: Navigation Architecture & Routing Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Authority**               | Engineering Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Context**                 | 14 navigation components will be used across the public website and dashboard (Chapter 0: Dual Experience). A unified navigation philosophy is therefore required before documenting individual components, particularly given UAEAF's multiple modules (Players / Clubs / Competitions).                                                                                                                                                                                                                                                                                                                                                          |
| **Decision**                | (1) Navigation is divided into three semantically independent layers (§N.2): **Application / Context / Workflow**. (2) The Design System is responsible only for the **navigation UI and its behavior**, not the routing library itself — with no direct dependency on React Router or Next.js Router. (3) All L3 components operate against an abstract **Current Route / Navigation State** concept rather than a specific router. (4) Deep Linking and History Integration (Back/Forward) are part of the behavioral contract defined here, while their actual implementation is the responsibility of the application layer, not this chapter. |
| **Alternatives Considered** | Directly coupling navigation documentation to Next.js Router (which is currently used in the project, Chapter 0) — rejected because it would violate the reusable, technology-agnostic principle of the Enterprise Design System Framework (Chapter 0). The documentation therefore remains technically agnostic, while the actual application (Chapter 21) integrates it with Next.js.                                                                                                                                                                                                                                                            |
| **Why This Decision**       | Separates **"navigation appearance and behavior"** (this chapter) from **"the actual routing mechanism"** (application responsibility) — applying the same principle as ADR-0014, which separates the Design System from the Form State Library, to navigation.                                                                                                                                                                                                                                                                                                                                                                                    |
| **Risks**                   | Potential ambiguity around "where the Design System contract ends and application logic begins" in complex scenarios such as Deep Linking with permissions. **Mitigation:** §N.4 Routing Contract defines the boundaries precisely for each case.                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Consequences**            | Every navigation component below **MUST** consume `currentRoute`/`activeItem` as an abstract Prop and **MUST NOT** import a Router SDK directly within the presentation layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

# Navigation Foundation — Shared Sections

**Inherited by every component below.**

## N.1 Navigation Foundation — Definition

**Navigation MUST** be limited to elements whose purpose is to move between states or pages.

**Navigation MUST NOT** include actions performed on data, such as saving or deleting — these belong to Form Actions / Dialog Actions in L2/L4 — even if they are visually presented as buttons inside a top navigation bar.

### The boundary is:

> Does the click change **where I am?** → Navigation
> Or does it change **something in the data?** → Action

---

## N.2 Navigation Taxonomy — Central Architectural Decision

Every L3 component below **MUST** be classified under one of the following three layers, and this classification **MUST** be explicitly stated in its documentation:

| Layer                      | Description                                                                                                                 | Component Examples                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Application Navigation** | Primary navigation between completely independent modules, such as Players, Clubs, Competitions, and News.                  | Sidebar, Navigation Rail, Top Navigation Bar, Mega Menu        |
| **Context Navigation**     | Navigation within a single module or context, such as player-profile tabs or sections within a competition page.            | Tabs, Breadcrumb, Tree View, Accordion (as content navigation) |
| **Workflow Navigation**    | Sequential navigation through mandatory, ordered steps, such as player registration, result approval, or multi-step review. | Stepper                                                        |

### Rule

**MUST NOT:** A component from one layer may not be used to perform the function of another layer.

**Example:**
**Tabs MUST NOT** be used to represent mandatory sequential Workflow steps — this is exclusively the responsibility of **Stepper**.

---

## N.3 Navigation State Model

Every interactive navigation component inherits the same state model rather than defining its own:

```text
Inactive → Hover → Focused → Active → Expanded (if branching exists) → Collapsed → Disabled
```

---

## N.4 Routing Contract

| Concept                          | Rule                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Active Route**                 | Every navigation component **MUST** receive `currentRoute`/`activeItem` as an abstract Prop and **MUST NOT** import a Router SDK inside the component — per ADR-0015.                                          |
| **Nested Route**                 | Hierarchical components such as Sidebar and Tree View **MUST** support nested-route activation, where a parent item appears "partially active" when one of its children represents the current route.          |
| **Deep Link**                    | Every navigation state **SHOULD** be directly accessible through a link; no navigation state should be "hidden" and accessible only through progressive browsing. Actual implementation belongs to Chapter 21. |
| **External Link**                | Any external link **MUST** have a clear visual distinction (icon) and use `target="_blank"` + `rel="noopener noreferrer"`.                                                                                     |
| **Unsaved Changes**              | Navigating away from a form containing unsaved changes (Chapter 8 L2 §F.2.1 `Dirty=true`) **MUST** warn the user before proceeding — through direct L2/L3 integration.                                         |
| **Route Restore / Back-Forward** | Navigation **SHOULD** respect standard browser Back/Forward behavior and **MUST NOT** break it through custom logic unless there is a documented necessity.                                                    |

---

## N.5 Keyboard Navigation

*(Equivalent to F.8 in L2)*

| Key            | Behavior                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `Arrow Keys`   | Navigate between items within a single navigation group using Roving Tabindex.                                  |
| `Home` / `End` | Jump to the first/last item in the group.                                                                       |
| `Esc`          | Close any overlay navigation such as Dropdown, Menu, or Command Palette.                                        |
| `Tab`          | Move between different navigation groups, not within a single group — arrow keys handle intra-group navigation. |
| `Type-ahead`   | Jump to an item beginning with the typed character, intended for long lists such as Menu and Command Palette.   |

---

## N.6 Responsive Navigation

| Layer                      | Desktop                 | Tablet                      | Mobile                                |
| -------------------------- | ----------------------- | --------------------------- | ------------------------------------- |
| **Application Navigation** | Fixed, expanded Sidebar | Collapsible Sidebar (Rail)  | Drawer hidden behind a Menu button    |
| **Context Navigation**     | Full horizontal Tabs    | Horizontal Tabs with Scroll | Scrollable Tabs or a compact Dropdown |

This behavior is defined **once here** and **MUST NOT** be redefined within individual component documentation.

---

## N.7 Navigation Accessibility

Direct application of Chapter 6 to navigation:

* **MUST** use `<nav>` with a descriptive `aria-label` for each independent navigation region.
* **MUST** use `aria-current="page"` for the active item.
* **MUST** use `aria-expanded` for collapsible items.
* **MUST** use `aria-controls` to associate the trigger with the content it controls.
* **MUST** use `aria-haspopup` for any element that opens a menu or submenu.

---

## N.8 Navigation Motion Rules

All values below **MUST** be derived from Chapter 5 §5.6 (Motion Tokens). No new arbitrary values may be introduced:

| Component               | Duration | Token                        |
| ----------------------- | -------: | ---------------------------- |
| Drawer (Open/Close)     |    220ms | `DT-MOTION-DURATION-BASE`    |
| Sidebar Collapse/Expand |    150ms | `DT-MOTION-DURATION-FAST`    |
| Accordion               |    150ms | `DT-MOTION-DURATION-FAST`    |
| Menu/Dropdown (Open)    |    100ms | `DT-MOTION-DURATION-INSTANT` |

### Accessibility Rule — Not Merely a Motion Rule

All navigation motion above (Drawer, Sidebar, Accordion, Menu) **MUST** be fully disabled when `prefers-reduced-motion` is enabled.

The transition must occur instantly without animation while preserving complete functionality.

This is the explicit application of Chapter 5 §5.8 to every navigation component rather than relying on an implicit assumption.

---

## N.9 Navigation Persistence

| Question                                                           | Default Decision                                                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Should the Sidebar remain collapsed after Refresh?                 | **SHOULD** — Yes. Persist locally, similar to accessibility preference persistence in Chapter 6 §6.9. |
| Should the last active Tab be restored when returning to the page? | **MAY** — Context-dependent. No globally mandatory state is required for Context Navigation.          |
| Should the last Module be remembered on the next visit?            | **MAY** — To improve repeated-use experiences, particularly within the dashboard.                     |
| Should Tree View remain Expanded?                                  | **SHOULD** — Yes within the same session; **MAY** persist across sessions.                            |

---

## N.10 Navigation Composition

*(Equivalent to `<Field>` in L2)*

```text
<Navigation>
  ├── Header (Logo / Section Title)
  ├── Section (Logical Grouping)
  ├── Group (Related Items)
  ├── Item (Individual Navigation Item)
  ├── Submenu (Branch)
  └── Footer (Secondary Actions, e.g. Sign Out)
```

Every hierarchical navigation component — Sidebar, Menu, Mega Menu — **MUST** be built using this Compound Component structure (Chapter 8 G.11) rather than duplicating custom structures.

---

## N.11 Navigation Event Lifecycle

The single reference lifecycle for any navigation operation.

It is consumed by Sidebar, Tabs, Drawer, Breadcrumb, and Command Palette rather than having each component define its own lifecycle:

```text
Idle
  → Navigation Requested
  → Guard Check (§N.14)
  → Allowed | Blocked
  → Loading (if applicable, §N.13)
  → Route Changed
  → Focus Restoration (§N.12)
  → Completed
```

---

## N.12 Focus Restoration

After any navigation completes (`Route Changed`):

Focus **MUST** move to either:

* the **Main Heading**, or
* the **Main Landmark**

of the new page.

Focus **MUST NOT** remain trapped on the previous navigation element, such as the Sidebar link that was clicked.

This is a direct application of WAI-ARIA Best Practice and prevents screen-reader users from losing page context after each navigation.

---

## N.13 Loading Navigation Contract

```text
Pending Route → Visual Loading State → Completed
```

The visual state displayed while navigation is pending **MUST** be explicitly defined for each context. It **MUST NOT** be left to default behavior.

* A full page transition **SHOULD** use a Skeleton (Chapter 8 L1) for the main content.
* A fast secondary navigation action **MAY** use a lightweight Progress indicator on the navigation bar itself without freezing the entire page.

### Cancellation Rule

Navigation **MUST** remain cancellable until `Route Changed` actually occurs.

Example:

If the user selects "Players" and immediately selects "Events", the **latest user intent MUST be executed**, rather than the first request that arrived.

This prevents navigation **Race Conditions**, particularly when route changes trigger data loading.

---

## N.14 Route Guard Contract

Every navigation request **MUST** pass through a unified validation sequence before actual execution.

Individual Modules **MUST NOT** implement their own isolated guard logic:

```text
Navigation Request
  → Permission Guard
  → Unsaved Changes Guard (§N.4)
  → Feature Flag Guard
  → Maintenance Guard
  → Navigate
```

Any Guard that rejects the request **MUST** produce a clear `Blocked` state according to §N.11, with a user-understandable reason.

**Silent failures are NOT permitted.**

---

## N.15 Scroll Restoration Policy

When the route changes:

* Navigating to a completely new page **SHOULD** reset the scroll position to the top by default.
* Going **Back** to a previous page **SHOULD** restore the scroll position the user had before leaving it.

A single unified policy **MUST** be applied across all pages rather than allowing each page to define its own behavior independently.

---

## N.16 Navigation Analytics Boundary

Applying the same principle as ADR-0015 to Analytics:

No navigation component **MUST** send Analytics data directly from within itself.

Instead, the component **MUST** emit an `onNavigate` event, consistent with Chapter 8 Governance §G.5.

The application layer decides what to do with the event:

* Tracking
* Analytics
* Nothing

### Accuracy Rule

The component **MUST NOT** implicitly assume that navigation succeeded.

Therefore:

```text
onNavigateRequested ≠ onNavigateCompleted
```

The emitted events **MUST** be multiple and explicitly defined:

```text
Requested
Blocked
Completed
```

rather than a single generic event that hides what actually occurred.

---

## N.17 Active Route Matching Rules

Determining whether a navigation item is "active" **MUST** follow one explicitly declared strategy per component.

Three strategies are available:

| Type                       | Example                                                                                                              | Typical Use                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Exact Match**            | `/players` is active only when the current route is exactly `/players`.                                              | Independent top-level Sidebar items. |
| **Partial / Prefix Match** | `/players` is also considered active at `/players/123`.                                                              | Items containing child pages.        |
| **Nested Match**           | A parent item appears "partially active" with lighter visual emphasis when one of its children is the current route. | Tree View, multi-level Sidebar.      |

### Rule

Every hierarchical navigation component **MUST** explicitly declare the matching strategy it uses in its documentation.

No implicit assumption that varies between developers is permitted.

---

## N.18 Navigation Failure Contract

The final gap in the navigation lifecycle (§N.11) is what happens when the loading process itself fails, rather than when a Guard blocks navigation (§N.14):

```text
Loading
  → Succeeded
  | Failed
      ├── Server Error
      ├── Timeout
      ├── Chunk Load Error
      └── Offline

Failed
  ↓
Retry | Return to Previous Route | Offline Message
```

Any route-loading failure **MUST NOT** leave the user facing a hanging screen, such as an indefinitely spinning Spinner.

The system **MUST** either:

* display an error message with a Retry option, or
* automatically return to the previous valid route,

depending on the nature of the failure.

---

## N.19 Navigation Authorization Boundary

### Visibility Contract

This differs from the Route Guard in §N.14:

* **Route Guard:** controls **entry**.
* **Visibility Contract:** determines **whether the navigation item appears in the first place**.

| Condition                                            | Behavior                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| User does not have permission to view the Module     | **MUST NOT** display the navigation item at all.                                          |
| User can see the item but lacks execution permission | **MAY** display it as Disabled with a clear reason, according to product policy.          |
| Feature Flag is disabled                             | **MUST** completely hide the item from navigation.                                        |
| Maintenance Mode                                     | **MAY** display it with an "Currently Unavailable" badge if the product chooses to do so. |

### Rule

Every hierarchical navigation component, such as Sidebar and Menu, **MUST** evaluate the Visibility Contract **before** the functional Route Guard.

There is no value in guarding a route for an item that should never have been visible in the first place.

This ensures consistent **visibility/hiding** behavior across the entire platform rather than allowing different developers to implement inconsistent logic where a Module appears for one user and disappears for another.

---

# Application Navigation

## CMP-SIDEBAR-001 — Sidebar

**Purpose:** Primary navigation between dashboard modules (Operational Experience, Chapter 0).

**Taxonomy:** Application Navigation.

**Anatomy:** Follows N.10 exactly.

**Variants:**

* `Expanded`
* `Collapsed` — icons only
* `Overlay` — displayed over content on smaller screens

**Behavior:**
The collapsed state **MUST** be persisted according to N.9.

**Related Governance:**
Complete Navigation Foundation (N.1-N.10) + Chapter 8 Governance G.9/G.12.

---

## CMP-NAVRAIL-001 — Navigation Rail

**Purpose:** A compact version of the Sidebar for medium-sized screens (Tablet), displaying icons only without persistent labels.

**Taxonomy:** Application Navigation.

**Difference from Sidebar Collapsed:**
The Rail is an intentional, independent design state rather than a temporary "collapsed" state of the Sidebar.

**Related Governance:**
Builds upon N.3/N.5/N.7.

---

## CMP-TOPNAV-001 — Top Navigation Bar

**Purpose:** Horizontal top navigation for the public website (Public Experience).

**Taxonomy:** Application Navigation.

**Anatomy:**

* Logo
* Primary navigation links
* Language Switcher (Chapter 4)
* Accessibility Settings button (Chapter 6)

**Behavior:**
The bar **MUST** remain Sticky while scrolling, according to Chapter 5 §5.10.2 Z-Index Layering, with the smooth hide/show behavior defined in Chapter 5.

**Related Governance:**
N.6 — On Mobile, it transforms into a Hamburger button that opens the Navigation Drawer.

---

## CMP-MEGAMENU-001 — Mega Menu

*Optional depending on project needs*

**Purpose:** A multi-column expanded navigation menu for a content-rich public website, should the project require it in the future for sub-sport classifications, for example.

**Status:** `Experimental` (Chapter 8 G.2) — not currently required by any documented Workflow.

**Taxonomy:** Application Navigation.

---

# Context Navigation

## CMP-BREADCRUMB-001 — Breadcrumb

**Purpose:** Display the user's current hierarchical location, for example:

```text
Home > Clubs > Club Name
```

**Taxonomy:** Context Navigation.

**Anatomy:** A sequence of links separated by a directional separator, which automatically mirrors in RTL.

**Accessibility:**

**MUST** use:

```html
<nav aria-label="Breadcrumb">
```

The final item, representing the current page:

* **MUST NOT** be an actual link.
* **MUST** be plain text with `aria-current="page"`.

**Related Governance:** N.7.

---

## CMP-TABS-001 — Tabs

**Purpose:** Navigate between alternative content sections within the same context, such as Player Profile tabs:

```text
Overview / Results / Statistics
```

**Taxonomy:** Context Navigation.

**MUST NOT** be used as Workflow navigation — see N.2.

**Keyboard Interaction:**

* Directional arrow keys navigate between tabs using Roving Tabindex.
* `Enter` / `Space` activates the tab when activation is not immediate on arrow navigation.

**Related Governance:** N.2 (Taxonomy), N.5.

---

## CMP-ACCORDION-001 — Accordion

**Purpose:** Expand and collapse long content sections, such as FAQs or regulation details.

**Taxonomy:** Context Navigation.

**Behavior:**
**MAY** allow multiple sections to remain open simultaneously or restrict the interface to one open section at a time. This is determined per use case.

**Accessibility:**
Every section header **MUST** include `aria-expanded`.

**Related Governance:** N.3, N.7, N.8 (150ms).

---

## CMP-TREEVIEW-001 — Tree View

**Purpose:** Display hierarchical data that can be navigated, such as sub-sport classifications or committee structures.

**Taxonomy:** Context Navigation.

**Keyboard Interaction:**

* `→` / `←` opens or collapses a node.
* `↑` / `↓` navigates between visible nodes.

**Related Governance:** N.9 (Expanded state persistence), N.10.

---

# Workflow Navigation

## CMP-STEPPER-001 — Stepper

**Purpose:** Represent mandatory sequential steps, such as registering a new player or approving a result through multiple stages.

**Taxonomy:** Workflow Navigation **exclusively**.

According to N.2:

> It must never be replaced by Tabs when the steps are mandatory and sequential.

**Anatomy:** A sequence of numbered circles connected by a line, with each circle representing a step.

**States per Step:**

* `Upcoming` — not yet reached
* `Current` — current step
* `Completed` — completed
* `Error` — contains an error

**Behavior:**
The component **MUST** prevent users from jumping to a later step before completing the current step unless the Workflow explicitly permits free navigation.

**Related Governance:**
N.2, Chapter 8 L2 §F.10 (Form Submission Contract for every step containing a form).

---

# Overlay Navigation

## CMP-MENU-001 — Menu

**Purpose:** A list of actions or links displayed when a trigger is activated, such as a "More" button.

**Taxonomy:** May serve any layer depending on context as a general-purpose tool.

**Keyboard Interaction:**
Full N.5 behavior:

* Arrow Keys
* Type-ahead
* Esc

**Accessibility:**

The trigger **MUST** include:

```html
aria-haspopup="menu"
```

The menu **MUST** use:

```html
role="menu"
```

**Related Governance:** N.8 (100ms open duration).

---

## CMP-DROPDOWNMENU-001 — Dropdown Menu

**Purpose:** A specialized form of Menu that is always anchored to a specific trigger element rather than functioning as a general floating menu.

**Difference from Menu:**
Its position is always constrained to the trigger element through Popover positioning.

**Related Governance:**
Builds upon CMP-MENU-001.

---

## CMP-CONTEXTMENU-001 — Context Menu

**Purpose:** A menu displayed through a right-click or long-press interaction on touch devices.

**Difference from Menu:**
It is triggered by a contextual event:

```text
Right-click / Long-press
```

rather than by directly clicking a trigger button.

**Accessibility:**

A complete keyboard-accessible alternative **MUST** be provided, such as a permanently visible "Options" button.

The Context Menu **MUST NOT** be the only way to access an action, according to Chapter 6 §POUR Operable.

**Related Governance:**
Builds upon CMP-MENU-001.

---

## CMP-NAVDRAWER-001 — Navigation Drawer

**Purpose:** An Overlay version of the Sidebar intended for Mobile, according to N.6.

**Taxonomy:** Application Navigation.

**Behavior:**

It **MUST** close:

* when clicking outside it, or
* when pressing `Esc`.

A complete Focus Trap **MUST** also be applied while it is open.

**Related Governance:** N.8 (220ms), Chapter 5 §5.10.1 Safe Area.

---

## CMP-COMMANDPALETTE-001 — Command Palette

**Purpose:** Fast keyboard-driven search for navigation and actions using a global shortcut such as:

```text
Cmd/Ctrl + K
```

It is a productivity tool for operational users (Chapter 0: Operational Experience).

**Taxonomy:**
A general-purpose tool serving both Application Navigation and Context Navigation.

**Behavior:**
Builds upon:

* CMP-COMBOBOX-001 (Chapter 8 L2)
* N.5 Type-ahead

**Related Governance:** Chapter 8 L2 (Combobox), N.5, Chapter 16 (AI Search — a natural future integration point).

---

# CMP-PAGINATION-001 — Pagination

**Purpose:** Navigate between paginated result sets, such as:

* Club lists
* Results
* News

**Taxonomy:** Context Navigation.

**Variants:**

* `Numbered` — numbered pages
* `Load More` — additional content loading button
* `Infinite Scroll` — automatic loading during scrolling; use cautiously according to Chapter 8 Governance G.3 Performance

**Accessibility:**

**MUST** use descriptive labels such as:

```html
aria-label="Next"
aria-label="Previous"
```

The current page **MUST** use:

```html
aria-current="page"
```

**Related Governance:** N.5, N.7.

---

# Do & Don't — L3 General

### Do

* Classify any new navigation component under N.2 **before** designing it.
* Use **Roving Tabindex** for any horizontal or vertical navigation group where applicable.

### Don't

* Do not use **Tabs** to represent mandatory sequential steps; use **Stepper**.
* Do not create a "hidden" navigation state that cannot be reached through **Deep Linking**.

---

# Success Metrics

* **14/14** L3 components are clearly classified within the N.2 Navigation Taxonomy.
* **100%** of navigation components support Roving Tabindex where applicable under N.5.
* **0** use of Tabs in mandatory Workflow contexts, verified during Chapter 23.7 reviews.
* **100%** integration with Chapter 8 L2 §Unsaved Changes when forms are involved.
* **100%** of navigation operations restore focus to the Main Landmark according to N.12, with zero cases of trapped focus.
* **0** navigation components send Analytics directly; according to N.16, they emit `onNavigate` only.
* **100%** of navigation motion defined in N.8 is disabled when `prefers-reduced-motion` is enabled.

---

# References

### Normative

* Chapter 5 (§5.6 Motion)
* Chapter 6 (§6.3, §6.4)
* Chapter 8 Global Governance

### Implementation

* WAI-ARIA APG (Menu, Tabs, Tree View patterns)
* Radix UI (NavigationMenu, Tabs, DropdownMenu primitives)

### Informative

* WCAG 2.2

---

# Related Chapters

* Chapter 5
* Chapter 6
* Chapter 8 L1/L2/Global Governance
* Chapter 11 (UX Patterns)
* Chapter 12 (Dashboard Navigation)
* Chapter 20 (Page Templates)

---

*End of L3 Navigation — Navigation Foundation N.1-N.10 + 14 Components.*

**Next: L4 — Feedback Components.**
