# Chapter 26 — Glossary

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Scope

**Covers:** Every term defined across Chapters 0–25, consolidated alphabetically with its original reference — no new definitions, references only (following the same principle as Chapter 23 ADR-0035).
**Does not cover:** Any term that was not formally defined in its source chapter — absence here means the term must first be defined in its appropriate source chapter, not added directly here.

## Purpose

This chapter is the **single alphabetical reference** for every technical term used throughout the document — providing one quick lookup point instead of navigating through 25 chapters.

---

## A

* **Accessible Name** — The text announced by a screen reader for an interactive element (Chapter 6)
* **AI-Assisted** — AI suggests; a human decides and approves (Chapter 16)
* **AI Extraction** — The extraction of a specific fact from a page by an AI model for presentation as an answer (Chapter 15)
* **Alias Token** — A shortened alias between a Primitive and a final token, used for internal construction purposes only (Chapter 3)
* **Anatomy** — The visual anatomy of a component: the sub-parts that make up the component (Chapter 8)
* **Answer-First Content** — A writing approach that places the core answer at the beginning of the paragraph (Chapter 15)
* **Anti-Pattern** — A common but incorrect implementation of a principle, documented to prevent its repetition (Chapter 2)
* **Audit Record** — An immutable record documenting who did what and when (Chapter 8 L7)

## B

* **Baseline Freeze** — The state of a chapter after final approval, where changes are permitted only through a new ADR (Chapter 22)
* **Behavior Layer** — The component logic and accessibility layer, separated from presentation (Chapter 8 ADR-0012)
* **Blocking Feedback** — Feedback that prevents any further interaction until it is addressed (Chapter 8 L4)
* **Block** — A flexible content unit that can be composed inside a rich-text editor (Chapter 13)
* **Brand Token** — A Primitive renamed with brand-specific meaning (Chapter 1, Chapter 3)
* **Breakpoint** — A screen width at which the number of grid/layout columns changes (Chapter 5)
* **Bulk Action** — An action applied simultaneously to more than one selected item (Chapter 8 L7)

## C

* **Canonical URL** — The single official reference URL for content that may be accessible through more than one path (Chapter 14)
* **Channel** — A means of delivering a notification (Chapter 18)
* **Choreography** — A coordinated timeline governing the movement of multiple elements (Chapter 5)
* **Clear Space** — The mandatory protected space around the logo (Chapter 1)
* **Component (CMP)** — A reusable interface unit documented in Chapter 8
* **Component Token** — A token specific to a single component only (Chapter 3)
* **Confidence Indicator** — A visual indicator of the confidence level of an AI suggestion (Chapter 16)
* **Content Rule (CR)** — A mandatory writing rule for a specific content type (Chapter 9)
* **Content Type** — A defined content data model with fixed fields (Chapter 13)
* **Current Route** — The abstract representation of the application's current location (Chapter 8 L3)

## D

* **Dashboard Zone** — A fixed-position area within a dashboard screen (Chapter 12)
* **Data Subject** — The person to whom personal data relates (Chapter 17)
* **Date-only Value** — A date value without a time component, independent of timezone (Chapter 19)
* **Dead Token** — A token that is defined but unused anywhere in the codebase (Chapter 3)
* **Delivery Guarantee** — The level of assurance that a notification was actually delivered (Chapter 18)
* **Density** — The amount of spacing within a data-display element (Chapter 8 L5)
* **Destructive Action** — An action with an irreversible or difficult-to-reverse effect (Chapter 8 L7)
* **Discipline Group** — A classification of a sub-discipline based on the nature of how its result is measured (Chapter 10)
* **Documented Consent** — Formally recorded consent with a clear date and source (Chapter 17)
* **Domain Component** — A component that combines multiple foundational components into a composition specific to a particular domain (Chapter 8 L8)

## E

* **Easing Curve** — A mathematical curve describing the acceleration/deceleration of motion (Chapter 5)
* **Escalation Level** — The degree of "interruption strength" associated with a feedback type (Chapter 8 L4)
* **Experience Layer** — An independent UX behavior layer built on top of the same tokens (Chapter 0)

## F

* **Field** — The complete unit consisting of Label + Input + Help Text + Error (Chapter 8 L2)
* **Field Event** — An event measured by distance or height (Chapter 10)
* **First Reference Implementation** — The first real-world implementation of the framework (UAEAF, Chapter 0)
* **Flow** — A user journey through multiple sequential screen states (Chapter 11)
* **Fluid Typography** — Typography whose font size changes gradually with the screen width (Chapter 4)

## H

