# Chapter 10 — Sports-Specific Scenarios & Discipline Specifications

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                              | Used By                                              |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Chapter 8 L8 (Core components — this chapter does not create a new component) · Chapter 9 (Content Terminology §CR-8.1) | Chapter 12 (Dashboard) · Chapter 20 (Page Templates) |

## Scope

**Covers:** Scenarios and edge cases specific to the nature of athletics — different result formats according to discipline type, live-results scenarios, medal ceremony presentation, and multi-discipline athlete profiles.

**Does not cover:** Any new UI component (all components are defined in Chapter 8 L8 — this chapter **MUST NOT** define a parallel component).

## Definitions

| Term                 | Definition                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Discipline Group** | Classification of a discipline according to the nature of its result measurement (time/distance/height/points) |
| **Field Event**      | An event measured by distance or height (jumps, throws), as opposed to running events measured by time         |

## Purpose

Chapter 8 L8 defined **the components**; this chapter defines **how those components behave in actual athletics scenarios** — no new component is introduced, only configuration and scenarios for existing components.

---

## 10.1 Discipline Groups & Result Format Mapping

Every event (Chapter 8 L8 §SP.2) **MUST** be classified into a group that determines the display format of `Result.value/unit` (Chapter 8 L8 §ADR-0020):

| Discipline Group       | Examples                 | Value Format                                              | Better-Result Direction |
| ---------------------- | ------------------------ | --------------------------------------------------------- | ----------------------- |
| **Track (Time-based)** | 100m, 400m, 1500m        | `00:12.45` (Chapter 9 §CR-1.10)                           | Lower time wins         |
| **Field — Distance**   | Long Jump, Javelin Throw | `6.20 m`                                                  | Greater distance wins   |
| **Field — Height**     | High Jump, Pole Vault    | `2.15 m`                                                  | Greater height wins     |
| **Combined Events**    | Heptathlon, Decathlon    | Total points (`Score`, Chapter 8 L8 §CMP-RANKINGCARD-001) | Higher score wins       |
| **Race Walking**       | 20km Race Walk           | `01:32:45` (hours:minutes:seconds)                        | Lower time wins         |

**Rule (MUST):** Chapter 8 L8 §CMP-RESULTSTABLE-001 **MUST** consume a `sortDirection` derived from the Discipline Group (ascending for time, descending for distance/points) — there **MUST NOT** be one fixed sorting direction for all tables.

---

## 10.2 Live Scoring Scenario

During an actively running competition, Chapter 8 L8 §CMP-EVENTSCHEDULE-001 and CMP-RESULTSTABLE-001 work together according to Chapter 8 L5 §DD.10 (Live-Updating):

```text
Event: Upcoming → In Progress → Results Pending Verification (Chapter 8 L8 §SP.6) → Results Verified/Official
```

**MUST** clearly distinguish visually between an **"Unofficial"** result (live and potentially subject to change) and an **"Official/Verified"** result (after Chapter 8 L7 §EC.7 Approval Workflow) — they **MUST NOT** have the same visual weight.

---

## 10.3 Medal Ceremony Display

When an event is completed and the three medals have been determined: Chapter 8 L8 §CMP-MEDALBADGE-001 **SHOULD** be presented in a grouped celebratory display (a miniature podium: Gold in the center, Silver on the right, Bronze on the left, or the standard visual ordering) rather than a simple text list — it consumes the reserved `DT-MOTION-EASING-SPRING` motion (Chapter 8 L8 §SP.7) once on its first appearance.

---

## 10.4 Multi-Discipline Athlete Profile

An athlete who competes in more than one discipline (Chapter 0 Discovery — open question: "Can an athlete compete in more than one discipline?"): Chapter 8 L8 §CMP-ATHLETECARD-001 and the full athlete profile (Chapter 20 later) **MUST** support displaying results categorized separately by Discipline Group (§10.1) — mixed-unit results **MUST NOT** be presented in an unclassified list or table (e.g., time and distance in the same table without distinction, which would make comparison confusing).

---

## 10.5 Team/Relay Result Edge Case

Relay results are **team-based** (club/team) rather than purely individual:

`Result.athlete` (Chapter 8 L8 §CMP-RESULTSTABLE-001) **MAY** be replaced with:

`Result.team: AthleteRef[]`

for this specific case — the exception **MUST** be explicitly documented wherever it is consumed, rather than silently breaking the standard shape.

---

## 10.6 Disqualification & Non-Result States

A result may not be a valid numerical value:

* `DNS` — Did Not Start
* `DNF` — Did Not Finish
* `DQ` — Disqualified

