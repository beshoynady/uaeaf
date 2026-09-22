# ADR-0089 — The approval path, and the list–detail workspace

| | |
| --- | --- |
| **Status** | Accepted (owner decisions P1–P12, 2026-09-21; this record requested by the owner the same day). **Recorded after the build** — see Context. |
| **Builds on** | Chapter 8 L5 `CMP-TIMELINE-001` · Chapter 8 L7 `CMP-APPROVALSTATUS-001`, §EC.3, §EC.6, §EC.7 · Chapter 11 `PT-FILTER-001`, `PT-CONFIRMATION-001`, `PT-BULKACTION-001` · Chapter 12 §12.2, §12.3, §12.4 · Chapter 8 L3 §N.6 · Chapter 5 §5.2 · ADR-0050 / ADR-0065 (colour appears where its role appears) · ADR-0056 (document-first) |
| **Adds** | `CMP-APPROVALPATH-001` (Chapter 8 L7) · `PT-LISTDETAIL-001` (Chapter 11) |
| **Does not amend** | `CMP-STEPPER-001` · `CMP-TIMELINE-001` · Chapter 12's zone order or the Side Panel · any token |
| **Authority** | Owner decision. Every value below is an existing token or an existing component's class set; nothing was introduced to draw these two patterns. |

---

## Context

The owner's brief for the approval-policies screen (2026-09-21) asked for two things no
chapter describes:

1. **A picture of who must decide before something is published.** Not the state of one
   item (`CMP-APPROVALSTATUS-001`), not a history of what happened (`CMP-TIMELINE-001`,
   `CMP-AUDITTIMELINE-001`), and not steps a person moves through (`CMP-STEPPER-001`, which
   is Workflow Navigation exclusively). A configured path, read before anything travels it.
2. **A working layout for a closed set of configurable items**, each with its own settings,
   edited one at a time: a compact list beside the chosen item's settings, both on screen
   together.

Both were built on 2026-09-21 in `apps/dashboard` **before** this record existed. ADR-0056 §2
asks for the record first; that order was not kept, and this ADR closes the gap it left. The
decisions themselves are the owner's (P1–P12); nothing here changes what was approved.

---

## D1 — `CMP-APPROVALPATH-001` — Approval Path (Chapter 8 L7)

**Purpose.** Show the path a piece of content takes to publication: where it starts, who must
decide on it, and where it ends. Read-only.

**Builds on** `CMP-TIMELINE-001`, which Chapter 8 L5 already reserves for "a fixed, limited
process path" — the same relation `CMP-AUDITTIMELINE-001` has to it. It differs from the
Timeline in two ways only: it is **prospective** (a configuration, not recorded events) and
it runs **along the reading direction**, wrapping rather than scrolling.

**Anatomy.** A captioned figure holding one ordered list: `start → stage… → end`.
Arrows between items are decoration.

**What the stages are**, by approval mode (Chapter 8 L7 §EC.7 governs the states a review
then passes through; this component only shows who decides):

| Arrangement | Stages between start and end | End |
| --- | --- | --- |
| In order (`SEQUENTIAL`) | one per approver, in the stored order | Published |
| Everyone (`ALL`) | one gate: "Everyone approves (N)" | Published |
| A set number (`THRESHOLD`) | one gate: "N of M approve" | Published |
| Approval required, nobody named | one stage: "Nobody named" | Published |
| No review | none | Published directly |

**Saved or draft.** Where the path sits beside controls that edit it, it follows the draft,
and its caption says which it is showing: "Current path" when nothing is unsaved, "Path after
saving" when something is. A sentence stating the saved arrangement stays beside it, so the
reader always has both.

**Tokens.** Figure: `color.surface.sunken`, `color.border.default`, `radius.md`. Start:
`color.border.default` edge, `color.text.secondary`. Stages: `color.brand.primary` edge (the
people who decide are the active role, ADR-0065), `color.text.primary`. End:
`color.semantic.success` edge, `color.semantic.success-text`. Arrows: `color.text.muted`,
`icon.size.xs`, Lucide `chevron-right` (ADR-0068 D6.1). No motion.

**Accessibility.** The figure is named by its caption through `aria-labelledby` (the implicit
`figcaption` name is not computed by every accessibility API). An ordered list, so each
stage's position is announced before its name. Arrows are `aria-hidden` and mirrored in
right-to-left. Colour is never the only signal: start, stages and end differ in their words.

**Responsive.** Wraps onto further lines; never scrolls sideways.

**Not for.** Navigating between steps (`CMP-STEPPER-001`) · the state of one item
(`CMP-APPROVALSTATUS-001`) · what happened to an item (`CMP-AUDITTIMELINE-001`).

**Built:** `apps/dashboard/src/components/admin/approval-flow.tsx`. It takes words, not
policies, so another screen can draw a path from its own facts. Guard:
`approval-flow.spec.tsx` (order, the empty path, arrows out of the accessibility tree) and
the path cases in `policy-manager.spec.tsx`.

---

## D2 — `PT-LISTDETAIL-001` — List–Detail Workspace (Chapter 11)

**When.** A closed set of items the server defines, each with its own settings, edited one at
a time — the approval policies are the first. Not for open-ended records, which follow
`PT-CRUD-001`.

**How it differs from Chapter 12's Side Panel.** The Side Panel is optional quick details
beside a main workspace. Here the detail **is** the workspace, and the list is context
navigation beside it.

**Order on the page** (Chapter 12 §12.3, unchanged): the KPI area first; the filter directly
before the list; then the list and the detail.