* **Headless CMS** — An architecture pattern that separates content management from its final presentation method (Chapter 13)

## I

* **Identity Provider (IdP)** — The entity/system responsible for verifying a user's identity (Chapter 17)

## L

* **Live Region** — An HTML region whose updates are automatically announced to a screen reader (Chapter 6)
* **Locale** — A set of language and regional settings that together determine formatting and direction (Chapter 19)

## M

* **Monorepo** — A single code repository containing multiple packages managed with shared dependencies (Chapter 21)

## N

* **Navigation** — Any interface element whose purpose is to move between states/pages rather than execute an action (Chapter 8 L3)
* **Notification Engine** — A centralized independent service that receives events and distributes them through channels (Chapter 18)

## O

* **Object Fit** — How an image/video fills a container with different dimensions (Chapter 8 L6)
* **Offline Snapshot** — The latest known local data displayed while the connection is unavailable (Chapter 8 L5)
* **Optical Size** — Automatic adjustment of letterform drawing details according to display size (Chapter 4)

## P

* **Page Template (TMP)** — A documented final composition for a complete, implementable page (Chapter 20)
* **Partial Data** — A response that has arrived but is incomplete (Chapter 8 L5)
* **Plain Language** — Writing at a simple reading level that can be understood by the broadest possible audience (Chapter 9)
* **POUR** — The WCAG framework: Perceivable, Operable, Understandable, Robust (Chapter 6)
* **Presentation Layer** — The presentation layer separated from component logic (Chapter 8 ADR-0012)
* **Primitive Token** — An absolute raw value without functional meaning (Chapter 3)
* **Principle (PR)** — A high-level, non-negotiable guiding rule (Chapter 2)

## R

* **Read-only** — A value that is visible and cannot be modified, but can be selected and copied (Chapter 8 L2)
* **Reference Implementation Color** — The mandatory numeric value (500) required to match Pantone exactly (Chapter 1)
* **Roving Tabindex** — A WAI-ARIA pattern in which only one element within a group has `tabindex="0"` (Chapter 8 L3)
* **Runtime Token** — The actual value used by the browser (CSS Custom Property) (Chapter 3)

## S

* **Semantic Token** — A token with functional meaning that is not consumed directly from a Primitive (Chapter 3, Chapter 7)
* **Stale Data** — Data that was previously correct but may no longer be up to date (Chapter 8 L5)
* **State** — A temporary interactive state of the same component (Chapter 8)
* **Structured Data** — Encoded data (Schema.org/JSON-LD) that describes page content accurately (Chapter 14)

## T

* **Terminology Governance** — A centrally approved list of recurring terminology (Chapter 9)
* **Theme** — A complete set of Runtime values for every Semantic Token (Chapter 7)
* **Theme Resolution** — The process through which the browser determines the actual value based on the active theme (Chapter 7)
* **Type Scale** — A fixed, mathematically interconnected scale of font sizes (Chapter 4)

## U

* **Unattached Athlete** — An athlete registered directly with the federation without affiliation to a club (Chapter 8 L8)
* **UX Pattern (PT)** — A documented interaction sequence that combines multiple components to accomplish a complete task (Chapter 11)

## V

* **Variant** — An alternative version of the same component intended for a different purpose (Chapter 8)
* **Variable Font** — A single font file containing all weights instead of separate files (Chapter 4)
* **Verified Badge** — A trust indicator showing that an athlete/club's data has been officially verified (Chapter 8 L8)

## W

* **Widget** — Any Chapter 8 component when consumed within a specific dashboard zone (Chapter 12)

---

## Do & Don't

**Do:** Search here first when encountering an unfamiliar term · Add any new term to its source chapter first, then reference it here.

**Don't:** Define a new term here directly without a source chapter.

## Success Metrics

* 100% of terms defined across Chapters 0–25 are present here
* 0 term definitions appear here first without a source

## References

**Normative:** All Chapters 0–25 (every term here is a reference, not an original definition)

## Related Chapters

All chapters

---

*End of Chapter 26 — Final Chapter.*

## 🏁 End of Document

**UAEAF Enterprise Design System Framework v1.0.0** — 27 chapters (0–26) completed and fully frozen as **Baseline v1.0**. Any subsequent development **MUST** pass exclusively through Chapter 22 (Governance).

**Next Recommended Step (Outside the Scope of Chapters 0–26):**
**"Design System Review & Consolidation"** — a comprehensive final review of the consistency of all identifiers (ADR/PR/DT/CMP/CR/PT/DB/CT/TMP) and all cross-references throughout the entire document before final delivery for implementation.
