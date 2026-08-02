# Chapter 8 — Component Inventory

## Level 7: Enterprise Components (Enterprise Action Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L7 of 8) | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                                                                                                                                                  | Used By                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Button/Chip/Badge) · Chapter 8 L2 (SearchInput/FileUpload) · Chapter 8 L3 (Stepper/§N.19 Authorization Boundary) · Chapter 8 L4 (ConfirmationDialog/Progress) · Chapter 8 L5 (Selection Model/Filtering/Data State) | Chapter 12 (Dashboard Patterns) · Chapter 13 (CMS Workflow) · L8 (Sports: Results Approval, Bulk Player Registration) |

## Scope

**Covers:** L7 as the layer that differentiates this system from any generic Design System — administrative tools operating above L5 (Filter Bar, Search Bar, Data Toolbar, Action Bar, Bulk Actions, Advanced Filters, Export Menu, Import Wizard, Approval Status, Audit Timeline).

**Does not cover:** Activity Feed (already documented in Chapter 8 L5 §CMP-ACTIVITYFEED-001 — **MUST NOT** be redefined here, in accordance with ADR-0013 preventing duplication across levels).

## Definitions

| Term                   | Definition                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Bulk Action**        | An action applied to more than one selected item at the same time (deleting 40 players, approving 5 results) |
| **Destructive Action** | An action with an irreversible impact or one that is difficult to undo (permanent deletion)                  |
| **Audit Record**       | An immutable record documenting who did what and when                                                        |

## Purpose

The **"Enterprise Action Foundation"** is the central contract for any administrative action that exceeds the scope of a single record — the risk here is higher than at any previous level (real data for dozens/hundreds of players and clubs), therefore this chapter is centered on **safety before efficiency**.

---

## ADR-0019: Enterprise Action Architecture

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Authority**               | Product Decision (builds directly on PR-003 Accessibility and Chapter 8 L4 ADR-0016)                                                                                                                                                                                                                                                                                                                                                                    |
| **Context**                 | L7 components execute actions with broad impact (Bulk Delete, importing hundreds of records) by a limited number of authorized users (Chapter 0: Operational Experience) — the risk is high, the human team is small, and the need for safety is greater than at any previous level                                                                                                                                                                     |
| **Decision**                | Every Enterprise action **MUST** be classified by a risk level (§EC.3) that determines the required confirmation level (Chapter 8 L4 Escalation Model, ADR-0016) · Every action **MUST** produce an audit record (§EC.4) automatically without exception · Visibility of every action **MUST** be subject to the Authorization Boundary (same principle as Chapter 8 L3 §N.19 — the button must not appear at all for users who do not have permission) |
| **Alternatives Considered** | Treating L7 actions under the same ordinary Button contract (Chapter 8 L1) without an additional safety layer — rejected because the impact of an error here (bulk data deletion) is far greater than that of an ordinary button                                                                                                                                                                                                                        |
| **Why This Decision**       | Direct application of the **"safety before efficiency"** principle — a small operational team (Chapter 0 Discovery: currently the project owner alone, and even a future team will be limited in size) means every administrative error is relatively costly                                                                                                                                                                                            |
| **Risks**                   | Additional confirmation layers may feel "slow" to experienced users. Mitigation: §EC.3 differentiates between risk levels — safe actions (Export) do not require the same confirmation as destructive actions                                                                                                                                                                                                                                           |
| **Consequences**            | Every component below **MUST** explicitly declare its risk level and confirmation path                                                                                                                                                                                                                                                                                                                                                                  |

---

# Enterprise Action Foundation — Shared Sections

### EC.1 Enterprise Component Definition

An L7 component **MUST** operate on a dataset (selection from L5 or a defined scope), not a single record — it **MUST NOT** replace a simple individual action (that is an ordinary button, Chapter 8 L1).

### EC.2 Bulk Action Contract

**MUST** depend on Chapter 8 L5 §DD.9 Selection Model (`Multiple`) and §DD.16 Display Identity — no bulk action without clear selection and stable identifiers.

A clear counter of selected items **MUST** be visible while any Bulk Action is active ("The action will be applied to 40 items").

### EC.3 Action Safety Levels

| Level           | Example                              | Required Confirmation Path                                                                                                                  |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Safe**        | Export, refresh display              | No additional confirmation                                                                                                                  |
| **Reversible**  | Temporarily disable, revoke approval | Toast with Undo (Chapter 8 L4 §CMP-SNACKBAR-001)                                                                                            |
| **Destructive** | Permanent bulk deletion              | Mandatory Confirmation Dialog (Chapter 8 L4) — **MUST** require entering the number of items or a confirmation word for higher-risk actions |

### EC.4 Audit Logging Contract

Every L7 action **MUST** automatically produce an audit record (who did it, what, when, and on which items) — an administrative action **MUST NOT** be silent or leave no trace that can be reviewed.

The record itself **MUST** be immutable after creation (Append-only).

### EC.5 Export Contract

