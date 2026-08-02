# Chapter 11 — UX Patterns

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                               | Used By                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chapter 8 (all levels L1-L8) · Chapter 9 (Content Rules) | Chapter 12 (Dashboard Patterns customizes these patterns) · Chapter 13 (CMS) · Chapter 20 (Page Templates composes Patterns into complete pages) |

## Scope

**Covers:** Complete interaction sequences (End-to-End Flows) that compose multiple components from Chapter 8 to accomplish a complete user task.

**Does not cover:** Any new UI component (Chapter 8 alone is the source of components, ADR-0013) — a Pattern **MUST NOT** contain logic for which a source component does not already exist.

## Definitions

| Term                | Definition                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UX Pattern (PT)** | A documented interaction sequence that composes multiple Chapter 8 components in a defined order with specific transition rules to accomplish a complete task (not a single component) |
| **Flow**            | A user journey through multiple sequential screen states for the same goal                                                                                                             |

## Purpose

Chapter 8 defined the **“Lego pieces”**; this chapter defines **“how they are assembled”** for recurring real-world tasks across the platform (adding a club, searching for an athlete, bulk deletion) — so the same sequence is not redesigned differently on every screen.

---

## ADR-0022: UX Pattern Composition Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Authority**               | Engineering Decision (direct application of Chapter 8 ADR-0013 at the Pattern level rather than the component level)                                                                                                                                                                                                                                                                                              |
| **Context**                 | Recurring tasks (creating/editing/deleting a record, searching, bulk importing) repeat across dozens of screens (athletes, clubs, referees, coaches, competitions) — without a standardized pattern, each screen reinvents its own sequence                                                                                                                                                                       |
| **Decision**                | Every Pattern **MUST** be explicitly defined as a composition of existing Chapter 8 components only (no new component is invented here) + transition rules between its states. Any Pattern **MUST** be applicable to any entity (athlete/club/referee) without modifying its structure — the only difference is the consumed data (same principle as Chapter 8 L8 ADR-0020: abstraction from the specific entity) |
| **Alternatives Considered** | Allowing each Module (athletes, clubs) to design its own flow independently — rejected because it produces an inconsistent user experience across different Dashboard sections                                                                                                                                                                                                                                    |
| **Why This Decision**       | Ensures that once a user learns the “Add Record” pattern (athlete), it applies identically to any other entity (club, referee) — reducing cognitive load                                                                                                                                                                                                                                                          |
| **Risks**                   | A strict constraint may not fit a rare exceptional case. Mitigation: any exception **MUST** be explicitly documented as a separate ADR rather than silently deviating from the pattern                                                                                                                                                                                                                            |
| **Consequences**            | Every Pattern below **MUST** clearly declare which Chapter 8 components it consumes, using their identifiers                                                                                                                                                                                                                                                                                                      |

---

## PT-CRUD-001 — CRUD Pattern

**Purpose:** The standardized sequence for managing any entity (club, athlete, referee, coach, competition) throughout its complete lifecycle.

```text
List (Chapter 8 L5 §CMP-TABLE-001/DataGrid + L7 §CMP-DATATOOLBAR-001)
  → Create (L2 Form Foundation, Modal or full page depending on complexity — L4 §CMP-MODAL-001)
  → Read (Details Page, L5 §CMP-DESCRIPTIONLIST-001 + Domain Card from L8 where applicable)
  → Update (same Create form with pre-populated initial values, L2 §F.7 Controlled)
  → Delete (L4 §CMP-CONFIRMATIONDIALOG-001 mandatory, Chapter 8 L7 §EC.3 Destructive)
```

**Related Governance:** Chapter 8 L2 §F.10 (Submission), L4 (Confirmation), L7 §EC.4 (Automatic audit for every operation).

---

## PT-SEARCH-001 — Search Pattern

**Purpose:** The standardized search flow within any context (general site search, athlete search in the Dashboard).

```text
Idle → Typing (Debounce, Chapter 8 L2 §CMP-SEARCHINPUT-001) → Loading → Results | Empty (L4 §CMP-EMPTYSTATE-001 with wording "No results for {query}" — Chapter 9 §CR-2.5)
```

**Related Governance:** Chapter 8 L5 §DD.7 (Searching Contract), L7 §CMP-SEARCHBAR-001.

