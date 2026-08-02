# Chapter 2 — Design Principles

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner (see Chapter 22: Governance)

> **Normative Language:** MUST (mandatory) · MUST NOT (strictly prohibited) · SHOULD (strongly recommended) · SHOULD NOT (avoid unless there is a documented reason) · MAY (optional).

## Depends On / Used By

| Depends On                                | Used By                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Chapter 0 (Design Goals, Dual Experience) | Chapter 3 (Design Tokens)                                                                        |
| Chapter 1 (Brand Identity)                | Chapter 6, Chapter 8, Chapter 10, and every subsequent chapter (via the “Based on PR-XXX” field) |

## Scope

**Covers:** The ten principles (PR-001→PR-010), their complete practical tools, the conflict-resolution framework, and the quick decision matrix.
**Does not cover:** Detailed technical implementation, which is documented in the relevant chapter through reference to the applicable principle identifier.

## Definitions

| Term                | Definition                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| **Principle (PR)**  | A high-level guiding rule that governs decisions when no more specific rule exists              |
| **Anti-Pattern**    | A common but incorrect application of a principle, explicitly documented to prevent recurrence  |
| **Decision Matrix** | A quick-reference table that directly maps a common design situation to its governing principle |

## Purpose

Chapter 1 answers **“Who are we?”**; this chapter answers **“How do we make design decisions?”** — Following this update, it has become a **daily working tool** for designers and developers rather than merely a theoretical reference.

---

# PR-001 — Clarity Over Decoration

| Field                         | Value                                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authority**                 | Product Decision                                                                                                                                                                             |
| **Tags**                      | `UX` `Visual Design` `Content`                                                                                                                                                               |
| **Cost**                      | Low (design discipline; no engineering cost)                                                                                                                                                 |
| **Definition**                | Functional clarity **MUST** take precedence over any decorative aesthetic element                                                                                                            |
| **Rationale**                 | Users need to understand the information before being visually impressed (Chapter 0/9)                                                                                                       |
| **Measurement (KPI)**         | Time-to-First-Meaningful-Content < 1.5s on a standard screen; zero visual elements without a documented purpose during design review                                                         |
| **❌ Anti-Patterns**           | Carousel used merely because it is “beautiful” · Glassmorphism over news text (reduces readability) · More than one Primary CTA in the same section · More than four colors in a single Hero |
| **✅ Good Example**            | World Athletics interface designs — clear data and results with limited, functional decoration                                                                                               |
| **❌ Bad Example**             | A page filled with animated widgets competing for attention simultaneously                                                                                                                   |
| **Checklist Before Approval** | ☐ Does every visual element have a clear purpose? ☐ Is the most important information actually the most visually prominent? ☐ Is there more than one primary CTA?                            |
| **Conflicts With**            | PR-005                                                                                                                                                                                       |
| **Resolution**                | PR-001 prevails in any direct conflict with PR-005                                                                                                                                           |
| **Version History**           | v1.0 (Current)                                                                                                                                                                               |

---

# PR-002 — Performance First

| Field                         | Value                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authority**                 | Product Decision (Chapter 5)                                                                                                                            |
| **Tags**                      | `Performance` `Engineering` `Testing`                                                                                                                   |
| **Cost**                      | Medium (requires continuous engineering discipline: Lazy Loading, Code Splitting)                                                                       |
| **Definition**                | Every decision **MUST** be evaluated for its impact on Core Web Vitals before approval                                                                  |
| **Rationale**                 | Performance is part of the intended global identity (Chapter 0)                                                                                         |
| **Measurement (KPI)**         | LCP < 2.5s · INP < 200ms · CLS < 0.1 · Animation FPS > 55 · Lighthouse Performance ≥ 90                                                                 |
| **❌ Anti-Patterns**           | 20MB Hero video without a Poster Image · Loading all fonts at once without `font-display: swap` · One oversized JS bundle without Code Splitting        |
| **✅ Good Example**            | Simple, highly responsive search engines (Google Search as a reference for functional speed, not visual design)                                         |
| **❌ Bad Example**             | Websites with heavy background video without compression or a fallback image                                                                            |
| **Checklist Before Approval** | ☐ Has LCP been measured in practice rather than assumed? ☐ Is every image compressed as WebP/AVIF? ☐ Is Lazy Loading applied to below-the-fold content? |
| **Decision Tree**             | Does the element affect LCP? → Yes → Can its loading be deferred? → Yes → Defer it (Lazy) → No → Optimize it as much as possible before approval        |
| **Conflicts With**            | PR-005, PR-010                                                                                                                                          |
| **Resolution**                | Always prevails                                                                                                                                         |
| **Version History**           | v1.0                                                                                                                                                    |

