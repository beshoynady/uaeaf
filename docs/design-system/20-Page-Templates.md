# Chapter 20 — Page Templates

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                   | Used By                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **All Chapters 1–19 without exception** — this is the final assembly chapter | No subsequent chapter depends on this architecturally (Chapters 21+ are technical / governance / reference layers) |

---

## Scope

**Covers:** Every actual page template in the platform — the public website (§20.1) and the dashboard (§20.2) — as a documented composition of components, content, and patterns from the preceding chapters, using their defined identifiers.

**Does Not Cover:** Any new component, pattern, or content type — this chapter is **pure assembly**, and represents the final and strictest rule in the entire document.

---

## Definitions

| Term                    | Definition                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page Template (TMP)** | A documented final composition of Components (CMP), Patterns (PT), and Content Types (CT) for a complete page that is directly implementable |

---

## Purpose

This chapter serves as the **practical proof** that Chapters 1–19 are sufficient to build any page on the platform without introducing a single new design decision.

If a template requires something that does not already exist in the preceding chapters, this represents a **gap that MUST be resolved retroactively in the appropriate source chapter**, rather than being solved locally within this chapter.

---

# ADR-0032: Page Template Assembly Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Authority**               | Engineering Decision (applies ADR-0013/0022/0023 collectively at the highest level)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Context**                 | 27 chapters have established a complete library covering tokens, components, patterns, content, and architecture. As the final chapter before the technical/governance layers, this chapter **MUST** prove that this library can actually produce real pages, rather than remaining an isolated theoretical system.                                                                                                                                                                                                                                                                                                           |
| **Decision**                | Every page template **MUST** be documented through an explicit composition consisting of a list of Components (`CMP-*`), Patterns (`PT-*`), Content Types (`CT-*`), and Dashboard Template types (`DB-*`) where applicable. **MUST NOT** use free-form descriptions for pages without linking them to identifiers defined in preceding chapters. Any requirement that does not already exist and is discovered while documenting a template here **MUST** be returned to the appropriate source chapter (Chapters 8–19) as a new ADR/Backlog item. It **MUST NOT** be solved through local improvisation within this chapter. |
| **Alternatives Considered** | Leaving the design of every actual page to the implementation phase independently of the documentation — rejected because this would undermine the document's value as a comprehensive implementation reference.                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Why This Decision**       | Ensures that any developer building a new page can begin from this chapter as a direct reference, rather than reinterpreting Chapters 1–19 from scratch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Risks**                   | Discovering a genuine gap while writing this chapter may require returning to a previously frozen chapter. **Mitigation:** This is expected and acceptable — it will be handled through a new ADR added to the relevant source chapter, consistent with the Baseline Freeze policy applied throughout the document.                                                                                                                                                                                                                                                                                                           |
| **Consequences**            | Every template below serves as a direct implementation reference for Chapter 21.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

---

# 20.1 Public Website Templates

