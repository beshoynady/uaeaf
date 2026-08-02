# Chapter 8 — Component Inventory

## Level 2: Forms Components (Form Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L2 of 8) | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item — **MUST NOT** directly modify the content of this chapter outside these two mechanisms.

> **Baseline Freeze Rule:** Chapter 8 Framework (L1 + Global Component Governance + ADR-0001→0013) is frozen as **Baseline v1.0**. Any new requirement arising during the writing of L2–L8 **MUST** be recorded in the Backlog or resolved through a new ADR later — **MUST NOT** directly modify the Baseline during implementation (prevents a Moving Target).

## Depends On / Used By

| Depends On                                                                                                                    | Used By                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Button, Icon, Typography) · Chapter 8 Global Governance (G.1-G.12, ADR-0012/0013) | L3-L8 (similar input patterns) · Chapter 11 (UX Patterns: Wizard, CRUD Forms) · Chapter 13 (CMS Forms) |

## Scope

**Covers:** L2 as a complete **Form Foundation** — not merely input elements, but the general contracts for every form in the system (field composition, validation lifecycle, error presentation, controlled/uncontrolled behavior) + 23 individual input components as implementations of these contracts.

**Does not cover:** Composite form patterns (multi-step Wizard → Chapter 11), specialized CMS forms (→ Chapter 13).

## Definitions

| Term                     | Definition                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Field**                | The complete unit: Label + Input + Help Text + Error Message together — not the Input alone               |
| **Validation Lifecycle** | The timeline during which a value's validity is checked (while typing / on blur / on submit)              |
| **Read-only**            | The value is visible and cannot be modified, but **can be selected and copied**                           |
| **Disabled**             | The element is completely non-interactive, usually because its value is irrelevant to the current context |

## Purpose

This **Form Foundation** section is the **single contract** governing form behavior across the entire platform — every individual input component below **MUST** reference it and **MUST NOT** redefine Label, Error, or Required behavior in its own way.

---