---

# PR-003 — Accessibility by Default

| Field                         | Value                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authority**                 | International Standard (WCAG 2.2 AA)                                                                                                                       |
| **Tags**                      | `Accessibility` `Compliance` `Development` `Testing`                                                                                                       |
| **Cost**                      | Medium (significantly less expensive when implemented from the design stage rather than as a later fix)                                                    |
| **Definition**                | Every component **MUST** be designed and built to be accessible from the outset                                                                            |
| **Rationale**                 | This is an established mandatory standard (Chapter 6); fixing accessibility issues later is significantly more expensive                                   |
| **Measurement (KPI)**         | 0 Critical/Serious errors in Axe DevTools · Color contrast ≥ 4.5:1 for normal text · 100% keyboard navigation                                              |
| **❌ Anti-Patterns**           | `outline: none` without an alternative visible Focus state · Images without Alt Text · Forms without associated `<label>` elements                         |
| **✅ Good Example**            | Modern UAE government forms (TDRA) with clearly visible Focus states                                                                                       |
| **❌ Bad Example**             | A website that relies solely on color to distinguish “success” from “error” without an icon or text                                                        |
| **Checklist Before Approval** | ☐ Has the entire interface been tested using Tab navigation? ☐ Does every content image have Alt Text? ☐ Has contrast been measured rather than estimated? |
| **Conflicts With**            | PR-001 in some cases                                                                                                                                       |
| **Resolution**                | **Never overridden — absolute priority across the entire framework**                                                                                       |
| **Version History**           | v1.0                                                                                                                                                       |

---

# PR-004 — Content First

| Field                         | Value                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Authority**                 | Engineering Decision                                                                                                         |
| **Tags**                      | `Content` `UX` `CMS` `SEO`                                                                                                   |
| **Cost**                      | Low                                                                                                                          |
| **Definition**                | Design **MUST** begin with real content, not placeholder text                                                                |
| **Rationale**                 | Arabic and English differ significantly in length; designing around idealized text causes real-world breakage                |
| **Measurement (KPI)**         | 0 unintended Text Overflow/Truncation cases during QA using real content                                                     |
| **❌ Anti-Patterns**           | Testing with a short “Sample News” title instead of a realistic long Arabic headline · Ignoring the “No Image” content state |
| **✅ Good Example**            | A news card designed to accommodate a three-line headline without breaking the layout                                        |
| **❌ Bad Example**             | A Card designed around a two-word headline that breaks as soon as real content is introduced                                 |
| **Checklist Before Approval** | ☐ Has it been tested using the longest real headline from the archive? ☐ Are “No Image” / “No Data” states designed?         |
| **Conflicts With**            | PR-001                                                                                                                       |
| **Resolution**                | PR-004 prevails — the design must withstand the worst realistic case                                                         |
| **Version History**           | v1.0                                                                                                                         |

---

# PR-005 — Motion with Purpose

