# Chapter 9 — Content Design System (Content Governance Framework)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                                                 | Used By                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Chapter 0 (§0.6 Tone of Voice, §Brand Personality) · Chapter 4 (Typography) · Chapter 6 (Accessibility — Error Messages) · Chapter 8 (all levels L1-L8 — all text within them refers here) | Chapter 11 (UX Patterns) · Chapter 13 (CMS Editorial) · Chapter 16 (AI Content) · Chapter 20 (Page Templates) |

## Scope

**Covers:** The complete content governance framework across eight levels — from voice and tone to standardized athletics terminology.

**Does not cover:** Actual editorial content (news, articles — the responsibility of the Media Team), or automated translation (Chapter 0 Discovery: rejected; separate content is maintained for each language).

## Definitions

| Term                       | Definition                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Content Rule (CR)**      | A mandatory writing rule for a specific content type, defined once and consumed by every component (Chapter 8) instead of being repeated |
| **Plain Language**         | Writing at a simple reading level that can be understood by the broadest possible audience without compromising accuracy                 |
| **Terminology Governance** | A centralized approved list of recurring terms (event name, result type) that prevents multiple phrasings for the same concept           |

## Purpose

Chapter 8 defined **“what the components are”**; this chapter defines **“how they speak.”** Every piece of text in any Chapter 8 component (Button label, Error Message, Empty State) **MUST** follow a rule defined here, rather than being freely written ad hoc.

---

# ADR-0021: Content Consistency Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Authority**               | Product Decision (directly complements Chapter 8 ADR-0020)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Context**                 | Dozens of components (Chapter 8) require text — without a central source, the same state (network error, save success) would be phrased in dozens of different ways over time and across contributors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Decision**                | All text **MUST** come from Content Rules documented here — **MUST NOT** have any text hardcoded inside component logic (Chapter 8 §Component API Contract consumes text as a Prop/Message Key rather than embedding it). All messages **MUST** be structurally translation-ready (i18n-ready), even if the actual content currently exists only in Arabic/English (Chapter 0 Discovery). **Content MUST remain independent from implementation** — changing text must not require modifying component code. The same state **MUST** use exactly the same message throughout the system (not “Saved” in one place and “Changes saved successfully” in another for the exact same event) |
| **Alternatives Considered** | Leaving wording to the discretion of each developer/editor at writing time — rejected (same rationale as Chapter 8 ADR-0016 rejecting leaving Feedback Level selection without governance)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Why This Decision**       | Ensures consistent voice (Chapter 0 §0.6) across hundreds of user touchpoints over the years and across multiple contributors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Risks**                   | Excessive centralization may slow down writing urgent one-off copy. **Mitigation:** A simplified Proposal path (similar to Chapter 3 §3.5) for quickly adding a new Content Rule when genuinely needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Consequences**            | Every component section in Chapter 8 (retroactively) **MUST** be updated to reference a Content Rule from this chapter instead of directly embedding the example text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

---

# Level 1 — Content Foundations

### CR-1.1 Voice & Tone

Applies Chapter 0 §0.6 literally: **confident, clear (short sentences), respectful, motivating without exaggeration, and human.**

### CR-1.2 Writing Principles

Clarity before creativity · Accuracy before speed · Professionalism before showmanship (Chapter 0).

**One sentence = one idea.**

### CR-1.3 Plain Language

**MUST** avoid technical terminology in content intended for the general public (use “We couldn’t save your changes” rather than “PATCH request failed”).

The Operational Dashboard **MAY** use more precise technical terminology for specialized audiences.

### CR-1.4 Reading Level

**SHOULD** use sentences of ≤20 words in general public-facing UI copy.

Long editorial paragraphs (news) are exempt, as they are outside the scope of this chapter.

### CR-1.5 Inclusive Language

**MUST NOT** make gender or cultural assumptions in general addressing (“Welcome” is neutral rather than “Welcome, Sir”).

### CR-1.6 Arabic / English Consistency

Every message **MUST** exist in both Arabic and English with the same meaning (no literal machine translation, Chapter 0).

The tone **MAY** differ slightly to suit the nature of each language, as long as meaning and accuracy are preserved.

### CR-1.7 Terminology Governance

One term per concept across the entire platform, registered in a centralized terminology registry (intersects with Level 8).