Chapter 8 L8 §CMP-RESULTSTABLE-001 **MUST** display these states as clear textual alternatives (Chapter 9 §CR-2.8 Null Policy applied here with specific sports terminology), rather than an empty numerical value or a misleading zero.

---

## 10.7 Attempt-Based Events

Throwing and jumping events (§10.1 Field Events) do **not** produce one final numerical result directly; instead, they consist of a sequence of attempts:

```text
Attempt 1 → Attempt 2 → Attempt 3 → (Final Attempts for qualifiers only) → Best Attempt
```

### Mandatory Rules

* An individual attempt **MUST NOT** be treated as an independent `Result` record (§10.1) — it is a sub-item within the athlete's single result.
* **MUST** only `Best Attempt` feed the ranking (Chapter 8 L8 §CMP-RANKINGCARD-001) and the primary Results Table.
* **MUST** keep all attempts available for viewing (details on expansion/click — Chapter 8 L4 §CMP-ACCORDION-001 is a suitable example); attempts **MUST NOT** be hidden after the best result has been determined.
* Unsuccessful-attempt symbols **MUST NOT** be treated as Null (§10.6). They are valid attempt values in their own right:

  * `X` — Foul/Failed Attempt
  * `Pass` — Voluntary Pass
  * `NM` — No Mark

---

## 10.8 Wind Reading (Display Rule, Not Calculation)

For certain events (sprints, long jump/triple jump), wind reading is an integral part of result presentation, not optional additional data:

* **MUST** Chapter 8 L8 §CMP-RESULTSTABLE-001 display the wind reading alongside the result when applicable (`10.21 (+3.1)`) — fixed format: the value appears in parentheses immediately after the result.
* Chapter 8 L8 §CMP-RECORDBADGE-001 **MUST NOT** appear if the wind reading exceeds the legally permitted limit — **this chapter does not calculate the legal limit itself** (a business/sporting decision outside the design scope). It only documents that the Record Badge **MUST** respect a valid/invalid flag provided by the data (consistent with ADR-0020: presentation consumes a prepared decision; it does not calculate it).

---

## 10.9 Tie Handling

When two or more athletes achieve exactly the same result (e.g., two jumps at 2.20m), they **MUST NOT** be displayed using ordinary sequential numbering (1, 2, 3):

```text
Rank 1 — Athlete A — 2.20
Rank 1 — Athlete B — 2.20
Rank 3 — Athlete C — 2.15   ← skips Rank 2 (Standard Competition Ranking)
```

Both Chapter 8 L8 §CMP-RESULTSTABLE-001 and CMP-RANKINGCARD-001 **MUST** support a repeated `rank` value across multiple rows, with the next rank automatically skipped in the display.

A subtle visual indication **MUST** communicate that a tie exists when applicable (not color alone, Chapter 6 §6.2).

---

## 10.10 Record Category (Expansion of the Generic "Record")

Instead of a simple binary classification (National/Personal only, Chapter 8 L8 §SP.7), `Record.category` **MUST** be extensible from the following list, even if not all categories are used in the first release:

```text
Personal Best · Season Best · Meeting Record · Championship Record · National Record
```

Chapter 8 L8 §CMP-RECORDBADGE-001 **MUST** consume `category` as a Prop rather than having two fixed types hardcoded into the component logic.

Adding a new category in the future **MUST NOT** require modifying the component code; it should only require extending the permitted values in the data layer. This follows the same spirit as Chapter 3 §Token Lifecycle, applied here to classifications rather than visual tokens.

---

# Do & Don't

**Do:** Classify every new event into a Discipline Group (§10.1) before displaying its results · Always visually distinguish unofficial results from verified/official results.

**Don't:** Do not display DNS/DNF/DQ as an empty field or zero · Do not mix different measurement units in the same table column without classification.

---

# Success Metrics

* 100% of events are explicitly classified into a Discipline Group.
* 0 DNS/DNF/DQ results are displayed as misleading numerical values.
* 100% of unofficial results are visually distinguished from verified/official results.
* 100% of throwing/jumping events display all attempts, not only the best result (§10.7).
* 0 Record Badges appear with an invalid wind reading (§10.8).
* 100% of ties use **Standard Competition Ranking** rather than sequential ranking (§10.9).

---

# References

**Normative:** Chapter 8 L8 · Chapter 9 §CR-8.1

**Informative:** World Athletics Competition Rules (general domain reference for event classification, not a source of design rules)

## Related Chapters

Chapter 8 L8 (complete foundation) · Chapter 9 (Terminology) · Chapter 12/20 (Actual consumption)

---

*End of Chapter 10 (§10.1–§10.10). Next chapter: Chapter 11 — UX Patterns.*
