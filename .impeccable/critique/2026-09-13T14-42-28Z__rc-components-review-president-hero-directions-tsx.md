---
target: President hero direction C
total_score: 16
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 2
timestamp: 2026-09-13T14-42-28Z
slug: rc-components-review-president-hero-directions-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

# Critique: President's Message portrait hero, direction C (photo ground under scrim)

Target: `apps/web/src/components/review/president-hero-directions.tsx` (direction `c`), route `/[locale]/review/president-hero/c`.

## Design Health Score (Assessment A, before fixes)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Current crumb differs from the unlinked parent only by weight and 15% opacity |
| 2 | Match system / real world | 2 | Stand-in ground shows a combat-sport podium on an athletics page |
| 3 | User control and freedom | 3 | Breadcrumb home link and header offer exits |
| 4 | Consistency and standards | 3 | Shared scrim/media constants used; honorific differs AR vs EN |
| 5 | Error prevention | n/a | No input or destructive action |
| 6 | Recognition rather than recall | 3 | Location shown, labels visible |
| 7 | Flexibility and efficiency | n/a | Read-only content hero |
| 8 | Aesthetic and minimalist design | 2 | Flag ring, podium, floating motif and a sparkle mark compete |
| 9 | Error recovery | n/a | No error states |
| 10 | Help and documentation | n/a | Nothing to explain |
| **Total** | | **16/24 (67%)** | **Acceptable** |

## Design specificity verdict
LLM: a dark photo, black scrim, bottom-left headline and a cut-out executive on the right is category-interchangeable; the stand-in ground is the wrong sport and the green register disappears in C.
Detector (CLI): 0 findings on the component, the route and `breadcrumb.tsx`. Browser overlay: 5 patterns — 3 low-contrast false positives (the detector read the body colour; the real ground is photo + `HERO_SCRIM`, worst case 6.69:1 white / 5.41:1 at 85%), 2 line-length findings on review-only elements (the preview band, the review bar).

## Priority issues and what happened to each
- [P1] Stand-in ground is the wrong sport and wins the hierarchy — OPEN (content): C needs an athletics background uploaded to the record; the page renders the green register (direction B) while none exists.
- [P1] Cut-out on a photo reads as a photomontage; the portrait file carries a four-point sparkle mark near the desk corner — OPEN (asset): the mark is in the source PNG and the published Cloudinary copy is pixel-identical (0 differing bytes). Needs a clean original from the federation.
- [P2] Arabic role line repeats "كلمة"; English drops the honorific — OPEN (content, CMS).
- [P2] Mobile gap of 157px between title and portrait — FIXED: title `mt-auto`, portrait wrapper sized to the picture; measured gap 32px at 390x844.
- [P2] Motif floating ~200px above the head — FIXED: wrapper takes the picture's own size; motif top/right equal the portrait's corner at 1440x900, 390x844, 720x450, 844x390.

## Additional defects found and fixed while verifying
- Breadcrumb parents over a photograph: black-register muted #BDBCB6 measured 3.51:1 at the scrim's lightest point — FIXED with `overPhoto` (85% of the ground's text: 5.41:1). Latent in `PageHero` with a hero image: FOLLOW-UP.
- Landscape phone 844x390: a fixed-height hero drew the portrait at 30x31px; a 128px floor then cropped the desk by 97px — FIXED: back to `HERO_VIEWPORT` minimum; portrait capped at screen minus header below `lg` (284x294 there), screen minus two header heights at `lg`. The hero grows 263px past the fold on that screen only.
- Portrait fetch priority restored in C (`fetchPriority="high"`, 24KB WebP).

## Persona red flags
- Jordan: stadium + podium reads as a championship page — content.
- Sam: portrait alt "محمد المر" in both languages duplicates the adjacent name, and the English alt is Arabic — content; focus ring token on the scrim relies on its white offset — verify in the later hero batch.
- Casey: landscape collapse — fixed as above.

## Minor observations
- Dark theme: header and scrimmed photo meet at a 1px rule.
- Arabic title block hugs the portrait; English leaves ~312px between name and portrait — owner to approve both.
- The desk-on-the-threshold edge sits on the fold at load.

## Questions
1. If there is no athletics ground photograph, what is C for — or does the page live as B until one is uploaded?
2. Can the federation supply the portrait's original file, without the mark?
