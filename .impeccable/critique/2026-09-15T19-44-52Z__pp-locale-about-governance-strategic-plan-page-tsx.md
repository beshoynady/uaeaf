---
target: Strategic Plan public page
total_score: 16
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 2
timestamp: 2026-09-15T19-44-52Z
slug: pp-locale-about-governance-strategic-plan-page-tsx
---
Method: dual-agent (A: design review from captures and source · B: detector CLI + in-page injection)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | "We measure progress" shows no progress; phases have no dates or current-phase marker |
| 2 | Match System / Real World | 2 | "2030" is a horizon counted as a KPI; the path is a generic logic model |
| 3 | User Control and Freedom | 3 | No traps; eyebrow in place of a breadcrumb (owner decision) |
| 4 | Consistency and Standards | 3 | Strong system; h3 sizes vary; position inks repeat across unrelated lists |
| 5 | Error Prevention | 2 | Client-created edge cases: step count uncapped, hiding renumbers (phases wrap and "1.5M" fixed in this run) |
| 6 | Recognition Rather Than Recall | 2 | Four lists restart at 01; pillar→objective link held in memory |
| 7 | Flexibility and Efficiency | n/a | Read surface |
| 8 | Aesthetic and Minimalist Design | 2 | Motif fatigue: four photo splits, ~10 stroke sets, Display L ordinals as loud as figures |
| 9 | Error Recovery | n/a | Reader cannot trigger errors |
| 10 | Help and Documentation | n/a | Static read page |
| **Total** | | **16/28** | **Acceptable (57%)** |

## Design Specificity Verdict
Half-authored: the Arabic-first build, the ascending path in the reading direction and the real Zayed Sports City photograph belong to this federation; the copy structure, the repeated text-beside-slanted-photo split and a pine-forest track photograph could belong to any federation. Detector: source clean (exit 0); in page 12/12/10 findings, all false positives on measurement (parallax clip, scrim not seen as backdrop, pillar descriptions 5.67–6.90:1, step chip read as heading rhythm).

## Priority Issues
- [P1] The lists do not connect (no parent pillar on objectives; position inks imply false pairs). Fix: parent-pillar field or pillar-identity colour — schema/owner. Command: clarify
- [P1] The indicators measure nothing (2030 horizon counted; +30%/+25% without baseline/target year; period absent above the fold). Fix: period in hero; baseline→target by year. Command: clarify
- [P2] Structural sameness and motif fatigue (four splits, ~10 stroke sets, Display L ordinals). Fix: reserve Display L for figures; break the split in metrics; UAE photograph. Command: distill
- [P2] Content edge cases (fixed: phases wrap, "1.5M"; open: step/phase cap, renumbering on hide). Command: harden
- [P2] The execution band is the lowest-information section (five words). Fix: step descriptions from the client, or fold into objectives. Command: layout

## Persona Red Flags
- Jordan: no plan period in the hero; no current phase; no plan document; both CTAs leave the page.
- Sam: five lists with no stated relation; phases h2 hidden from site messages while others are stored.
- Casey: 7,286px at 390; six pillar cards ~1,170px; CTAs ~6,300px down.
- Riley: 7 steps at 768 (~80px columns); hidden objective renumbers; 7 pillars leave an orphan card at xl.

## Minor Observations
Dev badge over the overview photo in captures; header nav differs between captures (check live); `sizes` derived from 1440 section heights; CTA h2 alone has no accent rule; objective rows mark position three ways.

## Questions to Consider
- After reading, can a visitor say which objective serves which pillar, or when the plan started?
- Which single number should a visitor remember, and why is "01" as loud as "+30%"?
- With the documents section removed, is this page the plan or an advert for it?
