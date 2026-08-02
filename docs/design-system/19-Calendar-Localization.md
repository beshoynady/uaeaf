# Chapter 19 — Calendar & Localization

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                                           | Used By                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Chapter 0 (Discovery — Calendar Decision) · Chapter 4 (RTL Typography) · Chapter 6 (RTL Accessibility) · Chapter 8 L2 (§CMP-DATEPICKER-001) · Chapter 9 (§CR-1.6, §CR-1.9, §CR-1.10) | Chapter 10 (Timestamp for Live Results) · Chapter 13 §9 (Localization) · Chapter 21 |

## Scope

**Covers:** Calendar systems (Gregorian/Hijri), date and timezone storage, bilingual architecture (RTL/LTR), number and unit formatting, and translation strategy.

**Does Not Cover:** Actual content authoring or copywriting (→ Chapter 9). This chapter defines the underlying technical architecture only.

## Definitions

| Term                | Definition                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Locale**          | A combination of language and regional settings that collectively determine date formatting, number formatting, and text direction. |
| **Date-only Value** | A date value without a time component (e.g., date of birth), independent of timezone, unlike a complete Date-Time value.            |

## Purpose

This chapter consolidates all calendar and localization decisions distributed across Chapter 0 Discovery, Chapter 4, and Chapter 8 L2 into one consistent architectural model.

---

## ADR-0031: Calendar & Localization Architecture

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Authority**               | Product Decision (formalizes the Chapter 0 Discovery decision as an official architectural standard)                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Context**                 | Discovery established the Gregorian calendar as the primary calendar for all operations (World Athletics standard), with Hijri as an optional supplementary display layer, and explicitly rejected machine translation. These principles require a detailed technical architecture to ensure consistent implementation across the platform.                                                                                                                                                                                                |
| **Decision**                | The **Gregorian calendar MUST be the single source of truth** for all internal date storage, comparison, and sorting. The Hijri calendar **MUST** exist only as an additional **Display Layer** and **MUST NOT** be used as a primary stored or directly compared value. Each language (Arabic/English) **MUST** contain genuinely independent content and **MUST NOT** rely on machine translation (Chapter 9 §CR-1.6). The data model **MUST** support two separate fields for every public-facing translatable text field from day one. |
| **Alternatives Considered** | Dual primary storage of Gregorian and Hijri dates — rejected because it complicates comparison and sorting without providing meaningful value when Hijri is display-only.                                                                                                                                                                                                                                                                                                                                                                  |
| **Why This Decision**       | It simplifies business logic (date comparison and chronological ordering) through a single source of truth while preserving cultural flexibility at the presentation layer.                                                                                                                                                                                                                                                                                                                                                                |
| **Risks**                   | Accurate Gregorian ↔ Hijri conversion can be technically complex and may sometimes depend on astronomical observation rather than purely mathematical calculation. **Mitigation:** A trusted, established calendar-conversion library **SHOULD** be used (Chapter 21) instead of implementing a custom conversion algorithm, and the library **SHOULD** be maintained and updated periodically.                                                                                                                                            |
| **Consequences**            | Every date token/component (Chapter 8 L2) **MUST** comply with this single-source-of-truth model.                                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

## 1. Calendar System

The Gregorian date **MUST** always appear first whenever both calendars are displayed together.

Example:

> `15 January 2027 / 6 Rajab 1448 AH`

The Hijri date **MAY** be displayed alongside the Gregorian date in specific national or religious contexts. It **SHOULD NOT** be displayed alongside every date throughout the platform.

---

## 2. Date-only vs. Date-Time Storage

This section directly consumes the timezone principles defined in Chapter 8 L2 §CMP-DATEPICKER-001 §Timezone.