# ADR-0014: Forms Architecture & Validation Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Authority**               | Engineering Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Context**                 | 23 upcoming input components require a unified validation and state-management strategy before documenting individual components; otherwise each component would invent its own pattern                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Decision**                | Every field **MUST** support **Controlled Mode** as the primary option (consistent with G.9, Chapter 8 Governance), with direct compatibility (no additional wrapper) with common form-management libraries (React Hook Form as the implementation reference). Validation **MUST** occur visually on `blur` by default (not while typing — Chapter 6 §6.5), with optional `onChange` for special cases (e.g. immediate password confirmation). **Unified API Rule (MUST):** Every Controlled component **MUST** expose its primary value through `onChange(value)` directly (the value itself, not the raw event) — raw DOM events **MAY** additionally be exposed through a separate `onChangeEvent` only when genuinely necessary, not as a default behavior reinvented by every component |
| **Alternatives Considered** | Enforcing a single Form State library (such as Formik) inside the Design System itself — rejected because it restricts the application consuming the system; the better approach is to provide a Contract (Props/Callbacks) compatible with any library                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Why This Decision**       | Separates the “field appearance” (this chapter) from the “complete form state-management logic” (application responsibility) — preserves PR-008 Built to Scale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Risks**                   | Complex fields (Date Range, File Upload) may require more internal state than simple fields. Mitigation: §Form Foundation §Validation Lifecycle documents the allowed exceptions for each field type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Consequences**            | Every input component below **MUST** follow the same format (`value`/`onChange` or `defaultValue`, `error`, `required`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

---

# Form Foundation — Shared Sections

### Inherited by every component below

## F.1 Field Composition

Every field = `<Field>` Compound Component (Chapter 8 G.11):

`<Field.Label>` + `<Field.Control>` (the actual Input) + `<Field.HelperText>` + `<Field.Error>`.

The DOM order **MUST** remain fixed across all fields — for example, no field may display the error above the Label.

## F.2 Validation Philosophy

`blur` is the default validation point (Chapter 6 §6.5: avoid disturbing screen-reader users while typing).

**The only permitted exception:** fields requiring immediate confirmation (password matching, username availability) **MAY** validate while typing (`onChange`) provided there is a debounce of **≥300ms**.

### F.2.1 Field State Model

Every field **MUST** logically pass through the same sequence, regardless of its type — this is the foundation for Error Message, Success Message, Character Counter, and Wizard (Chapter 11), without each one inventing its own state model:

```text
Pristine (not touched yet)
→ Dirty (value changed)
→ Touched (lost focus at least once)
→ Validated (validation passed/failed)
→ Submitted (part of a successful submission)
```

**Precise definition of Dirty (MUST):** `Dirty` represents the difference from the initial value (`defaultValue`) at any given moment, not merely whether the user has typed something before.

If the user modifies the field and then manually restores it to its original value, the field **MUST** automatically return to `Dirty=false` — the comparison is live and continuous, not a flag that is permanently enabled once triggered.

**Field Identity (MUST):** The identity of a field, which is tied to its internal Dirty/Touched/Value state, **MUST** remain stable across re-renders as long as the field has not logically changed.

Changing the React `key` **MUST NOT** be used as an implicit mechanism for resetting field state, as this causes unexpected state loss. Use the explicit `reset()` from §F.11 instead.

### F.2.2 Async Validation Contract

For asynchronous validation (username availability, email existence, searching for a federation registration number), standardized states **MUST** be used instead of every component inventing its own Loading behavior:

```text
Idle → Loading (small Spinner inside the field, Chapter 8 L1)
→ Success | Error | Cancelled
```

Any new validation request **MUST** cancel the previous unfinished request for the same field.

This prevents race conditions where an older result arrives after a newer result.

## F.3 Error Handling & Presentation

The error message **MUST** be fully descriptive (Chapter 9 will expand the wording rules later) and associated with the field through `aria-describedby` (Chapter 6 §6.5).

**MUST NOT** rely on red color alone — a warning icon **MUST** always accompany the text.

## F.4 Required Field Indicator

An `*` after the Label + `aria-required="true"` **MUST** always be used together, never one without the other.

A general explanatory text at the top of the form — e.g. **“Fields marked with * are required”** — **SHOULD** be displayed once instead of repeating it.

## F.5 Help Text Rules

Help text **MUST** always appear below the field.

A Tooltip **MUST NOT** be the sole replacement, because Tooltips are not easily accessible to touch users.

The text **SHOULD** be one short sentence, not a paragraph.

## F.6 Disabled vs Read-only — Critical Distinction

|                       | Disabled                                                                                                         | Read-only                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Keyboard focusable    | No                                                                                                               | Yes                                                                                 |
| Selectable / Copyable | No                                                                                                               | **Yes**                                                                             |
| Typical reason        | Not available in the current context (e.g. a field dependent on a previous selection that has not yet been made) | Displayed for information only (e.g. a player's registration number after approval) |
| Visual state          | Dimmed (`opacity.disabled`)                                                                                      | Distinct neutral background, without dimming                                        |

## F.7 Controlled vs Uncontrolled Forms

Refer to ADR-0014 and Chapter 8 Governance §G.9 — every field supports both modes where logically applicable.

Fields with no internal value state (rare in L2) are exempt.

## F.8 Keyboard Model — General for All Fields

`Tab` / `Shift+Tab` navigate between fields.

`Enter` **MUST NOT** automatically submit the form from inside a `Textarea` — only from simple text fields or an explicit submit button.

All fields follow the logical Tab Order specified in Chapter 6 §6.3.

## F.9 Form Accessibility Rules

Everything above applies Chapter 6 §6.5 Forms Accessibility literally.

This section does not repeat it; rather, it is the direct practical application of those rules at the complete-form level, not merely the individual-field level.

For example, keyboard navigation order must reflect the logical order of the entire form, not each field in isolation.

## F.10 Form Submission Contract

The single reference for the submission lifecycle of any form across the platform — later consumed by Wizard (Chapter 11), CMS (Chapter 13), Login, and any future Workflow Form:

```text
Client Validation
→ Async Validation (if applicable, §F.2.2)
→ Submit
→ Pending
→ Success | Failure
```

The submit button **MUST** enter the `Loading` state (Chapter 8 L1 Button) immediately after being pressed.

Repeated submission **MUST NOT** be allowed while `Pending`.

On `Failure`, a general form-level error message **MUST** be displayed — not only individual field errors — explaining the reason when the failure is not associated with a specific field, such as a network error.

**Focus Management After Submission Failure (MUST, WAI-ARIA Best Practice):**

The mandatory sequence is:

```text
Focus → Error Summary → First Invalid Field
```

Focus must not remain on the submit button, and it must not move directly to the first field without an Error Summary that first explains the total number of errors.

## F.14 Server-side Validation Mapping

Validation errors returned by the server (e.g. `422 email already exists`) **MUST** automatically map to their corresponding fields whenever possible, using the field name in the API response.

Errors that are not associated with a specific field — authorization, network, general server failure — **MUST** appear in the form-level Error Summary (§Form Submission Contract above), rather than being lost or ignored.

## F.11 Form Reset Contract

When resetting the form:

* All fields **MUST** return to their initial value (`defaultValue`)
* Validation errors **MUST** be completely cleared
* Pending asynchronous validation requests (§F.2.2) **MUST** be cancelled
* Dirty and Touched states (§F.2.1) **MUST** return to Pristine
* Focus **SHOULD** return to the first interactive field unless the Workflow explicitly specifies otherwise (e.g. keeping focus on the action button in certain Wizard cases)

## F.12 Autofill Contract

Browser autofill values — password, email, address — **MUST** trigger the same validation lifecycle (§F.2) as if the user had entered them manually.

There is no exception for Autofill.

The design **MUST** remain visually consistent under browser-default Autofill styles, with no severe color conflict against the Autofill background, such as the common yellow Autofill background in Chrome.

## F.13 IME Composition Rule

Validation **MUST NOT** be executed during an active IME Composition Session.

This is important for Arabic input using composed keyboards and for languages relying on IME, such as Chinese, Japanese, and Korean.

Detection **MUST** use the standard `compositionstart` / `compositionend` events rather than a custom solution for each field.

---

# Standard L2 Component Template

The following structure is fixed from now through L8:

**Purpose · Anatomy · Variants · Sizes · States · Content Rules · Behavior · Keyboard Interaction · Accessibility · Responsive Behavior · Design Tokens Used · API Contract · Composition Rules · Validation Rules · Related Governance · QA Checklist · Related Components**

### Standard “Related Governance” format

Mandatory from L3 onward:

```text
Related Governance:
• Form/Level Foundation (§X.1–X.N specifically relevant sections)
• Chapter 8 Global Governance (§G.1–G.12 specifically relevant sections)
```

*(L2 below uses a concise textual equivalent with the same meaning; the bullet format above becomes the mandatory literal standard starting from L3 to ensure complete visual consistency across the document.)*

---

# Core Inputs

## CMP-INPUT-001 — Input (Text)

**Purpose:** Single-line text input — the most frequently used field throughout the system.

**Anatomy:** Complete `<Field>` (§F.1) + `<input type="text">`.

**Variants:** `Default` · `With Icon` (prefix/suffix) · `Clearable` (clear button).

**Sizes:** `sm` / `md` / `lg` (matches Button, Chapter 8 L1).

**States:** Default / Focus / Filled / Error / Disabled / Read-only (§F.6).

**Behavior:** Validation on `blur` (§F.2).

**API Contract:** `id`, `name`, `value`/`defaultValue`, `onChange`, `error: string`, `required: boolean`, `disabled`, `readOnly`, `placeholder`, `autoComplete`.

These are also part of the accessibility contract — Chapter 6 §6.5 — not merely styling Props.

**Validation Rules:** The `error` prop automatically activates `<Field.Error>` and associates it through `aria-describedby`.

**Related Governance:** Complete Form Foundation + G.9/G.10/G.12.

**QA Checklist:** ☐ Label associated? ☐ Error associated through `aria-describedby`?

---

## CMP-TEXTAREA-001 — Textarea

**Purpose:** Multi-line text input (club description, administrative notes).

**Anatomy:** Same as Input + resizable height (`resize: vertical` only; horizontal resizing is prohibited because it breaks the grid, Chapter 5).

**Variants:** `Fixed Height` · `Auto-grow` (expands with content up to a maximum limit).

**Sizes:** Defined by number of lines (`rows={3|5|8}`), not by `sm/md/lg`.

**States:** Same as Input.

**Behavior:** `Enter` **MUST NOT** submit the form (§F.8).

**API Contract:** Same as Input + `rows`, `autoGrow: boolean`, `maxLength`.

**Related Governance:** Form Foundation.

**QA Checklist:** ☐ No horizontal resize?

---

## CMP-LABEL-001 — Label

**Purpose:** Independent reusable component, although it is normally part of `<Field>`, it may also be used independently.

**Anatomy:** Textual `<label>` + optional required indicator (§F.4).

**Behavior:** `for` / `htmlFor` **MUST** always match the field's `id` — this semantic relationship is foundational to Chapter 6 §6.5.

**Related Governance:** §F.4.

---

## CMP-FIELD-001 — Field (Wrapper)

**Purpose:** Compound component combining Label + Control + HelperText + Error in a fixed DOM order (§F.1) — the foundation upon which all fields above and below are built.

**Composition Rules:**

`<Field>` **MUST** render `children` with flexible internal ordering, but the final visible order **MUST** remain visually fixed:

**Label → Control → Help → Error**

(Chapter 8 G.11).

`<Field>` **MUST** automatically generate a unique and stable `id` when one is not explicitly provided, ensuring valid `aria-*` relationships (Label ↔ Control ↔ Error) in every case without relying on developers to remember to provide one.

**Related Governance:** The entire Form Foundation is applied centrally here.

---

## CMP-HELPERTEXT-001 — Helper Text

**Purpose:** Implementation of §F.5 as an independent reusable component.

**Anatomy:** Small text (`typography.caption`, Chapter 4) below the field.

**Related Governance:** §F.5.

---

# Selection

## CMP-CHECKBOX-001 — Checkbox

**Purpose:** Binary or multiple selection (e.g. selecting multiple age categories for a filter).

**Anatomy:** Square box + checkmark when selected + Label beside it (right in RTL).

**Variants:** `Default` · `Indeterminate` (partial selection of a subset).

**Sizes:** `md` only in most cases; significant size variation is not required.

**States:** Unchecked / Checked / Indeterminate / Disabled.

**Keyboard Interaction:** `Space` toggles the state.

**API Contract:** `checked` / `defaultChecked`, `onCheckedChange`, `indeterminate: boolean`.

**Related Governance:** G.9 (Controlled/Uncontrolled), G.12.

---

## CMP-RADIOGROUP-001 — Radio Group

**Purpose:** Selecting one option from multiple mutually exclusive choices (e.g. tournament type).

**Anatomy:** `<RadioGroup>` parent containing multiple `<Radio>` elements.

**Behavior:** Selecting one option **MUST** automatically deselect the others within the same group (`name` shared).

**Keyboard Interaction:** Directional arrows (`↑↓`) navigate between options inside the group, rather than using `Tab` between each option individually — standard WAI-ARIA Radio Group behavior.

**API Contract:** `value` / `defaultValue` at the group level, not on each individual Radio.

**Related Governance:** G.9, G.11 (Compound Component).

---

## CMP-SWITCH-001 — Switch

**Purpose:** Immediate state toggle (e.g. enabling/disabling a club, toggling Dark Mode).

**Difference from Checkbox:** A Switch applies its effect **immediately**, typically without a separate “Save” button.

A Checkbox is part of a form that is submitted later.

This behavioral distinction is important for developers.

**Anatomy:** Horizontal track + animated circular thumb.

**Behavior:** Animation follows Chapter 5 §5.6 (`motion.transition.fast`).

**Keyboard Interaction:** `Space` / `Enter`.

**API Contract:** Same as Checkbox (`checked`, `onCheckedChange`).

**Related Governance:** G.9, G.12, Chapter 5 (Motion).

---

# Choice

## CMP-SELECT-001 — Select

**Purpose:** Selecting one option from a known list (e.g. a club from the list of registered clubs).

**Anatomy:** Closed field displaying the selected value → opens a list when activated.

**Variants:** `Native` (for simple cases and higher performance) · `Custom` (fully designed, for supporting icons/formatting inside options).

**Behavior:** The list **MUST** close using `Esc` or by clicking outside it (Chapter 6 §6.3).

**Keyboard Interaction:** Directional arrows for navigation, `Enter` for selection, and Type-ahead to jump to an option beginning with a specific character.

**API Contract:** `value` / `defaultValue`, `onChange`, `options: {label, value}[]`.

**Related Governance:** G.9, G.12.

---

## CMP-COMBOBOX-001 — Combobox

**Purpose:** Selecting from a long list while allowing typing for filtering (e.g. selecting a player from hundreds of players).

**Difference from Select:** A Combobox is writable/searchable; Select is intended for direct selection only.

**Anatomy:** Text field + dropdown list filtered while typing.

**Behavior:** Filtering **SHOULD** be Client-side for lists under 500 items and Server-side (actual search) for larger datasets. It will integrate with Chapter 16 AI Search in the future.

**Keyboard Interaction:** Same as Select + free text input.

**Related Governance:** G.9, G.12, Chapter 3 §Performance (Debounce for search).

---

## CMP-AUTOCOMPLETE-001 — Autocomplete

**Purpose:** A special case of Combobox that suggests results from an external data source (e.g. searching for a club by name).

**Difference from Combobox:** Autocomplete always uses a dynamic/remote source (API); Combobox may use a fixed local list.

**Behavior:** A Loading state **MUST** be displayed while waiting for results (Chapter 8 L1: Spinner).

**Related Governance:** Built directly on CMP-COMBOBOX-001 — it does not redefine the same behavior.

---

# Numeric & Date

## CMP-NUMBERINPUT-001 — Number Input

**Purpose:** Input for numeric values only (player weight, record).

**Anatomy:** Input + optional increment/decrement buttons (Stepper).

**Variants:** `With Stepper` · `Plain`.

**Behavior:** Non-numeric input **MUST** be rejected immediately, without waiting for `blur`.

This is the only exception to §F.2 because this is data-type validation rather than business-rule validation.

**Note:** The behavior for accepting/rejecting special characters (`-`, `.`, `,`, `e`) and decimal/thousands separator rules depends on the parsing strategy documented in Chapter 19 (Calendar & Localization).

It is not defined literally here to avoid behavioral conflicts between browsers.

**API Contract:** `min`, `max`, `step`, in addition to the standard Input contract.

**Related Governance:** Form Foundation + §F.2 exception explicitly documented here.

---

## CMP-SLIDER-001 — Slider

**Purpose:** Selecting a value or range from a visible range (a visual alternative to numeric fields for an age-range filter).

**Anatomy:** Horizontal track + thumb (or two thumbs for a range).

**Keyboard Interaction:** Directional arrows change the value according to the `step`.

**Accessibility:** `role="slider"` with live-updated `aria-valuenow/min/max` **MUST** be provided.

**Related Governance:** G.12.

---

## CMP-DATEPICKER-001 — Date Picker

**Purpose:** Selecting a single date (player date of birth, event date) — consumes the calendar system from the Discovery Phase (Gregorian primary, optional Hijri alongside it).

**Anatomy:** Input + calendar popup upon activation.

**Behavior:** **MUST** be extensible to support a Hijri calendar alongside Gregorian in the future without redesign (original Discovery decision).

**Timezone Note:** Every date **MUST** be stored and sent to the server using a unified UTC/Local format (full details in Chapter 19). The component itself displays dates using the user's local timezone.

**Critical Rule:** Values of type **Date-only**, without a time component — such as a player's date of birth — **MUST** remain completely timezone-independent. No UTC/Local conversion is applied to them.

Timezone conversion **MUST** only apply to complete Date-Time values, such as the start time of an event.

**Keyboard Interaction:** Directional arrows navigate between days inside the calendar popup; `PageUp/PageDown` navigate to the previous/next month, following the standard WAI-ARIA Date Picker pattern.

**Related Governance:** G.12, Chapter 19 (Calendar & Localization — later).

---

## CMP-TIMEPICKER-001 — Time Picker

**Purpose:** Selecting a time (event start time).

**Anatomy:** Similar to Date Picker but using hour/minute wheels or lists.

**Related Governance:** Built on the same foundation as CMP-DATEPICKER-001.

---

## CMP-DATERANGEPICKER-001 — Date Range Picker

**Purpose:** Selecting a range between two dates (tournament period from/to).

**Anatomy:** Two calendars side by side or a single calendar with start/end selection.

**Behavior:** **MUST** prevent selecting an end date before the start date through immediate logical validation, not on `blur`.

**Official Policy:** If the user selects a date earlier than the current start date as the “end”, the system **MUST** reset the selection and treat it as a new start date, beginning a new range.

It **MUST NOT** silently swap start and end dates, as this can conflict with user expectations.

**Related Governance:** Built on CMP-DATEPICKER-001.

---

# Upload

## CMP-FILEUPLOAD-001 — File Upload

**Purpose:** Uploading general files (documents, medical certificates for athletes).

**Anatomy:** Drag & Drop area + a traditional Browse button that is always available.

Drag & Drop alone is prohibited because it is not fully keyboard-accessible.

**States:** Idle / Dragging / Uploading (Progress Bar) / Success / Error / **Retry**.

`Retry` is a recoverable state after Error, allowing the user to retry the same file without having to select it again.

**Accessibility:** A real `<input type="file">` **MUST** exist, visually hidden but still keyboard- and screen-reader-accessible behind the designed Drag & Drop area.

**Security Note:** Virus scanning, validation of the actual file type (MIME rather than extension alone), maximum file count, and duplicate prevention are delegated to Chapter 17 (Data Privacy & Identity Architecture).

These checks are not implemented in the presentation layer.

**Related Governance:** G.3 (Performance — maximum file size must be defined and displayed to the user before upload), G.12.

---

## CMP-IMAGEUPLOAD-001 — Image Upload

**Purpose:** Special case of File Upload with immediate image preview.

**Difference:** Displays a Thumbnail immediately after selection before upload completion.

**Behavior:** Image compression/resizing **MUST** occur client-side before upload wherever possible (supports Chapter 5 Performance).

**Related Governance:** Built on CMP-FILEUPLOAD-001.

---

## CMP-SIGNATUREPAD-001 — Signature Pad

**Purpose:** Digital signature (parent/guardian approvals for minor data — Chapter 0 Discovery: Digital Child Safety Law).

**Anatomy:** Touch/mouse drawing area + Clear/Confirm buttons.

**Accessibility:** A text alternative or alternative approval method **MUST** be provided for users unable to draw manually (Chapter 6 §POUR Operable).

**Related Governance:** G.12, Chapter 17 (Data Privacy — later; directly related to minor consent).

---

# Validation Components

## CMP-ERRORMESSAGE-001 — Error Message

**Purpose:** Implementation of §F.3 as an independent component.

**Anatomy:** Warning icon + text (Chapter 6 §6.2 — color alone is insufficient).

**Related Governance:** §F.3 in full.

---

## CMP-SUCCESSMESSAGE-001 — Success Message (Inline)

**Purpose:** Confirmation of successful field-level operation, distinct from the general Toast in L4.

This message is embedded directly within the field itself, e.g. **“Username available ✓”**.

**Related Governance:** Same structure as Error Message but using `color.semantic.success`.

**Scope Note:** Warning and Info feedback — general warnings/information not related to input errors — are covered by L4 Feedback Components (Alert/Toast).

They are not repeated here because L2 is concerned only with individual-field states: valid/invalid.

---

## CMP-CHARCOUNTER-001 — Character Counter

**Purpose:** Visible character counter for fields with a maximum length (e.g. a club bio limited to 200 characters).

**Anatomy:** Small text below the field, e.g. `"45/200"`.

**Behavior:** **SHOULD** change to a warning color when approaching the limit (last 10%) and to a danger color when exceeding it.

The count **MUST** use Unicode Grapheme Cluster units wherever technically possible, rather than raw UTF-16 length.

A compound emoji — such as a multi-part family emoji — **MUST** count as one character as perceived by the user, not as multiple technical units.

**Accessibility:** Screen readers **MUST NOT** announce the remaining count on every keypress, as this is disruptive.

It **MUST** announce only when crossing defined thresholds, such as 50%, 90%, and 100%, using carefully managed `aria-live="polite"`.

**Related Governance:** §F.5 (appears alongside Helper Text).

---

# Advanced

## CMP-OTP-001 — OTP Input

**Purpose:** Entering a segmented verification code (phone/email verification during login).

**Anatomy:** Separate boxes, typically 4–6, with one digit per box.

**Behavior:**

* **MUST** automatically move to the next box after entering a digit.
* **MUST** move back to the previous box when `Backspace` is pressed on an empty box.
* **MUST** support pasting a complete code and automatically distribute it across all boxes.

**Accessibility:** The component **MUST** remain understandable to screen readers as one logical code field despite the visual segmentation.

It **MUST** support browser autofill for received SMS codes where available through:

`autocomplete="one-time-code"`

**Related Governance:** G.12.

---

## CMP-SEARCHINPUT-001 — Search Input

**Purpose:** General text search (searching for a player/news item on the public website).

**Difference from standard Input:** Fixed search icon + mandatory Debounce behavior + quick Clear button.

**Behavior:**

Search requests **MUST** use a `debounce` of **≥300ms** before launching any search request (Chapter 3 Performance).

Any new search request **MUST** cancel the previous unfinished request using `AbortController` or an equivalent cancellation mechanism.

This applies the same principle as §F.2.2 Async Validation Contract to prevent old results from arriving after newer results.

Completely clearing the search field **MUST** cancel any pending request and immediately clear displayed results.

Old results **MUST NOT** remain visible after the search text has been removed.

**Related Governance:** Built on CMP-INPUT-001 + Chapter 11 (Search Pattern — later expands this to the full-page level).

---

## CMP-PASSWORDFIELD-001 — Password Field

**Purpose:** Password input (Dashboard only — no public registration, Chapter 0 Discovery).

**Anatomy:** Input `type="password"` + Show/Hide button (Icon Button, Chapter 8 L1).

**Accessibility:**

The Show/Hide button **MUST** have a dynamically changing `aria-label`:

* `"Show password"`
* `"Hide password"`

`autoComplete="current-password"` **MUST** be used for login.

`autoComplete="new-password"` **MUST** be used for registration/password change.

This is mandatory for compatibility with password managers and is part of the accessibility contract, not an optional technical detail.

**Related Governance:** Built on CMP-INPUT-001 + CMP-ICONBUTTON-001 (Chapter 8 L1).

---

## CMP-COLORPICKER-001 — Color Picker

### *(Optional — Very Limited Use in This Project)*

**Purpose:** Color selection (extremely rare in the UAEAF context — possibly for future club logo customization).

**Status:** `Experimental` (Chapter 8 Governance §G.2) — not currently required by any documented Workflow; documented for completeness only.

**Related Governance:** G.2 (Lifecycle Status).

---

# Do & Don't — General L2

**Do:**

* Always start any new field from `<Field>` (CMP-FIELD-001).
* Follow §F.2 (validation on `blur`) except for explicitly documented exceptions.

**Don't:**

* Do not create a new field without going through the Form Foundation.
* Do not repeat Label/Error/Required rules inside individual component documentation.
* Refer to §F.1–F.14 instead.

---

# Success Metrics

* **23/23** L2 components documented and linked to the Form Foundation.
* **100%** of fields support Controlled Mode (ADR-0014).
* **0** duplication of §F.1–F.14 rules inside individual component documentation.
* **100%** keyboard navigability across all fields.
* **100%** screen-reader compatibility.
* **0** duplicated validation rules between different components.
* **100%** Controlled/Uncontrolled parity across components where applicable.

---

# References

**Normative:**

* Chapter 6 (§6.5 Forms Accessibility)
* Chapter 8 Global Governance (G.1-G.12)
* Chapter 7 (Semantic Tokens)

**Implementation:**

* React Hook Form (compatibility reference, not a mandatory dependency)
* Radix UI (Select, Checkbox, RadioGroup primitives)
* WAI-ARIA APG (Combobox, Date Picker patterns)

---

# Related Chapters

* Chapter 6 §6.5
* Chapter 8 L1 (Button, Icon, Spinner consumed here)
* Chapter 8 Global Governance
* Chapter 11 (UX Patterns expands Wizard/CRUD Forms)
* Chapter 13 (CMS Forms)
* Chapter 19 (Calendar & Localization)

---

*End of L2 Forms/Form Foundation (23/23 components + 9 shared sections). Next: L3 Navigation Components.*