Mandatory example: **“100-meter race”** is the only approved wording — **MUST NOT** randomly substitute it elsewhere with “100m” or “100M race.”

### CR-1.8 Capitalization

**English:** Use Sentence case for buttons and subheadings (`Save changes`, not `Save Changes`), and Title Case only for proper names (official competition names).

**Arabic:** Capitalization does not apply as a concept — discipline here is maintained through correct diacritics and Hamza spelling only.

### CR-1.9 Date / Time Formatting

Directly consumes Chapter 19 (Calendar & Localization) — **MUST NOT** redefine date formatting here.

### CR-1.10 Number Formatting

Use Western Arabic numerals consistently (Chapter 4 Backlog preliminary decision), with thousands separators according to the display language.

Sports times use a fixed format (`00:12.45`) regardless of language (Chapter 8 L2 §NumberInput refers to this section).

### CR-1.11 Sentence Length by Context

**SHOULD** adapt sentence length to context rather than enforcing one fixed number across the entire system:

* Headings and buttons (Chapter 8 L1): ≤6 words
* Status messages (§CR-2.7): ≤15 words
* Helper text (§CR-2.3): ≤20 words
* Long-form editorial content is entirely outside this chapter’s scope.

---

# Level 2 — UI Content

### CR-2.1 Labels

Use a clear verb or noun; avoid ambiguous wording (“Club” rather than “Name” for a club-name field in an ambiguous context).

### CR-2.2 Field Help / Placeholder Rules

**MUST NOT** use Placeholder as a replacement for a Label (Chapter 8 L2 §F.1 — directly aligned).

Placeholder **MAY** be used only as an illustrative example (“Example: Dubai Athletics Club”).

### CR-2.3 Helper Text

One short sentence beneath the field (Chapter 8 L2 §F.5) — not a long explanatory paragraph.

### CR-2.4 Tooltips

Extremely concise wording (Chapter 8 L4 §Tooltip) — **MUST NOT** contain information essential to completing the task.

This repeats the Chapter 8 L4 rule and is not redefined here.

### CR-2.5 Empty States

Use a consistent pattern:

**State description + invitation to act**

Example: “No clubs are registered yet. Add the first club to get started.”

Do not use merely negative messages such as “No data available.”

### CR-2.6 Loading Messages

Normally no text is needed (Skeleton is sufficient, Chapter 8 L1).

Text **MAY** be used specifically for long-running operations (“Processing import…”).

### CR-2.7 Success / Warning / Error / Confirmation Messages

**Mandatory fixed pattern (MUST):**

**[What happened] + [Impact, if any] + [Next action, if any]**

Approved example: “Changes saved successfully,” rather than “Successfully completed” (Chapter 0 Discovery — explicitly cited original example).

Error example:

“Couldn’t save your changes. Please try again.”

Not simply “Error” or a raw status code.

### CR-2.8 Null / Undefined Content Policy

A field with no value **MUST NOT** be displayed silently as empty, as this may appear to be a design error.

**MUST** use a fixed contextual fallback:

* `"—"` (dash) for dense tables (Chapter 8 L5)
* `"Not available"` for descriptive fields (Chapter 8 L5 §CMP-DESCRIPTIONLIST-001, aligned with §DD.10 Partial State)
* `"Directly affiliated with the Federation"` specifically for an unattached athlete with no club (Chapter 8 L8 §SP.8 — no generic text here; the wording is defined there explicitly)

---

# Level 3 — Forms Content

### CR-3.1 Validation Messages

Always fully descriptive (Chapter 8 L2 §F.3) — mention both the field and the problem:

“Invalid email address” rather than “Error.”

### CR-3.2 Required / Optional Fields

Do not repeatedly label every non-required field as “Optional.”

**SHOULD** indicate required fields only (Chapter 8 L2 §F.4), with one general note at the top of the form.

### CR-3.3 Password Guidelines

Clearly state requirements before failure rather than after it:

“At least 8 characters, one uppercase letter, one lowercase letter, and one number.”

See Chapter 8 L2 §CMP-PASSWORDFIELD-001.

### CR-3.4 Upload Instructions

Accepted file type and maximum size **MUST** be stated before the upload attempt, not only after failure (Chapter 8 L2 §CMP-FILEUPLOAD-001).

### CR-3.5 Search Hints

Placeholder text should suggest the type of search:

“Search by athlete name or registration number”

rather than simply “Search.”