| Field                   | Value                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authority**           | Product Decision                                                                                                                                      |
| **Tags**                | `Motion` `UX` `Accessibility` `Performance`                                                                                                           |
| **Cost**                | Medium                                                                                                                                                |
| **Definition**          | Every animation **MUST** communicate a state change and respect `prefers-reduced-motion`                                                              |
| **Rationale**           | Chapter 5 — “Function before decoration”                                                                                                              |
| **Measurement (KPI)**   | Animation FPS > 55 · Zero continuous automatic motion (Infinite Loop) without a stop control                                                          |
| **❌ Anti-Patterns**     | Random shaking without a functional reason · Motion that cannot be disabled under Reduced Motion · Performance-heavy Parallax                         |
| **✅ Good Example**      | An animated statistic number when it enters the viewport, communicating that an important value has appeared                                          |
| **❌ Bad Example**       | Every element on the page animating differently on load without a coordinated system                                                                  |
| **Principle Checklist** | ☐ Does it explain a state change? ☐ Can it be removed without losing functionality? ☐ Does it respect `prefers-reduced-motion`? ☐ Does it affect FPS? |
| **Decision Tree**       | Does it improve understanding? → No → Reject · → Yes → Does it harm performance? → Yes → Reject/Simplify · → No → Accept                              |
| **Conflicts With**      | PR-001, PR-002                                                                                                                                        |
| **Resolution**          | Always loses to both                                                                                                                                  |
| **Version History**     | v1.0                                                                                                                                                  |

---

# PR-006 — Context-Aware Responsiveness

| Field                         | Value                                                                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authority**                 | Product Decision                                                                                                                                         |
| **Tags**                      | `Responsive` `UX` `Dashboard`                                                                                                                            |
| **Cost**                      | Medium                                                                                                                                                   |
| **Definition**                | Design **MUST** adapt according to the actual usage context: Public Website = Mobile Priority; Dashboard = Desktop Priority                              |
| **Rationale**                 | A documented reconciliation between the general “Mobile First” approach and the previous Responsive decision (Chapter 0 ADR-0001)                        |
| **Measurement (KPI)**         | 0 unintended Horizontal Scroll at 320px · Touch Targets ≥ 44px on all small screens                                                                      |
| **❌ Anti-Patterns**           | Designing a complex Data Grid for mobile first and then simply “scaling it up” for desktop · Designing the public website Hero first for a 1440px screen |
| **✅ Good Example**            | A Dashboard results table designed first for a 1440px display with full columns, followed by a simplified mobile version                                 |
| **❌ Bad Example**             | Forcing the same complex table layout onto a 375px screen until it breaks                                                                                |
| **Checklist Before Approval** | ☐ Was the primary audience for this screen identified first? ☐ Was it designed for the actual usage context (office / on the move)?                      |
| **Conflicts With**            | No direct conflict with other principles                                                                                                                 |
| **Resolution**                | Refer to Chapter 0 to determine the experience layer first                                                                                               |
| **Version History**           | v1.0                                                                                                                                                     |

---

# PR-007 — AI-Ready by Design

| Field                         | Value                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Authority**                 | Product Decision                                                                                                                                 |
| **Tags**                      | `AI` `Scalability` `CMS` `Future`                                                                                                                |
| **Cost**                      | Low currently (reserving UI extension points only), High later when actually activated                                                           |
| **Definition**                | Every component **MUST** accommodate future AI integration without requiring a redesign; every AI output **MUST** remain subject to human review |
| **Rationale**                 | 10-year vision + Chapter 16                                                                                                                      |
| **Measurement (KPI)**         | 100% of core CMS components contain an AI extension point reserved in the Component API, even if currently disabled                              |
| **❌ Anti-Patterns**           | Always-visible “AI” button when the feature is not enabled (violates PR-001) · Automatically publishing AI output without human review           |
| **✅ Good Example**            | An “AI Suggest” button appearing only when the feature is enabled (Progressive Disclosure)                                                       |
| **❌ Bad Example**             | An interface filled with “AI” badges everywhere before any AI capability has actually been enabled                                               |
| **Checklist Before Approval** | ☐ Is the extension point reserved in the code, not only in the design? ☐ Is there a mandatory human review workflow?                             |
| **Conflicts With**            | PR-001                                                                                                                                           |
| **Resolution**                | Reserved elements remain invisible until activation — therefore PR-001 is not violated                                                           |
| **Version History**           | v1.0 — AI-Ready (Assisted) → **Planned v2.0 — AI-Native** (deeper integration, outside the scope of the current version)                         |