| Template ID                               | Page                                                             | Consumes                                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TMP-HOME-001`                            | Homepage                                                         | Chapter 8 L1/L5/L6/L8, Chapter 5 (Hero — `CMP-CAROUSEL-001`), Chapter 9 (Content), Chapter 8 L6 §CMP-LIVESTREAM-001 (ADR-0036), Chapter 8 L8 §CMP-AFFILIATIONS-001 (ADR-0037)                                                                                              |
| `TMP-NEWSLIST-001`                        | News Listing                                                     | Chapter 8 L5 §CMP-CARD-001, Chapter 11 §PT-SEARCH-001/PT-FILTER-001, Chapter 13 §CT-ARTICLE-001                                                           |
| `TMP-NEWSDETAIL-001`                      | News Details                                                     | Chapter 13 (Content), Chapter 14 (SEO/Schema `NewsArticle`), Chapter 15 (Answer-First)                                                                    |
| `TMP-ATHLETELIST-001`                     | Athletes Listing                                                 | Chapter 8 L8 §CMP-ATHLETECARD-001, Chapter 11 §PT-SEARCH-001/PT-FILTER-001                                                                                |
| `TMP-ATHLETEDETAIL-001`                   | Athlete Profile                                                  | Chapter 8 L8 (Full), Chapter 10 (Result Scenarios), Chapter 13 (Hybrid Entity Boundary — Editorial Biography), Chapter 17 §SP.10 (Minor Data Sensitivity) |
| `TMP-CLUBLIST-001 / TMP-CLUBDETAIL-001`   | Clubs                                                            | Chapter 8 L8 §CMP-CLUBCARD-001, same Athlete pattern                                                                                                      |
| `TMP-EVENTLIST-001 / TMP-EVENTDETAIL-001` | Events                                                           | Chapter 8 L8 §CMP-EVENTSCHEDULE-001, Chapter 10 §10.2 Live Scoring                                                                                        |
| `TMP-RESULTS-001`                         | Results / Competitions                                           | Chapter 8 L8 §CMP-RESULTSTABLE-001, Chapter 10 (all scenarios: Attempt-based, Wind, Tie)                                                                  |
| `TMP-COACHLIST-001 / TMP-REFEREELIST-001` | Coaches / Referees                                               | Chapter 8 L8 §CMP-COACHCARD-001 / §CMP-REFEREECARD-001                                                                                                    |
| `TMP-GALLERY-001`                         | Photo & Video Gallery                                            | Chapter 8 L6 §CMP-GALLERY-001                                                                                                                             |
| `TMP-STATICPAGE-001`                      | Static Pages (About the Federation, Privacy Policy, Regulations) | Chapter 13 §CT-PAGE-001                                                                                                                                   |
| `TMP-CONTACT-001`                         | Contact Us                                                       | Chapter 8 L2 (Contact Form), Map (Chapter 0 Discovery)                                                                                                    |

### Shared Rule — MUST

Every template listed above **MUST** fully implement:

* Chapter 14 — SEO
* Chapter 15 — AI Readability

There are **no exceptions** for any public-facing page.

---

# 20.2 Dashboard Templates

This section directly consumes the **Chapter 12 §Dashboard Template Registry** through its defined identifiers (`DB-*`).

The following table maps those templates to their actual functional modules:

| Module                                      | Dashboard Template           | Consumes                                                      |
| ------------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| Athlete / Club / Referee / Coach Management | `DB-ENTITY-001`              | Chapter 11 §PT-CRUD-001, Chapter 8 L8 (Domain Cards)          |
| General Analytics Dashboard                 | `DB-ANALYTICS-001`           | Chapter 8 L5 §CMP-STATCARD-001                                |
| Live Competition Monitoring                 | `DB-MONITORING-001`          | Chapter 8 L5 §DD.10 Live-Updating, Chapter 10 §10.2           |
| News CMS Editor                             | `DB-WORKSPACE-001`           | Chapter 13 (Full), Chapter 8 L2 (Rich Text Editor)            |
| Bulk Import (Athletes, Results)             | `DB-WORKSPACE-001` (Variant) | Chapter 8 L7 §CMP-IMPORTWIZARD-001, Chapter 11 §PT-WIZARD-001 |

---

# Do & Don't

**Do:**

* Start every new page from a matching template defined here.
* Return any discovered gap to its appropriate source chapter rather than solving it locally (ADR-0032).

**Don't:**

* Create a template using components that are not documented in Chapters 1–19.
* Bypass Chapter 14 or Chapter 15 for any new public-facing page.

---

# Success Metrics

* **100%** of actual platform pages conform to a documented template in this chapter.
* **0** components, patterns, or content types are used in any template without an identifier defined in a preceding chapter.
* **100%** of public-facing templates fully implement Chapter 14 and Chapter 15.

---

# References

**Normative:** Chapters 1–19

---

# Related Chapters

All Chapters 1–19 (complete dependencies) · Chapter 21 (actual technical implementation of these templates)

---

*End of Chapter 20 — End of the complete Design, Content, and Composition Layer (Chapters 1–20). The following chapters (21–26) constitute the Technical / Governance / Reference Layer: Technical Architecture, Governance, Checklists, Known Constraints, Future Roadmap, and Glossary.*
