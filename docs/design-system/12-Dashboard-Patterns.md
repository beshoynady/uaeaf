# Chapter 12 — Dashboard Patterns (Dashboard Composition Layer)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                              | Used By                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Chapter 8 (all levels) · Chapter 11 (all patterns, especially PT-CRUD-001, PT-PERMISSION-001, PT-EMPTYLOADINGERROR-001) | Chapter 13 (CMS specializes these layouts) · Chapter 20 (Page Templates composes the final screens) |

## Scope

**Covers:** How a complete Dashboard screen is built from Chapter 8 components and Chapter 11 patterns together — layout types, fixed zones, element ordering rules, responsiveness, full-screen lifecycle, personalization, and performance.

**Does not cover:** Any new component or interaction pattern (Chapters 8/11 are the sole sources) — this chapter is purely a **Composition** layer.

## Definitions

| Term               | Definition                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------ |
| **Dashboard Zone** | A fixed-position area within any Dashboard screen (header, navigation, main workspace)     |
| **Widget**         | Any Chapter 8 component (Card, Table, Chart) when consumed within a defined Dashboard Zone |

## Purpose

Chapter 11 defined **“how components behave together within a task”**; this chapter defines **“how they are arranged within a complete Dashboard screen”** — a higher-level composition layer, with no new interaction behavior.

---

## ADR-0023: Dashboard Composition Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                     |
| **Authority**               | Engineering Decision                                                                                                                                                                                                                                                                                                                                                                         |
| **Context**                 | The Dashboard serves fundamentally different roles (Chapter 0: Operational Experience) with different tasks (entity management, statistics monitoring, live monitoring) — a single layout does not fit all use cases                                                                                                                                                                         |
| **Decision**                | The Dashboard **MUST** be built from a **limited set of known layout types** (§12.1), not a free-form layout for every screen. Each type **MUST** be composed exclusively from fixed zones (§12.2) and Chapter 8 components — **no new component or pattern may be invented in this chapter** (consistent with Chapter 8 ADR-0013 and Chapter 11 ADR-0022, applied at the full-screen level) |
| **Alternatives Considered** | Allowing each Module (Players, Statistics, Competitions) to design its own layout — rejected because it produces an inconsistent Dashboard that is difficult to navigate confidently                                                                                                                                                                                                         |
| **Why This Decision**       | A user who learns the “Entity Management” layout once (e.g., Players) can immediately understand the layout of any other entity (Clubs, Officials) without additional learning                                                                                                                                                                                                               |
| **Risks**                   | A fixed layout may not fit a rare exceptional case. **Mitigation:** Any deviation **MUST** be documented through a separate ADR                                                                                                                                                                                                                                                              |
| **Consequences**            | Every new Dashboard screen **MUST** begin by selecting a layout type from §12.1 before any detailed design work                                                                                                                                                                                                                                                                              |

---

## 12.1 Dashboard Layout Types

| Type                            | Usage                                                   | Typical Components                                                       |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Entity Management Dashboard** | Managing lists of entities (Athletes, Clubs, Officials) | Directly consumes Chapter 11 §PT-CRUD-001: Toolbar (L7) + DataGrid (L5)  |
| **Analytics Dashboard**         | Monitoring statistics and KPIs                          | KPI Cards (L5 §CMP-STATCARD-001) + Charts                                |
| **Monitoring Dashboard**        | Live monitoring during a competition                    | Live indicators (Chapter 8 L5 §DD.10 Live-Updating) + EventSchedule (L8) |
| **Workspace Dashboard**         | Focused editorial task (News Editor, CMS)               | Detailed in Chapter 13                                                   |

---

## 12.2 Dashboard Zones (Fixed Zones, No New Components)

```text
┌─────────────────────────────────────────┐
│ Global Header (logo, global search, user account) │
├──────────┬──────────────────────────────┤
│ Module   │ Context Toolbar (filters/search/actions) │
│ Nav      ├──────────────────────────────┤
│ (Sidebar,│ KPI Area (optional)          │
│  Ch8 L3) ├──────────────────────────────┤
│          │ Main Workspace (primary content) │
│          ├──────────────────────────────┤
│          │ Side Panel (optional, quick details) │
└──────────┴──────────────────────────────┘

Notification Area: floating above everything (Chapter 8 L4 Z-Order)
```

Each zone **MUST** be populated using existing Chapter 8 components only — Global Header consumes Chapter 8 L3 §CMP-TOPNAV-001, Module Nav consumes §CMP-SIDEBAR-001, etc.

---

## 12.3 Widget Placement Rules

The following order **MUST** remain consistent across screens:

1. KPI Area **MUST** always appear at the top of the Main Workspace (never below it or between it and Charts).
2. Filters (Chapter 11 §PT-FILTER-001) **MUST** directly precede the DataGrid/Table.
3. Charts **MUST NOT** precede direct numerical KPI indicators — the number comes first, followed by the explanatory visualization.
4. Action Bar (Chapter 8 L7 §CMP-ACTIONBAR-001) **MUST** appear only after an actual Selection exists (Chapter 11 §PT-BULKACTION-001) — it must not permanently reserve empty space.