---

# PR-008 — Built to Scale

| Field                         | Value                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Authority**                 | Engineering Decision                                                                                                                     |
| **Tags**                      | `Scalability` `Engineering` `Data`                                                                                                       |
| **Cost**                      | High (Pagination/Virtualization from day one is more expensive engineering-wise than a simple initial implementation)                    |
| **Definition**                | Every token/component **MUST** be designed assuming 10× data growth                                                                      |
| **Rationale**                 | 10-year vision + Chapter 12                                                                                                              |
| **Measurement (KPI)**         | Response time for a list containing 10,000 records ≈ response time for a list containing 100 records (through Pagination/Virtualization) |
| **❌ Anti-Patterns**           | Fetching all records in a single API request without Pagination · A Select dropdown containing every club without search                 |
| **✅ Good Example**            | A Dashboard Data Grid using progressive loading (Infinite Scroll or Pagination) from the first version                                   |
| **❌ Bad Example**             | A news list loading all content (500+ articles) in a single request                                                                      |
| **Checklist Before Approval** | ☐ Has the component been tested by default with 10× the current data volume?                                                             |
| **Conflicts With**            | No direct conflict (it may conflict with initial delivery speed, which is outside the scope of this framework)                           |
| **Resolution**                | —                                                                                                                                        |
| **Version History**           | v1.0                                                                                                                                     |

---

# PR-009 — Consistency Through Tokens

| Field                         | Value                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Authority**                 | Engineering Decision                                                                                                     |
| **Tags**                      | `Tokens` `Engineering` `Theming`                                                                                         |
| **Cost**                      | Medium (requires development discipline but saves significant maintenance costs later)                                   |
| **Definition**                | Any visual value **MUST** come from a defined token; arbitrary values **MUST NOT** be used in production code            |
| **Rationale**                 | The only reliable guarantee of consistency across 27 chapters over multiple years and teams                              |
| **Measurement (KPI)**         | 0 hardcoded Hex Colors in the codebase (automatically checked through an ESLint Rule/Stylelint)                          |
| **❌ Anti-Patterns**           | `color: #00843D` directly in code · `margin: 13px` as an arbitrary value outside the Chapter 3 scale                     |
| **✅ Good Example**            | `color: var(--brand-green-500)`                                                                                          |
| **❌ Bad Example**             | Every developer manually entering color values using their own numbers                                                   |
| **Checklist Before Approval** | ☐ Does the value already exist in Chapter 3/7? ☐ If not, does it require an official new token rather than an exception? |
| **Conflicts With**            | No direct conflict                                                                                                       |
| **Resolution**                | —                                                                                                                        |
| **Version History**           | v1.0                                                                                                                     |

---

# PR-010 — Government-Grade Quality

