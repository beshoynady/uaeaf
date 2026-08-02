# Chapter 6 — UAE Digital Accessibility & Government Compliance

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

## Depends On / Used By

| Depends On                                                                                           | Used By                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Chapter 1 (§1.9 Color Contrast) · Chapter 2 (PR-003) · Chapter 4 (§4.10) · Chapter 5 (§5.8, §5.10.1) | Chapter 7 (Semantic A11y Tokens) · Chapter 8/10 (Components) · Chapter 23.3 (Accessibility Checklist) |

## Scope

**Covers:** Complete accessibility strategy (WCAG 2.2 AA + UAE national compliance), POUR principles, color/keyboard/screen reader/forms/media rules, testing pipeline, quality budget, and compliance matrix.
**Does not cover:** Detailed implementation of every rule inside a specific component (→ Chapter 8), or detailed design of the accessibility settings panel (documented here as a decision, implemented in Chapter 8).

## Definitions

| Term                | Definition                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **POUR**            | The core WCAG framework: Perceivable, Operable, Understandable, Robust                                               |
| **Focus Trap**      | Restricting Tab navigation within an overlay element (Modal) to prevent focus from escaping to the content behind it |
| **Live Region**     | An HTML region that automatically announces its updates to a screen reader without moving the user's focus           |
| **Accessible Name** | The text announced by a screen reader for an interactive element (which may differ from its visible text)            |

## Purpose

This chapter transforms PR-003 (Chapter 2) from a general principle into **testable legal and engineering obligations**. It is the sole reference for all accessibility rules — subsequent chapters reference it rather than repeating it.

---

## ADR-0010: Accessibility Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Authority**               | International Standard + Product Decision                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Context**                 | The platform is a national official platform (Chapter 0), serving a broad public audience including older adults and People of Determination, and is subject to TDRA directions (Discovery Phase)                                                                                                                                                                                                                                                                                |
| **Decision**                | **Accessibility by Default** (PR-003) as a non-negotiable principle. Compliance with **WCAG 2.2 Level AA** as the mandatory minimum across the entire platform. Alignment with **UAE Design System/TDRA** directions where applicable (Chapter 0 Discovery — three-level model: mandatory international / national / progressive optional). Any exception to a rule here **MUST** be documented as a separate ADR explaining the reason and the alternative compensating measure |
| **Alternatives Considered** | Targeting full WCAG AAA — rejected (Chapter 0 Discovery) because it constrains the visual identity in certain cases without sufficient justification for a public platform. Relying solely on Lighthouse Score — rejected because it covers only ~30–40% of actual accessibility criteria                                                                                                                                                                                        |
| **Why This Decision**       | AA is the standard adopted by most governments and international sports organizations (World Athletics, IOC), and is aligned with current TDRA direction (WCAG 2.1/2.2 AA)                                                                                                                                                                                                                                                                                                       |
| **Risks**                   | A future development team may "save time" by ignoring a rule under delivery pressure. Mitigation: §6.10 Testing Pipeline automatically rejects any Build violating §6.11 Accessibility Budget; it does not rely solely on human discipline                                                                                                                                                                                                                                       |
| **Consequences**            | Every component (Chapter 8) **MUST** pass §6.12 QA Checklist before being merged into production                                                                                                                                                                                                                                                                                                                                                                                 |

---

## 6.1 Accessibility Principles (POUR) ↔ Chapter 2 Principles

| WCAG Principle     | Meaning                                                                   | Related To                               |
| ------------------ | ------------------------------------------------------------------------- | ---------------------------------------- |
| **Perceivable**    | Content can be perceived through any sense (sight/hearing/touch)          | PR-001 (Clarity), PR-004 (Content First) |
| **Operable**       | Every function can be operated using the keyboard alone                   | PR-003                                   |
| **Understandable** | Behavior and language are predictable and clear                           | PR-004, Chapter 9 (Content Design)       |
| **Robust**         | Compatible with current and future assistive technologies (Semantic HTML) | PR-008 (Built to Scale)                  |

## 6.2 Color & Contrast

* Normal text: **MUST** have a contrast ratio of ≥4.5:1 (WCAG 1.4.3)
* Large text (≥24px or ≥19px Bold): **MUST** have a contrast ratio of ≥3:1
* Non-text elements (Input borders, functional icons): **MUST** have a contrast ratio of ≥3:1 (Non-text Contrast, WCAG 1.4.11)
* Focus Indicators: **MUST** have a contrast ratio of ≥3:1 against the adjacent background
* **MUST NOT** rely on color alone for differentiation (Error/Success states **MUST** be accompanied by an icon or text, not color alone — also supporting Chapter 1 §1.9)

## 6.3 Keyboard Accessibility

