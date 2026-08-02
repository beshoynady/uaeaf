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

## 4.16 Future — Typography 2.0 (Backlog, Not Implemented Now)

**Fluid Typography** (gradual font-size scaling across viewport widths using `clamp()` instead of Breakpoint jumps) · **Optical Size** (leveraging additional Variable Font axes for automatic glyph-level refinements) · **AI Typography Assistant** (automatically suggesting a typographic hierarchy when raw content is pasted — Chapter 16) · **Dynamic Reading Modes** (a dedicated reading mode for users with low vision, expanding Chapter 6).

## Do & Don't

**Do:** Use only the sizes/weights defined in §4.4 · Follow §4.9 for every newly added typeface.

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
