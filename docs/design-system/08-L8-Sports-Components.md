# Chapter 8 — Component Inventory

## Level 8: UAEAF Sports / Domain Components (Sports Domain Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L8 of 8 — Final Level) | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                                                                                                   | Used By                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| All levels L1-L7 (this level is entirely compositional — it does not create new foundational components; it only composes them for the sports context) · Chapter 0 Discovery (entities: Competitions/Events/Clubs/Athletes/Coaches/Referees) | Chapter 10 (will extend this level with additional details) · Chapter 12 (Dashboard) · Chapter 20 (Page Templates) |

## Scope

**Covers:** L8 as the **Sports Domain Foundation** (relationship model, age categories, trust badges, medal/ranking display, results-source abstraction, records, unattached athletes, sensitivity of minor data, composition) + 12 domain components.

**Does not cover:** Business logic (how “Best Club of the Season” points are actually calculated — an open question from Discovery and a business decision, not a design decision), the actual results data source (an open question from Discovery — this chapter assumes any source).

## Definitions

| Term                   | Definition                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Domain Component**   | A component that combines multiple foundational components (L1-L7) into a meaningful composition specific to the athletics domain — it does not introduce fundamentally new behavior |
| **Verified Badge**     | A trust indicator showing that an athlete’s or club’s data has been officially verified by the Federation                                                                            |
| **Unattached Athlete** | An athlete registered directly with the Federation without affiliation to a club (Chapter 0 Discovery: `club_id` may be empty)                                                       |

## Purpose

This chapter is the **presentation layer** for all sports entities whose structure was established during the Discovery phase (Chapter 0). It does not reopen any unresolved data decisions; instead, it provides a consistent presentation layer regardless of the final answers.

---

# ADR-0020: Sports Domain Data Abstraction Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Authority**               | Engineering Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Context**                 | The Discovery Phase (Chapter 0) left several business questions open: results data source (external provider/manual), methodology for calculating “Best Club/Athlete of the Season,” and the Federation registration-number system. L8 components **MUST** be built without waiting for these questions to be resolved                                                                                                                                                                                                                |
| **Decision**                | Every L8 component **MUST** consume a **normalized, standardized data shape (Normalized Domain Shape)** regardless of its actual source — example: `<ResultsTable results={Result[]}>`, where `Result` has a fixed structure whether it comes from manual entry or an external timing-provider API. Calculation logic (season points, rankings) **MUST NOT** live inside presentation components — it **MUST** be passed as pre-calculated data (Props) from a higher layer (Backend/Business Logic, completely outside this chapter) |
| **Alternatives Considered** | Postponing L8 documentation until all open Discovery questions are resolved — rejected because it unnecessarily blocks documentation progress; separating presentation from the data source (a standard UI engineering pattern) solves the problem completely                                                                                                                                                                                                                                                                         |
| **Why This Decision**       | Aligns with the separation-of-concerns principle applied throughout the document (Chapter 3 Token Layers, Chapter 8 L3 Router-agnostic, Chapter 8 L7 implementation-independent)                                                                                                                                                                                                                                                                                                                                                      |
| **Risks**                   | If the actual data shape of an external timing provider differs from the `Result` assumed here, an Adapter layer will be required — presentation components will not need modification. **Mitigation:** this is precisely the correct separation; the Adapter lives in the data layer (Chapter 21)                                                                                                                                                                                                                                    |
| **Consequences**            | Every L8 component **MUST** explicitly document its expected data shape (Props Shape) and must not assume a specific source                                                                                                                                                                                                                                                                                                                                                                                                           |

---

# Sports Domain Foundation — Shared Sections

### SP.1 Sports Domain Definition

L8 components **MUST** be compositional (Composite) components built on top of L1-L7.

Any fundamentally new requirement (interaction, state, accessibility pattern) **MUST NOT** be invented here. It **MUST** first be added to the appropriate foundational level (L1-L7) through Architecture Review, consistent with the consequences of Chapter 8 §ADR-0013.

### SP.2 Entity Relationship Model (Referenced from Discovery)

```text
Competition (optional) ←→ Event ←→ Result ←→ Athlete (Club optional) / Referee / Coach
                                              ↓
                                            Club
```

