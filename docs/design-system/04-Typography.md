# Chapter 4 — Typography System

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

## Depends On / Used By

| Depends On                                                                                           | Used By                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chapter 1 (Official Typeface Reference) · Chapter 2 (PR-001, PR-003, PR-009) · Chapter 3 (DT-FONT-*) | Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapters 8/10 (Components) · Every chapter containing text (effectively Chapters 8–20) |

## Scope

**Covers:** Final official typefaces, font layers, complete type scale, RTL/LTR reading rules, responsiveness, loading, accessibility, and internationalization.
**Does not cover:** Text implementation within a specific component (→ Chapter 8), actual writing tone and Microcopy content (→ Chapter 9).

## Definitions

| Term                 | Definition                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type Scale**       | A fixed, mathematically coherent hierarchy of font sizes, ranging from the largest Display level to the smallest Overline level                                               |
| **Variable Font**    | A single font file containing all weights (Thin→Black), rather than separate files for each weight                                                                            |
| **Fluid Typography** | Gradual adjustment of font size according to viewport width, rather than fixed jumps at Breakpoints                                                                           |
| **Optical Size**     | Automatic adjustment of glyph design details according to display size (large headings may have different geometric characteristics from the same typeface at a smaller size) |

## Purpose

This chapter is the **single source of truth** for every typographic rule in the system. Any subsequent chapter **MUST NOT** repeat a typographic rule; it must reference an identifier defined here (`DT-FONT-*`, `ADR-0007`).

## Background

Chapter 1 established that the Federation's official print typeface is **The Sans Arabic**, but it is not suitable for use as a Web Font due to licensing restrictions (Chapter 1 §1.6). This chapter establishes the final digital alternative.

---

## ADR-0007: Official Typeface Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Authority**               | Product Decision (delegated to the Design Team — Chapter 0 Discovery)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Context**                 | The Sans Arabic (the official print typeface) cannot be used as a Web Font without an ongoing paid license (Chapter 1). A professional, free SIL OFL alternative with high-quality Arabic and English support is required                                                                                                                                                                                                                                                                                                                     |
| **Decision**                | **Arabic (UI + Content):** Alexandria — a sharp geometric character closely aligned with the spirit of the four logo typefaces (Chapter 1 §1.7). **Latin (UI + Content):** IBM Plex Sans — originally designed for bilingual Enterprise systems, with excellent readability across interfaces and tables. **Monospace:** IBM Plex Mono (for code/technical numbers where needed, such as athlete IDs). **Fallback:** `system-ui`                                                                                                              |
| **Alternatives Considered** | (A) Noto Sans Arabic — rejected: generic character without a distinctive personality. (B) Cairo — rejected: its rounded character is closer to commercial websites than an official sports institution. (C) Retaining IBM Plex Sans Arabic (the initial temporary recommendation from the Discovery phase) for Arabic text instead of Alexandria — replaced by the user's final decision: **Alexandria for all Arabic use cases** (UI and Content alike) to simplify the number of loaded fonts and unify the complete Arabic visual identity |
| **Risks**                   | Alexandria has historically been less widely used than IBM Plex Sans Arabic for very long-form text (large news articles) and may require real-world readability validation. **Mitigation:** §4.14 testing includes a complete, real news article page before final production approval                                                                                                                                                                                                                                                       |
| **Consequences**            | All `DT-FONT-FAMILY-*` tokens (Chapter 3) are locked to these typefaces; any future change requires a new ADR that supersedes this decision                                                                                                                                                                                                                                                                                                                                                                                                   |

---

## 4.1 Typography Philosophy

**Why Alexandria + IBM Plex Sans:** Alexandria provides a geometric sharpness that reflects the angles of the four logo typefaces (Chapter 1), while IBM Plex Sans was specifically designed for complex Enterprise interfaces (tables, dashboards) — precisely the context in which this system will be used.

**Relationship to Chapter 2 Principles:**

* **PR-001 (Clarity Over Decoration):** The typeface is first and foremost a reading tool, and only secondarily a visual personality — any weight or size that does not serve clarity **MUST NOT** be used.
* **PR-003 (Accessibility by Default):** Every size in the §4.4 Type Scale is tested for contrast and scalability (§4.10).
* **PR-009 (Consistency Through Tokens):** No arbitrary font size may exist outside §4.4 — every text element **MUST** consume a token from `DT-FONT-SIZE-*`.

