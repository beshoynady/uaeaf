# Chapter 8 — Component Inventory

## Level 5: Data Display Components (Data Display Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L5 of 8) | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                                                                                                                | Used By                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chapter 5 (Motion, Grid) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Skeleton, Badge, Avatar) · Chapter 8 L3 (Pagination documented there, Tree View/Accordion documented there) · Chapter 8 L4 (Empty/Error/Loading State) | L7 (Enterprise Components: Data Toolbar, Filters) · L8 (Sports Components: Results Table, Medal Table) · Chapter 12 (Dashboard Patterns) · Chapter 13 (CMS Listings) |

## Scope

**Covers:** L5 as the complete **Data Display Foundation** (definition, taxonomy, density, responsiveness, sorting, filtering, search, selection, state integration, live updates, virtualization, accessibility, analytics, composition) + the centralized **Data State Contract** + the actual data display components.

**Does Not Cover:** Full Pagination (documented in L3 §CMP-PAGINATION-001), Tree View and Accordion (documented in L3 as Context Navigation), advanced filtering tools as a standalone interface (→ L7 Filter Bar).

## Definitions

| Term                 | Definition                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Stale Data**       | Data that was previously correct but may no longer be up to date (e.g., the result of an outdated cache).                    |
| **Partial Data**     | A response that has arrived but is incomplete (some fields failed to load while others succeeded).                           |
| **Offline Snapshot** | The most recently known local data displayed while the connection is unavailable.                                            |
| **Density**          | The amount of vertical/horizontal spacing within a data display element — affecting how many rows/items are visible at once. |

## Purpose

The **Data Display Foundation** is the single contract governing how any dataset is presented across the platform. Unlike L2/L3/L4, its central concern is not a single interaction, but the **Data State Contract**: how any display component behaves under every possible state of the underlying data.

---

## ADR-0017: Data Display Architecture & Data State Contract

| Field                       | Details                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                             |
| **Authority**               | Engineering Decision                                                                                                                                                                                                                                                                                                                 |
| **Context**                 | L5 serves the largest number of screens (all club lists, players, results, and CMS dashboards). It therefore requires a unified contract for data states before defining any individual component; otherwise, each screen will handle “no data yet” or “stale data” differently.                                                     |
| **Decision**                | Every data display component **MUST** explicitly define its behavior for each state in the unified **Data State Contract**: `Loading → Empty \| Populated → Partial \| Stale \| Live-Updating → Error → Offline Snapshot`. No component **MUST NOT** assume that data is “always complete and up to date” as its only default state. |
| **Alternatives Considered** | Allowing each component (Table, Card, Timeline) to define its states independently — rejected because it produces an inconsistent experience (some tables show Skeleton, others Spinner, for the same loading state).                                                                                                                |
| **Why This Decision**       | It unifies the experience across all L5 components and makes integration with L4 (Empty/Error/Loading State) automatic rather than a repeated decision.                                                                                                                                                                              |
| **Risks**                   | Additional complexity for simple components that do not need every state (e.g., a static Description List). **Mitigation:** Non-applicable states **MAY** be explicitly omitted instead of being forcibly implemented — documentation must state which states apply to each component.                                               |
| **Consequences**            | Every component section below **MUST** contain an explicit “Data State Behavior” table.                                                                                                                                                                                                                                              |

---

# Data Display Foundation — Shared Sections

### DD.1 Data Display Definition

**Data Display MUST** be limited to displaying existing data — it **MUST NOT** include entering new data (that belongs to L2) or navigation between independent pages (that belongs to L3), even if it contains clickable elements (e.g., clicking a table row to navigate to details is an integration with L3, not an L5 function itself).

### DD.2 Display Taxonomy

| Type                | Description                                       | Examples               |
| ------------------- | ------------------------------------------------- | ---------------------- |
| **Tabular**         | Structured rows/columns                           | Table, Data Grid       |
| **Collection**      | Repeated items with a consistent visual structure | List, Card Grid        |
| **Hierarchical**    | Nested data                                       | Tree View → L3         |
| **Temporal**        | Time-related data                                 | Timeline               |
| **Summary**         | Compact number/indicator                          | Statistic Card, Metric |
| **Structured Pair** | Key-value representation                          | Description List       |

### DD.3 Density Model

`Comfortable` (comfortable spacing, public website) · `Compact` (higher density, dashboard — Chapter 0 ADR-0001 Dual Experience) — the same principle from Chapter 8 L1 §Visual Density applies here and is mandatory for every L5 component specifically.

