# UAEAF — Enterprise Master Product Specification

**Document ID:** MASTER-SPEC-002 (rebuild of MASTER-SPEC-001)
**Version:** 0.2.0
**Status:** Draft — governing product/CMS/experience contract, pending Federation sign-off on §52 Open Decisions
**Prepared:** August 2026

> **A note on format, stated once here rather than apologized for repeatedly:** this document uses compact tables, not a paragraph per field, per its own governing instruction to optimize for clarity over word count. Where a requested field genuinely doesn't apply to a given page/entity, the table says so in one word ("n/a") rather than being padded. Where two requested fields are the same piece of information for a given row (e.g., "Canonical URL" and "Route" for a page with no locale-prefixed URL variant), they are merged into one column rather than duplicated — this is a legibility decision, not a completeness shortcut, and is noted inline wherever it happens.

---

## 00. Document Control

| Field | Value |
|---|---|
| Document ID | MASTER-SPEC-002 |
| Supersedes | MASTER-SPEC-001 (v0.1.0) — rebuilt, not merely expanded, per explicit instruction |
| Owner | Project Owner (UAEAF), Chapter 22 §2 |
| Audience | Product Owner, UX/UI Designer, Figma Designer, Frontend Developer, Backend Developer, CMS Developer, SEO Specialist, Accessibility Reviewer, QA Engineer, future Mobile team |
| Governs | Product/UX/CMS/data decisions above the Design System and below business/legal policy |
| Does not govern | Visual tokens, component anatomy, or any frozen Design System rule — cited, never restated or overridden |
| Change process | Chapter 22 §4 change process, applied to this document (§60) |
| Modification safety | This rebuild modified **only this file**. No Design System chapter, ADR, `CLAUDE.md`, Homepage Spec, or IA file was changed. No Figma, code, schema, or component was touched. |

---

## 01. Executive Product Overview

UAEAF's digital platform is two layers sharing one token/component system (ADR-0001): a **Public Website** and an **Operational Layer** (CMS + Admin Dashboard). This document is the connective contract between them — content types, workflows, data relationships, and the full page/entity inventory that no single Design System chapter owns end-to-end, because the Design System is deliberately presentation-only (ADR-0020: components consume abstract data, never own or calculate it).