**Reading Principles:** Arabic traditionally carries a higher information density (longer words and more complex sentence structures) — line spacing (§4.6) is therefore relatively more generous for Arabic than English to preserve equivalent visual scanning ease.

---

## 4.2 Font Architecture

```text
Brand Font (The Sans Arabic — Logo and Print Materials Only, Chapter 1)
    ↓ (Not used digitally)
Display Font (Alexandria Black/Bold — Large Headings)
    ↓
UI Font (Alexandria/IBM Plex Sans Regular/Medium — Buttons, Labels, Navigation)
    ↓
Content Font (Alexandria/IBM Plex Sans Regular — News, Long-form Text)
    ↓
System Fallback (system-ui — When Custom Font Loading Fails)
```

## 4.3 Font Families

| Usage                              | Typeface      |
| ---------------------------------- | ------------- |
| Arabic UI                          | Alexandria    |
| English UI                         | IBM Plex Sans |
| Arabic Content                     | Alexandria    |
| English Content                    | IBM Plex Sans |
| Monospace (Code/Technical Numbers) | IBM Plex Mono |
| Fallback                           | system-ui     |

## 4.4 Type Scale

A 1.25 (Major Third) type scale, with each level directly mapped to a `DT-FONT-SIZE-*` token (Chapter 3):

| Level      | Desktop                          | Mobile    | Weight  | DT Token                  |
| ---------- | -------------------------------- | --------- | ------- | ------------------------- |
| Display XL | 64px/1.05                        | 40px/1.1  | Black   | `DT-FONT-SIZE-DISPLAY-XL` |
| Display L  | 56px/1.1                         | 36px/1.15 | Black   | `DT-FONT-SIZE-DISPLAY-L`  |
| H1         | 40px/1.2                         | 28px/1.25 | Black   | `DT-FONT-SIZE-H1`         |
| H2         | 32px/1.25                        | 24px/1.3  | Bold    | `DT-FONT-SIZE-H2`         |
| H3         | 24px/1.3                         | 20px/1.35 | Bold    | `DT-FONT-SIZE-H3`         |
| H4         | 20px/1.35                        | 18px/1.4  | Medium  | `DT-FONT-SIZE-H4`         |
| Title      | 18px/1.4                         | 16px/1.4  | Medium  | `DT-FONT-SIZE-TITLE`      |
| Subtitle   | 16px/1.5                         | 15px/1.5  | Medium  | `DT-FONT-SIZE-SUBTITLE`   |
| Body Large | 18px/1.6                         | 16px/1.6  | Regular | `DT-FONT-SIZE-BODY-LG`    |
| Body       | 16px/1.6                         | 15px/1.55 | Regular | `DT-FONT-SIZE-BODY`       |
| Body Small | 14px/1.5                         | 13px/1.5  | Regular | `DT-FONT-SIZE-BODY-SM`    |
| Caption    | 13px/1.4                         | 12px/1.4  | Regular | `DT-FONT-SIZE-CAPTION`    |
| Label      | 13px/1.3                         | 12px/1.3  | Medium  | `DT-FONT-SIZE-LABEL`      |
| Overline   | 12px/1.3 · letter-spacing 0.08em | Same      | Bold    | `DT-FONT-SIZE-OVERLINE`   |

## 4.5 Font Tokens Mapping

```text
DT-FONT-SIZE-H1 (Primitive/Component Token — Chapter 3)
    ↓
typography.h1 (Semantic Token — Chapter 7)
    ↓
<Heading level={1}> Component (Chapter 8) — consumes typography.h1 only, never the raw value
```

## 4.6 Reading Rules