### DD.4 Responsive Display Strategy

A complex table (many columns) **SHOULD** switch to a card-based display (Card List) below `md` (Chapter 5 §5.10 Reflow) — horizontal scrolling should not be the sole default solution.

### DD.5 Sorting Contract

There **MUST** be a clear visual indicator for the active sort column and its direction (ascending/descending) · Sorting **MUST** be announced to screen readers (`aria-sort`) · Multi-column sorting **MAY** be supported with an explicitly declared priority order (a small number beside each sorted column).

### DD.6 Filtering Contract

Active filters **MUST** be visible and summarized above the data (integrates with L1 Chip) — no “hidden” filter may change the results without a visible indication. Clearing filters **MUST** be a single, clearly identifiable action (“Clear All”).

### DD.7 Searching Contract

Search within a data display (not a full search page) **MUST** consume `CMP-SEARCHINPUT-001` (Chapter 8 L2) directly — search behavior must not be redefined independently.

### DD.8 Pagination Contract

Pagination is consumed directly from Chapter 8 L3 §CMP-PAGINATION-001 — it **MUST NOT** be redefined here. The only local decision for each component is which Variant (`Numbered` / `Load More` / `Infinite Scroll`) best fits its context.

### DD.9 Selection Model

| Pattern    | Usage                                                    |
| ---------- | -------------------------------------------------------- |
| `None`     | Display only, no selection                               |
| `Single`   | Selecting one item (opening details)                     |
| `Multiple` | Selecting multiple items (Bulk Actions, delegated to L7) |

The selection state **MUST** be clearly visible (distinct background + Checkbox for Multiple), rather than relying on subtle color alone (Chapter 6 §6.2).

**Selection Persistence Policy (MUST):** Selection — especially `Multiple` — **MUST** persist through sorting (§DD.5), filtering (§DD.6), and page changes (§DD.8) as long as the selected items still logically exist. Selection **MUST NOT** be lost merely because the display changed. This **MUST** rely on §DD.17 Display Identity (not row/page index) to achieve this.

### DD.10 Data State Contract (Central Principle — See ADR-0017)

```text
Loading → Empty | Populated → (Partial | Stale | Live-Updating applies to Populated) → Error → Offline Snapshot
```

| State                | Unified Default Behavior                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Loading**          | Skeleton (Chapter 8 L1) matching the expected content structure exactly — no Spinner for tabular/collection data displays.     |
| **Empty**            | Consumes `CMP-EMPTYSTATE-001` (Chapter 8 L4).                                                                                  |
| **Populated**        | Normal, complete display.                                                                                                      |
| **Partial**          | **MUST** provide a clear visual indication for missing fields/rows (not silent empty space that appears to be a design error). |
| **Stale**            | See the detailed §DD.11 Data Freshness Contract.                                                                               |
| **Live-Updating**    | **MUST** update smoothly (no layout jump, Chapter 5 CLS) when new data arrives.                                                |
| **Error**            | Consumes `CMP-ERRORSTATE-001` (Chapter 8 L4) + Retry Contract (Chapter 8 L4 §FB.19).                                           |
| **Offline Snapshot** | **MUST** explicitly indicate “Locally cached data; may not be up to date” — it must not be presented as live data.             |

**Independent Component Lifecycle (Partial Rendering, MUST):** On a page containing multiple independent data display components (e.g., Statistic Cards + Table on the same screen), each component **MUST** have its own Data State lifecycle rather than being forcibly synchronized. Ready statistics (`Populated`) **MUST** appear as soon as they are available even if the adjacent table is still `Loading`. The page **MUST NOT** wait for the slowest component before displaying anything (violates PR-002 Performance First).

### DD.11 Refresh & Live Update Contract (Data Freshness)

Manual refresh (Refresh button) **MUST** preserve the current scroll position and selection (§DD.9) whenever possible. Live updates (WebSocket/Polling) **MUST** follow Chapter 8 L4 §FB.25 Idempotency to prevent duplicate rows when the same event arrives twice.

**Full Freshness Contract (MUST be explicitly represented, not just Stale):**

