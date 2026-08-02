# Chapter 21 — Technical Architecture

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                      | Used By                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| All Chapters 1–20 (technically implements them) | Development Team directly; no subsequent documentation chapter depends on it architecturally |

## Scope

**Covers:** The defined technologies used to implement all previously established decisions — frontend framework, token pipeline, Tailwind, component architecture, naming conventions, folder structure, and precise performance budgets.

**Does not cover:** Any new design or architectural decision — this chapter is an **implementation layer** for decisions already documented in Chapters 1–20, not a place for new architectural judgment.

## Definitions

| Term         | Definition                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo** | A single code repository containing multiple packages (Design System, website, dashboard) with shared dependency management. |

## Purpose

This chapter establishes the final technical choices (Chapter 0 Discovery: Next.js + Express/Nest.js) as a single implementation reference, rather than leaving them scattered as incidental references throughout the preceding chapters.

---

## ADR-0033: Technical Stack Confirmation

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Authority**               | Engineering Decision (formalizes the Chapter 0 Discovery selection)                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Context**                 | Chapters 1–20 repeatedly referenced technologies such as React, Tailwind, Radix UI, shadcn/ui, and Next.js without consolidating them into one formally documented decision.                                                                                                                                                                                                                                                                                                  |
| **Decision**                | **Frontend:** Next.js (App Router) + React + TypeScript. **Styling:** Tailwind CSS built on Design Tokens (Chapter 3). **Component Primitives:** Radix UI where available (Chapter 8 ADR-0012), with shadcn/ui as the reference styling layer. **Icons:** Lucide (Chapter 8 L1). **Backend:** Express.js or Nest.js (Chapter 0 Discovery; the final choice between the two is outside the scope of the design system). **Token Pipeline:** Style Dictionary (Chapter 3 §3.9). |
| **Alternatives Considered** | No alternative is discussed here — this is a formalization of the original Discovery decision, not a new comparison.                                                                                                                                                                                                                                                                                                                                                          |
| **Why This Decision**       | It aligns with the accumulated technical references across the 20 chapters and provides a single definitive reference for actual development.                                                                                                                                                                                                                                                                                                                                 |
| **Risks**                   | Future technological changes (such as a new React/Next.js release) may require review. **Mitigation:** Only this chapter — not Chapters 1–20 — should be modified when a technical change occurs. The design chapters remain intentionally technology-neutral (Chapter 8 ADR-0012, Chapter 8 L3 ADR-0015).                                                                                                                                                                    |
| **Consequences**            | Every section below (21.1–21.7) implements a previously documented decision with an explicit source reference.                                                                                                                                                                                                                                                                                                                                                                |

---

## 21.1 Frontend Architecture

Next.js App Router:

**MUST** use SSR/SSG for every public page (Chapter 20 §20.1) to achieve Core Web Vitals objectives (Chapter 0 §Design Goals).

**MUST NOT** use pure CSR for pages expected to be indexed (Chapters 14/15).

The Dashboard (Chapter 20 §20.2) **MAY** use CSR where indexing is not required.

---

## 21.2 Design Tokens Mapping

Implement Chapter 3 §3.9 Export Pipeline exactly:

```text
Figma Variables
      ↓
Style Dictionary
      ↓
tokens.json
      ↓
CSS Custom Properties
      ↓
tailwind.config.js
```

**MUST NOT** deviate from this pipeline (Chapter 3 §3.10 Token Rules).

---

## 21.3 Tailwind Strategy

`tailwind.config.js` **MUST** import all colors, spacing values, and typography from the generated CSS Variables (§21.2).

**MUST NOT** use default Tailwind values such as the standard `gray-500` instead of the custom tokens defined in Chapter 3.

---

## 21.4 Component Structure

Every component defined in Chapter 8 **MUST** exist as an independent file and follow this structure:

* **Behavior Layer** — component logic (Chapter 8 ADR-0012)
* **Presentation Layer** — visual implementation, separated from behavior where possible
* **Tests** — accompanying tests (Chapter 8 Governance §G.4)
* **Storybook Story** — corresponding Storybook entry (§G.7)

---

## 21.5 Naming Convention

| Type                                               | Convention                             | Example               |
| -------------------------------------------------- | -------------------------------------- | --------------------- |
| React Component File                               | PascalCase                             | `Button.tsx`          |
| CSS Class (Tailwind Utility)                       | kebab-case (automatically generated)   | `bg-brand-primary`    |
| Token (Chapter 3 §3.3)                             | dot-notation                           | `color.brand.primary` |
| Documentation Identifier (ADR/PR/CMP/PT/DB/CT/TMP) | Must follow the chapter system exactly | `CMP-BUTTON-001`      |

---

## 21.6 Folder Structure

**Reference / Proposed Monorepo Structure:**

```text
/packages
  /design-tokens      (Chapter 3 tokens.json + build output)
  /ui                 (Chapter 8 L1–L8 components)
  /content            (Chapter 9 Content Rules, i18n)

/apps
  /web                (Chapter 20 §20.1 Public Website)
  /dashboard          (Chapter 20 §20.2 Dashboard)

/api                  (Backend, outside detailed design scope)
```

---

## 21.7 Performance Guidelines

**Precise implementation of Chapter 0 / Chapter 5 requirements**

| Metric                        |                                                      Budget |
| ----------------------------- | ----------------------------------------------------------: |
| **LCP**                       |                                                      < 2.5s |
| **INP**                       |                                                     < 200ms |
| **CLS**                       |                                                       < 0.1 |
| **Bundle Size per Page (JS)** | < 200KB compressed — guidance target, reviewed periodically |
| **First Hero Image**          |                                        `priority` / `eager` |
| **Other Images**              |                                                      `lazy` |

The Hero image requirement follows Chapter 8 L6 §M.5.

---

## Do & Don't

**Do:**

* Implement every design decision exactly as documented in its source chapter.
* Refer to this chapter alone when making future technical changes.

**Don't:**

* Do not introduce a new design decision here; such decisions belong in their respective source chapters.
* Do not deviate from the token-based Tailwind configuration.

## Success Metrics

* **100%** of implemented components match Chapter 8 documentation exactly.
* **0** default Tailwind values are used instead of custom Design Tokens.
* Performance budgets defined in §21.7 are achieved in every CI measurement.

## References

**Normative:** Chapter 0 · Chapter 3 · Chapter 8 (all levels)

**Implementation:** Next.js · Tailwind CSS · Radix UI · shadcn/ui · Style Dictionary Documentation

## Related Chapters

All Chapters 1–20 (direct implementation layer) · Chapter 22 (Governance applies to this implementation)

---

*End of Chapter 21. Next Chapter: Chapter 22 — Governance.*