| Rule                 | Arabic                                                                                                         | English                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Maximum Line Length  | 65–75 characters                                                                                               | 75–85 characters                     |
| Line Height (Body)   | 1.6 (relatively more generous)                                                                                 | 1.6                                  |
| Paragraph Spacing    | `space.4` (16px) between paragraphs                                                                            | Same                                 |
| Text Alignment       | Always right-aligned, **MUST NOT** be justified                                                                | Always left-aligned                  |
| Italic               | **MUST NOT** be used (breaks letter connections)                                                               | MAY be used for subtle emphasis only |
| Mixed Arabic/English | Numbers and English terms within an Arabic sentence remain internally LTR (important for dates/sports timings) | —                                    |

## 4.7 Responsive Typography

Transitions between sizes follow the Breakpoints defined in Chapter 3 (`DT-BREAKPOINT-*`), with only two steps per level (Desktop/Mobile) as specified in §4.4 — **no** additional Tablet jumps are permitted (the closest Breakpoint value is used) to avoid maintenance complexity.

The Dashboard (Chapter 12) **SHOULD** use Desktop sizes as the default even on medium-sized screens (PR-006).

## 4.8 Variable Fonts

**Decision:** Use **Variable Fonts** (a single file per family containing all weights) instead of separate Static font files.

**Reason:** Both Alexandria and IBM Plex Sans are available as Variable Fonts on Google Fonts. This reduces the number of network requests from approximately 8 files (4 weights × 2 families) to only 2 files — a direct application of **PR-002 (Performance First)**.

## 4.9 Font Loading Strategy

| Technique       | Implementation                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `preload`       | The most frequently used weight (Regular) for each family **MUST** be loaded using `<link rel="preload">` in `<head>`                       |
| `font-display`  | `swap` is mandatory — system font text is displayed immediately and smoothly replaced when the custom font finishes loading (prevents FOIT) |
| `unicode-range` | Split the font into ranges (Arabic/Latin) so only the required range is loaded according to the page language                               |
| `subset`        | **SHOULD** use a subset containing only the actual characters and numbers used, rather than the full font                                   |
| Local Fallback  | Self-hosting **SHOULD** be preferred over the Google Fonts CDN to reduce an additional external DNS request (Chapter 5: LCP)                |

## 4.10 Accessibility (Related to Chapter 6)

| Rule               | Value                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Minimum Font Size  | 13px (Caption/Label) — no text smaller than this anywhere                                                                  |
| Contrast           | Follows Chapter 1 §1.9 and Chapter 6 (WCAG 2.2 AA)                                                                         |
| Zoom               | The system **MUST** remain fully usable when the browser is zoomed to 200%, without breaking the layout                    |
| Text Inside Images | **MUST NOT** — any important text (headings, labels) **MUST** be real HTML that can be selected and read by screen readers |
| Line Length        | Follows §4.6 to prevent reading fatigue                                                                                    |

## 4.11 Internationalization (I18n)

This chapter is part of the general **Enterprise Design System Framework** (Chapter 0) — its rules **MUST NOT** be structurally restricted to only two languages:

* **Arabic:** RTL, Alexandria (§4.3)
* **English:** LTR, IBM Plex Sans
* **Future Latin-based languages** (French, Spanish, etc.): use the same IBM Plex Sans family (Latin Extended coverage is already available in the typeface) without structural changes.
* **Future languages using different writing systems** (Chinese, Thai, etc.): require adding a new typeface family through a new §ADR recorded here, while keeping the §4.2 Font Architecture and its principles unchanged.

**Architectural Rule (MUST):** No text in the code **MUST** assume a fixed language (Hardcoded) — every Direction and Font Family is derived from the actual language token (Chapter 7).

## 4.12 Typography QA Checklist

☐ Does every text element use a token from §4.4 rather than an arbitrary size?
☐ Is the size actually defined in the Type Scale?
☐ Does the Line Height match the value specified in §4.4/4.6?
☐ Has the screen been fully tested in Arabic RTL?
☐ Has the screen been tested on Mobile (375px)?
☐ Are there more than 3 font weights visible on the same screen? (There should not be — see §4.13)

## 4.13 Typography Anti-Patterns

❌ More than 3 visible font weights on the same screen (violates PR-001)
❌ Using ALL CAPS for Arabic text (Arabic has no concept of letter case; doing so produces unreadable text)
❌ Line Height below 1.4 for any paragraph text
❌ Text placed over an image without a sufficient contrast layer (Gradient Overlay)
❌ A font size not defined in §4.4 (arbitrary value such as `17px`)