| Element          | Rule                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Last Updated`   | A relative timestamp (“5 minutes ago”) **MUST** be visible for any data that may become stale.                                                              |
| `Refreshing`     | Transitional state during refetch — **MUST NOT** hide existing data during refresh (show a subtle indicator over it instead of replacing it with Skeleton). |
| `Auto Refresh`   | **MAY** be used for live results dashboards, with a user-visible interval (e.g., “Updates every 30 seconds”).                                               |
| `Manual Refresh` | **MUST** always be available as an explicit option even when Auto Refresh is enabled.                                                                       |

### DD.12 Huge Dataset Strategy

Large datasets **MUST** be handled using one of the following strategies rather than Pagination alone as a universal default:

| Strategy                       | When to Use                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pagination** (§DD.8)         | Default for most lists — clear segmentation for the user.                                                                                                           |
| **Virtualization / Windowing** | Dense tables/lists requiring continuous scrolling (>500 items — consistent with the Chapter 8 L2 §Combobox threshold) — only visible items are rendered in the DOM. |
| **Progressive Rendering**      | Fast initial rendering of a portion of the data, followed by loading the remainder in the background without blocking initial interaction.                          |

This is a direct application of Chapter 2 PR-008 **Built to Scale** — the choice among the three **MUST** be explicitly declared for each component according to its data characteristics rather than using one universal assumption.

### DD.13 Accessibility

A proper semantic table structure **MUST** be used (`<table>`, `<th scope="col">`) rather than visually imitating a table using `<div>` elements · A complex Data Grid **MUST** support arrow-key navigation between cells (WAI-ARIA Grid pattern) · Every state indicator (Live/Stale) **MUST** have a textual alternative and must not rely solely on an icon/color.

### DD.14 Data Display Analytics Boundary

The same principle from L3 §N.16 and L4 §FB.14 applies: no display component **MUST** send Analytics directly — it only emits events (`onSort`, `onFilter`, `onSelect`).

### DD.15 Composition

```text
<DataDisplay>
  ├── Toolbar (optional — search/filter/actions, delegated to L7)
  ├── Header (column headers/labels)
  ├── Body (actual content — follows Data State Contract §DD.10)
  ├── Footer (Pagination, result-count summary)
  └── Overlay States (Loading/Empty/Error are composed over Body, not replacing the entire structure except for complete Empty/Error states)
