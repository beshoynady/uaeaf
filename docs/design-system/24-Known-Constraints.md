# Chapter 24 — Known Constraints

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                     | Used By                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| All Chapters 1–23 (source of every constraint documented here) | Chapter 25 (Future Roadmap builds upon these constraints) |

## Scope

**Covers:** The system's current limitations and boundaries, explicitly documented — browser support, third-party risks, font licensing, performance constraints, AI limitations, and business questions that remain unresolved from Discovery.

**Does Not Cover:** Solutions to these constraints. Any future solution or planned mitigation **MUST** be documented in Chapter 25 — Future Roadmap.

## Purpose

A genuine Enterprise reference **MUST** document its limitations with the same rigor used to document its capabilities.

This chapter prevents future readers, designers, developers, or stakeholders from assuming a level of completeness or capability that does not actually exist.

---

## 1. Browser Support

The platform **MUST** officially support the latest two versions of:

* Chrome
* Safari
* Edge
* Firefox

The platform **MAY** function partially on older browser versions, but full compatibility **MUST NOT** be guaranteed.

This particularly applies to modern CSS capabilities such as:

* `aspect-ratio` — used in Chapter 8 L6 §M.2.
* `:has()` — if introduced in a future implementation.

**Internet Explorer MUST NOT** be supported and is explicitly outside the platform's browser-support commitment.

---

## 2. Third-Party Risks & Open Business Questions

The following questions remain unresolved from Discovery and represent known external or business-level constraints:

| Question                                                                          | Status                                                                                                                                   |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Source of competition/result data** — external timing provider or manual entry? | **Open** — Chapter 8 L8 ADR-0020 is intentionally designed to support either option without requiring changes to the presentation layer. |
| **Federation Registration Number System**                                         | **Open** — not yet determined by the Federation.                                                                                         |
| **Methodology for calculating “Best Club / Best Athlete of the Season”**          | **Open** — business decision outside the scope of the design system (Chapter 8 L8 §SP.5).                                                |

These items **MUST** remain explicitly classified as unresolved until the relevant business or technical decision is formally documented.

---

## 3. Font Licensing

The official print font, **The Sans Arabic** (Chapter 1 §1.6), **MUST NOT** be used as a Web Font due to its ongoing licensing cost.

The approved web alternative — **Alexandria + IBM Plex Sans** (Chapter 4 ADR-0007) — is freely available under the **SIL Open Font License (OFL)**.

However, these fonts **ARE NOT** the Federation's literal official brand typeface.

This is an intentional and documented architectural/design decision, not an omission or forgotten requirement.

---

## 4. Performance Constraints

Virtualization (Chapter 8 L5 §DD.12) improves performance for large datasets, but introduces genuine technical complexity and interaction constraints.

One known example is the loss or limitation of the browser's native `Ctrl+F` behavior within virtualized tables, which is a common characteristic of virtualization-based interfaces.

This limitation is an **accepted architectural constraint**, not an implementation defect.

Any implementation using virtualization **MUST** therefore recognize the trade-off between rendering performance and native browser interaction behavior.

---

## 5. AI Limitations

### 5.1 AI Hallucination

External AI models — including AI search engines referenced in Chapter 15 — **MAY** generate hallucinated or inaccurate information despite all measures defined in Chapter 15.

This behavior is **outside the platform's complete control**.

Chapter 15 improves source clarity, consistency, and machine readability, but **MUST NOT** be interpreted as a guarantee that external AI systems will always produce accurate answers.

### 5.2 AI Translation

Any AI-assisted translation introduced under Chapter 16 §2 Priority 7 **MUST** undergo mandatory human review.

AI translation **MUST NOT** be treated as a permanently reliable 100%-accurate replacement for professionally authored bilingual content.

This remains an assisted workflow rather than an autonomous publishing mechanism.

### 5.3 Confidence Indicator

The Confidence Indicator is architecturally documented as a reference component in Chapter 16 §4 but **HAS NOT YET BEEN IMPLEMENTED**.

Its implementation remains a **Backlog item** and is therefore outside the current Baseline v1.0 implementation scope.

---

## 6. Consolidated Backlog Reference — v1.1

Multiple Chapters — particularly Chapters 3–14 — recorded individual **Backlog v1.1** items during the review process.

These represent intentional improvements that were deliberately excluded from Baseline v1.0.

Key examples include:

* Detailed Font Weight Policy — Chapter 4 — **RESOLVED, see ADR-0040** (Semantic Typography Roles / "Model E"). The four-part evidence test and the initial approved role registry (§4.15a) are now authoritative; individual future role proposals still require their own evidence review under that same test.
* Input Mask and Mobile Keyboard Hints — Chapter 8 L2.
* Accessible Components Matrix and Color Blind Validation — Chapter 8 L1/L6, linked to Chapter 6.
* Multi-Window Synchronization and AI Navigation — Chapter 8 L3.
* Detailed Select/Combobox Empty States — Chapter 8 L2.

**MUST:** Any actual implementation work **MUST** review the originating chapter directly for the authoritative details of each Backlog item.

This chapter **MUST NOT** reproduce the complete Backlog specification.

It serves only as a consolidated reference, consistent with ADR-0013, which establishes that the source chapter remains the authoritative location for implementation details.

---

## 7. Scope Boundaries

This document **MUST NOT** be interpreted as a replacement for any of the following:

### 7.1 Legal Agreement

This Design System Framework **IS NOT** a legal contract or contractual agreement with the Federation.

### 7.2 Complete Backend Specification

This Framework **IS NOT** a complete Backend Architecture Specification.

Chapter 21 provides deeper technical documentation of the frontend architecture than of the backend implementation.

### 7.3 Project Delivery Plan

This Framework **IS NOT** a project-management plan and **MUST NOT** be interpreted as a delivery schedule, timeline, or implementation commitment.

Project timelines and delivery planning are explicitly outside the scope of the Design System Framework.

---

## Do & Don't

**Do:**

* Review this chapter before making any external commitment regarding the platform's “full capabilities.”
* Update this chapter whenever an open Discovery question (§2) is formally resolved.
* Treat every documented constraint as an explicit architectural or business boundary until superseded by an approved decision.

**Don't:**

* Do not assume that any constraint documented here has an automatic solution.
* Do not treat an unresolved Discovery item as implicitly decided.
* Do not remove a known limitation merely because it is inconvenient to communicate.
* Do not introduce a solution to a documented constraint without recording the relevant architectural/product decision.

---

## Success Metrics

* **0** known constraints remain undocumented.
* **100%** of open Discovery questions (§2) have their status updated whenever meaningful progress or a formal decision occurs.
* **0** external commitments are made that contradict documented platform constraints.
* **100%** of implemented mitigations are backed by an explicit architectural or product decision where required.

## References

**Normative:** All Chapters 1–23

## Related Chapters

Chapter 25 — Future Roadmap (builds upon these constraints)

---

*End of Chapter 24. Next Chapter: Chapter 25 — Future Roadmap.*