---

## PT-FILTER-001 — Filter Pattern

**Purpose:** The flow for applying filters to any data view.

```text
Filter Bar (L7 §CMP-FILTERBAR-001) or Advanced Filters Drawer (L7 §CMP-ADVANCEDFILTERS-001)
  → Apply → Data Display updates (L5 §DD.6) → Active Filter Chips remain visible (L1 §Chip)
  → Clear All (one clear button, Chapter 8 L5 §DD.6)
```

**Related Governance:** Chapter 8 L5 §DD.6 directly; no redefinition.

---

## PT-WIZARD-001 — Wizard Pattern

**Purpose:** A multi-step flow for a complex task (registering a new athlete with complete data, bulk importing).

```text
Step 1 → Step 2 → ... → Review → Submit (Chapter 8 L3 §CMP-STEPPER-001 exclusively — no Tabs, Chapter 8 L3 §N.2)
```

Each step **MUST** be an independent L2 form that complies with its own §F.10 before proceeding to the next step.

**Related Governance:** Chapter 8 L3 (Stepper), L7 §CMP-IMPORTWIZARD-001 (direct application of this pattern).

---

## PT-EMPTYLOADINGERROR-001 — Page Load State Flow

**Purpose:** The standardized sequence for any page/section when it is loaded for the first time — extending Chapter 8 L5 §DD.10 from a “component state” to a complete “page-level experience sequence.”

```text
Loading (Skeleton, L1) → Empty (L4 §EmptyState) | Populated | Error (L4 §ErrorState + Retry Contract L4 §FB.19)
```

**MUST** transition smoothly between these states (Chapter 5 Motion), rather than through an abrupt jump.

**Related Governance:** Chapter 8 L5 §DD.10 is the source of truth; this Pattern applies it at the page level, not only to an individual component.

---

## PT-CONFIRMATION-001 — Confirmation Decision Pattern

**Purpose:** Defines when confirmation is required before executing an action — consuming Chapter 8 L4 ADR-0016 (Escalation) and L7 §EC.3 (Safety Levels) together as one standardized decision:

```text
Is the action Destructive (L7 §EC.3)? → Yes → Confirmation Dialog mandatory (L4)
Is the action Reversible? → Toast + Undo (L4 §Snackbar) is sufficient, no Dialog
Is the action Safe? → No additional confirmation
```

**Related Governance:** Chapter 8 L7 §EC.3 literally; this Pattern is only its practical application and does not duplicate the definition.

---

## PT-BULKACTION-001 — Bulk Action Pattern

**Purpose:** The complete flow from selection through execution of a bulk action.

```text
Select (L5 §DD.9 Multiple) → Action Bar appears (L7 §CMP-ACTIONBAR-001) → Select action (L7 §CMP-BULKACTIONS-001)
  → PT-CONFIRMATION-001 (according to risk level) → Execution (L7 §EC.2/EC.11 Idempotent)
  → Feedback (L4, reflecting partial success if applicable, L7 §EC.6 Partial Success Pattern)
```

**Related Governance:** Connects L4, L5 §DD.9, and the entirety of L7 in a single sequence.

---

## Do & Don't

**Do:** Start any new recurring task by first reviewing whether an existing Pattern here matches it · Apply the same Pattern consistently across all entities (athlete/club/referee).

**Don't:** Do not invent a new sequence for a CRUD/Search/Filter task that already exists here · Do not use Tabs instead of Stepper in PT-WIZARD-001 (violates Chapter 8 L3 §N.2).

## Success Metrics

* 100% of CRUD screens in the Dashboard follow PT-CRUD-001 exactly
* 0 search/filter sequences reinvented outside PT-SEARCH-001/PT-FILTER-001
* 100% of multi-step flows use Stepper rather than Tabs

## References

**Normative:** Chapter 8 (all levels) · Chapter 9
**Informative:** Nielsen Norman Group (general UX principles, not a direct source of rules)

## Related Chapters

Chapter 8 (complete component source) · Chapter 12 (Dashboard customizes these patterns for its context) · Chapter 13 (CMS) · Chapter 20 (Page Templates)

---

*End of Chapter 11. Next chapter: Chapter 12 — Dashboard Patterns.*
