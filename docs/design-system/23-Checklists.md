# Chapter 23 — Checklists

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                         | Used By                                               |
| -------------------------------------------------- | ----------------------------------------------------- |
| All Chapters 1–21 (source of every checklist item) | Development / Review Team directly before any release |

## Scope

**Covers:** 8 practical checklists ready for direct use (UX, UI, Accessibility, SEO, Performance, Responsive, Design Review, Dev Handoff).

**Does not cover:** Any new rule — every item here is a **reference** to an existing rule in its source chapter.

## Purpose

Chapters 1–22 document the rules; this chapter consolidates them into practical checklists that can be used directly during review, without needing to browse through 22 separate chapters when an actual review is required.

---

## ADR-0035: Checklist Consolidation Exception

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Authority**               | Product Decision                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Context**                 | ADR-0013 (Chapter 8) prohibits duplicating rules across chapters — however, a practical checklist requires all its items to be available in one place during actual use, rather than navigating across 22 chapters during an urgent pre-release review.                                                                                                                                                                                                    |
| **Decision**                | This chapter is the **only documented exception** to the general prohibition against duplication: **MUST** every item here carry an explicit citation to its source (chapter number and section) — any restatement here **MUST NOT** be considered a new definition of the rule, but only a practical reminder. If there is any conflict between the text here and the source chapter, **the source is always the binding reference**, not this checklist. |
| **Alternatives Considered** | Providing only links to each chapter without the actual text — rejected because this would undermine the chapter's practical value as a quick-review tool.                                                                                                                                                                                                                                                                                                 |
| **Why This Decision**       | Balances practical needs (review speed) with architectural discipline (single source of truth) through explicit source citations.                                                                                                                                                                                                                                                                                                                          |
| **Risks**                   | The version here may become outdated if the source chapter changes and this chapter is not updated in parallel. **Mitigation:** Chapter 22 §5 Review Cadence explicitly includes this chapter as a review priority.                                                                                                                                                                                                                                        |
| **Consequences**            | Every item below **MUST** have its source reference identified.                                                                                                                                                                                                                                                                                                                                                                                            |

---

## 23.1 UX Checklist

☐ Does the screen follow a documented Pattern (Chapter 11) rather than a free-form design?

☐ Has the lowest sufficient feedback escalation level been used (Chapter 8 L4 ADR-0016)?

☐ Has permission validation occurred before content is displayed (Chapter 11 §PT-PERMISSION-001)?

☐ Are Empty / Loading / Error states documented for every data-bearing element (Chapter 8 L5 §DD.10)?

---

## 23.2 UI Checklist

☐ Is every visual value derived from a defined token rather than a free-form value (Chapter 3 §3.10)?

☐ Does the density (Comfortable/Compact) match the correct experience layer (Chapter 8 L1 §Visual Density)?

☐ Is the Danger button reserved exclusively for deletion/cancellation (Chapter 1 ADR-0004)?

☐ Is the logo used in the correct form according to the background (Chapter 1 §1.5)?

---

## 23.3 Accessibility Checklist

**Reference: Chapter 6 §6.12**

☐ Does every text element have a contrast ratio of ≥4.5:1 (or ≥3:1 for large text)?

☐ Can every function be operated using the keyboard alone?

☐ Does Focus Trap work correctly in every Modal/Drawer?

☐ Does every content image have descriptive Alt Text?

☐ Has the page been actually tested with at least one screen reader?

---

## 23.4 SEO Checklist

**Reference: Chapter 14 / Chapter 15**

☐ Does the Structured Data exactly match the visible content (Chapter 14 §4, Chapter 15 §3)?

☐ Is the Metadata complete (Chapter 13 §12)?

☐ Does the page begin with a clear, essential fact (Chapter 15 §1)?

☐ Is `hreflang` correctly implemented for both language versions (Chapter 14 §10)?

---

## 23.5 Performance Checklist

**Reference: Chapter 21 §21.7**

☐ LCP < 2.5s, INP < 200ms, CLS < 0.1?

☐ Is Lazy Loading applied to all below-the-fold media (Chapter 8 L6 §M.5)?

☐ Is Virtualization applied to large tables (Chapter 8 L5 §DD.12)?

---

## 23.6 Responsive Checklist

**Reference: Chapter 5 §5.10.3**

☐ Is there no unintended horizontal overflow at any breakpoint?

☐ Does the grid remain intact at every screen width?

☐ Are touch targets ≥44px on small screens?

☐ Is Safe Area applied to fixed-position elements?

---

## 23.7 Design Review Checklist

☐ Does the design match the documented component in Chapter 8 exactly, with no undocumented deviation?

☐ Has any new component / pattern / content gone through Architecture Review (Chapter 8 ADR-0013)?

☐ Are there zero instances of Logo Misuse (Chapter 1 §1.4)?

---

## 23.8 Development Handoff Checklist

☐ Is every token consumed from the Semantic Layer rather than directly from the Primitive Layer (Chapter 7 §7.7)?

☐ Does the component have a matching Storybook ID (Chapter 8 §G.7)?

☐ Are `data-testid` / `data-component` attributes present (Chapter 8 §G.5)?

☐ Is the documentation (Component API Contract) complete before handoff (Chapter 8 §L1 — Button as an example)?

---

## Do & Don't

**Do:**

* Refer back to the source chapter whenever there is any uncertainty about the interpretation of an item in this checklist (ADR-0035).
* Use these checklists before every release.

**Don't:**

* Do not treat the text of this chapter as the definitive definition of a rule when it conflicts with the source chapter.

## Success Metrics

* **100%** of the items in this chapter carry an explicit reference to their source.
* Every checklist is actually used before each release (Chapter 22 §5 Review Cadence).

## References

**Normative:** All Chapters 1–21 (the actual source of every checklist item).

## Related Chapters

All Chapters 1–21

---

*End of Chapter 23. Next Chapter: Chapter 24 — Known Constraints.*
