---
target: President hero identity lines + entrance scenario (review route b)
total_score: 15
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 2
timestamp: 2026-09-13T17-22-19Z
slug: rc-components-review-president-hero-directions-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector/browser sub-agent), run sequentially because both needed the single shared Playwright browser.

Target: identity-lines distribution + cinematic entrance for the President's Message hero (review route /ar|en/review/president-hero/b), plus the written body/values scenario.

## Design Health Score (applicable max 24; 5, 7, 9, 10 n/a — read-only hero, no input, no tasks, no help surface)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Breadcrumb current item clear |
| 2 | Match system / real world | 2 | AR subtitle repeats H1; AR/EN honorifics differ (content) |
| 3 | User control and freedom | 3 | Motion < 1s; reduced motion honoured |
| 4 | Consistency and standards | 2 | AR title hugs portrait, EN floats ~220px away; no-portrait RTL grid puts title in right half |
| 6 | Recognition rather than recall | 3 | Face, name, role together |
| 8 | Aesthetic and minimalist design | 2 | 525px empty field between trail and H1 at 1440×900; group A floats in it |
| **Total** | | **15/24** | Acceptable (62%) |

## Design Specificity Verdict
LLM: identity lines are UAEAF-specific (logo order, ratios, 45°, footer ribbons); without them the hero is category-generic. Body scroll reveals and staggered cards were template choreography.
Deterministic scan: CLI 0 findings (component folder, route page). Browser injection on 5 views: 3 line-length on review-only scaffolding (ReviewBar, WhatFollows) and 3 low-contrast in direction C that read the page background instead of the scrim (worst case ≥6.7:1) — all false positives. Identity-line SVGs never flagged.

## Priority Issues
- [P1] Lines were a late second beat (300–960ms, corners 1300px apart, left→right sweep on an Arabic-first page). FIXED in prototype: groups start together, reading-order stagger, slow 320 / base 220, done by 680 / 580ms.
- [P1] Body/values scenario contradicted its limits (paragraph 45° slide moved the reading edge; ambient not yet a token; icon opacity 0; AR wave against the ascent; one band trigger on stacked mobile cards; 60ms icon→text lead imperceptible). FIXED in scenario: paragraphs static, body rises vertical only, icons transform-only, trigger per visual row, 120ms lead, ambient added before use per ADR-0069 D9.
- [P2] Composition void above the title and H1/name weight inversion (AR name line 604px vs H1 268px). OPEN — type roles are §7.4-approved; owner decision.
- [P2] Group B costly on phones: portrait 343→249px and pushed to the physical left by B's reserve. OPEN — owner decision (decision 5 forbids dropping lines below lg).
- [P2] Content/a11y: EN alt text in Arabic and duplicating the adjacent name; AR/EN subtitle and honorific mismatch. OPEN — client content list.

Also fixed: portrait rise 14% (71px, "lift") → 16px settle. Recorded for D2: no-portrait RTL grid defect.

## Persona Red Flags
Sam: EN alt is Arabic. Reduced motion, focus ring, 200% zoom pass.
Casey: last motion lands exactly at the fold on 390×844; long AR H1 wraps 5 lines tightly.
Jordan: full-screen hero with nothing signalling a message below; B cropped at the fold reads as clipped art.

## Minor Observations
Perceived order inside A was green→red regardless of logo order (now reading order). Header nav rise (protected) runs concurrently, 17 animations total. On slow networks CSS starts before the portrait decodes. At 1024 title column 323px (long EN title 8 lines). Black stroke weakest on #005226 next to the dark desk. Direction C stand-in photo's LED flag shares the palette; red stroke lost in it at 390px.

## Questions to Consider
Would a lattice present at first paint be more institutional than an entrance? Does group B serve the hero or only the footer echo? On an Arabic-first page, why did the only sweep travel left to right (now resolved by reading-order stagger)?