## 4.14 Typography Testing

| Type                | Tool / Method                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Visual Regression   | Compare screenshots before/after any typography token change (linked to Chapter 3 §3.29)                 |
| Screenshot Testing  | Full coverage of a long, real Arabic news article page (real-world test of the ADR-0007 §Risks decision) |
| Accessibility Tests | 200% Zoom test and automated minimum 13px font-size check                                                |
| Responsive Tests    | Test every level in §4.4 on actual Desktop/Mobile environments                                           |

## 4.15 Typography Registry

Every typographic style is registered using the same logic as Chapter 3 §3.24:

`TY-H1 · Heading Level 1 · Token: DT-FONT-SIZE-H1 · Usage: Main Page Headings · Components: [PageHeader, ArticleTitle] · Introduced: v1.0`

Semantic Typography Roles (weight variants, ADR-0040, §4.15a) are registered the same way:

`TY-EYEBROW · Hero Eyebrow · Tokens: DT-FONT-SIZE-SUBTITLE + DT-FONT-WEIGHT-BOLD · Usage: Hero kicker text · Components: [Hero] · Introduced: ADR-0040`
`TY-CTALABEL · CTA Label · Tokens: DT-FONT-SIZE-SUBTITLE + DT-FONT-WEIGHT-BOLD · Usage: Button/link label text · Components: [CMP-BUTTON-001] · Introduced: ADR-0040`
`TY-METADATA-COMPACT · Compact Metadata · Tokens: DT-FONT-SIZE-BODY-SM + DT-FONT-WEIGHT-MEDIUM · Usage: Combined title/location-style metadata · Components: [Event/News/Results cards] · Introduced: ADR-0040`
`TY-MICROBODY · Micro Body · Tokens: DT-FONT-SIZE-OVERLINE + DT-FONT-WEIGHT-REGULAR · Usage: Small plain supporting text (non-kicker) · Components: [CMP-STATCARD-001] · Introduced: ADR-0040`

## 4.16 Future — Typography 2.0 (Backlog, Not Implemented Now)

**Fluid Typography** (gradual font-size scaling across viewport widths using `clamp()` instead of Breakpoint jumps) · **Optical Size** (leveraging additional Variable Font axes for automatic glyph-level refinements) · **AI Typography Assistant** (automatically suggesting a typographic hierarchy when raw content is pasted — Chapter 16) · **Dynamic Reading Modes** (a dedicated reading mode for users with low vision, expanding Chapter 6).

---

# ADR-0040: Font Weight Policy — Semantic Typography Roles (Model E)

**Resolves the "Detailed Font Weight Policy" Backlog v1.1 item recorded in Chapter 24 §6.**

| Field | Details |
| --- | --- |
| **Status** | Accepted |
| **Authority** | Product Decision (Project Owner) |
| **Context** | §4.4's Type Scale pairs exactly one weight with each size/role, mirrored 1:1 into the live Figma Text Styles. Real component usage (Hero kicker text, Button/CTA labels, compact card metadata, Stat Card secondary labels) legitimately requires a different weight at an already-canonical size for emphasis or de-emphasis. Chapter 3 §3.4 already documents `DT-FONT-WEIGHT-*` as an independent primitive token category from `DT-FONT-SIZE-*` — the primitives already support this; only the semantic/style layer did not. |
| **Decision** | Adopt a 4-layer typography architecture, made explicit as governance: `Primitive Tokens (DT-FONT-SIZE-*, DT-FONT-WEIGHT-*) → Semantic Typography Roles → Figma Text Styles/Variables → Components`. Components **MUST** consume a named Semantic Typography Role — never an undocumented local combination of raw primitives (this is not superseded by the fact that primitives are independently tokenized; independence of primitives does **NOT** authorize arbitrary component-level combinations). A new Semantic Typography Role **MAY** be registered only when **all** of the following hold: (1) its semantic meaning is genuinely distinct from every existing role: (2) its usage recurs across components or is architecturally significant, not a single incidental instance; (3) no existing role can legitimately represent it; (4) registering it does not create unnecessary proliferation (no full size×weight matrix, no per-component one-off styles). |
| **Alternatives Considered** | (A) Leave one-weight-per-size as-is, forcing every emphasis need through ad hoc unbound text — rejected, this is the defect being fixed. (B) Full size×weight matrix (up to 42 style combinations) — rejected, violates the anti-proliferation principle and creates a picker most combinations never use. (D) Allow components to freely compose primitive size+weight without any named role — rejected, this would let typography decisions leak into individual components ungoverned, defeating the purpose of a semantic layer. |
| **Why This Decision** | Preserves semantic governance (every typographic choice remains traceable to a named, documented role) while removing the artificial one-weight-per-size constraint that has no primitive-token basis — `DT-FONT-WEIGHT-*` was already independent, the Text Style layer just hadn't caught up. |
| **Risks** | Uncontrolled role creation could still lead to proliferation over time. **Mitigation:** the four-part evidence test above is a **MUST**, not a guideline; any future role proposal is reviewed against it (Chapter 3 §3.5 Token Lifecycle applies equally to semantic typography roles). |
| **Consequences** | The roles registered in §4.15a below are the first application of this policy. Any UI element needing a weight not covered by an existing size's default pairing **MUST** either map to one of §4.15a's roles or be flagged as `DESIGN SYSTEM GAP` pending its own evidence review — it **MUST NOT** be given an ad hoc raw fontSize/weight combination. |

