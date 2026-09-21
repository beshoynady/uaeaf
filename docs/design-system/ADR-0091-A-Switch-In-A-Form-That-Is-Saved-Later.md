# ADR-0091 — A switch in a form that is saved later

| | |
| --- | --- |
| **Status** | **Accepted — option A, with its three conditions as written** (owner decision, 2026-09-21). Accepted after the audit below: ten of the eleven switches meet the conditions. The one that does not is recorded as its own item and not changed here. |
| **Amends** | Chapter 8 L2 `CMP-SWITCH-001` (one exception to "Difference from Checkbox") |
| **Concerns** | Chapter 8 L2 `CMP-SWITCH-001` and `CMP-CHECKBOX-001` |
| **Builds on** | ADR-0084 (the hero editor's visible unsaved state and leave warning) · ADR-0089 D2 (the list–detail workspace's unsaved marker and named save) · ADR-0056 §2 (a documented rule is amended on the record, never routed around) |
| **Authority** | Owner decision. |

---

## Context

`CMP-SWITCH-001` draws a clear line:

> A Switch applies its effect **immediately**, typically without a separate "Save" button. A
> Checkbox is part of a form that is submitted later.

The dashboard does not keep that line, and no ADR moved it. `SwitchField`
(`components/admin/homepage-hero/switch-field.tsx`, a native checkbox with `role="switch"`)
draws ten switches across six editors: the hero slide and settings editors, the call-to-action
card, and the sponsors, organisations and sponsor-strip editors. Every one of them edits a
draft that a Save button writes later.

The approval-policies screen (ADR-0089) added an eleventh, "Requires approval", which also
waits for its Save. It was first drawn with a second, hand-built switch; that copy is replaced
by `SwitchField` in the same change as this ADR, so the dashboard has one switch whichever
way this is decided.

This was first reported as a design-system gap. It is not one. The rule exists and the
implementation departs from it, on eleven controls.

## The question

Should an on/off control inside a form that is saved later be drawn as a switch?

## Options

**A — Amend `CMP-SWITCH-001` narrowly.** Immediate effect stays the default. A switch may also
sit in a form saved later when **all three** of these hold:

1. It turns a whole feature or section on or off: autoplay, a slide's visibility, whether
   approval is required. It never selects items from a list; that stays a checkbox.
2. The form shows a visible unsaved state as soon as the switch moves: the hero editor's
   unsaved marker, or ADR-0089 D2's unsaved row and "path after saving" caption.
3. The save names what it saves, or the form warns before the reader leaves with the change
   unsaved.

**B — Keep the rule as written.** Each of the eleven becomes a checkbox (`CMP-CHECKBOX-001`),
in one change across the six editors and the policy screen.

**C — Make those switches immediate** (save on toggle). Rejected for the policy screen:
turning approval on before anyone is named is the deadlock the server refuses. An immediate
switch would either fail or store a policy that stops every publication of that type. The
hero editor's Save also publishes (ADR-0084), so an immediate switch there would publish
half an edit.

## Evaluation

The rule exists for a real reason: a reader who sees a switch move believes the change has
taken effect. If it has not, they can leave without saving. Option A accepts the switch only
where that belief is contradicted on screen at once (condition 2), and where leaving with it
is guarded or the save is unmistakable (condition 3). Option B removes the risk entirely, at
the cost of eleven controls changing across seven screens that have shipped, and of the
switch's reading as "this turns something on" where that is exactly what the control does.

One gap is common to both options. The policy screen has the unsaved marker and the named
save, but **no warning before leaving**. Under A it meets condition 3 through the named save.
Under B it would still benefit from the warning.

## Recommendation

**A**, with its three conditions written into `CMP-SWITCH-001`, and a leave warning added to
the policy screen as its own small item. It keeps one consistent control across the dashboard,
keeps the rule's intent in words a reviewer can check, and changes no shipped screen.

If the owner chooses **B**, all eleven change together in one change, never one screen at a
time: a checkbox on one editor and a switch on the next, for the same kind of setting, is the
inconsistency this ADR exists to end.

## Decision (2026-09-21)

**Option A.** `CMP-SWITCH-001` keeps "immediate effect" as its rule, with one exception: a
switch may sit in a form that is saved later when all three conditions above hold. Condition 3
reads as written: the save names what it saves, **or** the form warns before the reader leaves
with the change unsaved. A switch that fails any condition is drawn as a checkbox
(`CMP-CHECKBOX-001`).

## Audit of the eleven, before acceptance

Every switch was read in code: what it sets, and the form around it.

- **C2 (unsaved state).** Both editor frames (`homepage-hero-editor.tsx`,
  `sponsor-relations/editor-frame.tsx`) show «تغييرات غير محفوظة» in a pinned
  `role="status"` bar as soon as the draft differs.
- **C3 (named save, or a leave warning).** Both frames label their button «حفظ», which does
  **not** name what it saves. Both warn before leaving: `beforeunload`, plus a guard on the
  app's own links. C3 is therefore met through its second half.
- The policy screen meets C2 with its unsaved row marker and "path after saving" caption. It
  meets C3 with a save named after the policy, «حفظ تغييرات «…»». It has no leave warning.

| # | Screen | Switch | What it sets | C1 | C2 | C3 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Hero — call-to-action card | «ظاهر» | The button shown or hidden | ✓ | ✓ | ✓ (leave warning) |
| 2 | Hero — playback | «تشغيل تلقائي» | Autoplay | ✓ | ✓ | ✓ (leave warning) |
| 3 | Hero — next-event bar | «الشريط ظاهر» | The bar shown or hidden | ✓ | ✓ | ✓ (leave warning) |
| 4 | Hero — slide | «استخدام صورة مختلفة للموبايل» | A separate mobile image, on or off | ✓ | ✓ | ✓ (leave warning) |
| 5 | Hero — slide | «الشريحة ظاهرة» | The slide shown or hidden | ✓ | ✓ | ✓ (leave warning) |
| 6 | Partners | «الاتفاقية سارية» (`partnerships.isActive`) | **A fact about the agreement** — the schema: "the relationship's own state, not whether the site shows it" | **✗** | ✓ | ✓ (leave warning) |
| 7 | Partners / memberships | «ظاهر في الموقع» | The record shown or hidden | ✓ | ✓ | ✓ (leave warning) |
| 8 | Sponsors | «علامة VIP» | The VIP mark on the sponsor's card, on or off | ✓ | ✓ | ✓ (leave warning) |
| 9 | Sponsors | «ظاهر في الموقع» | The record shown or hidden | ✓ | ✓ | ✓ (leave warning) |
| 10 | Sponsor strip | «إظهار الشريط» | The strip shown or hidden | ✓ | ✓ | ✓ (leave warning) |
| 11 | Approval policies | «تتطلب موافقة» | Whether review is required | ✓ | ✓ | ✓ (named save) |

**#6 does not meet C1.** It records whether an agreement is in force: a fact, not a feature
turned on or off. Under this ADR it becomes a checkbox. That change is outside this task (the
policy screen) and is recorded as its own item in `docs/engineering/post-delivery-backlog.md`
§٣; nothing on the partners screen is changed here.

**Not required, offered separately:** a leave warning on the policy screen. It already meets
C3 through its named save.