Every L8 component below **MUST** explicitly state which entity from this model it represents and display its actual relationships rather than assumed relationships.

### SP.3 Age Category System

The age-category system (Under 14/16/18/20/23/Senior — the final list remains an open Discovery question) **MUST NOT** be hardcoded into any component.

It **MUST** be passed as classification data (Enum/Config that can be modified from the Admin Panel in the future). This ensures that any subsequent change to official age categories does not require modifications to presentation code.

### SP.4 Verification & Trust Badges

The `Verified Badge` (officially verified athlete/club) **MUST** have a consistent visual treatment across all L8 components by consuming Chapter 8 L1 §CMP-BADGE-001.

Each context in which it appears **MUST NOT** introduce a different design.

### SP.5 Medal & Ranking Display Contract

This chapter **only displays** rankings and medals. The calculation methodology (points, ranking) remains an open business decision (Chapter 0 Discovery §9).

Every ranking/medal display component **MUST** consume a pre-calculated number/rank from an external layer and **MUST NOT** calculate it internally.

The three medal types (Gold/Silver/Bronze) **MUST** have a consistent visual treatment using dedicated tokens rather than general Semantic colors, to avoid conflict with Chapter 1 ADR-0004.

Gold/Silver/Bronze are not Success/Warning/Danger states; they are independent celebratory colors that should be added as additional Brand Tokens.

### SP.6 Results Data Source Abstraction

Refer to ADR-0020.

Every results component **MUST** consume a consistent `Result` structure regardless of the source (Chapter 0 Discovery §Open Question).

A “Pending Verification” result — awaiting approval from an official/judge — **MUST** be visually differentiated from a final approved result.

This integrates with Chapter 8 L7 §EC.7 Approval Workflow Contract.

### SP.7 National & Personal Records

A newly achieved record (National/Personal Record) **MUST** have a distinctive celebratory indicator.

It uses the `DT-MOTION-EASING-SPRING` motion reserved specifically for these moments (Chapter 5 §Motion, Chapter 3 §3.4).

This motion **MUST NOT** be used for ordinary events, preserving its special significance and supporting PR-001 Clarity.

### SP.8 Unattached Athlete Display Rules

An athlete without a club (`club_id` empty, Chapter 0 Discovery) **MUST** be explicitly presented as:

**“Directly affiliated with the Federation”**

It **MUST NOT** display an empty club field silently, as this could appear to be missing or erroneous data.

### SP.9 Bilingual Sports Terminology

Event and discipline names (400m, Long Jump, etc.) **MUST** always be displayed in the active language (Chapter 4).

Discipline names **MUST NOT** be hardcoded in a single language inside any component.

### SP.10 Data Sensitivity for Minors

Any L8 component displaying athlete data/photo **MUST** respect the recorded consent status for minor data (Chapter 17 later).

A minor without recorded publication consent **MUST NOT** have their personal photo or full data publicly displayed.

Instead, an alternative such as an Initials Avatar (Chapter 8 L1) **MUST** be used specifically in this case.

### SP.11 Accessibility

Digital results tables **MUST** follow Chapter 8 L5 §DD.13, including:

* Correct semantic table structure
* Consistent numerical alignment
* Tabular Numbers (Chapter 4 Backlog v1.1)

This represents the first critical real-world use of Tabular Numbers.

### SP.12 Composition

Every L8 component **MUST** follow this pattern:

```text
Abstract Data (Props)
        ↓
Composition of L1-L7 Components
        ↓
No complex domain-specific internal state
```

---

# Athlete & Club

## CMP-ATHLETECARD-001 — Athlete Card

**Purpose:** A compact representation of an athlete used in lists and search-result grids.

**Anatomy:** Built on:

* Chapter 8 L1 §Avatar
* SP.10 Minor Privacy Rule
* Chapter 8 L1 §Badge for verification
* Chapter 8 L5 §CMP-CARD-001

**Data Shape:**

```ts
{
  id,
  name,
  photo?,
  club?,
  ageCategory,
  verified,
  isMinor
}
```

**Related Governance:** SP.2, SP.3, SP.4, SP.8, SP.10.

---

## CMP-CLUBCARD-001 — Club Card

