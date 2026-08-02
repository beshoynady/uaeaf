# UAEAF Enterprise Design System Framework

## Enterprise Design System Framework — First Reference Implementation: UAE Athletics Federation

**Version 1.0.0** | **Status: Chapters 0–1 Approved**

> This document is not a project-specific “Design System.” It is a reusable **Enterprise Design System Framework** applicable to any government, sports, or institutional platform — with the UAE Athletics Federation (UAEAF) serving as the **first and reference implementation** of this framework. Every general rule is first defined as a framework principle, then applied to UAEAF as a real-world use case.
>
> **Fixed Document Methodology:** 27 chapters (0–26), with each chapter containing, where applicable: Scope, Definitions, Purpose, Background, Design Goals, Principles, Standards, Guidelines, Best Practices, Do/Don't, Examples, Accessibility/Performance/AI Considerations, Developer Notes, Future Scalability, Success Metrics, References, and Related Chapters. Significant architectural decisions are documented as **ADRs** (Context/Decision/Alternatives/Why/Consequences/**Risks**/**Status**). Terminology is centrally consolidated in Chapter 26 (Glossary).

---

# Chapter 0 — Introduction & Philosophy

## Scope

**Covers:** The rationale behind the framework, UAEAF objectives as the first implementation, the dual philosophy (Public/Operational), and brand personality at the principle level.

**Does not cover:** Executable design principles (→ Chapter 2), actual visual values (→ Chapter 1), or detailed application-level Tone of Voice (→ Chapter 9).

## Definitions

| Term                                   | Definition                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Enterprise Design System Framework** | A general design framework, not tied to a single project, that can be adopted by any organization and provides a unified methodology for tokens, components, governance, and accessibility |
| **Digital Ecosystem**                  | A connected group of digital products sharing the same identity and design infrastructure, as opposed to a single isolated “website”                                                       |
| **Experience Layer**                   | An independent UX behavior layer (Public or Operational) built on top of the same Design Tokens                                                                                            |
| **First Reference Implementation**     | The first real-world implementation of the framework (here: UAEAF), used to test and validate the framework before broader adoption                                                        |

## Purpose

This chapter establishes the rationale behind the framework before defining any design rules. Every decision in Chapters 2–25 must be traceable to at least one statement here.

## Background

The UAE Athletics Federation (UAEAF) is rebuilding its entire digital platform as a **Digital Ecosystem** serving all stakeholders. Although this framework originated from UAEAF’s needs, it was designed to be abstractable from day one — meaning any other organization can adopt it by replacing only Chapter 1 (Visual Identity), while the remaining chapters (2–26) remain valid as a general framework.

## Design Goals — UAEAF as the First Implementation

| # | Goal                                    | Time Horizon    | Success Indicator                                                                                |
| - | --------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| 1 | World-Class Digital Identity            | First two years | A visitor from outside the UAE feels they are experiencing a modern national sports organization |
| 2 | Full Digital Transformation             | First two years | All federation operations are unified within a single platform                                   |
| 3 | Promote Athletics & Increase Engagement | Ongoing         | Increased visibility across search engines and AI engines                                        |

**10-Year Vision:** Every decision is measured against Scalability, Maintainability, Reusability, Accessibility, Performance, and International Standards.

## Principles

*(Introductory — full PR-XXX numbering in Chapter 2)*

### ADR-0001: Dual Experience Architecture

| Field                       | Details                                                                                                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                 |
| **Context**                 | The platform serves two fundamentally different audiences: a public/media/international audience that should be impressed from the first visit, and daily operational users who need to complete tasks in the fewest possible steps      |
| **Decision**                | Build two separate experience layers on top of the same Design Tokens: **Public Experience** (emotional, inspiring, Premium) and **Operational Experience** (efficient, clear, Data-first)                                               |
| **Alternatives Considered** | A single unified style — rejected because it would force one audience to compromise. Two completely separate systems with different tokens — rejected because it would break unified identity                                            |
| **Why This Decision**       | Achieves the balance of one visual identity with audience-specific UX behavior, without structural duplication                                                                                                                           |
| **Risks**                   | Public-site decoration may leak into the dashboard and slow task completion, or vice versa, reducing the impact of the public experience. **Mitigation:** Every component in Chapter 8 documents its behavior across both layers clearly |
| **Consequences**            | Every component in Chapter 8 documents its potentially different behavior between the two layers                                                                                                                                         |