| Rule               | Detail                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Tab Order          | **MUST** follow the logical visual order (right-to-left in RTL) without manually assigned positive `tabindex` values |
| Focus Trap         | **MUST** be implemented in every Modal/Drawer (Chapter 8) — Tab focus must not escape the overlay until it is closed |
| Skip Links         | **MUST** be the first focusable element on every page, providing a "Skip to main content" link                       |
| Escape Behavior    | **MUST** allow the `Esc` key to close any open Modal/Drawer/Dropdown                                                 |
| Logical Navigation | **MUST** ensure no interactive element is visually visible while being hidden from keyboard navigation               |

## 6.4 Screen Reader Rules

* Semantic HTML: **MUST** use the correct elements (`<button>` instead of `<div onClick>`, `<nav>`, `<main>`, `<article>`) before using any ARIA solution
* ARIA: **MUST NOT** be used when a semantic HTML alternative exists (W3C golden rule: "No ARIA is better than Bad ARIA")
* Landmark Regions: **MUST** clearly define `<header>`, `<nav>`, `<main>`, and `<footer>` on every page
* Live Regions: **MUST** be used for important dynamic updates (live results, Toast messages) through `aria-live="polite"` (or `assertive` for critical errors only)
* Accessible Names: **MUST** be provided for every interactive element without sufficient visible text (such as an icon-only button) through a clear `aria-label`

## 6.5 Forms Accessibility

| Rule            | Detail                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Labels          | **MUST** have a `<label>` properly associated with every field (Placeholder is not a substitute for a Label)                         |
| Required Fields | **MUST** be indicated visually, textually, and through `aria-required`                                                               |
| Error Messages  | **MUST** be descriptive and programmatically associated with the field through `aria-describedby` (aligned with Chapter 9 Microcopy) |
| Validation      | **SHOULD** occur on `blur`, not while typing (prevents disruption for screen reader users)                                           |
| Autocomplete    | **SHOULD** use the standard `autocomplete` attribute for common fields (name, email, phone)                                          |
| Input Purpose   | **SHOULD** clarify the purpose of the field through metadata where possible (WCAG 1.3.5)                                             |

## 6.6 Motion Accessibility (related to Chapter 5)

Refer to Chapter 5 §5.8 (Reduced Motion) for the complete technical details. Additional legal requirement here: **MUST NOT** allow any animation to flash more than 3 times per second (WCAG 2.3.1 — prevents photosensitive seizures) — an absolute restriction with no exceptions, even with design approval.

## 6.7 Responsive Accessibility

* Zoom 200%: **MUST** keep all content complete and usable without loss of functionality or text overlap (WCAG 1.4.4)
* Reflow: **MUST NOT** introduce horizontal scrolling at a width of 320px (WCAG 1.4.10)
* Touch Targets: **MUST** be ≥44×44px (aligned with Chapter 0 Discovery)
* Orientation: **MUST NOT** restrict usage to a single orientation (portrait/landscape) unless there is a documented functional necessity

## 6.8 Media Accessibility

| Rule              | Detail                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Alt Text          | **MUST** be provided for every content image (athlete, event, club) — descriptive in both Arabic and English |
| Decorative Images | **MUST** explicitly use an empty `alt=""` attribute (do not omit the attribute) for purely decorative images |
| Captions          | **SHOULD** be provided for every video containing important dialogue/voice commentary                        |
| Transcripts       | **MAY** be provided for long-form video content (interviews, press conferences)                              |
| Icons             | **MUST** provide an `aria-label` or accompanying text for every functional (non-decorative) icon             |

## 6.9 Government Compliance (UAE)

**Reference standards:** WCAG 2.2 AA (Chapter 0 Discovery) · WAI-ARIA 1.2 · HTML Living Standard · TDRA National Digital Accessibility Policy and UAE Design System directions (refer to Chapter 0 for the complete findings from research concerning federal law and national policy).

**The single entry point** (from the Discovery Phase — final decision): An elegant **Floating Accessibility Button** (bottom corner, compatible with Light/Dark and RTL/LTR) opens an organized Drawer with sections: **Vision** (contrast, font size, text spacing, line height) · **Reading** (Listen — Text-to-Speech through a standard browser interface or any provider achieving the same objective; no specific technology mandated) · **Motion** (reduce motion, disable decorative animations) · **Theme** (system/light/dark) · **Language**. Preferences are stored locally for visitors and with the account for authenticated users. Button behavior while scrolling: remains visible at all times, may shrink or become more transparent, and returns to its normal state when scrolling stops — this behavior is fully disabled with Reduce Motion (Chapter 5 §5.8).

**Feature classification** (from Discovery): *Recommended:* Text-to-Speech, Contrast Toggle, Font Size Controls, Text Spacing Controls. *Optional:* Text Alignment Controls (only if they provide real value without breaking Chapter 5 consistency).