### CR-3.6 Inline Errors / Summary Errors

**Inline** (Chapter 8 L2 §F.3): precise error for a single field.

**Summary** (Chapter 8 L2 §F.10 Form Submission Contract): summarize the number of errors and identify each affected field:

“There are 3 errors: email address, phone number, and date of birth.”

---

# Level 4 — Actions

### CR-4.1 CTA / Button Text Rules

Use a clear imperative verb (Chapter 8 L1 §Button):

* “Publish” rather than “OK”
* “Delete club” rather than simply “Delete” when additional context is needed for clarity (Chapter 8 L4 §CMP-CONFIRMATIONDIALOG-001)

### CR-4.2 Link Text

Describe the destination (Chapter 8 L1 §Link):

“View all results” rather than “Click here.”

### CR-4.3 Destructive Actions Copy

**MUST** explicitly state the impact:

“This will permanently delete this club and its 15 associated athletes.”

Integrates with Chapter 8 L7 §EC.14 Cross-Entity Impact Preview.

Do not use a generic “Are you sure?” message.

### CR-4.4 Confirmation Dialog Copy

The title describes the action + the body explains the impact (§CR-4.3) + action buttons use explicit verbs rather than generic “Yes/No.”

Example: **“Delete”** rather than **“Yes.”**

### CR-4.5 Loading Button Text

The button during execution (Chapter 8 L1 §Button Loading State) **SHOULD** use a continuous-action label reflecting the same action:

“Saving…” for a button that was “Save”

rather than a generic fixed label such as “Loading…” across all buttons.

This preserves clarity about exactly what is happening.

---

# Level 5 — Data Content

### CR-5.1 Metadata / Status Labels / Badges

Use one consistent term for each state throughout the system:

Pending / Approved / Rejected

(Chapter 8 L7 §CMP-APPROVALSTATUS-001).

Do not use “Pending” in one location and “On hold” in another for the exact same state.

### CR-5.2 Tables — Column Headers

Column headers should be short and precise (Chapter 8 L5):

“Rank” rather than “Athlete ranking in this specific event.”

### CR-5.3 Numbers & Units

The unit **MUST** be clearly attached at least to the first occurrence in each table:

* “12.45 seconds”
* “6.20 meters”

Integrates with §CR-1.10.

### CR-5.4 Athlete Results & Competition Metadata

Directly integrates with Level 8 (Sports Domain Terminology) — not redefined here.

### CR-5.5 Timestamp Language

Relative timestamps (Chapter 8 L5 §DD.11 Data Freshness “Last Updated”) **MUST** use a consistent format:

“X minutes/hours/days ago.”

After 24 hours, it **MUST** automatically transition to an absolute date (Chapter 19), rather than continuing indefinitely as “3 days ago.”

---

# Level 6 — Notifications

### CR-6.1 Toast / Snackbar Copy

Very short (Chapter 8 L4) — follows §CR-2.7 but condensed to a single line.

### CR-6.2 Email / SMS / Push / In-App Notifications

Every channel (Chapter 18 Notifications, forthcoming) **MUST** communicate the same core meaning of the event, with wording adapted to the channel’s length:

SMS is shorter than Email.

There **MUST NOT** be contradictory information between channels for the same event.

### CR-6.3 Notification Grouping Copy

When multiple notifications are grouped (Chapter 8 L4 §FB.23 Rate Limiting):

“12 new updates”

The number **MUST** always be explicitly stated rather than using vague wording such as “Several updates.”

This preserves transparency about the actual volume for the user.

---

# Level 7 — AI Content

### CR-7.1 AI Disclosure

Any content generated or suggested by AI (Chapter 8 L1 §AI Badge, Chapter 16) **MUST** carry a clear indicator such as:

**“AI suggestion”**

It **MUST NOT** appear as human-generated content without disclosure, matching Chapter 0 Discovery’s AI Governance principle of transparency.

### CR-7.2 AI Suggestions Copy

Use suggestion language rather than commands:

“Would you like to use this suggested headline?”

rather than:

“The headline is…”

### CR-7.3 Confidence Messages

**MUST NOT** use language that conveys more certainty than the model’s actual accuracy supports:

“May be” rather than “Definitely”

when no numerical confidence score is available.

### CR-7.4 Explainability

An important AI suggestion (automatic classification, etc.) **SHOULD** include a short explanation of why it was suggested:

“Suggested based on similar previous content.”

where technically possible.

### CR-7.5 Human Review Required

Any workflow requiring human approval (Chapter 0 Discovery: Human-in-the-Loop is mandatory) **MUST** explicitly state:

“Awaiting your review before publishing.”

Do not rely on implicit approval.

### CR-7.6 AI Error/Failure Copy

Failure of an AI operation (unable to generate a suggestion, request timeout) **MUST NOT** be presented as a frightening generic system error (§CR-2.7 standard).

It **SHOULD** use calmer wording specific to the optional nature of the feature:

“Couldn’t generate a suggestion right now. You can continue manually.”

This clarifies that the core functionality has not been affected; only the assistive feature is unavailable.

---

# Level 8 — Sports Domain Terminology

### CR-8.1 Terminology Registry

Complements §CR-1.7.

A final standardized terminology registry for every recurring sports concept **MUST** be the single reference consulted before writing any new text related to:

* Sub-event names (races, jumps, throws, race walking)
* Result types (time, distance, points)
* Medal types (Gold/Silver/Bronze — Chapter 8 L8 §SP.5)
* Qualification statuses (Chapter 8 L8 §CMP-QUALIFICATIONSTATUS-001)
* Record terminology (National Record / Personal Record — Chapter 8 L8 §SP.7)
* Officials’ terminology (license level, Discipline — Chapter 8 L8 §CMP-REFEREECARD-001)
* Coaches and federation registration terminology (registration number — Chapter 0 Discovery open question; to be finalized later, but wording becomes standardized once finalized)

**Rule (MUST):** Any new sports term **MUST** be added to this registry through the same Content Rule Proposal path (parallel to Chapter 3 §3.5) before being used in any component.

No ad hoc wording is permitted, even if it appears obvious to the writer.

### CR-8.2 Abbreviation Policy

Common sports abbreviations (m for meter, s for second) **MUST** follow a consistent policy throughout the registry:

**MUST NOT** abbreviate on first occurrence within any table/page.

Write “meter” in full the first time.

**MAY** abbreviate subsequent occurrences within the same table to save space (Chapter 8 L5 display density, §DD.3).

The decision for each abbreviation **MUST** be recorded in §CR-8.1 rather than left to the discretion of each table.

---

# Content QA Checklist

☐ Does every piece of text consume a Content Rule from this chapter rather than using ad hoc wording?

☐ Does the same state (success/error/delete) use the same approved wording already established elsewhere on the platform?

☐ Does the message exist in both Arabic and English?

☐ Has any new sports term been added to §CR-8.1 before being used?

☐ Does AI-generated content, if present, carry a disclosure indicator (§CR-7.1)?

☐ Does a field with no value display a defined fallback rather than silently appearing empty (§CR-2.8)?

---

# Do & Don’t — General

**Do:**

Consult the Terminology Registry (§CR-1.7/CR-8.1) before writing any new text · Follow the §CR-2.7 pattern for every status message.

**Don’t:**

Do not hardcode text inside component logic (ADR-0021) · Do not use two different phrasings for exactly the same state.

---

# Success Metrics

* **0** hardcoded text strings inside the logic of any component (Chapter 8, verified through code reviews)
* **100%** of recurring messages (save/error/delete) use consistent wording across the entire platform
* **100%** of AI-generated content (Level 7) carries a clear disclosure indicator
* **0** sports terms have more than one approved phrasing in the registry (§CR-8.1)
* **0** fields display silently empty without a defined fallback (§CR-2.8)
* **100%** of the Content QA Checklist is applied before any new content release

---

# References

**Normative:** Chapter 0 (§0.6) · Chapter 6 (§6.5 Error Messages) · Chapter 8 (all levels)

**Implementation:** i18n libraries (implementation-neutral reference; Chapter 21 documents the technical details)

**Informative:** Plain Language Guidelines (general principles, not a direct source of rules)

---

# Related Chapters

Chapter 0 · Chapter 4 · Chapter 6 · Chapter 8 (all levels refer back to this chapter) · Chapter 11 (UX Patterns) · Chapter 13 (CMS) · Chapter 16 (AI) · Chapter 19 (Calendar)

---

*End of Chapter 9 — Content Governance Framework (8 levels + ADR-0021). Next chapter: Chapter 10 — Sports-Specific Components (detailed expansion of Chapter 8 L8).*