**Guiding Principle:** The audience should be impressed, while the daily user should be able to complete their work in the fewest possible steps.

## Brand Personality

*(First implementation for UAEAF)*

**Professional** (no visual exaggeration) · **Inspiring** (stronger Hero, governed celebratory moments) · **Modern** (Motion, AI-Ready, Dark Mode from day one) · **National with Global Standards** (national pride expressed through execution quality rather than direct symbolism)

## Do & Don't

**Do:** Connect every subsequent decision to a Design Goal · Use the same tokens across both layers · Design with the 10-year objective in mind

**Don't:** Do not design a screen without connecting it to a principle · Do not impose one layer’s decoration on the other · Do not treat the framework as merely a “website”

## Success Metrics

* Every subsequent chapter references at least one Design Goal
* No component is designed without specifying its Experience Layer
* The framework (Chapters 2–26) can be separated from Chapter 1 without logical breakage

## References

UAEAF Vision Discovery Interview · World Athletics Digital Platform · IOC Digital Guidelines

## Related Chapters

Chapter 1 → Brand Personality.
Chapter 2 → Numbers the principles of this chapter using PR-XXX identifiers.
Chapter 9 → Expands the Tone of Voice.
Chapter 25 → Returns to the Design Goals as measurement criteria.

---

# Chapter 1 — Official Brand Identity

## Scope

**Covers:** Logo and its usage rules, official colors and the digital scale derived from them, font reference, and decorative visual pattern.

**Does not cover:** Full Design Tokens (→ Chapter 3), detailed typography system (→ Chapter 4), or any ready-made component (→ Chapter 8).

## Definitions

| Term                               | Definition                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Brand Token**                    | A raw visual value directly tied to the official brand identity — the lowest layer in the token hierarchy |
| **Clear Space**                    | The mandatory safe area around the logo within which no other element may be placed                       |
| **Reference Implementation Color** | The digital value (500) in any color scale that is required to match the official Pantone value exactly   |

## Purpose

To document the official UAEAF visual identity exactly as defined in the UAEAF Visual Standard Guide, serving as the highest-authority reference for every subsequent visual decision.

## Background

The official guide covers the logo, colors, typography, misuse, decorative patterns, and print applications. This chapter extracts only what applies to digital platforms.

## Standards — Logo

**Composition:** Symbolic logo (4 lines representing running, throwing, jumping, and walking) + wordmark.

**Variants:** Primary (default) / Secondary (for limited space).

**Minimum width:** 20mm (≈96px digitally) — below this size, use the symbol without the wordmark.

**Background rule:** White/high-contrast background → full-color logo; any other background → monochrome logo.

### ADR-0002: Logo Usage on Dark Mode

| Field                       | Details                                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                |
| **Context**                 | The guide requires the full-color logo only on white/high-contrast backgrounds; Dark Mode (Chapter 7) uses a dark background                                                            |
| **Decision**                | In Dark Mode, the **white monochrome logo is used exclusively**                                                                                                                         |
| **Alternatives Considered** | White container behind the full-color logo — rejected because it disrupts visual continuity                                                                                             |
| **Why This Decision**       | Literal compliance with the rule “high-contrast background = monochrome”; provides the highest possible contrast                                                                        |
| **Risks**                   | Incorrectly using the colored version on a dark background reduces contrast and violates the guide. **Mitigation:** Provide only the correct asset in the component library (Chapter 8) |
| **Consequences**            | Every Header/Sidebar in Dark Mode uses a separate dedicated SVG asset                                                                                                                   |

## Standards — Prohibited Logo Misuse