**Purpose:** A compact representation of a club used in club lists and rankings.

**Anatomy:** Built on Chapter 8 L5 §CMP-CARD-001 + club logo.

The logo uses `object-fit: contain` according to Chapter 8 L6 §M.9.

**Data Shape:**

```ts
{
  id,
  name,
  logo?,
  memberCount,
  medalCount?,
  verified
}
```

**Related Governance:** SP.4, SP.5. City-name label inside the club crest is governed by Chapter 4 ADR-0041's Club Shield City-Name Exception (scoped, non-generalizable sub-13px allowance) — not a general permission for small text elsewhere in this component.

---

## CMP-REFEREECARD-001 — Referee Card

**Purpose:** A compact representation of a referee used in referee lists and for assigning referees to events — using Chapter 8 L3 §CMP-DROPDOWNMENU-001 when selecting.

**Anatomy:** Built on Chapter 8 L1 §Avatar + §Badge for license level:

* Local
* Arab
* Asian
* International

As defined in Chapter 0 Discovery.

**Data Shape:**

```ts
{
  id,
  name,
  photo?,
  licenseLevel,
  discipline?,
  verified
}
```

`discipline` may be:

* Track
* Field
* Combined Events
* Race Walking

This is more precise for athletics than the generic term “specialty.”

**Related Governance:** SP.2, SP.4.

---

## CMP-COACHCARD-001 — Coach Card

**Purpose:** A compact representation of a coach used in coach lists and club profiles displaying their coaches.

**Anatomy:** Built on Chapter 8 L1 §Avatar + §Badge.

**Data Shape:**

```ts
{
  id,
  name,
  photo?,
  qualifications?,
  clubs: ClubRef[],
  verified
}
```

A coach may be associated with multiple clubs.

Chapter 0 Discovery leaves open the question of whether a coach can belong to only one club. This structure supports both cases without making a premature decision, in accordance with ADR-0020.

**Related Governance:** SP.2, SP.4, ADR-0020.

---

# Competition & Event

## CMP-COMPETITIONCARD-001 — Competition Card

**Purpose:** A compact representation of a competition/championship.

**Data Shape:**

```ts
{
  id,
  name,
  type,
  season,
  status
}
```

**Related Governance:** SP.2.

---

## CMP-EVENTSCHEDULE-001 — Event Schedule

**Purpose:** A chronological schedule of events across a full competition day.

**Anatomy:** Built on Chapter 8 L5:

* §CMP-TIMELINE-001, or
* §CMP-TABLE-001

depending on data density.

**Data State Behavior:** Fully follows Chapter 8 L5 §DD.10. Live events use the `Live-Updating` state.

**Related Governance:** SP.2, SP.6, Chapter 8 L5 §DD.10.

---

## CMP-QUALIFICATIONSTATUS-001 — Qualification Status

**Purpose:** An indicator showing whether an athlete has qualified for a subsequent stage/competition.

**Anatomy:** Built on Chapter 8 L1 §Badge.

**Variants:**

| Variant         | Semantic State |
| --------------- | -------------- |
| `Qualified`     | Success        |
| `Not Qualified` | Neutral        |
| `Pending`       | Info           |

The `Pending` state integrates with SP.6.

**Related Governance:** SP.6.

---

# Results & Rankings

## CMP-RESULTSTABLE-001 — Results Table

**Purpose:** An event-results table displaying:

* Rank
* Athlete
* Time/Distance
* Medal

**Anatomy:** Built on either:

* Chapter 8 L5 §CMP-DATAGRID-001, or
* Chapter 8 L5 §CMP-TABLE-001

**Data Shape:**

```ts
{
  resultId,
  rank,
  athlete: AthleteRef,
  value,
  unit,
  medal?,
  isNewRecord?,
  verified: boolean
}
```

This directly reflects ADR-0020.

`resultId` must comply with Chapter 8 L5 §DD.16 Display Identity — a stable identifier, never an array index.

**Related Governance:**

* SP.5 — Medal Display
* SP.6 — Verification State
* SP.7 — Record Indicator
* SP.11 — Tabular Numbers
* Chapter 8 L5 §DD.16 — Display Identity (`resultId`, not Index)

---

## CMP-MEDALBADGE-001 — Medal Badge