## 4.15a Approved Semantic Typography Roles (Weight Variants)

Evidence-reviewed against real component usage (UAEAF Homepage, this review cycle). Each role reuses only already-approved `DT-FONT-SIZE-*`/`DT-FONT-WEIGHT-*` primitives — no new pixel or weight values were introduced.

| Role | Size | Weight | Basis | Distinct From | Evidence |
| --- | ---: | --- | --- | --- | --- |
| `Type/Eyebrow` | 16px | Bold | `DT-FONT-SIZE-SUBTITLE` + `DT-FONT-WEIGHT-BOLD` | `Type/Overline` (12px/Bold/tracked — a smaller badge-scale kicker; Eyebrow is a larger Hero-scale kicker, different context and size) | Hero kicker text; kicker/eyebrow patterns are architecturally expected to recur beyond the Hero across other feature-style sections. |
| `Type/CTA Label` | 16px | Bold | `DT-FONT-SIZE-SUBTITLE` + `DT-FONT-WEIGHT-BOLD` | `Type/Subtitle` (same size, Medium weight — CTA Label is the emphasis variant for actionable text) | Button/link label text; 6 independent instances confirmed on a single page, and `CMP-BUTTON-001` (Chapter 8 L1) is a platform-wide component — strongest recurrence evidence of any role reviewed. |
| `Type/Compact Metadata` | 14px | Medium | `DT-FONT-SIZE-BODY-SM` + `DT-FONT-WEIGHT-MEDIUM` | `Type/Body Small` (same size, Regular weight — Compact Metadata is the emphasis variant for combined title+context strings) | Combined title/location-style metadata strings; this compact-combination pattern is architecturally common to Event, News, and Results card metadata, not unique to one instance. |
| `Type/Micro Body` | 12px | Regular | `DT-FONT-SIZE-OVERLINE` + `DT-FONT-WEIGHT-REGULAR` | `Type/Overline` (same size, Bold + letter-spacing — a kicker/label treatment; Micro Body is plain small supporting text with no kicker styling) | Stat Card secondary supporting label; a genuinely distinct treatment from Overline's kicker role, expected to recur wherever small plain supporting text is needed. |

**Explicitly left unresolved (insufficient evidence, not guessed):** a "Day Number" style text role (16px/Bold, observed once, in a countdown/calendar context) was reviewed and **rejected** for its own role — single-instance usage does not meet criterion (2) above, and it must not be silently folded into `Type/CTA Label` either, since a calendar numeral is not semantically a call-to-action. This specific usage remains flagged `DESIGN SYSTEM GAP — recurrence evidence required` pending a second confirmed usage elsewhere in the platform.

## 4.15b Scoped Typography Exceptions

# ADR-0041: Scoped Micro-Typography Exceptions