| Field                         | Value                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Authority**                 | Product Decision                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Tags**                      | `Quality` `Trust` `Reliability`                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Cost**                      | High (requires a higher level of testing and review than an average SaaS product)                                                                                                                                                                                                                                                                                                                                                          |
| **Definition**                | Every part of the platform **MUST** meet a quality standard appropriate for an official national institution                                                                                                                                                                                                                                                                                                                               |
| **Rationale**                 | Chapter 0 §Design Goals #1, and the Federation’s international positioning                                                                                                                                                                                                                                                                                                                                                                 |
| **Note on Naming**            | From a purely engineering perspective, this principle is closer to an **outcome (Vision)** than a **method (Principle)**; the broader engineering equivalent is **“Reliability by Design.”** The current name is retained because it specifically expresses the identity of this project. However, any future application of this framework to another organization (Chapter 0) **SHOULD** use “Reliability by Design” as the generic name |
| **Measurement (KPI)**         | 0 visible “Beta Labels” on the public-facing website · Every published number (result/statistic) has a documented source                                                                                                                                                                                                                                                                                                                   |
| **❌ Anti-Patterns**           | Displaying “Under Development” or “Coming Soon” on public-facing pages · Publishing a number/result without a verified source                                                                                                                                                                                                                                                                                                              |
| **✅ Good Example**            | World Athletics results pages — no experimental messaging; every figure is final and reliable                                                                                                                                                                                                                                                                                                                                              |
| **❌ Bad Example**             | A statistics dashboard displaying “Beta” on the public homepage                                                                                                                                                                                                                                                                                                                                                                            |
| **Checklist Before Approval** | ☐ Is this actually ready for the official public audience, or is it still experimental? ☐ Does the displayed figure have a documented source?                                                                                                                                                                                                                                                                                              |
| **Conflicts With**            | PR-002                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Resolution**                | PR-002 prevails — “Government-Grade” means stability and accuracy, not expensive visual luxury                                                                                                                                                                                                                                                                                                                                             |
| **Version History**           | v1.0                                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

# Backlog — Future Principle (v2.0, Not Added Now)

### PR-011 — Simplicity Over Complexity

*Registered for future consideration only; not formally numbered at this stage in order to preserve current numbering stability.*

This principle concerns simplifying engineering solutions and user experience (in contrast to PR-001, which focuses specifically on visual clarity):

* Do not create a new component when a reusable alternative already exists.
* Do not introduce a complex workflow when a single step is sufficient.
* Do not divide a screen into 10 cards when 4 clear cards are enough.

---

# Conflict Resolution Framework

```text
1.  PR-003 Accessibility by Default        ← Never overridden
2.  PR-002 Performance First
3.  PR-004 Content First
4.  PR-001 Clarity Over Decoration
5.  PR-009 Consistency Through Tokens
6.  PR-006 Context-Aware Responsiveness
7.  PR-010 Government-Grade Quality
8.  PR-007 AI-Ready by Design
9.  PR-008 Built to Scale
10. PR-005 Motion with Purpose             ← First to lose in a conflict
```

---

# Principle Decision Matrix

A quick-reference table for use during development — the first place any designer/developer should consult when uncertain:

| Design Situation                                            | Governing Principle                           |
| ----------------------------------------------------------- | --------------------------------------------- |
| Choosing a color                                            | PR-009                                        |
| Adding an animation                                         | PR-005 + PR-002                               |
| Writing content/text                                        | PR-004                                        |
| Designing a Hero Section                                    | PR-001 + PR-005                               |
| Designing a Dashboard screen                                | PR-006                                        |
| Designing a CMS/content editor                              | PR-004                                        |
| Adding an AI feature                                        | PR-007                                        |
| Any decision affecting accessibility                        | PR-003 (always prevails)                      |
| SEO-related decision                                        | PR-004                                        |
| Designing Dark Mode                                         | PR-009                                        |
| Decision involving data volume / long lists                 | PR-008                                        |
| Choosing between a “beautiful” design and a “stable” design | PR-010 → but PR-002 prevails if they conflict |

---

## Do & Don't

**Do:** Use the Principle Decision Matrix as the first reference point whenever uncertain · Apply each principle’s Checklist before delivery.

**Don't:** Skip a Checklist because of time constraints · Break PR-003 regardless of the justification.

---

## Success Metrics

* Every subsequent ADR explicitly references its applicable PR-XXX.
* The Principle Decision Matrix is actively used during design reviews (Chapter 23.7).
* Zero documented Anti-Patterns recur across two consecutive reviews.

---

## References

Chapter 0 · Chapter 1 · WCAG 2.2 · RFC 2119

## Related Chapters

Every chapter from Chapter 3 through Chapter 26 directly consumes this chapter.

---

*End of Chapter 2 — Complete version with practical tools. Next chapter: Chapter 3 — Design Tokens.*