**Purpose:** A reusable individual medal icon/badge for:

* Gold
* Silver
* Bronze

**Anatomy:** Built on Chapter 8 L1 §Badge using the dedicated medal tokens defined by SP.5.

**Related Governance:** SP.5.

---

## CMP-RECORDBADGE-001 — Record Badge

**Purpose:** A “New Record” badge accompanying an exceptional result, such as:

* National Record
* Personal Record

**Behavior:** Uses the SP.7 celebratory motion only upon its first appearance.

The animation **MUST NOT** replay every time the page re-renders.

**Related Governance:** SP.7.

---

## CMP-RANKINGCARD-001 — Ranking Card

**Purpose:** Displays an athlete’s or club’s ranking within a ranking system, such as the Top 10 Athletes of the Season.

**Data Shape:**

```ts
{
  rank,
  entity: AthleteRef | ClubRef,
  score
}
```

`score` is provided by an external layer and is **not calculated internally**, in accordance with ADR-0020.

**Related Governance:** SP.5, ADR-0020.

---

## CMP-PERFORMANCEINDICATOR-001 — Performance Indicator

**Purpose:** A visual indicator showing an athlete’s performance progression over time.

Example:

* A small chart/Sparkline showing improvement or decline in times across seasons.
* Direction indicator: `▲ / ▼`

**Anatomy:** Simple Sparkline + trend direction.

**Related Governance:** Chapter 8 L5 §DD.10 for historical data states.

This component also prepares for future AI Analytics integration (Chapter 16), where AI provides recommendations rather than decisions, as established in Chapter 0 Discovery.

---

