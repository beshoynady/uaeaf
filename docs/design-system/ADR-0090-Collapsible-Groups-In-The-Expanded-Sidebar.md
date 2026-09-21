# ADR-0090 — Collapsible groups in the expanded sidebar

| | |
| --- | --- |
| **Status** | Accepted (owner decision S7, option A, 2026-09-21). Recorded **before** the build, per ADR-0056 §2. |
| **Extends** | Chapter 8 L3 `CMP-SIDEBAR-001` (its `Expanded` variant gains group disclosure) · Chapter 8 L3 §N.9 (one more persisted state) |
| **Builds on** | ADR-0062 D3 (disclosure navigation, not an application menu) · Chapter 8 L3 §N.7 · Chapter 12 §12.4 |
| **Does not amend** | The dashboard's navigation structure (`NAV_ITEMS`) — it changed the same day by a separate owner decision recorded in the IA, see the note under Context · the Navigation Rail (`CMP-NAVRAIL-001`) · the collapsed sidebar · the Navigation Drawer (`CMP-NAVDRAWER-001`) · any token |
| **Authority** | Owner decision. |

---

## Context

With every group open, the expanded sidebar lists every screen at once. The owner asked for
the groups to fold, the one holding the current screen open and the rest closed, so the
sidebar starts noticeably shorter.

The request named three groups from the design reference — Content, Members, Management. They
do not exist in the dashboard. Its navigation has seven top-level screens and two groups:
**News** (three screens) and **Homepage** (five). Offered the choice, the owner kept the real
structure (option A) and refused a regrouping (option B), "an empty Members group being a
clear sign the design was leading the real navigation". This ADR therefore changes how the
existing groups behave, not what they are.

`CMP-SIDEBAR-001` describes `Expanded`, `Collapsed` and `Overlay`, and persists only whether
the sidebar is collapsed. Nothing in it folds a group.

> **Amended 2026-09-21, the same day (owner decisions G1–G3, `docs/product/01-Information-Architecture.md` §4.8).**
> The dashboard's groups are now three:
> - **News:** two screens.
> - **Homepage:** five screens.
> - **«المستخدمون والوصول» / Users & Access:** Users, Roles & Permissions, and Approval Policies, moved out of News. The Arabic is provisional.
>
> The new group is last in the sidebar, in the IA's order. The approved IA already had this section; placing Users and Roles right after Overview contradicted it. The policy screen's address moved from `/news/policies` to `/approval-policies`, and the old address redirects permanently. Nothing in D1–D6 changes: the new group folds like the others.

---

## D1 — Where groups fold, and where they do not

Only in the sidebar at `lg`+ while it is **expanded** — the one place the group names are
drawn.

| Where | Groups |
| --- | --- |
| Sidebar, `lg`+, expanded | fold (this ADR) |
| Sidebar, `lg`+, collapsed (icons only) | flat, as before: a rule above each group's screens |
| Navigation Rail, `md` | flat, as before |
| Navigation Drawer, below `lg` | flat, full labels, as before |

Folding an icon column would hide screens behind a control that has no visible name.

## D2 — The pattern: disclosure, as in ADR-0062 D3

The group's name becomes a `<button>` with `aria-expanded` and `aria-controls`, and the
group's `<ul>` of links is what it shows or hides. A group is a button and never also a link.
Its name stays the group's own name; the state is `aria-expanded`'s to announce. A chevron
(Lucide `chevron-down`, ADR-0068 D6.1) turns half a turn when open; it is not directional and
is not mirrored.

## D3 — Which groups start open

- With no stored choice, a group is open when it holds the current screen and closed
  otherwise.
- Once the administrator opens or closes a group, that choice is kept for that group and wins
  over the default, on every page, until they change it again.

On `/approval-policies`: Users & Access is open, News and Homepage are closed.

## D4 — Persisted like the collapsed state (§N.9)

A second cookie, `uaeaf_admin_nav_groups`, holds only the groups the administrator has
chosen, as `key:1|key:0`. Its path is `/`, it lasts a year, and it is `SameSite=Lax`. It is
readable by script, like the sidebar and theme preferences. The layout reads it on the
server, so the first paint already has the chosen groups folded, with no jump after
hydration. That is the reason S2 chose a cookie over `localStorage`, and it holds here
unchanged. A group key the navigation no longer has is ignored.

## D5 — The current screen inside a closed group

A closed group that holds the current screen shows a small dot beside its name. The same fact
is also in the button's accessible name as visually hidden text ("contains the current
page"), so it is never carried by colour or shape alone.

## D6 — No height animation

The list appears and disappears at once. §N.8 gives an accordion 150ms
(`--motion-duration-fast`) when it moves. It is not animated here: a height transition needs
either a measured box or a grid-row interpolation, and a list of three to five links does
not justify either. Under `prefers-reduced-motion` it would be instant anyway. The owner can
ask for the 150ms transition later; it would not change D1 to D5.

---

## Alternatives considered

- **Regroup into Content / Members / Management (option B).** Refused by the owner. It
  changes the information architecture, and Members would be empty today.
- **Fold groups in the rail and the collapsed sidebar too.** Rejected: an icon-only column has
  no visible group name to press.
- **Remember only the last page, not each group.** Rejected: the owner asked for each group's
  state to be kept.
- **`localStorage`.** Rejected for the reason S2 records: the server could not draw the first
  paint correctly.

## PENDING FIGMA BACK-SYNC

No Figma frame shows the dashboard sidebar with folding groups. To draw once Figma access
returns: the expanded sidebar with its three groups (News, Homepage, «المستخدمون والوصول»),
one open and the others closed, the closed-group indicator,
and the chevron in both states, in both directions and both themes.

## Built

Yes, 2026-09-21, the same day and after this record: `SidebarNav`'s `foldGroups` and
`initialGroups` (the sidebar passes them, the drawer does not), `parseNavGroups` and
`navGroupsCookie` in `lib/shell/sidebar-preference.ts`, read by the signed-in layout. Guards:
`components/shell/sidebar-nav.spec.tsx`, `lib/shell/sidebar-preference.spec.ts`, and a case
in `app-shell.spec.tsx`.

**Measured in Chromium:**

- First paint on `/news/policies` at 1440px: News open, Homepage closed, and the navigation
  572px tall instead of 812px.
- A choice made on one page is already in place at DOMContentLoaded on the next.
- Enter on a focused group toggles it. A closed current group is named
  "News contains the current page".
- The collapsed sidebar, the rail at 768px and the drawer at 390px draw every list, with no
  fold control.
- English/left-to-right matches.
- No console errors.

**Measured again after G1–G3**, same day:
- On `/ar/approval-policies` the order is Overview, Pages, President's Message, Vision & Mission, Strategic Plan, then the groups News (closed), Homepage (closed) and «المستخدمون والوصول» (open), with Approval policies current.
- `/ar/news` opens News only.
- `/ar/news/policies`, `/en/news/policies` and `/news/policies` answer 308 to the new address.
- The collapsed sidebar and the rail draw all 15 screens.
- English matches.
- No console errors.

The measurements above that name `/news/policies` were taken before the move.

A guard caught one defect on the way. The design-system focus-indicator rule reads class
strings where they are written, so the button's classes sit on the element and not in a
constant.