---

## 12.4 Responsive Dashboard Behavior (Full-Screen Level)

| Size                                 | Behavior                                                                                                                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop/Laptop (Chapter 5 `lg`+)** | All zones (§12.2) are visible together, with an expanded Sidebar                                                                                                                                            |
| **Tablet (`md`)**                    | Sidebar becomes a Navigation Rail (Chapter 8 L3 §CMP-NAVRAIL-001); Side Panel becomes a Drawer on demand                                                                                                    |
| **Mobile (`xs`/`sm`)**               | Dashboard support **MAY** be limited (Chapter 0: mobile priority is for the public website, not the Dashboard). If supported, Module Nav becomes a full-screen Navigation Drawer (Chapter 8 L3) when opened |

---

## 12.5 Dashboard State Flow (Full-Page Level)

Extends Chapter 11 §PT-EMPTYLOADINGERROR-001 and Chapter 11 §PT-PERMISSION-001 into a single flow for the complete Dashboard:

```text
Loading → Permission Check (§PT-PERMISSION-001) → Empty | Populated → Realtime Updates (if applicable, L5 §DD.11) → Error (§FB.19 Retry)
```

The permission check **MUST** occur **before** any visible loading/content state is shown to the user — there must be no content flicker followed by disappearance due to insufficient permission (race condition between Loading and Permission).

---

## 12.6 Dashboard Personalization

Within the current project scope (Chapter 0):

* KPI card ordering **MAY** be user-reorderable.
* Optional Widgets within an Analytics Dashboard **MAY** be shown/hidden.
* Layout preferences **SHOULD** be persisted per user (consistent with Chapter 8 L3 §N.9 Navigation Persistence, applied here to screen layout rather than navigation).

These capabilities **MAY** remain disabled in the first release — the architecture must accommodate them without requiring a later redesign (PR-008 Built to Scale).

---

## 12.7 Dashboard Performance Rules

Direct application of PR-002 at the full-screen level rather than the individual component level:

* **MUST** use Lazy Loading for any zone (§12.2) that is not visible above the fold during initial loading (Side Panel, collapsed sections).
* **MUST** use Virtualization for any large DataGrid (Chapter 8 L5 §DD.12).
* **MUST** display a Skeleton before any chart (no empty flash followed by sudden rendering).
* **MUST NOT** reload the entire page when a single Widget is updated (partial live update only, Chapter 8 L5 §DD.10 Independent Component Lifecycle).

---

## 12.8 Dashboard Refresh Strategy

Extends §12.7 — not every Widget requires the same refresh rate:

| Widget                                               | Typical Refresh Rate             |
| ---------------------------------------------------- | -------------------------------- |
| KPI Cards                                            | 30–60 seconds                    |
| Live Competition (Chapter 8 L5 §DD.10 Live-Updating) | Immediate (WebSocket/Push)       |
| Analytics Charts                                     | Manual or every 5 minutes        |
| Tables                                               | On filtering/manual refresh only |

**Rule (MUST):** Every Widget **MUST** explicitly declare its own refresh policy — the entire Dashboard **MUST NOT** refresh merely because one Widget requires fresher data (consistent with §12.7 Independent Lifecycle; this section defines the actual refresh rates).

---

## 12.9 Widget Failure Isolation

Failure of one Widget (e.g., a chart loading error) **MUST NOT** propagate to the rest of the Dashboard:

```text
Dashboard
├─ KPI ✔ (working normally)
├─ Table ✔
├─ Chart ✘ (Chapter 8 L4 §CMP-ERRORSTATE-001 local to this Widget only)
└─ News ✔
```

Each zone (§12.2) **MUST** be treated as an independent isolation unit (**Error Boundary**) — failure of one **MUST NOT** cause the entire Dashboard to fall into a global error state.

---

## 12.10 Dashboard Context Boundary

Every Dashboard **MUST** declare one primary context (Players, Competitions, General Statistics) — it **MUST NOT** become a random collection of unrelated information:

```text
Players Dashboard → Widgets MUST serve the Players context
(statistics about players, player list, player alerts)
```

Displaying a Widget from a completely different context (e.g., competition metrics inside the Players Dashboard) **MUST** be explicitly documented with a justification explaining why the exception exists — no arbitrary additions without a stated reason.

---

## 12.11 Widget Loading Priority

A fixed loading order **MUST** be respected for every screen to prevent content from appearing in a confusing arbitrary sequence:

```text
1. Global Header (§12.2)
2. Module Navigation
3. KPI Area
4. Main Workspace
5. Side Panel
6. Optional/Secondary Widgets
```