| Dimension        | Rule                                                                                                                                                                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope            | **MUST** be explicitly clear: `Selected` (selected items only) / `Filtered` (current filter results) / `All` (all data) — no implicit assumption                                                                                                                                             |
| Size             | Large exports (>1000 rows) **SHOULD** be asynchronous (Async, consuming Chapter 8 L4 §CMP-PROGRESSBAR-001 + a completion notification — see §EC.12), without blocking the UI                                                                                                                 |
| Format           | **MUST** be clear before execution (CSV/Excel/PDF) through the Export Menu                                                                                                                                                                                                                   |
| Data Sensitivity | Exports containing sensitive personal data (minor data, Chapter 0 Discovery) **MUST** comply with the same restrictions defined in Chapter 17 (Data Privacy); **SHOULD** document who exported the file and when under §EC.4 Audit Logging (logging only "Export completed" is insufficient) |

### EC.6 Import Contract

```text
File Selected → Validation Preview → Confirm → Processing → Partial Success | Full Success | Full Failure
```

A **Preview MUST** be provided, with errors displayed **before** actual commitment (Commit) — no direct import without an opportunity for review.

Partial success (some rows valid, others invalid) **MUST** be clearly displayed row by row — the entire file should not be rejected because of an error in a single row unless there is a documented necessity.

**Rollback Policy (MUST be explicitly declared):** After an actual Commit, a full rollback of the entire import batch **SHOULD** be available (`operationId` unified, §EC.11) within a limited time window — it **MUST NOT** be implicitly assumed that every import is final and irreversible immediately after success.

### EC.7 Approval Workflow Contract

Unified states for every approval operation across the platform:

`Pending → Approved | Rejected | Escalated`

Every state transition **MUST** be recorded through §EC.4 Audit Logging with the approver's name.

### EC.8 Permission Visibility

*(Applying Chapter 8 L3 §N.19 at the action level)*

Any L7 action **MUST** be completely hidden (not merely Disabled) from a user who does not have the required permission — the same Visibility Contract principle from L3, applied here to buttons/menus rather than navigation items.

### EC.9 Accessibility

Full application of Chapter 6:

* Bulk Actions Toolbar **MUST** use `aria-live="polite"` to announce changes in the number of selected items.
* Import Wizard **MUST** follow the complete Stepper Accessibility requirements from Chapter 8 L3 §Stepper A11y.

### EC.10 Composition

```text
<EnterpriseAction>
  ├── Trigger (button/link shown according to §EC.8)
  ├── Safety Gate (§EC.3 — according to risk level)
  ├── Execution (§EC.2/EC.5/EC.6)
  └── Audit Emission (§EC.4, always automatic)
```

### EC.11 Idempotent Retry Contract

Execution of a Bulk Action **MUST** be safe to retry (same principle as Chapter 8 L4 §FB.25, but at the level of the complete bulk operation rather than an individual feedback event).

If partial execution fails (e.g., 30 of 40 deletion operations succeed) and the user retries, the 30 already-successful items **MUST NOT** be executed again.

The operation **MUST** carry an identifier (`operationId`) tracking which items were actually completed.

### EC.12 Long-Running Operation Contract

Operations exceeding immediate response time (large Import, large Export — §EC.5/§EC.6) **MUST** continue in the background even if the user closes the page or navigates away (Chapter 8 L3 §N.4).

The status **MUST** be queryable later (the operation must not be lost simply because the user left the screen), with a completion notification (Chapter 18 Notifications — a future integration point documented here).

### EC.13 Conflict Resolution Contract

When data conflicts occur during a Bulk Action (two selected items were modified by another user during processing), an explicit strategy **MUST** be declared for each context:

* `Last-Write-Wins` — the latest update wins.
* `Reject-on-Conflict` — skip the conflicting item and report it in the operation result, following the partial-success pattern from §EC.6.

There **MUST NOT** be silent failure or overwriting another user's change without informing them.

### EC.14 Cross-Entity Impact Preview

For Destructive actions (§EC.3) that have cascading effects on related entities (deleting a club that has registered players), the complete impact **MUST** be previewed before execution:

> "This action will also affect 15 players associated with this club."

The user **MUST NOT** discover the side effects only after it is too late.

---

# Discovery & Filtering

## CMP-SEARCHBAR-001 — Search Bar

**Purpose:** Search across an entire page/section (not an individual field like L2 SearchInput).

**Related Governance:** Builds directly on Chapter 8 L2 §CMP-SEARCHINPUT-001 + Chapter 8 L5 §DD.7 Searching Contract.

## CMP-FILTERBAR-001 — Filter Bar

**Purpose:** Quick-filter bar above a data display (filtering clubs by status).

**Anatomy:** A group of Chips (Chapter 8 L1) + a "Clear All" button.

**Related Governance:** Directly follows Chapter 8 L5 §DD.6 Filtering Contract — no redefinition.

## CMP-ADVANCEDFILTERS-001 — Advanced Filters