**Date-only values** (such as an athlete's date of birth) **MUST** remain completely independent of timezone logic.

They **MUST NOT** undergo UTC/Local timezone conversion.

This prevents a common defect in which an athlete's date of birth shifts by one day due to timezone differences.

Full **Date-Time values** (such as the start time of an event) **MUST** be stored internally in UTC and **MUST** be rendered using the user's applicable local timezone.

---

## 3. RTL/LTR Architecture

This chapter directly consumes the CSS Logical Properties principles defined in Chapter 6.

**MUST NOT** redefine directionality rules here.

This section establishes only the following architectural requirement:

Language switching **MUST** update the `dir` attribute at the root `<html>` level rather than applying direction changes independently to isolated sections of the page.

The platform **MUST** therefore transition coherently between:

* `dir="rtl"` for Arabic.
* `dir="ltr"` for English.

---

## 4. Locale Switching Mechanism

Changing the language **MUST** preserve the user's current location within the application.

Language switching **MUST NOT** redirect the user to the homepage by default.

The implementation **MUST** integrate with the routing contract defined in Chapter 8 L3 §N.4, ensuring that the equivalent route in the alternative language points to the same underlying content.

---

## 5. Number & Unit Localization

This section consumes Chapter 9 §CR-1.10 and does not redefine its rules.

The following principles apply:

* Western/Latin numerals **MUST** be used consistently.
* Thousands separators **MUST** follow the active display locale.
* Athletic timing and performance measurements **MUST** use a globally consistent format regardless of interface language.

---

## 6. Translation Strategy

This section directly consumes Chapter 9 §CR-1.6 and Chapter 13 §9.

Machine translation **MUST NOT** be used for public-facing editorial content.

Every content item managed through Chapter 13 (CMS) **MUST** contain two independent language fields:

* Arabic content
* English content

Each language version **MUST** be professionally authored as independent content rather than generated as an automatic translation of the other.

Static system UI content — such as button labels, system messages, navigation labels, and interface text defined by Chapter 9 — **MAY** be managed through standard technical translation/i18n files.

This distinction applies specifically to editorial content versus static system UI.

---

## 7. Multi-Calendar Extensibility

The architecture **MUST** support the future addition of another calendar system without requiring structural redesign.

Although the likelihood of adding another calendar is low, the platform is expected to remain extensible in accordance with **PR-008 Built to Scale**.

The architecture **MUST** therefore maintain a strict separation between:

**Storage Layer:**
Gregorian calendar remains the permanent internal source of truth regardless of how many display calendars are introduced.

**Presentation Layer:**
Additional calendar systems **MAY** be added as display-only layers without modifying the underlying storage model.

---

## Do & Don't

**Do:**

* Store all dates internally using the Gregorian calendar as the permanent source of truth (§1).
* Keep Date-only values completely isolated from timezone conversion logic (§2).
* Preserve the user's current route and context when switching languages.
* Treat Arabic and English editorial content as independent professionally authored content.

**Don't:**

* Do not store Hijri dates as a parallel primary source of truth.
* Do not use Hijri values for internal date comparison or sorting.
* Do not apply timezone conversion to Date-only values.
* Do not use machine translation for public-facing editorial content (§6).
* Do not redirect users to the homepage when switching languages unless explicitly required by the routing model.

## Success Metrics

* **100%** of dates stored internally use the Gregorian calendar as the single source of truth.
* **0** Date-only values are affected by timezone conversion.
* **100%** of CMS content supports independent Arabic and English fields without machine translation.
* **0** layout or content regressions occur when switching between RTL and LTR.
* **100%** of language switches preserve the user's current content context where an equivalent localized route exists.

## References

**Normative:** Chapter 0 (Discovery) · Chapter 6 · Chapter 8 L2 · Chapter 9

**Implementation:** Chapter 21 (Approved Hijri Calendar Conversion Library)

## Related Chapters

Chapter 4 · Chapter 6 · Chapter 8 L2/L3 · Chapter 9 · Chapter 13 §9 · Chapter 21

---

*End of Chapter 19. Next Chapter: Chapter 20 — Page Templates.*