## 6.10 Accessibility Testing Pipeline

```text
Commit → axe-core (automated check during development) → Lighthouse Accessibility (CI) → Playwright (automated keyboard tests) → Manual Keyboard Testing (before every Release) → Screen Reader Testing (NVDA on Windows / VoiceOver on macOS/iOS) → Merge
```

Any automated check (axe-core/Lighthouse) that detects a **Critical** or **Serious** issue **MUST** block the Build (integrated with Chapter 3 §3.13 CI Pipeline).

## 6.11 Accessibility Budget (measurable, not a recommendation)

| Metric                                                                     | Required Threshold |
| -------------------------------------------------------------------------- | ------------------ |
| Critical Accessibility Issues                                              | 0                  |
| Serious Accessibility Issues                                               | 0                  |
| Lighthouse Accessibility Score                                             | ≥95                |
| axe-core Critical Violations                                               | 0                  |
| Keyboard Coverage (every function operable by keyboard)                    | 100%               |
| Focus Visibility (every interactive element has a visible focus indicator) | 100%               |

## 6.12 Accessibility QA Checklist

☐ Is the contrast of all text ≥4.5:1 (or ≥3:1 for large text)?
☐ Does every function work using the keyboard alone without a mouse?
☐ Does Focus Trap work in every Modal/Drawer?
☐ Is a Skip Link present and functional?
☐ Does every content image have descriptive Alt Text?
☐ Does every form field have an associated Label?
☐ Does the page work completely at 200% Zoom?
☐ Is there no horizontal scrolling at 320px?
☐ Has the page been actually tested with at least one screen reader?

## 6.13 Accessibility Anti-Patterns

❌ `outline: none` without a visible Focus alternative (directly violates §6.3)
❌ Using color alone to distinguish between states (§6.2)
❌ `<div onClick>` instead of `<button>` (§6.4)
❌ Placeholder as a complete substitute for Label (§6.5)
❌ Autoplaying video with sound without user controls
❌ Animation flashing more than 3 times/second (§6.6 — absolute restriction)

## 6.14 Accessibility Registry

Every accessibility rule is registered with a reference identifier (used in Chapter 8 when applying it to a specific component): e.g. `A11Y-CONTRAST-001 · Text Contrast ≥4.5:1 · WCAG 1.4.3 · Related Components: [all text components]`.

## 6.15 Future Accessibility Roadmap (Backlog)

Progressive support for additional features from Discovery (Text Alignment Controls) · Improved Screen Reader experience for complex Data Grids (Dashboard) · Exploration of WCAG 2.2 AAA for selected high-sensitivity pages (such as official competition results) without imposing it across the entire platform.

## 6.16 Compliance Matrix

| Rule            | WCAG          | WAI-ARIA | UAE Policy | Related Chapter |
| --------------- | ------------- | -------- | ---------- | --------------- |
| Contrast        | 1.4.3, 1.4.11 | —        | ✓          | Ch1, Ch6        |
| Focus Visible   | 2.4.7         | ✓        | ✓          | Ch6, Ch8        |
| Keyboard Access | 2.1.1, 2.1.2  | ✓        | ✓          | Ch6, Ch8        |
| Motion/Flashing | 2.3.1, 2.3.3  | —        | ✓          | Ch5, Ch6        |
| Reflow/Zoom     | 1.4.4, 1.4.10 | —        | ✓          | Ch5, Ch6        |
| Forms/Labels    | 1.3.1, 3.3.2  | ✓        | ✓          | Ch6, Ch8        |
| Alt Text        | 1.1.1         | —        | ✓          | Ch6, Ch9        |
| Live Regions    | 4.1.3         | ✓        | —          | Ch6, Ch8        |

## Do & Don't

**Do:** Apply the §6.12 Checklist to every screen before delivery · Always use Semantic HTML first.

**Don't:** Do not violate §6.6 (Flashing) regardless of the creative justification · Do not "postpone" accessibility to a later stage (PR-003).

## Success Metrics

Refer literally to §6.11 Accessibility Budget — these are the chapter's success metrics.

## References

WCAG 2.2 (W3C) · WAI-ARIA 1.2 · TDRA National Digital Accessibility Policy · UAE Design System (dgov.tdra.gov.ae) · Federal Law No. 29/2006 (People of Determination)

## Related Chapters

Chapter 1 (§1.9) · Chapter 2 (PR-003) · Chapter 4 (§4.10) · Chapter 5 (§5.8, §5.10.1) · Chapter 8 (Detailed implementation for every component) · Chapter 23.3 (Final Accessibility Checklist)

---

*End of Chapter 6 — Foundation Layer (Chapters 0–6) is now fully completed. Next: Chapter 7 — Semantic Tokens & Theming.*