| Field | Details |
| --- | --- |
| **Status** | Accepted |
| **Authority** | Product Decision (Project Owner) |
| **Context** | Two Homepage components carry typography below the general §4.10 13px minimum: (1) club-shield city-name labels (`CMP-CLUBCARD-001`, Chapter 8 L8), measured at ≈9px inside a 63.6px-diameter crest circle — a 13px label was tested and confirmed to visually overlap the crest icon; (2) bilingual organization captions (`CMP-AFFILIATIONS-001`, Chapter 8 L8, ADR-0037), at 12.5px Arabic / 10.5px English, in a compact five-card logo row. §4.4 already establishes one precedent for a sub-general-floor size: `Overline` at 12px is itself an approved exception to a stricter reading (§4.10's 13px floor exists precisely because Overline was deliberately set at 12px as the system's smallest approved role) — establishing that narrowly-scoped micro-typography exceptions are not unprecedented in this system, provided they are named, bounded, and non-generalizable. |
| **Decision** | Formalize two **narrowly scoped, non-transferable** exceptions to §4.10's 13px minimum: **(1) Club Shield City-Name Exception** — permitted **only** inside `CMP-CLUBCARD-001`'s crest-circle city-name label, at its existing measured size (≈9px, pending exact confirmation during Figma implementation); **(2) Membership Caption Exception** — permitted **only** inside `CMP-AFFILIATIONS-001`'s bilingual organization caption pair, at 12.5px (Arabic) / 10.5px (English). Neither exception applies to any other component, any other text role, or any future component merely because it is visually small — each new candidate for a sub-13px size **MUST** undergo its own evidence review and, if approved, receive its own named exception entry here. |
| **Alternatives Considered** | (A) Enlarge the crest / reflow the membership row to accommodate 13px — rejected for now: no evidence review of the resulting layout change has occurred, and this ADR's scope is to formalize the *existing approved* composition, not to redesign it. (C, generalized) A blanket "micro-label" permission for any component under 13px — explicitly rejected; this would erode §4.10 into a suggestion rather than a rule. |
| **Why This Decision** | Preserves §4.10's general floor as a real, enforced minimum for the platform while acknowledging — honestly, not by silent omission — that these two specific, already-shipped compositions cannot currently meet it without a layout change that has not been separately evidenced or approved. |
| **Risks** | Two named exceptions could be cited as precedent to justify unrelated future micro-typography requests. **Mitigation:** this ADR's language explicitly scopes each exception to its exact component and role by name — any future request **MUST** cite its own evidence, not this ADR, per the same four-part test in ADR-0040. |
| **Consequences** | `CMP-CLUBCARD-001` and `CMP-AFFILIATIONS-001` (Chapter 8 L8) are updated with a cross-reference to this ADR in their Related Governance rows. Neither component's Homepage-visible values change as a result of this documentation — this ADR records the existing approved state, it does not authorize new work. |

---

## Do & Don't

**Do:** Use only the sizes/weights defined in §4.4, or a registered Semantic Typography Role from §4.15a · Follow §4.9 for every newly added typeface.

**Don't:** Do not load more than two font families (Arabic + Latin) on any page · Do not violate §4.6, even for a "special" design.

## Success Metrics

* 100% of text consumes a token from §4.4 (validated through Chapter 3 §3.13 CI)
* Zero font files other than Alexandria/IBM Plex Sans/IBM Plex Mono in the final bundle
* LCP for primary text is not negatively affected by font loading (through §4.9 `font-display: swap`)

## References

Alexandria (Google Fonts, SIL OFL) · IBM Plex Sans/Mono (IBM, SIL OFL) · WCAG 2.2 (§1.4 Text Spacing/Resize) · Chapter 1 §1.6

## Related Chapters

Chapter 1 (§1.6 Original Typeface Reference) · Chapter 3 (DT-FONT-* Tokens) · Chapter 6 (Complete Accessibility) · Chapter 7 (Semantic Typography Tokens) · Chapter 8 (Actual implementation in Heading/Text Components)

---

*End of Chapter 4. This chapter is the sole reference for typography — subsequent chapters reference it rather than repeating it. Next Chapter: Chapter 5 — Grid, Layout & Motion.*