Charts or secondary content **MUST NOT** appear before the core structure (Header/Navigation) is established — this violates the user's natural visual expectation of page loading.

---

## 12.12 Dashboard Data Dependency

Every Dashboard screen **MUST** explicitly declare the nature of data dependencies between its composed Widgets — no implicit dependencies that are discovered accidentally later:

```text
Each Widget MUST declare whether it:

- Shares a data source with other Widgets (Shared Dataset)
- Has its own independent request endpoint (Independent Endpoint)
- Depends on another Widget's result (Dependent — requires special documentation explaining the reason)

Hidden Runtime Dependencies MUST NOT exist without being explicitly documented.
```

**Reason:** Without this explicit declaration, a screen designed for parallel loading (§12.7) may gradually become a sequential loading chain (Chart waits for KPI, which waits for Table) without anyone noticing the progressive performance degradation.

---

## 12.13 Cross-Widget Communication

A common interaction in modern Dashboards is clicking a KPI to filter the table below, or clicking a point in a chart to filter results. This is a **Dashboard Behavior**, not a component (Chapter 8) or a general interaction pattern (Chapter 11):

```text
A Widget MAY publish context when the user interacts with it.
Other Widgets MAY subscribe to that context and respond to it.

This interaction MUST always remain optional — every Widget MUST
function correctly and independently even if it does not consume
any context published by another Widget.
```

**Rule (MUST NOT):** Widgets **MUST NOT** become tightly coupled — no Widget may require another Widget to exist in order to function at all (which would implicitly violate §12.9 Widget Failure Isolation).

---

## 12.14 Dashboard Context Provider (Principle, Not Implementation)

Shared contextual values across all Widgets on the same screen (selected season, selected competition, selected club) **MUST** have one shared source at the page level — **MUST NOT** have every Widget independently fetch the same value (which creates duplicate API requests for the same data unnecessarily and violates §12.7 performance principles).

**This chapter documents only the architectural principle** — the exact implementation mechanism (React Context, Global Store, etc.) **MUST NOT** be decided here, but rather in Chapter 21 (Technical Architecture).

---

# Dashboard Template Registry

A central quick reference (following the same logic as Chapter 11 §Pattern Registry) — consumed by Chapter 20 through the ID rather than the textual name:

| ID                | Layout                      | Status                               |
| ----------------- | --------------------------- | ------------------------------------ |
| DB-ENTITY-001     | Entity Management Dashboard | Stable v1.0                          |
| DB-ANALYTICS-001  | Analytics Dashboard         | Stable v1.0                          |
| DB-MONITORING-001 | Monitoring Dashboard        | Stable v1.0                          |
| DB-WORKSPACE-001  | Workspace Dashboard         | Stable v1.0 (detailed in Chapter 13) |

# Widget Registry (Reference Structure, Not Currently Activated)

For every new Widget added in the future, it **SHOULD** be registered using the following fields (to be consumed later by Chapter 20 for automated screen composition):

| Field                     | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| Widget ID                 | Unique identifier (following the `WG-{NAME}-001` pattern)               |
| Supported Dashboard Types | Which Dashboard Template Registry entries from §12.1 accept this Widget |
| Zone                      | Which zone from §12.2 it belongs to                                     |
| Priority                  | Its position within §12.11 Widget Loading Priority                      |
| Refresh Policy            | As defined in §12.8                                                     |

**Not mandatory in this release** — the structure is documented now to avoid future redesign (PR-008 Built to Scale), with actual activation when Chapter 20 requires it.

---

## Do & Don't

**Do:** Select a layout type from §12.1 first before any detailed design work · Apply the element ordering rules in §12.3 literally to every new screen.

**Don't:** Do not design a free-form layout outside §12.1 · Do not expose protected content even momentarily before checking permissions (§12.5).

## Success Metrics

* 100% of new Dashboard screens explicitly select a type from §12.1.
* 0 screens expose restricted content even momentarily before permission checks.
* 100% of large tables use Virtualization.
* 0 full-page reloads for updating a single Widget.
* 100% of Widgets explicitly declare their own refresh policy (§12.8).
* 0 Widget failures propagate to the rest of the Dashboard (§12.9).
* 100% of Dashboards declare one primary context (§12.10).
* 100% of screens explicitly declare the data dependency nature of their Widgets (§12.12).
* 0 Widgets require another Widget to exist in order to function (§12.13).
* 0 duplicate API requests for the same contextual value across different Widgets (§12.14).

## References

**Normative:** Chapter 8 (all levels) · Chapter 11 (all patterns)
**Informative:** Common Enterprise Dashboard Patterns (Grafana, Power BI — general conceptual references, not sources of design rules)

## Related Chapters

Chapter 8 · Chapter 11 · Chapter 13 (CMS specializes Workspace Dashboard) · Chapter 20 (Final Composition)

---

*End of Chapter 12. Next chapter: Chapter 13 — CMS System.*