**Layout.**

| Width | List | Detail |
| --- | --- | --- |
| `xl`+ | 3 of 12 columns | 9 of 12 |
| `lg` | 4 of 12 | 8 of 12 |
| below `lg` | one Select above the detail (Chapter 8 L3 §N.6: context navigation becomes a compact dropdown on small screens) | full width |

Gutter 24px at `lg`, 32px from `xl` (Chapter 5 §5.2).

**Behaviour.**

- **The filter** is `PT-FILTER-001` drawn as one segmented group, each option naming its own
  count. Counts and KPIs are taken over every item, never over the rows a filter shows.
- **Rows.** Each row is one selectable row (`SELECTABLE_ROW`). The chosen one carries
  `aria-current="true"`: it is the item on show, not a toggle. A row describes the **saved**
  state in words, flags what needs attention in words as well as an icon, and marks an
  unsaved change.
- **Selection** changes the detail at once. Each item keeps its own draft, so moving between
  items loses nothing.
- **Saving** writes the one item on show. The button names that item, and it waits until
  something differs. "Discard changes" returns the draft to the saved state and appears only
  when there is something to discard.
- **An action on the whole group** is a separate control with its own name. It copies the
  **saved** item, and waits while the item on show has unsaved changes, so there is never a
  doubt about which version is copied. It asks first, with the destructive tone
  (`PT-CONFIRMATION-001`: it overwrites other items), listing what will change, what will be
  skipped and why, and which unsaved drafts it will replace. It then runs item by item and
  reports each outcome (`PT-BULKACTION-001`, §EC.6 Partial Success) in a live region that
  exists before it has anything to say. What is safe to change is decided again when the
  action runs, not when it was asked for (CLAUDE.md §31).

**Tokens and components.** All existing: `SELECTABLE_ROW`, `TOGGLE_SEGMENT`, `SelectField`,
`ConfirmDialog`, `StatTiles`, `card.radius`, the surface and border roles. No new value.

**Amended 2026-09-22: the inbox (owner request, the contact messages screen).** The owner
asked for this pattern for the contact-form messages. They are open-ended records, which "When"
above sends to `PT-CRUD-001`. The owner's request decides it (CLAUDE.md §1, priority 1). What
is reused unchanged:

- the order on the page, the layout table and the gutters;
- the filter, as one segmented group with each option's count taken over every message;
- the rows, `aria-current` on the message on show, and the Select below `lg`.

What differs, and why:

- **Order.** Newest first, as the server sends it. The set is not closed and not grouped.
- **No KPI area.** The filter's counts are the numbers an inbox needs.
- **No selection on arrival.** Opening a new message marks it read, so choosing one for the
  reader would mark a message nobody read.
- **No draft and no Save.** A status is one choice, written at once. Its outcome is a toast
  (Chapter 8 L4): success, or an error that leaves the status as it was. The status buttons
  wait while a write for that message is on its way.
- **The open message stays listed** when the filter stops matching it, as the users directory
  keeps the row being edited.
- **No action on the whole group.**

Tokens and components: the same list, plus the toast. **PENDING FIGMA BACK-SYNC:** the screen
has no frame (list, detail, empty inbox, read-only detail, Select below `lg`).

---

## Alternatives considered

- **Every item's settings stacked on one page** — the screen as first built. Rejected: the
  settings of the item the administrator came for sat a long scroll away among twelve others.
- **A table with the settings inline.** Rejected: an arrangement of mode, people, count and
  order does not fit a cell, and the order is itself the policy under `SEQUENTIAL`.
- **The settings in a drawer or Side Panel.** Rejected: the settings are the main job here,
  not quick details.
- **A Stepper for the path.** Rejected: `CMP-STEPPER-001` is navigation. A path nobody moves
  through, drawn as a Stepper, would announce steps a reader cannot reach.

## Consequences and risks

- **The group action is not atomic.** No endpoint writes several policies in one call. An
  interruption leaves the earlier items changed. Mitigation: each outcome is reported by name.
- **§EC.7 and §EC.4 are not met on this screen yet.** Policy writes produce no audit row: the
  global interceptor needs `:id` or a response `_id`, and this route has neither. The EC.10
  "audit emission, always automatic" step therefore does not happen here, for a single save
  or a group action. Recorded as a separate backend item,
  `docs/engineering/post-delivery-backlog.md` §٢ (owner decision 2026-09-21).
- **No activity section and no "last updated by"** — there is no data source for them until
  the item above is done (owner decision P3).

## PENDING FIGMA BACK-SYNC

No Figma frame exists for either pattern. To draw once Figma access returns: the approval
path in its five arrangements, in both directions and both themes · the list–detail workspace
at `xl`, `lg`, `md` and a phone width, in both directions · the confirmation of the group
action and its partial result. Below `lg` the layout is **RESPONSIVE DESIGN NOT VERIFIABLE**:
derived from §N.6, not from a frame.

## Built

Yes, in `apps/dashboard` (2026-09-21): `components/admin/approval-flow.tsx`,
`components/admin/news/policy-{manager,list,detail}.tsx`, and the pure rules in
`lib/admin/approval-policies.ts` (`savedChoice`, `needsAttention`, `matchesFilter`,
`policyStats`). Guards: `policy-manager.spec.tsx`, `approval-policies.spec.ts`,
`approval-flow.spec.tsx`, and the design-system guards in `lib/design-system/`. Verified in
Chromium at 1440, 1280, 1024, 768 and 390px, Arabic and English, light and dark.