Rotation · non-proportional stretching · color changes · adding shadows · framing · changing the angle/order of the four lines — all are explicitly prohibited as defined in the guide, because they compromise immediate recognition and violate the national identity and modern flat aesthetic (Chapter 6).

## Standards — Official Colors

| Name             | Pantone | HEX     | RGB         |
| ---------------- | ------- | ------- | ----------- |
| Federation Green | 348 C   | #00843D | 0, 132, 61  |
| Federation Red   | 186 C   | #C8102E | 200, 16, 46 |
| Federation Black | Black C | #000000 | 0, 0, 0     |

**Official rule:** Inspired by the national flag — adherence is mandatory across all applications.

### ADR-0003: Digital Color Scale Extension

| Field                       | Details                                                                                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                            |
| **Context**                 | The guide defines only 3 solid colors; digital systems require tonal scales for states such as Hover and for WCAG contrast calculations                                                                                             |
| **Decision**                | A 50→900 tonal scale for each color, with value 500 matching the official Pantone value exactly; all other values are mathematically derived using HSL Lightness                                                                    |
| **Alternatives Considered** | Using opacity instead of separate tonal scales — rejected because it complicates WCAG contrast calculations                                                                                                                         |
| **Why This Decision**       | Preserves brand identity at the reference value while providing the flexibility required for digital interfaces                                                                                                                     |
| **Risks**                   | Modifying the 500 value without federation review would break its match with the official Pantone color. **Mitigation:** The 500 value is protected in Chapter 3 with an explicit comment: “DO NOT MODIFY — Official Pantone Match” |
| **Consequences**            | Chapter 3 contains the complete scale; every review specifically verifies the 500 value                                                                                                                                             |

### ADR-0004: Color Usage Discipline

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                      |
| **Context**                 | The guide defines the colors as brand identity but does not establish functional digital usage rules                                                                                                                                                                                                                                                                                          |
| **Decision**                | Green = primary/positive action. Red = danger/delete/cancel only. Black = text and structural elements                                                                                                                                                                                                                                                                                        |
| **Alternatives Considered** | Using red as a standard CTA because it is a brand color — rejected                                                                                                                                                                                                                                                                                                                            |
| **Why This Decision**       | Ensures clear visual communication — a color with a consistent meaning is more effective than a color with multiple meanings (Material Design and Nielsen Norman principles)                                                                                                                                                                                                                  |
| **Risks**                   | If red is used as a standard Primary button, users may subconsciously interpret it as a warning regardless of the designer’s intention, reducing interaction with important actions and weakening the visual distinction of actual error states. **Mitigation:** Enforce the rule at the Semantic Token level (Chapter 7) so `button-primary` cannot be mapped to `core-red` programmatically |
| **Consequences**            | Primary buttons (Chapter 8) use green or black; red is reserved exclusively for delete/cancel/error                                                                                                                                                                                                                                                                                           |

## Standards — Medal Colors

*(Approved addition, outside the official guide)*

| Name         | HEX (Reference 500) | Usage                           |
| ------------ | ------------------- | ------------------------------- |
| Medal Gold   | #D4A017             | Gold medal (Chapter 8 L8 §SP.5) |
| Medal Silver | #9AA3AD             | Silver medal                    |
| Medal Bronze | #B0703B             | Bronze medal                    |

**TDR-002 — Medal Color Tokens**

```text
Token:      color.brand.medal.gold / .silver / .bronze
Decision:   Add 3 new Brand colors (outside the official identity colors in Chapter 1 §Official Colors) dedicated exclusively to distinguishing medals
Reason:     Chapter 8 L8 §SP.5 requires consistent visual distinction for the three medals through dedicated tokens rather than general Semantic colors
            (Success/Warning/Danger), to avoid semantic conflict with Chapter 1 ADR-0004 — gold/silver/bronze
            are independent celebratory colors, not system states
Approved By: Project Owner (Chapter 3 §3.7 — authority to approve a new Proposal)
Alternative Rejected: Reusing a shade from the green/red scale visually as a medal — rejected (no semantic relationship and may confuse the reader)
Scale:      Full 50→900 scale (10 steps, consistent with the other core colors in §3.14), derived from the above 500 value using the same methodology as ADR-0003
```