**Purpose:** Panel/Drawer for constructing complex multi-condition filters (players: age group + club + status simultaneously).

**Anatomy:** Builds on Chapter 8 L4 §CMP-DRAWER-001 + L2 components (Select, Checkbox) for each condition.

**Related Governance:** Its final result is output as Filter Bar Chips (direct integration).

## CMP-DATATOOLBAR-001 — Data Toolbar

**Purpose:** A composite toolbar placed above any Data Display (L5), combining:

* Search
* Quick filters
* Result count
* Export button
* Bulk Action trigger when a selection exists

**Composition:** Consumes CMP-SEARCHBAR-001 + CMP-FILTERBAR-001 + CMP-EXPORTMENU-001 together as a single composite component — without duplicating their individual logic.

**Related Governance:** EC.10, Chapter 8 L5 §DD.15 (occupies the Toolbar area of the Data Display Composition).

---

# Bulk Operations

## CMP-ACTIONBAR-001 — Action Bar (Contextual)

**Purpose:** A contextual bar that appears **only** when an active selection exists (Chapter 8 L5 §DD.9):

> "3 items selected: Delete, Export, Approve."

**Behavior:** **MUST** appear/disappear smoothly as the selection state changes from empty to non-empty and vice versa (Chapter 5 Motion).

**Related Governance:** EC.2, EC.9 (`aria-live`).

## CMP-BULKACTIONS-001 — Bulk Actions

**Purpose:** The actual group of actions that can be applied collectively, consumed inside the Action Bar.

**Related Governance:** EC.2, EC.3 (each action is explicitly classified), EC.4 (every execution is logged).

## CMP-EXPORTMENU-001 — Export Menu

**Purpose:** Menu for selecting the export format and executing the export.

**Anatomy:** Builds on Chapter 8 L3 §CMP-DROPDOWNMENU-001.

**Related Governance:** Full EC.5.

## CMP-IMPORTWIZARD-001 — Import Wizard

**Purpose:** Bulk data import flow (importing a player list from an Excel file).

**Anatomy:** Builds on Chapter 8 L3 §CMP-STEPPER-001 (steps: Upload → Preview → Confirm → Result) + Chapter 8 L2 §CMP-FILEUPLOAD-001.

**Related Governance:** Full EC.6, Chapter 8 L2 §F.10 Form Submission Contract (for the final step).

---

# Governance & Workflow

## CMP-APPROVALSTATUS-001 — Approval Status

**Purpose:** Visual indicator of an item's approval state (Badge, Chapter 8 L1, specialized).

**Variants:**

* `Pending` (Info)
* `Approved` (Success)
* `Rejected` (Danger)
* `Escalated` (Warning)

These directly reflect §EC.7.

**Related Governance:** EC.7, Chapter 1 ADR-0004 (red is exclusively for Rejected, not for general use).

## CMP-AUDITTIMELINE-001 — Audit Timeline

**Purpose:** Specialized display of audit records (§EC.4) for a specific item (complete history of changes to a player's profile).

**Anatomy:** Builds directly on Chapter 8 L5 §CMP-TIMELINE-001, with additional fixed fields:

* User
* Action
* Time
* Before/After Value

**Related Governance:** EC.4 (data source), Chapter 8 L5 §DD.10 (Live-Updating is common here for active items).

---

# Do & Don't (L7 General)

**Do:**

* Classify every new action under §EC.3 Safety Level first.
* Ensure an Audit Record is produced for every new action (EC.4 without exception).

**Don't:**

* Do not re-document Activity Feed here (already exists in L5).
* Do not allow a Destructive action without a Confirmation Dialog, regardless of the required speed.

---

# Success Metrics

* 100% of L7 actions explicitly classified under §EC.3.
* 100% of actions produce an Audit Record (EC.4) — zero silent actions.
* 0 Destructive actions without a Confirmation Dialog.
* 100% of L7 buttons are hidden (not merely Disabled) from users without permission (EC.8).
* 0 re-execution of items already completed when retrying (EC.11).
* 100% of Destructive actions with cascading impact display a complete impact preview (EC.14).
* 100% of sensitive exports document who exported them and when (EC.5).

# References

**Normative:** Chapter 2 (PR-003) · Chapter 8 L3 (§N.19) · Chapter 8 L4 (ADR-0016) · Chapter 8 L5 (§DD.9, §DD.16) · Chapter 8 Global Governance

**Implementation:** WAI-ARIA APG · Chapter 21 (will document the actual technical Audit Log integration)

**Informative:** WCAG 2.2

# Related Chapters

Chapter 8 L1/L2/L3/L4/L5 (all dependencies) · Chapter 12 (Dashboard Patterns heavily consumes this level) · Chapter 13 (CMS Workflow) · Chapter 17 (Import Security Details)

---

*End of L7 Enterprise (Enterprise Action Foundation EC.1–EC.14 + 9 components). Next: L8 UAEAF Sports/Domain Components — the final level.*
