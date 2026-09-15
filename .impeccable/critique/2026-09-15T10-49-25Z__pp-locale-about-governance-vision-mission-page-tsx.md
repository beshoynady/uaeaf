---
target: Vision & Mission page, final state of the closing batch
total_score: 22
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 1
timestamp: 2026-09-15T10-49-25Z
slug: pp-locale-about-governance-vision-mission-page-tsx
---
Method: dual-agent (A: design review in the browser, both languages, 1440 and 390, light/dark/high contrast · B: detector CLI with a canary, detector injected in the browser at ar 1440, en 390, ar 390 and ar 1440 dark, measured)

## Design Health Score (22/28, 79%, Good)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | no visible location on the page (no trail by owner decision, ADR-0072 D7) |
| 2 | Match system / real world | 3 | "Excellence" and "Transparency" recur across the mission, the goals and the values: a goal and a value cannot be told apart by wording |
| 3 | User control and freedom | 4 | — |
| 4 | Consistency and standards | 3 | small drift: 01 near-black and 02 teal in light; the English ordinals 38px apart; the two buttons 49 and 51px tall |
| 5 | Error prevention | 3 | the primary call leads to a page "in preparation" without saying so |
| 6 | Recognition rather than recall | 3 | the goals have no anchors although the plan cites them by number; no index across 12 stacked cards on a phone |
| 7 | Flexibility and efficiency | n/a | a reading page with no repeated tasks |
| 8 | Aesthetic and minimalist design | 3 | decoration outranks content at the top: 128px ordinals are 3.2× the 40px h1; eight stroke sets |
| 9 | Error recovery | n/a | no input or error states |
| 10 | Help and documentation | n/a | a content page |

Not like-for-like with the earlier run (18/28, n/a 5, 9, 10): this run scores 5 and marks 7 n/a.

## Design specificity
Authored at the top and bottom (logo-angle slanted photographs mirrored with the language, ordinals on one centre line, logo-derived strokes, the green band, Arabic composed, goals reading right to left); category-interchangeable in the middle: two six-card pastel grids with line icons, 37% of the page at 1440. Detector: CLI 0 findings on 8 files, canary proved .tsx is scanned (3 findings on it). Browser 16 / 15 / 15 / 31 (ar 1440 light, en 390, ar 390, ar 1440 dark), all false positives or heuristic hits on approved values: clipped-overflow on the hero parallax layer; low-contrast on the hero h1 and subtitle read against the body ground, not the photograph and scrim (worst case with a white photograph 8.12:1); gray-on-color on the approved card pairings (5.67–6.90:1 light, 6.81:1 dark); tight-leading on the h2-size mission title paragraph; ai-color-palette on the approved item-2 ink in dark (7.21 / 10.57:1).

## Priority issues
1. [P1] The primary call leads to a placeholder: "استكشف الخطة الاستراتيجية" opens "هذه الصفحة قيد الإعداد". Fix: make About the primary until the plan is public, or keep the link and say it. DESIGN DECISION REQUIRED (CTA order and copy). Command: /impeccable clarify.
2. [P2] Goals and values read as one set; in high contrast the green band is white and nothing separates them. Fix: an edge on the band in high contrast only, or seam lines on the values in high contrast only; start the values at colour 3 or set them as a typographic list. Owner decision (ADR-0074 D2, D8). Command: /impeccable layout.
3. [P2] The hero title is outranked: 541px hero with ~90px of text; 128px ordinals against a 40px h1. Fix: a display size for the h1 in the content-height hero, or display-xl ordinals; smaller stroke reserves at xl. Owner decision (guide §6). Command: /impeccable typeset.
4. [P2] Photographs upscaled: slanted photos at 1440 get ~604–640w for a 568×407 cover box needing ~931px (1.18–1.54× at DPR 1); the hero at 390 ~1.4×. Fix: a Cloudinary crop at the box ratio, or sizes that include the crop. FOLLOW-UP (ADR-0073), outside this batch. Command: /impeccable optimize.
5. [P3] Stroke sets gather on one edge: 8 sets, 6 of them the red/green pair, 5 on the Arabic page's left half; the seam set reads as an underline to the mission paragraph; hero and vision sets meet at one corner in English. Fix: drop the call's photo strokes, or draw photo strokes at normal length. Visual Identity Density principle (guide §٨). Command: /impeccable quieter.

## Persona red flags
Jordan: two numbering systems drawn alike (01/02 statements, 01–06 goals); "التميز" as a value and inside a goal on identical cards; the primary button ends at "in preparation". Sam: good structure (skip link, h1→h2→h3, visible focus); in high contrast 12 outlined cards run on with only "قيمنا" between them. Casey: 5,989 / 6,182px pages, goals and values 2,411px on a phone; photographs become 171px strips; the buttons are followed by a decorative photo strip.

## Minor
Dark: the mission band is pure black between #131210 bands. Card titles 20px/500 under 56px numbers. Mission title clause repeated in its body (content). Goals subtitle restates its heading; English subtitle in Title Case. Hero subtitle names only the vision. The vision aerial is pitch-dominated (placeholder under the rule 2 suspension). Dev "N" badge in captures.

## Questions
What do 128px ordinals say in a set of two that "الرؤية" and "الرسالة" do not? What would a section look like that could only be values? Should the page end pointing at a plan that does not exist yet?