These colors belong to the **Brand** layer (not the federation’s official identity itself) — they are governed by the same Chapter 3 §3.5 Token Lifecycle as any other Brand token, rather than the dual modification restrictions applicable specifically to the official identity colors (§3.7 final paragraph applies only to the official identity colors defined in this chapter above: Federation Green/Red/Black).

## Standards — Official Font

*(Reference only — full details in Chapter 4)*

The guide adopts **The Sans Arabic** for the logo and official printed materials. The complete digital decision (free web alternative) is documented as **ADR-0010 in Chapter 4**.

## Standards — Decorative Pattern

*(Brand Visual Theme)*

The four parallel diagonal lines (the “take-off point” angle) are the approved decorative element for backgrounds and dividers.

### ADR-0005: Theme Pattern as Reusable Asset

| Field                       | Details                                                                                                                                                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                      |
| **Context**                 | The pattern exists in the guide as static images within printed designs and is not directly reusable digitally                                                                                                                                                                |
| **Decision**                | Recreate the pattern as an **SVG Component**: 5–10% opacity background layer for general use, full fill for Hero sections only                                                                                                                                                |
| **Alternatives Considered** | Using the original images as backgrounds — rejected because it harms performance and does not adapt to RTL/Responsive layouts                                                                                                                                                 |
| **Why This Decision**       | SVG is lightweight, recolorable, responsive to any screen size, and supports automatic RTL mirroring                                                                                                                                                                          |
| **Risks**                   | Recreating the pattern with a different angle or proportion from the original would weaken its visual relationship to the logo. **Mitigation:** Measure the angle and proportions from the original guide files before implementation, followed by side-by-side visual review |
| **Consequences**            | Chapter 8 includes this as a core “Brand Pattern” component                                                                                                                                                                                                                   |

## Do & Don't

**Do:** Use the official values literally as the 500 reference · Use only approved logo variants · Use the decorative pattern as a subtle layer

**Don't:** Do not invent colors that are merely “close” to the official colors · Do not use red as a standard CTA · Do not violate any Logo Misuse rule

## Accessibility Considerations

Green 500 on white = **4.6:1** contrast ratio (passes AA for normal text). Red 500 on white = **5.9:1** (passes AA). Neither passes AAA — when AAA is required (Chapter 6), use 700 from the scale.

## Developer Notes

Logo assets (SVG) are provided separately for each state:

* `logo-primary-color.svg`
* `logo-secondary-color.svg`
* `logo-mono-white.svg`
* `logo-mono-black.svg`
* `logo-icon-only.svg`

None should be created using CSS filters, to avoid inaccurate color rendering.

## Future Scalability

If the federation updates its official guide, this is the only chapter that should be directly modified; the color scale is automatically recalculated from the new 500 reference value.

For the general framework: another organization can replace Chapter 1 entirely with its own brand data, while Chapters 2–26 remain valid as-is.

## Success Metrics

* All screens use the official colors (500 value matching Pantone) without exception
* Zero instances of Logo Misuse in any design review (Chapter 23.7)
* Full compliance with logo clear space requirements in every implementation
* No standard Primary button using red in any interface

## References

UAEAF Visual Standard Guide (primary and binding reference) · WCAG 2.2 · Material Design Color System

## Related Chapters

Chapter 0 → Brand Personality.
Chapter 3 → Directly consumes the values defined here.
Chapter 4 → Expands the font reference.
Chapter 6 → Uses the Accessibility Considerations calculations.
Chapter 8 → Uses the Theme Pattern.

---

**End of Chapters 0 and 1 — Updated version using the complete Enterprise methodology.**

**Next:** Chapter 2 — Design Principles *(will contain the first official PR-XXX numbering).*