```

### DD.16 Display Identity

Every displayed item (table row, card, Timeline event) **MUST** carry a stable, unique identifier (`rowId`, `cardId`, `timelineEventId`) derived from the actual data identity (database ID) — it **MUST NOT** rely on the array index as an identifier.

This is the foundation for §DD.9 Selection Persistence and DD.11 Idempotency, and prevents common React issues caused by item ordering changing after sorting/filtering (incorrect re-rendering or loss of an item's internal state).

---

# Tabular

## CMP-TABLE-001 — Table

**Purpose:** Display relatively simple structured data in rows/columns (e.g., club list).

**Data State Behavior:** Applies §DD.10 in full; Loading = Skeleton rows matching the number of rows on the current page.

**Related Governance:** DD.5 (Sort), DD.13 (semantic `<table>`).

## CMP-DATAGRID-001 — Data Grid

**Purpose:** Advanced table for dashboards with sorting/filtering/multiple selection/frozen columns (e.g., complete competition results with hundreds of rows).

**Difference from Table:** Data Grid supports DD.9 Multiple Selection and DD.12 Virtualization in most cases; a simple Table generally does not need them.

**Related Governance:** DD.9, DD.12, DD.13 (full WAI-ARIA Grid Pattern), prepares for L7 (Data Toolbar).

## CMP-LIST-001 — List

**Purpose:** Display repeated items without explicit columns (e.g., notification list, simplified player list on mobile).

**Data State Behavior:** Loading = repeated Skeleton items.

**Related Governance:** DD.4 (the natural alternative to Table on mobile).

## CMP-DESCRIPTIONLIST-001 — Description List

**Purpose:** Display static key-value pairs (e.g., player profile details: name, club, age category).

**Data State Behavior:** Partial applies specifically here (some fields available, others show “—” or “Not Available” instead of silent empty space).

**Related Governance:** DD.10 §Partial.

---

# Collection & Summary

## CMP-CARD-001 — Card (Data Display)

**Purpose:** A composite display unit for a single item (club, news article, event) within a grid.

**Anatomy:** Image/Icon + Title + Short Description + Metadata + Optional Action.

**Related Governance:** DD.15, Chapter 8 L1 (Avatar/Badge/Chip as common internal parts).

## CMP-STATCARD-001 — Statistic Card

**Purpose:** Display a prominent statistical number with context (e.g., number of players, number of medals).

**Anatomy:** Large Number + Label + Optional Trend Indicator (▲/▼ compared with a previous period).

**Data State Behavior:** Loading = Skeleton matching the size of the number itself to prevent CLS.

**Related Governance:** DD.10, Chapter 4 (Numeric Typography — Backlog Ch4 v1.1, **status confirmed still open** — this component's large-number typography remains deferred to that dedicated work; it was reviewed but not resolved during the ADR-0040 typography-architecture pass, since it requires new size/weight values rather than a recombination of existing primitives). Chapter 4 §4.15a `TY-MICROBODY` role applies to this component's secondary/supporting label text.

## CMP-METRIC-001 — Metric

**Purpose:** A compact version of Statistic Card for dense display within smaller spaces (e.g., a summary bar).

**Related Governance:** Builds upon CMP-STATCARD-001.

## CMP-KEYVALUE-001 — Key-Value Display

**Purpose:** Display a single key-value pair outside the context of a complete list such as a Description List — used as a smaller building block.

**Related Governance:** Consumed inside CMP-DESCRIPTIONLIST-001 and CMP-CARD-001.

## CMP-AVATARGROUP-001 — Avatar Group

**Purpose:** Display a group of overlapping thumbnail images (e.g., coaches associated with a club).

**Anatomy:** Builds upon CMP-AVATAR-001 (Chapter 8 L1) + a “+N” counter when the display limit is exceeded.

**Related Governance:** DD.12 (Virtualization is generally unnecessary because the count is naturally limited).

## CMP-EMPTYCOLLECTION-001 — Empty Collection

**Purpose:** A specialized case of `CMP-EMPTYSTATE-001` (Chapter 8 L4) specifically for an empty dataset context (not a loading failure).

The semantic distinction is:

* **Empty Collection:** No content exists yet as a normal state.
* **Error State:** A technical failure occurred.

**Related Governance:** Builds upon CMP-EMPTYSTATE-001.

---

# Temporal & Feed

## CMP-TIMELINE-001 — Timeline

**Purpose:** Display a chronological sequence of events (e.g., stages of player registration, achievement history).

**Data State Behavior:** Live-Updating is common here (e.g., a live audit log).

**Related Governance:** DD.10 §Live-Updating, DD.11.

## CMP-ACTIVITYFEED-001 — Activity Feed

**Purpose:** A chronological list of events, newest first (e.g., dashboard activity: “Ahmed updated a club’s data”).

**Difference from Timeline:** Feed focuses on continuously changing chronological events; Timeline is generally intended for a fixed, limited process path.

**Related Governance:** DD.11 (Live), Chapter 8 L4 §FB.25 (Idempotency to prevent duplicate events).

---

# Do & Don't (L5 General)

**Do:**

* Apply the complete Data State Contract (§DD.10) to any new component before visual design.
* Use Skeleton rather than Spinner for any tabular/collection loading state.

**Don't:**

* Do not redefine Pagination or Search (consume them from L2/L3).
* Do not leave Partial/Stale states visually silent.

## Success Metrics

* 100% of L5 components explicitly document their behavior for every applicable Data State Contract state.
* 0 redefinitions of Pagination/Search logic outside L2/L3.
* 100% of complex tables (>500 rows) use Virtualization or Progressive Rendering (DD.12).
* 0 Stale/Offline states presented as live data without explicit indication.
* 100% of multiple selections persist across sorting/filtering/page changes (DD.9).
* 100% of displayed items use a stable identifier rather than an array index (DD.16).
* 0 components wait for the slowest adjacent component on the same page before displaying data that is already ready (Partial Rendering, DD.10).

## References

**Normative:** Chapter 2 (PR-008) · Chapter 6 (§DD.13) · Chapter 8 L1/L3/L4 Governance
**Implementation:** WAI-ARIA APG (Grid, Table patterns) · TanStack Table/Virtual (technology-neutral implementation reference)
**Informative:** WCAG 2.2

## Related Chapters

Chapter 8 L1 (Skeleton/Badge/Avatar) · Chapter 8 L3 (§Pagination, §Tree View/Accordion) · Chapter 8 L4 (§Empty/Error State, §FB.25) · Chapter 7 · L7 (Enterprise: Data Toolbar/Bulk Actions) · L8 (Sports: Results/Medal Table)

---

*End of L5 Data Display (Data Display Foundation DD.1-DD.16 + 12 components, in addition to 4 components consumed from L1/L3/L4). Next: L6 Media Components.*