# ADR-0037: Memberships / International Affiliations Component & Homepage Section Governance

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Authority**               | Product Decision (Project Owner, Chapter 22 §2)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Context**                 | The built Homepage's "memberships-section" (international affiliation logos: Olympic Council of Asia, IOC, Asian Athletics Association, World Athletics, UAE NOC) had no source-chapter component, flagged by the prior audit as an ADR-0032 gap. `01-Information-Architecture.md` §4 already anticipated this content conceptually ("International bodies... credibility signal, affiliation proof... footer affiliations strip"), but never formalized it as a component or a full Homepage section. The Project Owner has confirmed the full-section treatment (not a minor footer strip) is intentional. |
| **Decision**                | Add `CMP-AFFILIATIONS-001` to Chapter 8 L8 (Sports/Domain — these are sports-governance bodies, not generic enterprise partners, so this belongs in L8 rather than L7). The Homepage's "Memberships" section is retroactively authorized, formalized in `docs/product/02-Homepage-Specification.md` §14a. It is explicitly a **credibility/affiliation display**, distinct from `CMP-SPONSORSTRIP` content (commercial, `02-Homepage-Specification.md` §15) — the two **MUST NOT** be merged, since conflating paid sponsorship with sports-governance affiliation would misrepresent the federation's institutional standing. |
| **Alternatives Considered** | Fold it into the Sponsors & Partners section — rejected: sponsors are commercial/contractual (§15), memberships are governance/credibility (this section); merging them would blur a distinction that matters for both SEO structured-data typing (`Organization.memberOf` vs. sponsorship) and for the visitor's trust read of the page. |
| **Why This Decision**       | International-body affiliation is one of the strongest, lowest-effort credibility signals available to a national federation (Chapter 0 Design Goal #1) and deserves its own governed component rather than being treated as decoration. |
| **Risks**                   | Logo marks belong to third-party organizations. **Mitigation:** §M.9 `object-fit: contain` (no cropping/recoloring of a third party's mark, same rule already governing sponsor logos) applies here identically. |
| **Consequences**            | `TMP-HOME-001` (Chapter 20) now explicitly lists Chapter 8 L8 §CMP-AFFILIATIONS-001 in its consumes list. |

## CMP-AFFILIATIONS-001 — International Affiliations / Memberships

| Section | Details |
| --- | --- |
| **Purpose** | Display the federation's official memberships in international/regional sports-governance bodies as a credibility and legitimacy signal. |
| **Target Users** | International visitors, media/press verifying the federation's standing, international federation stakeholders (`02-Homepage-Specification.md` §3). |
| **Business Objective** | Design Goal #1 (world-class digital identity) — affiliation proof is direct evidence of "internationally credible national sports federation." |
| **User Objective** | Quickly verify which recognized bodies the federation is affiliated with, without needing to research this externally. |
| **Section Priority** | **P2** (`02-Homepage-Specification.md` §7 ladder) — credibility/engagement, not task-critical, consistent with Federation-by-the-Numbers/Featured Athletes/Media Centre. |
| **Homepage Placement** | Between Media Gallery and Newsletter, matching the as-built position — see `02-Homepage-Specification.md` §5 (revised). |
| **CTA** | None required — this is a trust/credibility display, not a conversion surface (same rationale as Sponsors §8: "not a lead-generation surface"). An optional "Learn more about our affiliations" link **MAY** route to the About the Federation static page (`TMP-STATICPAGE-001`) if such content exists; not required for compliance. |
| **Destination / Journey** | No dedicated "membership journey" exists or is required — this is a display-only credibility section, not a service entry point (consistent with `02-Homepage-Specification.md` §1 Non-goal: the Homepage is not transactional). |
| **Content Ownership** | CMS-owned (Media Team/Content Editor) — logo asset, organization name, display order. Affiliation *status itself* (is the federation actually a current member) is a factual/registry-adjacent claim and **MUST** be kept current through the same editorial review as any factual claim (Chapter 13 Author → Review → Publish, PR-010 spirit — an out-of-date affiliation claim is a credibility risk, not just stale content). |
| **CMS Relationship** | New content type required: `CT-AFFILIATION-001` (organization name, logo asset, official URL, display order) — **not yet formally defined in Chapter 13**; flagged here as a Chapter 13 backlog item per ADR-0032's own escalation rule, to be added at the next Chapter 13 review rather than improvised. |
| **Desktop Behavior** | Carousel/grid of affiliation cards, as built (5 shown, paginated dots) — logo + org name per card, one card visually emphasized/centered (as-built pattern) is acceptable as a carousel "current focus" affordance, not a ranking claim. |
| **Tablet Behavior** | *(Not yet verified against an actual Figma tablet frame — flagged as a Known Constraint, same status as CMP-LIVESTREAM-001.)* |
| **Mobile Behavior** | Single-column/horizontally-scrollable card row (implementation choice; **MUST NOT** introduce page-level horizontal scroll, PR-006). |
| **Empty / Unavailable State** | If zero affiliations are published, the section **MUST** be hidden entirely (same rule as CMP-LIVESTREAM-001's empty-shelf case) rather than rendering an empty carousel. |
| **Accessibility** | Each logo **MUST** carry descriptive `alt` text (organization name, not "logo image" — §M.7) · carousel pagination **MUST** be keyboard-operable (Chapter 8 Global Governance §G.12) · this is a static/non-auto-advancing carousel by default (no `CMP-CAROUSEL-001` auto-advance requirement applies unless explicitly implemented, in which case the full §CMP-CAROUSEL-001 pause/reduced-motion contract applies without exception). |
| **Content Governance** | Chapter 9 content rules apply to any accompanying section copy (heading/subheading) — no factual claims beyond "member of X" without source backing (PR-010 spirit extended by analogy). |
| **Relationship with Clubs, Athletes, Federation Services** | This section documents the federation's *own* upward affiliations (federation → international bodies) — it is the structural inverse of Clubs Network (federation → domestic member clubs, downward). The two **MUST NOT** be visually merged or confused; they answer different credibility questions ("who recognizes us" vs. "who do we govern"). |
| **Related Governance** | Chapter 8 Global Governance (G.1–G.12) · §M.9 Object Fit (logo integrity) · Chapter 8 L6 §CMP-CAROUSEL-001 (if auto-advance is implemented) · bilingual organization caption typography (12.5px Arabic / 10.5px English) is governed by Chapter 4 ADR-0041's Membership Caption Exception (scoped, non-generalizable sub-13px allowance) |

---

# ADR-0043: Global Sponsors Strip — Site-Wide Secondary Sponsor Component

| Field | Details |
| --- | --- |
| **Status** | Accepted |
| **Authority** | Product Decision (Project Owner, Chapter 22 §2) — resolves a direct conflict between a client requirement and the already-locked Homepage Sponsors Grid (`02-Homepage-Specification.md` §15) |
| **Context** | A client requirement ("sponsors in a continuously moving strip on every page") directly conflicted with this engagement's own locked decision that the Homepage Sponsors & Partners section is a **static grid** (VIP banner + tiered cards, no continuous motion, Homepage-only — §15, reconciled and locked earlier this engagement). Logged as a Critical Conflict in `docs/product/05-Client-Requirements-Register-2026-08.md` (item 7) pending Product Owner ruling, rather than silently resolved either direction. |
| **Decision** | **Both exist, as two distinct components with different jobs.** The Homepage Sponsors Grid is **retained unchanged** — same static, tiered, VIP-banner treatment, same section, same locked status. A **new, separate, sitewide persistent component**, `CMP-GLOBALSPONSORSTRIP-001`, is introduced: compact, continuously moving, combining sponsor logo + concise sponsor text, appearing across website pages. It is explicitly a **secondary global brand-support component** — it does not replace, duplicate, or compete with the Homepage Grid's tier badges, VIP treatment, or Partnership CTA. |
| **Alternatives Considered** | (A) Replace the Homepage Grid with the moving strip — rejected; would reverse an already-locked, evidence-based decision and lose the richer tiered/VIP treatment a grid supports, which the Product Owner did not ask for. (B) Add the strip only on non-Homepage pages — not what was decided; the Product Owner's wording keeps the Grid on the Homepage while introducing the Strip site-wide, without carving out an exception, so this ADR does not assume one (see Open Sub-Questions below). |
| **Why This Decision** | Satisfies the client's actual request (persistent, sitewide brand-support visibility for sponsors) without discarding the Homepage Grid's already-approved, more detailed treatment. Follows the same layering pattern already established for global chrome (Header/Footer/Search overlay) coexisting with page-specific rich sections. |
| **Risks** | (1) The Sponsor/Partner entity (`§52 OPEN-007` in `00-MASTER-SPECIFICATION.md` / `§8.14` in `03-Content-Data-Structuring-Document.md`) is still the single highest-priority Design System gap — **no `CT-SPONSOR-001` exists**. This decision now makes that gap block *two* components instead of one; it does not resolve it. (2) Continuous motion sitewide carries a larger accessibility surface than a single Homepage section — `prefers-reduced-motion` must be honored on every page load, not once. (3) Two sponsor displays visible simultaneously on the Homepage (Grid + Strip, if the Strip is not excluded there — see Open Sub-Questions) risks message redundancy if not visually differentiated. |
| **Consequences** | New component backlog entry: `CMP-GLOBALSPONSORSTRIP-001` (spec below). Client Requirements Register item 7 marked RESOLVED. Sponsor entity gap (OPEN-007) escalated in urgency, not closed. |

## CMP-GLOBALSPONSORSTRIP-001 — Global Sponsors Strip

| Section | Details |
| --- | --- |
| **Purpose** | Continuous, lightweight, sitewide reminder of the Federation's sponsors/partners — brand-support visibility beyond the Homepage's dedicated section. |
| **Relationship to Homepage Sponsors Grid** | Explicitly secondary and non-replacing (this ADR). The Grid remains the authoritative, detailed, tiered display (Strategic/Official/Supporting, VIP banner, Partnership CTA — §15, unchanged). This component **MUST NOT** duplicate the Grid's tier badges, VIP treatment, or CTA — it is a lighter-weight signal only. |
| **Placement** | A new, independent, persistent global element — **NOT** merged into the Header or Footer component definitions; both remain untouched. Exact position (immediately below Header vs. immediately above Footer vs. elsewhere) is **not** decided by this ADR. **DESIGN DECISION REQUIRED** before Figma. |
| **Scope — which pages** | "Across all website pages" is interpreted as the full **public website** (every public page template) — not the CMS/Admin Dashboard, consistent with ADR-0001's Public/Operational separation. **DESIGN DECISION REQUIRED:** whether "all pages" includes the Homepage itself (Grid + Strip both present) or excludes it (Strip only on non-Homepage pages) — the Product Owner's wording does not resolve this and it is not assumed here either way. |
| **Content** | Sponsor logo + "concise sponsor text." The exact text field (tagline? partnership category? name only?) is **not** specified by the decision. **DESIGN DECISION REQUIRED** before CMS/content-model work on this field. |
| **Motion** | Continuous horizontal motion ("compact, continuously moving"). Reuses the existing `CMP-CAROUSEL-001` motion contract already applied to Club Marquee and the "UAEAF in the Media" carousel: pause on hover/focus/touch, full `prefers-reduced-motion` compliance (Ch.5 §5.8) — motion **MUST** stop entirely, not merely slow, with no exception for being a "secondary" component. |
| **RTL Behavior** | Inherits an already-open, unresolved question rather than resolving it unilaterally: this engagement's existing moving-strip precedent (Club Marquee) does not have a uniformly settled continuation/fade direction in RTL. **DESIGN DECISION REQUIRED** at the Design-System level — affects Club Marquee too, not only this new component. |
| **CMS Relationship** | Depends on the Sponsor/Partner entity gap already flagged as the highest-priority Design System gap (`§52 OPEN-007` / Content-Data-Structuring `§8.14`) — no `CT-SPONSOR-001` exists. This component increases the urgency of that gap; it does not close it. |
| **Accessibility** | Full keyboard operability for any interactive element (Chapter 8 Global Governance §G.12); descriptive `alt` text per logo (organization name, §M.7); `prefers-reduced-motion` compliance is mandatory given sitewide exposure. |
| **Empty / Unavailable State** | Zero published sponsors → hidden entirely, same governing principle as `CMP-AFFILIATIONS-001`/`CMP-LIVESTREAM-001` (never render an empty persistent strip). |
| **Object Fit** | §M.9 `object-fit: contain` applies identically — sponsor logos are never cropped or recolored, same rule as the Homepage Grid. |
| **Visual Weight** | "Compact" per the Product Owner's own wording — **MUST** read as visually secondary to the Homepage Grid, not competing with it. Exact height/typography is a Figma-phase decision, not fixed here. |
| **Related Governance** | Ch.5 §5.8 (reduced motion) · Chapter 8 L6 §CMP-CAROUSEL-001 (motion contract) · §M.9 (object-fit) · §M.7 (alt text) · ADR-0001 (Public/Operational boundary) · ADR-0037 (nearest sibling — **MUST NOT** be merged with Memberships/Affiliations, same non-merger rationale: commercial/contractual vs. governance/credibility) · `00-MASTER-SPECIFICATION.md` §52 OPEN-007 / `03-Content-Data-Structuring-Document.md` §8.14 (Sponsor entity gap) |

---

# Do & Don't — L8 General

### Do

* Consume an abstract data shape (ADR-0020) for every new component.
* Explicitly display **“Directly affiliated with the Federation”** for unattached athletes (SP.8).

### Don't

* Do not calculate points or rankings inside presentation components. This is the responsibility of the data layer.
* Do not display a minor’s real photograph without recorded consent (SP.10).

---

# Success Metrics

* **100%** of L8 components explicitly document their Data Shape.
* **0** calculation logic (points/rankings) inside any presentation component (ADR-0020).
* **100%** of unattached athletes are explicitly displayed as **“Directly affiliated with the Federation”** (SP.8).
* **0** real photographs of minors displayed without recorded consent (SP.10).
* **100%** of results tables use stable Display Identity (`resultId`) rather than an array Index.

---

# References

**Normative:**

* Chapter 0 — Discovery (data model and open questions)
* Chapter 8 L1-L7 — All dependencies
* Chapter 17 — Future detailed minor-consent requirements

**Implementation:** —

**Informative:** World Athletics Digital Platform (general domain reference, not a source of rules)

---

# Related Chapters

* All L1-L7 chapters
* Chapter 10 — Will extend this level
* Chapter 17 — Data Privacy
* Chapter 12 / Chapter 20 — Actual consumption within the Dashboard and page templates

---

*End of L8 — the final level of Chapter 8 (Sports Domain Foundation SP.1-SP.12 + 12 components). **Chapter 8 — Component Inventory is now complete across all eight levels (L1-L8).** The next chapter in the document is: **Chapter 9 — Content Design System.***
