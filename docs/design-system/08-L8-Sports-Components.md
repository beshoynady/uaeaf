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

**Related Governance:** SP.4, SP.5.

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