**What changed in this rebuild vs. MASTER-SPEC-001:** the document is reorganized entity-first and page-first (§10–14) rather than governance-first, adds a complete independent-page inventory (not just Homepage-exposed content), adds a full Entity Registry (§13) and two relationship representations — diagram and table (§14, §48) — adds a Page↔Entity matrix (§10.3), and investigates Board/Committee/Organizational pages for the first time (§33), which surfaced a new, previously unexamined gap. No previously resolved decision (Championship/Athlete naming, "UAEAF in the Media" placement, Chapter 27's pending status) is reopened — all are carried forward and re-cited, not re-litigated.

---

## 02. Product Vision & Goals

*Source: Chapter 0 Design Goals — not re-derived.*

| # | Goal | Status |
|---|---|---|
| 1 | Global digital identity — internationally credible national federation | COMPLETE at spec level; Hero photography is a CONTENT DEPENDENCY |
| 2 | Full digital transformation — every federation operation unified | OPEN PRODUCT DECISION — Services gap, IA §15.1, unchanged |
| 3 | Spread the sport, grow reach, AI/search discoverability | COMPLETE at spec level |

---

## 03. Digital Ecosystem Scope

```
UAEAF Digital Ecosystem
├── 1 · Public Website           — §06–12, §31–45 (this document)
├── 2 · CMS / Admin Panel        — §15–21
├── 3 · Backend / API            — §20, §57
├── 4 · Design System            — docs/design-system/* (referenced, not owned by this doc)
├── 5 · Data / Registry Layer    — §13–14, §48
└── 6 · Future Mobile App        — out of scope for build, architecture must accommodate (Ch.25 §2)
```

This document owns layers 1–3 and 5 at the product-decision level. It does not own layer 4 (cites it) and does not build layer 6 (only confirms nothing here blocks it later).

---

## 04. Source-of-Truth & Governance

Unchanged from MASTER-SPEC-001 §06, re-verified, not re-decided:

1. Explicit current Product Owner instruction
2. This Master Specification, once approved
3. Frozen Design System chapters (0–26)
4. Approved ADRs (embedded in their chapter)
5. `02-Homepage-Specification.md`
6. `01-Information-Architecture.md` (staleness caveat: written against 9/27 chapters, never revised — every `[NV]`/`[A]` flag in it is re-verified here, not trusted at face value)
7. Chapter 27 (Brand Visual Language) — **Draft/Pending**, explicit Product Owner instruction: current approved Homepage stays binding until Chapter 27 is approved or shelved
8. Installed Claude Code skills
9. General UI/UX best practice

**Standing documentation-integrity finding, carried forward unchanged:** `CLAUDE.md` §11's "Events vs. Tournaments" rule cites an IA distinction that does not exist anywhere in `docs/` — confirmed twice now by independent repository search. Not corrected here (§52 OPEN-003).

---

## 05. Terminology & Canonical Naming

| Term | Canonical | Status | Basis |
|---|---|---|---|
| Championship | **Championship** | LOCKED (Product Owner, prior session) | Retires "Competition" as primary terminology; component rename against Ch.8 L8 still pending (§52 OPEN-015) |
| Event | **Event** = single race/discipline instance only | LOCKED (this document's convention) | Ch.8 L8 SP.2, Ch.10 — see §06.2 for the 4-sense disambiguation this resolves |
| Athlete | **Athlete** | LOCKED (Product Owner, prior session) | "Player" (Google Doc) is a translation variant, not a second entity |
| UAEAF in the Media | **UAEAF in the Media** / **الاتحاد في الإعلام** | LOCKED (Product Owner) | "External Media Coverage" is technical/governance vocabulary only, never user-facing |
| Referee / Official / Technical Official | **Unresolved** | OPEN — §52 OPEN-002 | Three names, one entity (or possibly two — not decided) |
| Season | **Season** | Name not contested; **existence as a formal entity is** | §52 OPEN-013 |
| Board Member / Committee | **Unresolved — no canonical model exists yet** | OPEN — new this rebuild, §52 OPEN-026 | See §33 |
| Sponsor | **Sponsor** | Name not contested; **content type/component do not exist** | §52 OPEN-007 |
| News / Article | **One content type**, `CT-ARTICLE-001` | LOCKED (governance-confirmed) | Not two page families |

---

## 06. Website Information Architecture

### 06.1 Public Hierarchy (as built, IA §3.1 — re-cited, not re-decided)

```
Home
├── About the Federation (dropdown · 4 children: About · Board of Directors · Regulations & Reports · Technical Committees)
├── Clubs (top-level)
├── Athletes (top-level)
├── Events (dropdown · 3 children: Championship Calendar · Results & Rankings · National Records)
├── News (top-level)
├── Media Centre (top-level)
└── Footer-only: Contact, Help Centre, Newsletter, Affiliations, Accessibility Statement, Sitemap
```

**Header architecture is OPEN** (§52 OPEN-004) — built Header has 9 items/4 dropdowns; the tree above (7/2) is what IA documents. Neither ratified.

### 06.2 The "Event" Overloading Problem (re-verified, unchanged from prior session)

Four senses confirmed in active use: (A) single race/discipline entity — Ch.8 L8/Ch.10 canonical; (B) the "Events" nav grouping (Championship Calendar + Results & Rankings + National Records) — IA §3.1/§8.1; (C) unrelated software/component API events — false positive; (D) IA's own silent rename to "Event Unit" to dodge the A/B collision, never cross-referenced back. This document uses "Event" = Sense A exclusively (§05).

### 06.3 Championship vs. Event Separation (Client Requirement — Confirmed Structurally Distinct)

Per the explicit, repeated client requirement that Championships and Events remain separate:

| Dimension | Championship | Event |
|---|---|---|
| Content model | Registry entity, no CMS type (§13) | Registry entity, no CMS type |
| Route | `/championships/{slug}` | `/championships/{slug}/events/{id}` — nested, never top-level |
| Detail page | PAGE-004/005 (§10) | PAGE-006/007 |
| CMS record | Editorial overlay only | Editorial overlay only |
| Relationship | Parent | Child (belongs to exactly one Championship) |

The Homepage's "Results & Rankings + Upcoming Events" section **may** aggregate both for discovery (Homepage Spec §12) — this is a presentation-layer convenience explicitly permitted by the governing principle stated in this task: *the Homepage presentation may aggregate upcoming Championships and Events for discovery, while the underlying content models, CMS records, routes, and detail pages remain strictly separated.* Nothing in the current Homepage build actually merges the two records — verified against `02-Homepage-Specification.md` §12, which already tabs Results vs. Events as distinct data sources within one visual section, not one merged record type.

---

## 07. Global Website Structure

```
┌─────────────────────────────────────────────┐
│ Header (OPEN — §52 OPEN-004)                 │
├─────────────────────────────────────────────┤
│ Page Content (§08 Page Taxonomy)             │
├─────────────────────────────────────────────┤
│ Footer (§34, mirrors Header 1:1 once resolved)│
└─────────────────────────────────────────────┘
Floating social rail — persistent overlay, Homepage Spec §5
```

Component behavior (Header/Footer/nav interaction) fully governed by Chapter 8 L3 — not restated. What Chapter 8 L3 does not decide is the actual item structure (§52 OPEN-004).

---

## 08. Page Taxonomy

Every page on the platform falls into exactly one of five types — this taxonomy is new in this rebuild and is what §10–12 are organized around:

| Type | Definition | Examples |
|---|---|---|
| **Composite** | Assembles multiple entities/sections, not one primary record | Homepage |
| **Listing/Archive** | Paginated collection of one entity type | Athletes Listing, News Listing |
| **Detail** | One entity's full record | Athlete Detail, Championship Detail |
| **Static/Editorial** | `CT-PAGE-001`, free-form CMS content, no structured entity | About, Privacy Policy, Board of Directors (see §33 — currently this type, not a structured entity) |
| **Utility/System** | Search, 404, account — no CMS content type | Search, 404 |

## 09. Homepage Architecture

Fully governed by `02-Homepage-Specification.md` (13 sections) — full per-section detail in §32, not duplicated here. This section exists only to place the Homepage inside the Page Taxonomy: it is the platform's one **Composite** page (§08), the only page type that legitimately aggregates multiple entities in one URL.

## 10. Independent Website Pages — Complete Inventory

**Scoping note:** this inventory covers every public-facing page identified in `01-Information-Architecture.md` §4.1–§4.5 (56 screens, consolidated to one row per page *type* — a dynamic detail page is one row, not N rows per record) plus every page named in this task's own Part 2 list, cross-checked against the repository. **Deep self-service/account pages** (IA §4.6: My Entries, Club Roster Management, Transfer Requests, etc.) are intentionally out of this table's scope — they are operational/self-service, not independent public pages — and are listed separately in §10.4 for completeness rather than silently dropped. **No "Careers" page exists anywhere in any source document** — it was in this task's example list but has zero evidence in the repository; not fabricated here, noted as absent.

**Column consolidation (stated once, applied throughout):** Canonical Name/Arabic/English → one "Name" column (bilingual noted inline only where the label differs meaningfully, since Chapter 9 §CR-1.6 already mandates full bilingual parity for all of them by default). Incoming/Outgoing Links → folded into "Relationships." Filters/Search/Sorting/Pagination → folded into "List Behavior" (Listing pages only). Loading/Error state → not repeated per page, since Chapter 8 L4/L5 governs all of them identically platform-wide (§27) — a page only gets its own row-level note if it deviates from that baseline.

### 10.1 Governance & Organizational Pages

| PAGE-ID | Name | Type (§08) | Route | Primary Entity | CMS | Nav Location | Status |
|---|---|---|---|---|---|---|---|
| PAGE-101 | About the Federation | Static | `/about` | `CT-PAGE-001` | Yes | About▾ dropdown | Not built |
| PAGE-102 | Vision, Mission & Strategy | Static | `/about/vision` | `CT-PAGE-001` | Yes | About▾ (proposed child, IA `[P]`) | Not built |
| PAGE-103 | Board of Directors | Static — **not a structured entity, see §33** | `/about/board` | `CT-PAGE-001` (free-form only) | Yes | About▾ dropdown | Not built; **entity gap §52 OPEN-026** |
| PAGE-104 | Organisational Structure | Static — same gap as PAGE-103 | `/about/structure` | `CT-PAGE-001` | Yes | About (IA `[P]`, no entry point yet) | Not built |
| PAGE-105 | Technical Committees | Static — same gap | `/about/committees` | `CT-PAGE-001` | Yes | About▾ dropdown | Not built |
| PAGE-106 | History & Milestones | Static | `/about/history` | `CT-PAGE-001` | Yes | About (IA `[P]`) | Not built |
| PAGE-107 | Regulations & Reports | Static/Document listing | `/about/regulations` | `CT-PAGE-001` + Document assets | Yes | About▾ dropdown | Not built |
| PAGE-108 | Departments Directory | Static/light listing | `/contact/departments` | `CT-PAGE-001` | Yes | Contact (footer) | Not built |
| PAGE-109 | Contact & Location | Static | `/contact` | `CT-PAGE-001` | Yes | Footer | Not built |

### 10.2 Sports & Competition Pages

| PAGE-ID | Name | Type | Route | Primary Entity | CMS/Registry | Status |
|---|---|---|---|---|---|---|
| PAGE-004 | Championships Listing | Listing | `/championships` | Championship | Registry, no CT | **OPEN — no `TMP-` (§52 OPEN-015)** |
| PAGE-005 | Championship Detail | Detail | `/championships/{slug}` | Championship | Registry | **OPEN — no `TMP-`** |
| PAGE-006 | Events (races) Listing | Listing | `/championships/{slug}/events` | Event (Sense A) | Registry | Template exists, scope caution §52 OPEN-016 |
| PAGE-007 | Event (race) Detail | Detail | `/championships/{slug}/events/{id}` | Event | Registry | Template exists |
| PAGE-012a | Live Results | Detail (state-driven) | `/results` (live state) | Result | Registry | See §52 OPEN-008 — may be one template with PAGE-012b, not two pages |
| PAGE-012b | Final Results / Rankings | Listing | `/results` | Result | Registry | Same as above |
| PAGE-013a | National Records | Listing | `/records` | Result (`isNewRecord`/`Record.category`) | Registry | Not built |
| PAGE-013b | Medal / Club Standings | Listing (computed) | `/standings` | Computed (not stored, ADR-0020) | Registry, computed | IA `[P]`, no template |
| PAGE-114 | Disciplines Index | Static/light listing | `/disciplines` | Discipline (taxonomy value, §13 ENT-017) | `CT-PAGE-001` + taxonomy | IA `[P]` |
| PAGE-115 | Discipline Detail | Static | `/disciplines/{slug}` | Discipline | `CT-PAGE-001` | IA `[P]` |
| PAGE-116 | Anti-Doping | Static | `/anti-doping` | `CT-PAGE-001` | IA `[P]`, no entry point |

### 10.3 People & Club Pages

| PAGE-ID | Name | Type | Route | Primary Entity | CMS/Registry | Status |
|---|---|---|---|---|---|---|
| PAGE-008 | Athletes Listing | Listing | `/athletes` | Athlete | Registry + editorial overlay | Not built |
| PAGE-009 | Athlete Detail | Detail | `/athletes/{slug}` | Athlete | Registry + editorial | Not built |
| PAGE-009a | Athlete Results History | Detail (sub-view) | `/athletes/{slug}/results` | Athlete → Result (1:N) | Registry | IA `[P]` |
| PAGE-010 | Clubs Listing | Listing | `/clubs` | Club | Registry + editorial | Not built |
| PAGE-011 | Club Detail | Detail | `/clubs/{slug}` | Club | Registry + editorial | Not built |
| PAGE-013 | Coaches Listing | Listing | `/coaches` | Coach | Registry + editorial | Not built |
| PAGE-014 | Coach Detail | Detail | `/coaches/{slug}` | Coach | Registry | **OPEN — no `TMP-COACHDETAIL-001` (§52 OPEN-009)** |
| PAGE-015 | Referees/Officials Listing | Listing | `/officials` | Referee | Registry | Naming per §05/§52 OPEN-002 |
| PAGE-016 | Referee/Official Detail | Detail | `/officials/{slug}` | Referee | Registry | **OPEN — no `TMP-REFEREEDETAIL-001`** |
| PAGE-117 | Age Categories | Static | `/about/age-categories` | `CT-PAGE-001` | IA `[P]` |

### 10.4 News, Media & External Coverage Pages

| PAGE-ID | Name | Type | Route | Primary Entity | CMS | Status |
|---|---|---|---|---|---|---|
| PAGE-002 | News Listing | Listing | `/news` | Article (`CT-ARTICLE-001`) | Yes | Not built |
| PAGE-003 | News Detail | Detail | `/news/{slug}` | Article | Yes | Not built |
| PAGE-118 | Category/Tag Archive | Listing | `/news/category/{tag}` | Article (filtered) | Yes | IA `[P]` |
| PAGE-119 | Press Releases | Listing | `/press` | Article variant — **§52 OPEN-011** | Proposed | IA `[P]` |
| PAGE-017 | Media Centre (Gallery Index) | Listing | `/media` | `CT-MEDIA-001` via `CMP-GALLERY-001` | Yes | Built this engagement (dark treatment) |
| PAGE-120 | Album Detail | Detail | `/media/{album-slug}` | `CT-MEDIA-001` (Gallery/Album) | Yes | IA `[P]` |
| PAGE-121 | Videos | Listing | `/media/videos` | `CT-MEDIA-001` (Video) | Yes | IA `[P]` |
| PAGE-018 | UAEAF in the Media Archive | Listing | `/media-coverage` | `CT-EXTERNALMEDIA-001` | Yes | Locked this engagement, not built |
| PAGE-021 | Live Stream | Detail (Homepage-embedded; dedicated page `[P]`) | Homepage §11a; standalone `/live` per IA §4.4 | Live signal + `CT-MEDIA-001` shelf | Partial | Homepage-embedded only |
| PAGE-122 | Press Kit & Brand Assets | Static/document listing | `/press/kit` | `CT-MEDIA-001` | IA `[P]`, gated to Media/Press role |

### 10.5 Commercial & Credibility Pages

| PAGE-ID | Name | Type | Route | Primary Entity | CMS | Status |
|---|---|---|---|---|---|---|
| PAGE-019 | Sponsors | Static/Listing hybrid | `/sponsors` | **No content type — §52 OPEN-007** | No | Not built |
| PAGE-020 | Memberships (Affiliations) | Homepage-only per current spec | n/a — no dedicated page yet | `CT-AFFILIATION-001` (proposed) | Proposed | Not built as standalone |

### 10.6 Utility & System Pages

| PAGE-ID | Name | Type | Route | Status |
|---|---|---|---|---|
| PAGE-022 | Search Results | Utility | `/search` | Not built |
| PAGE-023 | Privacy Policy | Static | `/privacy` | Not built (Footer link present per this engagement's audit) |
| PAGE-024 | Terms of Use | Static | `/terms` | Not built (Footer link present) |
| PAGE-025 | Cookie Notice | Static | `/cookies` | **Still missing — the one Footer legal-strip gap not yet closed** |
| PAGE-123 | Sitemap | Utility | `/sitemap` | Not built |
| PAGE-124 | Accessibility Statement | Static | `/accessibility` | Not built; P0 per Chapter 6/PR-003 |
| PAGE-026 | 404 | System | n/a | Not built |
| PAGE-125 | 500 / Maintenance | System | n/a | Not built |

### 10.7 Account & Self-Service (out of primary scope — noted, not detailed)

IA §4.6 lists 15 self-service screens (Login, Register, Profile, My Entries, My Results & PBs, My Licence, Club Roster Management, Club Entries, Transfer Requests, My Assignments, Accreditation Request, Notification Centre, Saved/Following, Password Recovery, Identity Verification). All require authentication, which does not yet exist (§52 OPEN-001, no Identity Provider abstraction implemented — Ch.17 ADR-0029 defines the *pattern* only). These are correctly out of scope for this document's primary page inventory; flagged for a future Account/Self-Service module spec once authentication is built, not detailed here to avoid inventing UI for a system that doesn't exist yet.

### 10.8 Page ↔ Entity Matrix (sample — extends to every row above)

| Page | Primary Entity | Related Entities | CMS | Registry | SEO |
|---|---|---|---|---|---|
| Athletes Listing (PAGE-008) | Athlete | Club, Result | Editorial overlay | Yes | Indexable |
| Athlete Detail (PAGE-009) | Athlete | Club, Coach, Result, Record, News | Editorial overlay | Yes | Indexable, `Person` schema |
| Board of Directors (PAGE-103) | **None — static content only** | n/a | `CT-PAGE-001` | No | Indexable |
| Championship Detail (PAGE-005) | Championship | Season, Event, Referee, Club, Athlete | No | Yes | Indexable, `SportsEvent` schema — **no template, §52 OPEN-015** |
| News Detail (PAGE-003) | Article | Athlete/Club/Championship (optional reference) | Yes | No | Indexable, `NewsArticle` schema |
| UAEAF in the Media Archive (PAGE-018) | External Media Coverage | External Publisher (unmodeled) | Yes | No | Indexable |
| Sponsors (PAGE-019) | **None — no entity exists** | n/a | **Gap** | **Gap** | Indexable (once content exists) |

*(Extending this matrix to all ~40 rows in §10.1–10.6 is mechanical once each page is actually implemented — the sample above demonstrates the pattern, including the two rows, Board of Directors and Sponsors, that honestly have no backing entity yet.)*

## 11. Listing / Archive Pages — Shared Contract

Every Listing page in §10 shares one behavioral contract, stated once here rather than per-page:

| Dimension | Rule | Source |
|---|---|---|
| List behavior | Filter (`PT-FILTER-001`) + Search (`PT-SEARCH-001`) + pagination (PR-008, no unbounded fetch) | Ch.11 |
| Empty state | `CMP-EMPTYSTATE-001`, Chapter 9 §CR-2.5 pattern | Ch.8 L4 |
| Loading | Skeleton, not spinner, for predictable-shape content | Ch.8 L1, §PT-EMPTYLOADINGERROR-001 |
| SEO | Indexable, canonical URL, no filter-combination index bloat (Ch.14 §14) | Ch.14 |
| Card component | `CMP-CARD-001` as the base, specialized per entity (`CMP-ATHLETECARD-001` etc.) | Ch.8 L5/L8 |

## 12. Detail Pages — Shared Contract

| Dimension | Rule | Source |
|---|---|---|
| Structured Data | Must match visible content exactly (Ch.15 §3) | Ch.14/15 |
| Answer-First | Core fact in first 2–3 sentences | Ch.15 §1 |
| Breadcrumbs | `Home / Section / Subsection / Object`, max 4 levels — **citation gap, §52 OPEN-006** | IA §8.5 |
| Related content | Internal linking required (Ch.14 §5) — e.g., Athlete Detail must link to Club, Championships, related News | Ch.14 |
| Minor data | Chapter 17 ADR-0028/SP.10 applies without exception on any Detail page displaying a person | Ch.17 |

## 13. Content & Entity Model — Entity Registry

*This is the authoritative entity list, reconciling Chapter 8 L8's SP.2 model, the Google Doc's proposal, and every entity implied across IA/Homepage Spec. **Verified**, not assumed — every ID below is checked against an actual chapter or explicitly marked as a gap.*

| ENT-ID | Name (EN) | CMS or Registry? | Component | Content Type | Status |
|---|---|---|---|---|---|
| ENT-001 | Federation (UAEAF itself) | n/a — singleton, not a listed entity | — | `Organization`/`SportsOrganization` schema anchor (Ch.14) | Implicit, never modeled as a record — reasonable for a singleton |
| ENT-002 | Season | Registry (proposed) | **None — §52 OPEN-013** | None | **GAP — no formal entity anywhere** |
| ENT-003 | Championship | Registry | `CMP-COMPETITIONCARD-001` (pending rename) | None (correctly, Hybrid Entity Boundary) | Exists, naming pending |
| ENT-004 | Event | Registry | `CMP-EVENTSCHEDULE-001` | None | Exists, well-governed (Ch.10) |
| ENT-005 | Result | Registry | `CMP-RESULTSTABLE-001` | None | Exists, most heavily governed entity in the repo |
| ENT-006 | Ranking | Registry, **computed, never stored independently** | `CMP-RANKINGCARD-001` | None | Exists as a *view*, not a stored entity — ADR-0020 |
| ENT-007 | Record | Registry, sub-type of Result | `CMP-RECORDBADGE-001` | None | Exists — `Record.category` extensible list (Ch.10 §10.10) |
| ENT-008 | Athlete | Registry + editorial | `CMP-ATHLETECARD-001` | Editorial overlay only | Exists, best-governed entity in the repo |
| ENT-009 | Club | Registry + editorial | `CMP-CLUBCARD-001` | Editorial overlay only | Exists |
| ENT-010 | Coach | Registry + editorial (inferred) | `CMP-COACHCARD-001` | Editorial overlay — **Ch.13's Hybrid Entity Boundary text never explicitly names Coach, only Athlete/Club** | Exists, minor documentation gap |
| ENT-011 | Referee/Official | Registry | `CMP-REFEREECARD-001` | None | Exists, naming unresolved (§52 OPEN-002) |
| ENT-012 | Venue | Registry (implied by Championship fields) | **None** | None | **GAP — never modeled independently, only as a text field on Championship** |
| ENT-013 | Board Member | **Unmodeled** | **None** | **None — only free-form static-page content (§33)** | **GAP — new this rebuild, §52 OPEN-026** |
| ENT-014 | Committee | **Unmodeled** | **None** | **None** | **GAP — same as ENT-013** |
| ENT-015 | Article/News | CMS | `CMP-CARD-001` | `CT-ARTICLE-001` | Exists, fully governed |
| ENT-016 | Media Asset | CMS | Chapter 8 L6 contract | `CT-MEDIA-001` | Exists |
| ENT-017 | Discipline (taxonomy) | CMS/taxonomy value | n/a | Taxonomy value, not its own type | Exists as a filter vocabulary only |
| ENT-018 | External Media Coverage | CMS | `CMP-CARD-001`+`CMP-CAROUSEL-001` | `CT-EXTERNALMEDIA-001` | Exists, ADR-0042, best-governed feature in the repo |
| ENT-019 | External Publisher | **Not modeled in-platform** | n/a | n/a | Correctly out of scope — it's an external party, not a UAEAF record |
| ENT-020 | Sponsor/Partner | **Unmodeled** | `CMP-SPONSORSTRIP` (named only in passing) | **None** | **GAP — highest-priority, §52 OPEN-007** |
| ENT-021 | Affiliation (Membership) | CMS (proposed) | `CMP-AFFILIATIONS-001` | `CT-AFFILIATION-001` (proposed, not registered) | Backlog per ADR-0037 itself |
| ENT-022 | Static Page (About, Privacy, Board, Committees, etc.) | CMS | n/a | `CT-PAGE-001` | Exists — this is where Board/Committee content currently lives, as flat pages, not entities |
| ENT-023 | User/Role | **Unmodeled** | n/a | n/a | **GAP — §52 OPEN-001, the deepest gap in the entire audit** |
| ENT-024 | Country/Emirate | Taxonomy value | n/a | n/a | Exists as a filter (Club's Emirate field) |

## 14. Entity Relationships

### 14.1 Human-Readable Relationship Diagram

```
Season                                    [ENT-002 — GAP, no formal entity]
  └── contains → Championship             [ENT-003]
       └── contains → Event               [ENT-004]
            └── produces → Result         [ENT-005, one per participant]
                 ├── references → Athlete [ENT-008] (or Athlete[] for relays, Ch.10 §10.5)
                 ├── references → Club    [ENT-009, via Athlete]
                 └── feeds → Ranking      [ENT-006, computed] / Record [ENT-007, if qualifying]

Athlete [ENT-008]
  ├── belongs to (0..1) → Club [ENT-009]           ("Unattached Athlete" if none, SP.8)
  ├── coached by (0..N) → Coach [ENT-010]           (cardinality open, §52 §17.2)
  ├── produces → Result [ENT-005]
  ├── holds → Record [ENT-007]
  └── referenced by (0..N) → Article [ENT-015]      (never restates the fact, only links — Ch.13 §7)

Club [ENT-009]
  ├── has (1..N) → Athlete [ENT-008]
  ├── has (1..N) → Coach [ENT-010]
  └── participates in → Championship [ENT-003]

Referee [ENT-011]
  └── assigned to → Event [ENT-004] or Championship [ENT-003]   (granularity OPEN, §52 §17.2)

Board Member [ENT-013 — UNMODELED]
  └── (proposed only, not built) belongs to → Committee [ENT-014 — UNMODELED]
       └── belongs to → Federation [ENT-001]
  This entire branch is currently flat CT-PAGE-001 content (ENT-022), not a real relationship graph — see §33.

Sponsor [ENT-020 — UNMODELED]
  └── (proposed only) associated with → Federation [ENT-001] / Championship [ENT-003]
  No actual field/relationship exists to back this yet — see §52 OPEN-007.

Article/News [ENT-015]
  ├── references (0..N, optional) → Athlete [ENT-008]
  ├── references (0..N, optional) → Club [ENT-009]
  └── references (0..N, optional) → Championship [ENT-003]

External Media Coverage [ENT-018]
  ├── about → Federation [ENT-001] (implicit, not a formal field)
  └── links to → External Publisher [ENT-019, unmodeled by design]
```

### 14.2 Machine-Readable Relationship Table

| REL-ID | From | To | Relationship | Cardinality | Required? | CMS/Registry | Source |
|---|---|---|---|---|---|---|---|
| REL-001 | Season | Championship | contains | 1:N | Required (but Season itself is a gap) | Registry | Google Doc §1; Ch.8 L8 `season` field only |
| REL-002 | Championship | Event | contains | 1:N | Required | Registry | Ch.8 L8 SP.2, Ch.10 |
| REL-003 | Event | Result | produces | 1:N | Required | Registry | Ch.8 L8 SP.2 |
| REL-004 | Result | Athlete | references | N:1 (or N:N for relay teams) | Required | Registry | `CMP-RESULTSTABLE-001`, Ch.10 §10.5 |
| REL-005 | Athlete | Club | belongs to | N:0..1 | Optional (Unattached Athlete) | Registry | SP.8 |
| REL-006 | Athlete | Coach | coached by | N:0..N | Optional | Registry | `CMP-COACHCARD-001`, cardinality open |
| REL-007 | Referee | Event/Championship | assigned to | N:N | Required per assignment | Registry | Granularity open, Google Doc §4 |
| REL-008 | Article | Athlete/Club/Championship | references | N:0..N | Optional | CMS→Registry (one-way link, never restates value) | Ch.13 §7 |
| REL-009 | External Media Coverage | External Publisher | attributes to | N:1 | Required | CMS (Publisher unmodeled) | ADR-0042 |
| REL-010 | Board Member | Committee | belongs to | **Unmodeled — proposed only** | n/a | n/a | **GAP, §52 OPEN-026** |
| REL-011 | Sponsor | Championship/Federation | associated with | **Unmodeled — proposed only** | n/a | n/a | **GAP, §52 OPEN-007** |

## 15. CMS Architecture

Fully governed by `docs/design-system/13-CMS-System.md` (ADR-0024: Headless Business Platform) — not restated. The CMS owns **publishing**, never registry data (§13/§14 boundary). `Published` is the only state visible publicly. Every Content Type must expose SEO Metadata fields (Ch.13 §12, §25).

**CMS Modules (Purpose · Users · Permissions · Data · Workflow · Dependencies):**

| Module | Purpose | Users | Data | Workflow | Dependency |
|---|---|---|---|---|---|
| Content Registry (Article/Page/Media/ExternalMedia) | Author/manage the 4 real content types | Editor, Reviewer/Approver, Publisher | §16 | §18 | §17 roles must exist first for real access control |
| Media Library | Central asset store | Media Team | `CT-MEDIA-001` | Simplified, no full editorial workflow (Ch.13 §14) | Ch.8 L6 upload contract |
| Dashboard Overview | Drafts/pending/scheduled/published/rejected at a glance | All CMS roles | Aggregated from Content Registry | n/a | `DB-WORKSPACE-001` (Ch.12) |
| Users & Roles | Manage accounts, assign roles | Administrator/Super Admin | **Unmodeled — §52 OPEN-001** | n/a | Blocks real implementation |

## 16. CMS Content Registry

*Re-verified directly against `docs/design-system/13-CMS-System.md` §14 — exactly four real entries.*

| Content Type ID | Name | Status |
|---|---|---|
| `CT-ARTICLE-001` | Article / News | ✅ Registered |
| `CT-PAGE-001` | Static Page | ✅ Registered — currently the home for Board/Committee/About content (§33) |
| `CT-MEDIA-001` | Media Asset | ✅ Registered — covers Image/Video/Gallery as one type |
| `CT-EXTERNALMEDIA-001` | External Media Coverage | ✅ Registered (ADR-0042) |
| `CT-AFFILIATION-001` | Affiliation | 🟡 Proposed, not registered (ADR-0037 backlog) |
| — | Sponsor/Partner | 🔴 Not even proposed with an ID — §52 OPEN-007 |
| — | Press Release, FAQ Entry, Announcement/Banner | 🟡 IA-proposed, never reconciled — §52 OPEN-011 |
| — | Board Member, Committee | 🔴 Not proposed by anyone, anywhere, as structured content — new gap, §52 OPEN-026 |

## 17. CMS Roles & Permissions

**Cannot be marked COMPLETE — the deepest gap in the entire audit, unchanged across every session's review of this repository.** Chapter 13 §11 names three generic roles (`Editor`, `Reviewer/Approver`, `Publisher`) and defers everything else to "Chapter 22," which governs *document* versioning, not *application* authorization. Chapter 17 (Privacy) and Chapter 8 L3 §N.19 (Authorization Boundary — hides UI when permission is denied) both come close but neither defines *who has what*. IA's 13-role model (Registrar, Competition Officer, Media Team, Administrator, Super Admin, etc.) remains `[A]`, unvalidated by any governing chapter.

**Recommendation, not a decision:** new ADR against Chapter 13. Registered as **§52 OPEN-001**, highest priority in the entire registry.

## 18. Editorial Workflow

Two lifecycles, deliberately distinct (Ch.13 §5/§6):

```
Editorial Workflow:   Draft → In Review → Approved | Rejected
Publishing Lifecycle: Draft → In Review → Approved → Scheduled → Published → Archived → (Deleted, separate operation, never automatic from Archived)
```

`Scheduled` reserved, not yet activated (Ch.13 §8). `Archived ≠ Deleted` (Ch.13 §6c). Product docs' "Author → Review → Publish" shorthand maps onto this exactly (Author=Draft, Review=In Review+Approved, Publish=Published) — stated explicitly so the two phrasings are never mistaken for competing workflows.

**Who can do what** (only what's actually governed — not invented): `Editor` authors and submits; `Reviewer/Approver` approves/rejects (EC.7); `Publisher` publishes, may combine with Approver. Beyond this trio: unknown, pending §52 OPEN-001.

## 19. Data Lifecycle

For **registry entities** (Championship, Event, Result, Athlete/Club factual data): a *different*, non-CMS lifecycle applies — `Entered → Pending Verification → Verified/Official` (Ch.10 §10.2) — governed by `verification_status` (PR-010), not `Published`. The two lifecycles must never be conflated: a News article can be `Published` while referencing a Result that is still only `Entered` — in which case the article **MUST NOT** state the unverified figure as fact (Ch.13 §7 anti-duplication + PR-010).

**Results approval sign-off count (single vs. double) is unresolved** — Google Doc raises it, no chapter answers it. **§52 OPEN-014.**

## 20. API / Data Flow

```
Registry data (Championship/Event/Result/Athlete/Club/Coach/Referee)
   → entered via Admin Dashboard (DB-ENTITY-001/DB-MONITORING-001, Ch.12)
   → verification gate (PR-010, Ch.10 §10.2)
   → Shared Services canonical source (IA §1.2 — one canonical source per fact)
   → consumed identically by every listing/detail/Homepage-preview surface, never recomputed per-surface

Editorial data (Article/Page/Media/ExternalMedia)
   → authored in CMS → Editorial Workflow → Publishing Lifecycle
   → only `Published` reaches the public site (sitemap rule, Ch.14 §13)

Search
   → indexes the published/verified end of both flows only (IA §8.7 exclusion list)
```

Fully governed by Chapter 21 (Next.js/Express-Nest, headless API-agnostic boundary, Ch.13 §13) — stack/folder detail not restated here, see §57.

## 21. Cross-Entity Relationships

*Consolidates §14's diagram into flow-relevant groupings for engineering planning — the same relationships, viewed by which team needs which edge.*

| Consumer | Needs these relationships |
|---|---|
| Championship Detail page | Championship→Season (gap), Championship→Event (1:N), Championship→Referee (N:N) |
| Athlete Detail page | Athlete→Club (0:1), Athlete→Result (1:N), Athlete→Coach (0:N), Athlete→Record (0:N), Article→Athlete (0:N, reverse lookup) |
| Results page | Event→Result (1:N), Result→Athlete (N:1) |
| News Detail page | Article→Athlete/Club/Championship (0:N, one-way reference only) |
| Homepage §5 (Results & Rankings + Upcoming Events) | Same as Results + Event, aggregated for display only — does not create a new relationship, §06.3 |

## 22. Search & Filtering

Fully governed by `PT-SEARCH-001`/`PT-FILTER-001` (Ch.11), `CMP-SEARCHINPUT-001`/`CMP-SEARCHBAR-001` (Ch.8 L2/L7), Homepage Spec §10. Scope: published/verified content only, excludes drafts/unverified results/personal data (IA §8.7). Route `/search`, noindex (dynamic). Suggested-query source (trending vs. curated) unresolved — Homepage Spec §25 Q7.

## 23. Localization / Arabic / English

Fully governed by Chapter 19 + Chapter 9 §CR-1.6 — independent AR/EN authored content, no machine translation, Gregorian-primary dates with optional Hijri display layer. **Engineering-reality flag, independently re-verified this session by reading the actual file:** `apps/web/src/app/layout.js:52-53` hardcodes `lang="ar" dir="rtl"` with a theme-bootstrap script for light/dark but **zero** language-toggle logic — every governing document assumes a switchable bilingual site; that switch does not exist in code today.

## 24. Navigation & Routing

Component behavior fully governed by Chapter 8 L3 (routing contract §N.4, external-link rule, RTL tab order). The actual nav tree is **not** decided by that chapter and is **not** decided here — §52 OPEN-004 (Header) remains the single governing open item for all navigation placement questions, including where Championships, UAEAF in the Media, and any future page in §10 eventually appear in the nav. Route conventions used throughout §10 (`/championships/{slug}/events/{id}` nesting, etc.) are **this document's own proposal**, consistent with the entity model in §14, not sourced from a prior decision — flagged here explicitly rather than presented as already-settled.

## 25. SEO Architecture

Fully governed by Chapter 14 (ADR-0025) + Chapter 15 (AI Readability). Every entity Detail page in §10 is indexable with matching Structured Data; Listing pages are indexable with canonical/pagination discipline (no filter-combination index bloat, Ch.14 §14); Search and account pages are noindex. Thin/duplicate content check: External Media Coverage's archive is indexable (genuine curated value per entry) while individual external articles never get a UAEAF detail page — the exact anti-duplication pattern Ch.14 §14 exists to prevent, confirmed compliant.

## 26. Accessibility

Fully governed by Chapter 6 (WCAG 2.2 AA — explicitly not AAA). Applies identically to every page in §10, every component in §29, without per-page exception. AAA is a narrow, non-current Backlog carve-out for results pages only (Ch.6 §6.15).

## 27. Responsive Behavior

Fully governed by Chapter 5 + Chapter 12 §12.4. **Repeated, confirmed finding:** no mobile/tablet Figma frame exists for the Homepage or for `CMP-LIVESTREAM-001`/`CMP-AFFILIATIONS-001`/the "UAEAF in the Media" carousel — every one self-documents as unverified. This applies platform-wide; no page in §10 should be assumed to have verified mobile behavior merely because its desktop spec is complete.

## 28. Design System Dependencies

Every component named in §10/§29/§31–45 already exists in Chapter 8 L1–L8, with two exceptions tracked as gaps, not invented: `CMP-SPONSORSTRIP` (named only in passing, never fully specified) and `CMP-COMPETITIONCARD-001`'s pending rename. No new token, component, or pattern is introduced anywhere in this document.

## 29. Component Mapping

| Product need | Existing component | Governing chapter |
|---|---|---|
| Any entity card (Athlete/Club/Coach/Referee/Championship) | `CMP-CARD-001` base, specialized per L8 entity | Ch.8 L5/L8 |
| Horizontal moving card row (UAEAF in the Media, Club Marquee) | `CMP-CAROUSEL-001` | Ch.8 L6 |
| Any listing page toolbar | `CMP-DATATOOLBAR-001` | Ch.8 L7 |
| Any results table | `CMP-RESULTSTABLE-001` | Ch.8 L8 |
| Any static page body | Rich text/Block (Ch.13 §Block) | Ch.13 |
| Board/Committee content **if it stays flat content** | Same static-page body, no new component | — |
| Board/Committee content **if it becomes a structured entity** | **No component exists — would need a new `CMP-BOARDMEMBERCARD-001`, its own ADR against Ch.8 L7 or L8** | **Gap, §52 OPEN-026** |
| Sponsor card/strip | **No component exists** | **Gap, §52 OPEN-007** |

## 30. UX Interaction Rules

Fully governed by Chapter 11 (PT-CRUD-001, PT-SEARCH-001, PT-FILTER-001, PT-WIZARD-001, PT-EMPTYLOADINGERROR-001, PT-CONFIRMATION-001, PT-BULKACTION-001 — **exactly 7 patterns, independently re-verified by direct grep this session**, not the 9 the Master Index claims — §52 OPEN-006/021) and Chapter 8 L4 (Feedback Foundation). No product-specific interaction rule exists outside these patterns; every page in §10 composes them, none reinvents them.

## 31. Website Modules — Index

Each module below (§32–45) is the full-site specification for its domain — the Homepage's *preview* of the same domain is cross-referenced, never re-specified. Platform-wide rules (Accessibility §26, Localization §23, Motion — Ch.5 §5.8 reduced-motion, no exception) apply to every module without repetition.

## 32. Homepage Modules

Fully governed by `02-Homepage-Specification.md` (13 sections, current order below). Not restated beyond this cross-reference table:

| # | Section | Primary Entity | Homepage Spec ref | Status |
|---|---|---|---|---|
| 1 | Hero | Editorial (Hero Slide, no formal CT-) | §5/§25 Q10 | ⚠ Ch.27 pending (proposes no-carousel) |
| 2 | Federation by the Numbers | Computed | §2 | COMPLETE |
| 3 | Clubs Network | Club | §14 | COMPLETE |
| 4 | Featured Athletes | Athlete | §13 | ⚠ Ch.27 pending (4:5 crop, one-hero-athlete) |
| 5 | Results & Rankings + Upcoming Events | Result, Event, Championship | §12 | COMPLETE (aggregates Championship+Event for discovery per §06.3, records stay separate) |
| 6 | Live Stream & Videos | Media Asset + live signal | §11a | COMPLETE spec / ENGINEERING GAP (no CMS field) |
| 7 | News | Article | §11 | COMPLETE |
| 8 | **UAEAF in the Media** | External Media Coverage | §11b | **LOCKED — see §38** |
| 9 | Sponsors & Partners | **No entity** | §15 | Spec COMPLETE / entity GAP §52 OPEN-007 |
| 10 | Media Centre | Media Asset | §16 | COMPLETE |
| 11 | Memberships | Affiliation (proposed) | §14a | Spec COMPLETE / CT- GAP |
| 12 | Newsletter | n/a (data capture) | §5/§6 | COMPLETE |
| 13 | Footer | n/a | §6 | Labels coupled to §52 OPEN-004 |

## 33. Governance / Organization Pages

**New investigation this rebuild.** Answering the 14 questions directly, with evidence, not invention:

1. **Is this an Entity?** No — confirmed by full-repository search. Board of Directors, Organisational Structure, and Technical Committees exist only as **static page destinations** (`CT-PAGE-001`) under the "About the Federation" nav dropdown (IA §3.1, §4.1) and as three rows in the Screen Inventory, each a single free-form content page.
2. **What is the Entity?** There isn't one — this is the answer, not a placeholder. No `CMP-BOARDMEMBERCARD-001`, no `CT-BOARDMEMBER-001`, nothing in any of the 27 Design System chapters or the Google Doc.
3. **What fields does it have?** Whatever `CT-PAGE-001` provides generically (title, body, last-modified, publish status) — no Board-Member-specific fields (name, title, photo, term, committee membership) exist anywhere.
4. **Who manages it?** Content Editor, via the same static-page workflow as any other `CT-PAGE-001` (§18) — no specialized workflow exists.
5. **Where is it displayed?** `/about/board`, `/about/structure`, `/about/committees` (target routes, §10.1) — each a standalone static page, not a directory.
6. **Does it have a listing page?** No.
7. **Does it have a detail page?** No — there is no per-member profile page; the entire Board is presumably one block of content on one static page.
8. **Can one person belong to multiple committees?** Unanswerable — there is no data model in which "person" and "committee" are separate records that could relate to each other in the first place.
9. **What are the relationships?** None modeled (§14.1 shows this branch as explicitly unmodeled).
10. **CMS workflow?** Generic static-page Author→Review→Publish (§18) — no specialized approval for e.g. a board term change.
11. **Permissions?** Whatever governs `CT-PAGE-001` generally — no Board-specific permission exists, consistent with §52 OPEN-001's broader gap.
12. **SEO strategy?** Indexable static page, same as any `CT-PAGE-001` (Ch.14) — no per-member SEO (no `Person` schema per board member, since there's no per-member record to attach it to).
13. **URL strategy?** One static URL per page (§10.1) — not a slug-per-person pattern.
14. **Connection to other entities?** None currently. If the Federation later wants individual Board Member profiles (photo, bio, term dates, committee assignments) as a real structured entity — which would enable a listing+detail pattern, `Person` schema, and real relationships to Committees — **that is a new requirement with zero existing backing, exactly analogous to Sponsor (§52 OPEN-007) and Season (§52 OPEN-013).** Registered as **§52 OPEN-026**. Not invented here.

## 34. Sports & Competition Pages

Season→Championship→Event→Result relationship fully specified in §14. Explicit restatement of the client's non-negotiable requirement, now with the full entity chain: **Championship and Event are never merged** — separate routes (§06.3), separate registry records, separate Detail templates (Championship's is a gap, §52 OPEN-015; Event's exists, Ch.20). Rankings and Records are correctly modeled as *computed views* over Result (ENT-006/007), not independently stored entities — consistent with ADR-0020's "never calculate in the presentation layer" principle, meaning Rankings/Records pages read from the same canonical Result data, never a separately maintained number.

## 35. People & Athlete Pages

Fully governed by Chapter 8 L8 (`CMP-ATHLETECARD-001`), Chapter 17 (minors), Ch.13 Hybrid Entity Boundary. Google Doc field additions (medical certificate, guardian data fields, transfer-history retention depth) are content dependencies, not decided here (§52 OPEN-023).

## 36. Clubs & Organizations

Fully governed by Chapter 8 L8 (`CMP-CLUBCARD-001`). Google Doc field additions (registration-number authority, renewal period, public self-service registration) are content dependencies (§52 OPEN-017).

## 37. News / Editorial

**One content type, not two** (`CT-ARTICLE-001`) — News and Article are the same thing, confirmed by direct read of Chapter 13 §14. Full Editorial + Publishing Lifecycle (§18). References Athletes/Clubs/Championships without ever restating their factual values (Ch.13 §7).

## 38. Media & External Coverage

Three genuinely distinct concepts, kept explicitly separate per this session's own prior governance work — restated here as the module-level contract:

| | Media Centre | UAEAF in the Media |
|---|---|---|
| Ownership | UAEAF-owned assets | External publisher owns the article; UAEAF owns only the reference record |
| Content type | `CT-MEDIA-001` | `CT-EXTERNALMEDIA-001` (ADR-0042) |
| Component | `CMP-GALLERY-001` | `CMP-CARD-001` + `CMP-CAROUSEL-001` |
| Homepage position | 10 of 13 | **8 of 13 — locked, immediately after News, before Sponsors** |
| Presentation | Dark full-bleed mosaic, lightbox | **Animated horizontal card carousel — locked, not a static grid** |
| External link behavior | n/a (own assets) | Chapter 8 L3 External Link rule in full: visible icon, `target="_blank"`, `rel="noopener noreferrer"`, descriptive text (Ch.9 §CR-4.2) |
| RTL | Standard | **Validated, not mirrored** — Card 1 at RTL reading-start (right), continuation cue on the left, a deliberate departure from Club Marquee's own left-right fade convention (flagged for that component's own future review, not corrected here) |
| Reduced motion | Ch.5 §5.8 | Ch.5 §5.8 + `CMP-CAROUSEL-001`'s own pause-on-hover/focus/touch contract, in full |
| Keyboard | Standard | Full keyboard nav, visible focus, manual controls — `CMP-CAROUSEL-001`, no exception |
| CTA | Implicit (lightbox) | "View all coverage" / **"عرض كل التغطية الإعلامية"** → `/media-coverage`, bound to `color/brand/primary` semantic token, never a raw primitive |
| Relationships | None modeled | → External Publisher (unmodeled by design, ADR-0042) |

Not redesigned, not reopened — every row above cites the already-locked decision, none invents a new one.

## 39. Sponsors / Partners

**Most extensively specified section, least backing governance in the repository — unchanged finding across every session's audit of this repo.** `02-Homepage-Specification.md` §15 fully specifies the VIP-banner + tiered-grid presentation. No `CT-SPONSOR-001`, no fully-specified component. **§52 OPEN-007, still the highest-priority Design System gap.**

## 40. Membership

Fully governed by ADR-0037 (`CMP-AFFILIATIONS-001`) and Homepage Spec §14a. `CT-AFFILIATION-001` remains backlog. "Affiliation" carries a second, unrelated sense elsewhere (Club→UAEAF registration status, vs. this module's UAEAF→international-body sense) — documentation clarity note only, no data collision (§52 OPEN-019).

## 41. Live / Streaming

Fully governed by ADR-0036 (`CMP-LIVESTREAM-001`). No CMS field yet for the live-channel reference (ENGINEERING GAP, self-documented in the source chapter already).

## 42. Results / Statistics

Fully governed by Chapter 10 (all 10 scenarios). One template (`TMP-RESULTS-001`) vs. IA's two screens (Live/Final) — recommendation is one state-driven template, not decided (§52 OPEN-008).

## 43. Forms & Submissions

Fully governed by Chapter 8 L2 (23 components, F.1–F.14) and Chapter 11 (PT-CRUD-001, PT-WIZARD-001). Nothing platform-specific to add — every form (club registration, athlete registration, contact, newsletter) composes existing components exactly as documented.

## 44. Notifications

Fully governed by Chapter 18 (Notification Engine, ADR-0030) — In-App/Email/Push/SMS channels, `Critical`/`Workflow`/`Informational`/`Social` classification. No product-specific notification rule exists beyond this chapter.

## 45. Search

See §22 — not repeated.

## 46. CMS → Website Publishing Flow

```
Editor authors (Draft) → submits (In Review) → Reviewer/Approver decides (Approved | Rejected)
   → [Scheduled, reserved not active] → Publisher publishes (Published)
   → sitemap regenerates (Ch.14 §13, Published-only) → public page renders
   → later: Archived (≠ Deleted, Ch.13 §6c) or Updated (re-enters Draft/Review per the same gate)
```

## 47. Website → CMS Data Flow

```
User submits a form (contact, newsletter, future registration)
   → Chapter 8 L2 validation (client) → API → server-side validation
   → Registry write (if a registry entity, e.g. future public club-registration request) OR
      CMS Draft creation (if editorial, e.g. a press inquiry)
   → Notification Engine event emitted (Ch.18) — success/failure feedback to user
   → Audit record if the action touches Restricted/Sensitive data (Ch.17 §7)
```

No public self-service registration flow exists yet for Athlete/Club/Coach/Referee — these remain Admin-Dashboard-entered only until §52 OPEN-017/023 resolve (the Google Doc explicitly asks whether public self-service should be allowed at all).

## 48. Entity Dependency Map

*What must exist before what — for sequencing implementation, not for re-deciding anything in §13.*

```
Season (GAP) ──requires──> before Championship can be properly time-scoped
Roles & Permissions (GAP) ──requires──> before any real CMS access control
Sponsor entity (GAP) ──requires──> before Sponsors page (PAGE-019) can be built on real data
Board/Committee entity decision (GAP) ──requires──> before Board page becomes more than flat text
Championship naming/template (OPEN) ──requires──> before Championship Listing/Detail (PAGE-004/005) can be built
Athlete/Club (exist) ──requires nothing further──> ready today
UAEAF in the Media (exists, locked) ──requires nothing further──> ready today
```

## 49. User Journeys

*Sample, not exhaustive — demonstrates how §10–14 compose into a real visitor path.*

| Journey | Path |
|---|---|
| International visitor learns about a Championship | Homepage Hero → Homepage §5 (Results & Upcoming Events preview) → "View schedule" CTA → Championship Detail (**blocked today, §52 OPEN-015**) → Event Detail → Result |
| Media/press checks external coverage | Homepage §8 "UAEAF in the Media" carousel → per-card "Read the full article" → external publisher site (leaves UAEAF) |
| Fan checks an athlete's record | Athletes Listing → Athlete Detail → Athlete Results History → Record badge (if applicable) |
| Visitor looks up Federation leadership | About▾ nav → Board of Directors static page → **dead end, no individual profiles, no relationship to Committees (§33)** |

## 50. Business Rules

*Consolidated from across the Design System, not newly invented:*

- One canonical source per fact — no surface recomputes a Result/Ranking independently (IA §1.2, ADR-0020).
- No unverified figure is ever publicly rendered (PR-010).
- A News article referencing a Result links to it, never restates the number (Ch.13 §7).
- Minors' data/photos require documented, withdrawable consent before any public display (Ch.17 ADR-0028).
- No more than one primary CTA per Homepage section (PR-001) — verified compliant for "UAEAF in the Media" (§38).
- Red (`color.semantic.danger`) is reserved for destructive actions only; `color.semantic.live`/`achievement` are the only other approved red uses, each capped at one per component (Ch.1 ADR-0004, Ch.7 §7.9.2).
- Championship and Event content models/routes/CMS records remain strictly separate even where the Homepage aggregates them for discovery (§06.3 — the client's own non-negotiable rule, restated as a formal business rule here).

## 51. Traceability Matrix (sample)

| Requirement | Entity | CMS | Page | Component | DS Chapter | Acceptance Criteria (§59) | Status |
|---|---|---|---|---|---|---|---|
| HP-001 Homepage shows 3–4 latest external media items | ENT-018 | `CT-EXTERNALMEDIA-001` | PAGE-001 | `CMP-CARD-001`+`CMP-CAROUSEL-001` | Ch.8 L5/L6, ADR-0042 | AC-001 | LOCKED |
| PAGE-004 Championship Listing | ENT-003 | Registry, no CT | PAGE-004 | `CMP-COMPETITIONCARD-001` (pending rename) | Ch.8 L8 | AC-002 | **OPEN — no template, §52 OPEN-015** |
| REL-005 Athlete↔Club optionality | ENT-008/009 | n/a | PAGE-009 | `CMP-ATHLETECARD-001` | SP.8 | AC-003 | COMPLETE |
| ENT-013 Board Member | **none** | **none** | PAGE-103 | **none** | **none** | n/a | **GAP — §52 OPEN-026** |
| A11Y-001 WCAG 2.2 AA platform-wide | all | n/a | all | all | Ch.6 | AC-004 | COMPLETE |
| SEO-001 NewsArticle schema | ENT-015 | `CT-ARTICLE-001` | PAGE-003 | n/a | Ch.14 §4/§8 | AC-005 | COMPLETE |

*(Sample per instruction — extends mechanically to every ID in §10/§13/§14 as implementation proceeds.)*

---

## 52. Open Decisions / Gaps / Dependencies

**26 items — the additional item this rebuild surfaces is OPEN-026 (Board/Committee entity).** Two items (Championship/Athlete naming) are RESOLVED and kept for traceability, not because they're still open.

| ID | Decision | Category | Owner | Blocking Level |
|---|---|---|---|---|
| OPEN-001 | Formal CMS/Platform Roles & Permissions model | GOVERNANCE GAP | Product Owner + DS owner | **P0** |
| OPEN-002 | Referee vs. Official vs. Technical Official | OPEN PRODUCT DECISION | Product Owner | P1 |
| OPEN-003 | `CLAUDE.md`'s unsourced "Tournament" claim | DOCUMENTATION DRIFT | Product Owner | P3 |
| OPEN-004 | Header architecture (9 vs. 7 item) | OPEN PRODUCT DECISION | Product Owner | P1 |
| OPEN-005 | "Events" nav-label clarity rename | OPEN PRODUCT DECISION | Product Owner | P3 |
| OPEN-006/021 | `PT-NAVIGATION-001`/`PT-PERMISSION-001` cited, never defined; Master Index claims 9 patterns, 7 exist | DOCUMENTATION DRIFT | DS owner | P3 |
| OPEN-007 | Sponsor entity/component — never formally specified | DESIGN SYSTEM GAP | DS owner | **P0** |
| OPEN-008 | Results: one template vs. two screens | OPEN PRODUCT DECISION | Product Owner | P2 |
| OPEN-009 | No Coach/Referee Detail template | DESIGN SYSTEM GAP (likely oversight) | DS owner | P2 |
| OPEN-010 | News vs. Article as one page-type vs. two | OPEN PRODUCT DECISION | Product Owner | P3 |
| OPEN-011 | Press Release/FAQ/Announcement formalization | DESIGN SYSTEM GAP | DS owner | P2 |
| OPEN-012 | Homepage Section Instance content type | OPEN PRODUCT DECISION | Product Owner | P3 |
| OPEN-013 | Season as a formal entity | DESIGN SYSTEM GAP | DS owner | **P0** |
| OPEN-014 | Results approval sign-off count | OPEN PRODUCT DECISION | Product Owner | P2 |
| OPEN-015 | No Championship template | DESIGN SYSTEM GAP | DS owner | **P1** |
| OPEN-016 | Event template scope (race-level vs. nav-group) | CONFLICT (see §52.1) | Product Owner + DS owner | P1 |
| OPEN-017 | Club registration Google Doc questions | CONTENT/PRODUCT DEPENDENCY | Federation | P2 |
| OPEN-018 | `CT-EXTERNALMEDIA-001` clipping-image field | DESIGN SYSTEM GAP (easy fix) | DS owner | P2 |
| OPEN-019 | "Affiliation" dual-sense | DOCUMENTATION DRIFT | DS owner | P3 |
| OPEN-020 | Chapter 27 approval status | OPEN PRODUCT DECISION (explicitly PENDING) | Product Owner | P1 |
| OPEN-022 | Master Index claims 5 dashboard templates, 4 exist | DOCUMENTATION DRIFT | DS owner | P3 |
| OPEN-023 | Athlete registration fields (medical cert, guardian data, transfer history) | CONTENT/PRODUCT DEPENDENCY | Federation | P2 |
| OPEN-024 | Data cardinality questions (§14.2 sample) | CONTENT/PRODUCT DEPENDENCY | Federation | P2 |
| OPEN-025 | Analytics/tracking plan | OPEN PRODUCT DECISION (not urgent) | Product Owner | P3 |
| **OPEN-026** | **Board Member/Committee as a structured entity (or remain flat static content)** | **DESIGN SYSTEM GAP — new this rebuild** | **DS owner + Product Owner** | **P2** |
| RESOLVED-A | Championship canonical over Competition | RESOLVED | Product Owner | n/a |
| RESOLVED-B | Athlete canonical over Player | RESOLVED | Product Owner | n/a |

### 52.1 Conflict Registry

| Conflict ID | Source A | Source B | Conflict | Current Authority | Required Action |
|---|---|---|---|---|---|
| CONF-001 | Chapter 8 L8 SP.2 (`CMP-COMPETITIONCARD-001`) | Product Owner instruction (this session) | "Championship" vs. "Competition" naming | Product Owner instruction wins (§05) | Documentation-only rename ADR against Ch.8 L8, not yet filed |
| CONF-002 | `CMP-REFEREECARD-001`/`TMP-REFEREELIST-001` | Ch.14 ADR-0025 / Ch.13 ADR-0042 ("Official") / IA role model ("Technical Official") | Same entity (probably), three names | **Unresolved — no current authority** | Product Owner decision, OPEN-002 |
| CONF-003 | Chapter 20 §20.1 `TMP-EVENTLIST-001` | IA §3.1/§8.1 "Events" nav (Championship Calendar/Results/Records) | Template may be built for the wrong granularity | **Unresolved** | Clarify before implementation, OPEN-016 |
| CONF-004 | `CLAUDE.md` §11 | Full-text search of `docs/design-system/` and `docs/product/` | Cites an IA "Tournament" distinction that doesn't exist | `CLAUDE.md`'s general priority (Ch.06 §04) still wins procedurally, but the underlying factual claim is false | Correct the `CLAUDE.md` line or formally define Tournament, OPEN-003 |
| CONF-005 | `00-MASTER-INDEX.md` "Cross-Reference Integrity ✅" self-certification | Chapter 11 body (7 patterns, not 9); Chapter 12 body (4 dashboards, not 5) | Self-certification is factually contradicted | Chapter bodies win (they're the actual content) | Correct the Master Index count or add the missing patterns, OPEN-006/021/022 |
| CONF-006 | `02-Homepage-Specification.md` §15 (extensive Sponsor visual spec) | Chapter 8 L8/L7 (no Sponsor component ever fully specified) | Product depends on an undefined foundation | Homepage Spec's visual decision stands; the component still needs writing | New ADR against Ch.8, OPEN-007 |
| CONF-007 | Every governing document (assumes switchable AR/EN) | `apps/web/src/app/layout.js:52-53` (hardcoded, no toggle) | Documentation vs. actual code | Documentation describes the target state; code is pre-implementation | Build the toggle — engineering task, not a doc conflict, §57 |

## 53. Risks

| Risk | Mitigation |
|---|---|
| Building CMS roles ad hoc before OPEN-001 | Build content editing against the generic Editor/Approver/Publisher trio only; do not hardcode the IA's 13-role list as if validated |
| Building Championship pages before OPEN-003/015 | Use "Competition" as an internal code identifier with one isolated rename point if implementation must start now |
| Chapter 27 approval landing mid-build | Avoid deep-coupling Hero/Featured Athletes/Media Centre work to the carousel/grid pattern in a way that's expensive to unwind |
| Treating the Google Doc as final | It is unsigned — do not implement Club/Athlete/Coach/Referee schemas as final without Federation sign-off |
| Inventing a Board Member entity to "complete" the spec | Don't — §33/OPEN-026 exists precisely so this isn't guessed |

## 54. Implementation Readiness

| Domain | Status |
|---|---|
| Homepage | READY WITH DEPENDENCY (Hero photography, mobile frames) |
| Championships | BLOCKED BY GOVERNANCE (OPEN-015) |
| Events | BLOCKED BY DECISION (OPEN-016) |
| Athletes / Clubs | READY WITH DEPENDENCY (Google Doc field sign-off) |
| News / Articles | READY |
| UAEAF in the Media | READY |
| Media Centre | READY |
| Live Stream | READY WITH DEPENDENCY (CMS field) |
| Memberships | READY WITH DEPENDENCY (content type) |
| Sponsors | BLOCKED BY GOVERNANCE (OPEN-007) |
| Board/Committees | BLOCKED BY DECISION (OPEN-026) — or READY if the Federation confirms flat static content is acceptable permanently |
| CMS (editorial core) | READY |
| Roles & Permissions | BLOCKED BY GOVERNANCE (OPEN-001) |
| Localization (toggle) | BLOCKED BY ENGINEERING |
| SEO / Accessibility | READY |
| Search | READY WITH DEPENDENCY (suggested-query source) |

## 55. Figma / Design Handoff Contract

**READ → AUDIT → REPORT → APPROVAL → DESIGN, never READ → ASSUME → DESIGN.** Read order: `CLAUDE.md` → this document → the relevant Design System chapter(s) → relevant ADR(s) → Homepage Spec/module section (§31–45) → the component's Chapter 8 entry. If a requirement is missing, **STOP, cite the §52 Open Decision — do not invent a design.** Do not reopen RESOLVED-A/B or any LOCKED item without new evidence.

**Per-page/section Design Handoff Block (template, applied via §10/§32–45's tables):** what to design (Page Type, §08) · where it appears (Nav Location, §06) · why (Purpose, §31–45) · what data (Primary/Related Entity, §10.8/§14) · which components (§29) · which states (§26/§27, Empty/Loading/Error per §11/§12's shared contract) · mobile behavior (§27 — flag unverifiable, don't fabricate) · RTL behavior (§23/§38's worked example) · empty/failure behavior (§11's shared contract).

## 56. Frontend Handoff Contract

Stack: Next.js App Router + React + TypeScript + Tailwind-on-tokens + Radix UI/shadcn + Lucide icons (Ch.21 ADR-0033), SSR/SSG for every indexed page. Tokens from the Semantic layer only (Ch.7 §7.7). Folder structure per Ch.21 §21.6 — confirmed empty scaffolding today (`packages/ui`, `packages/content` re-verified empty this session), a from-scratch build. RTL: implement the real AR↔EN toggle — only a hardcoded attribute exists today (§23).

**Per-entity Developer Handoff Block (template, applied via §13):** entity + fields (§13's registry, expand per ENT-ID when schema work begins) · relationships (§14) · query needs (filter/sort/paginate per §11's shared contract) · permissions (§52 OPEN-001 — do not hardcode ad hoc) · publishing state (§18/§19, correct lifecycle per registry vs. CMS) · localization (§23) · SEO (§25) · error handling (§26's shared contract, Ch.8 L4).

## 57. Backend Handoff Contract

Express/Nest.js (final choice out of Design-System scope, Ch.21), headless API-agnostic boundary (Ch.13 §13) — the CMS/registry never directly couples to the frontend. One canonical source per fact (IA §1.2) — no endpoint recomputes a Result/Ranking independently of how another endpoint does. Verification gate (`verification_status`) is a registry-side concern, distinct from the CMS `Published` gate (§19) — implement as two separate state machines, not one merged enum.

## 58. CMS Handoff Contract

Build the Content Registry (§16) for the 4 real content types first; do not build Sponsor/Board-Member/Season management UI before their respective ADRs land (§52 OPEN-007/026/013) — building CMS screens for undefined entities is exactly the "invent a product decision through implementation" failure mode this document exists to prevent. Roles: implement against the generic Editor/Approver/Publisher trio (§17) until OPEN-001 resolves; do not hardcode the IA's unvalidated 13-role list.

## 59. QA / Acceptance Criteria

*Sample, tied to §51's traceability sample — extends per requirement as implementation proceeds.*

| AC-ID | Criterion |
|---|---|
| AC-001 | Homepage "UAEAF in the Media" shows exactly 3–4 items, latest-first unless `featured`, each with a working external link (`target="_blank"`, `rel="noopener noreferrer"`), visible focus states, and pauses its motion on hover/focus/touch |
| AC-002 | Championship Listing/Detail — **cannot be tested until OPEN-015 resolves; do not write a test against an assumed template** |
| AC-003 | Athlete Detail renders "Directly affiliated with the Federation" (not an empty field) when `club_id` is null (SP.8) |
| AC-004 | Every page in §10 passes Chapter 6 §6.12's Accessibility QA Checklist before release |
| AC-005 | Every published News article's visible timestamp/author exactly matches its `NewsArticle` JSON-LD (Ch.15 §3 — no discrepancy permitted) |

## 60. Change Governance

This document follows Chapter 22's change process applied to itself: propose → identify whether the change belongs here or in a Design System chapter → draft → approve → version bump. Resolving a §52 item moves it to a "Resolved" appendix rather than deleting it (matching IA §15.1's own audit-trail convention). Version 0.2.0 (this rebuild) supersedes 0.1.0 in full — 0.1.0 is not deleted from history, this file simply now reflects the current state.

---

*End of Master Specification v0.2.0 — a rebuild, not an expansion, of v0.1.0. Every previously resolved/locked decision is preserved; every open item is preserved and, where new evidence existed (Board/Committee, §33/OPEN-026), extended. Re-run §59's acceptance criteria and §52's registry after each Open Decision resolves.*




