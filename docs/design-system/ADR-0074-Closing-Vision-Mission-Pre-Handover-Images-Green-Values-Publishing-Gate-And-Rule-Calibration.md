# ADR-0074 — Closing Vision & Mission: Pre-Handover Images, the Values on the Green Register, Rule 6 as a Publishing Gate, and the Rules Calibrated

**Status:** Accepted and built, except group B's short stroke (D3, presented).
**Date:** 2026-09-15
**Authority:**
- The owner's closing brief «إغلاق دفعة الرؤية والرسالة ومعايرة قواعد البناء» (M1–M10).
- Two owner corrections sent during the batch: M2's colour block, and the image policy for this batch.
- The owner's answers to the two questions those corrections raised (D1, D2).

**Amends:**
- ADR-0073 D1: the vision shows a photograph again.
- ADR-0073 D5: the values stand on the green register.
- ADR-0073 D6: rule 6 is accepted as a publishing gate.
- ADR-0073 D8: the stroke-set cap is recorded as a review principle.
- ADR-0073 *Remaining*: the label gap and `contact-hero`'s text are resolved.
- ADR-0072 D1: the item edge in dark (D2, recorded before the tokens changed).
- ADR-0072 D5: Vision & Mission's values and call to action.
- `page-building-guide.md` §2, §5, §6 and §8.

**Does not amend:** any contrast floor · the header, the footer and the shared layout · any schema or backend code · Figma (D11 lists the back-sync) · the President's Message and the board page, except the signature date's size (D4) and the portrait's English alternative text (D5).

**Companion:** `docs/engineering/page-building-guide.md` §٨, and `docs/engineering/how-green-values-work.md` (D2, in Arabic).

---

## D1 — The pictures before handover

**What happened, in order.**
1. The brief's M1 removed the vision's football stadium. The statement became one centred column, and its ordinal was proposed as its identity element. Published on the local database as revision `6aa8ff997dc36907e43d221e`, 08:19:37Z.
2. The owner's image-policy correction cancelled that. Every image slot in the design shows an image, with no empty slot and no placeholder, and the selection order is:
   1. a library asset with athletics evidence, even with a different crop;
   2. a topically suitable library asset;
   3. an external photograph under a documented commercial licence, uploaded from the dashboard.
3. The ordinal's counting as an identity element (a rule 1 evolution) was withdrawn with it, and never reached the guide's final text.

**Finding: the library is AI-generated.** Before choosing, each asset's stored original was downloaded and its metadata read.
- Seven of the eight carry a C2PA manifest (PNG chunk `caBX`) signed by "Google C2PA Media Services".
- Their XMP declares `Iptc4xmpExt:DigitalSourceFileType = http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia`, the IPTC term for media created by a trained model.
- This is known now, not discovered later.

| Asset | Size | Content credentials | Generated |
| --- | --- | --- | --- |
| `vision-mission-values` (the hero) | 1344×768 | C2PA, Google, trainedAlgorithmicMedia | **yes** |
| `vision-mission-mission` | 1536×672 | same | **yes** |
| `vision-mission-cta` | 1536×672 | same | **yes** |
| `vision-mission-hero` (football, unused) | 1536×672 | same | **yes** |
| `vision-mission-vision` (football, unused) | 1536×672 | same | **yes** |
| `contact-hero` | 1536×672 | same | **yes** |
| `contact-map` | 1248×832 | same; its place names are also garbled text | **yes** |
| `image-5ac5e6c8` (the President's portrait) | 491×508 | none | no evidence |

**Owner decision (answer 1, option 3).**
- The existing assets stay on show under a temporary suspension of rule 2 in ADR-0073, reviewed on 2026-10-02.
- The brief's "no generated pictures" item is withdrawn for the existing assets only. **No new generated picture is added.**
- The federation's real photographs are an urgent item in the client list, with the reason stated.
- Rule 6 stands without exception: every alternative text describes the picture actually shown.

**The vision's slot.** The first tier holds one athletics asset not already on this page: `contact-hero`.
- **Athletics evidence:** the red running track around the pitch, visible in the aerial view.
- **Alternatives rejected:**
  - The football stadium: a first-tier asset exists.
  - `vision-mission-cta` or `-mission`: the same picture twice on one page.
  - A licensed external photograph: not chosen by the owner.
- Placed through the dashboard, which is also the replacement test (D10).

## D2 — The values on the green register, the call to action on the page's ground

**The ledger (built, then withdrawn).** M2 asked for the values as ruled rows. It was built test-first, then withdrawn by the owner's correction: "the cards' shape does not change; only the section's background". The component, its tests and its explainer were removed.

**The palette colour block (measured, not built).** Each of the four item surfaces was applied to the values section in the browser, as built otherwise, at 1440 in Arabic, in the three themes. Six values, tones 1 2 3 4 1 2.

| Block | Light: heading / accent rule / card boundaries | Dark: heading / accent rule / card boundaries |
| --- | --- | --- |
| item-1 | 14.51 / 3.32 / **1.00** ×2, 1.10 | 12.40 / 3.31 / **1.00** ×2, 1.11–1.39 |
| item-2 | 14.55 / 3.33 / **1.00** ×2, 1.10 | 13.70 / 3.66 / **1.00** ×2, 1.11–1.26 |
| item-3 | 13.18 / 3.02 / **1.00**, 1.10–1.22 | 17.25 / 4.61 / **1.00**, 1.09–1.39 |
| item-4 | 16.02 / 3.67 / **1.00**, 1.10–1.22 | 15.82 / 4.23 / **1.00**, 1.09–1.28 |

- **Every palette colour matches at least one card.** Positions cycle through the four colours, so that card's boundary against the block is 1:1. The capture shows the card as text standing on the block.
- **In high contrast every item surface is `#FFFFFF`, as the page grounds are.** The block does not mark the seam there.
- **Card text and icons are unchanged:** at least 5.67 and 5.85 in light, 6.81 and 5.09 in dark.

A card variant was therefore required: the correction's stop point. Four options were presented:
- the green register;
- a palette colour with the cards skipping it;
- a card variant;
- seam lines alone.

**Owner decision (answer 2, option 1).**
- **The layout:** the values on the green register, the President's Message's measured composition. The call to action moves to the page's neutral ground with its photograph.
- **The condition:** item card boundaries reach 3:1 in dark. They are fixed by the dark edge token, not by a new card variant, and the ADR-0072 amendment is recorded before the change (below).

**The composition, as the President's Message sets it** (ValuesBand `register="green"`, StrategyCta `register="neutral"`):
- **Rule 1.** The values: the green register. The call: its photograph.
- **Rule 3.** Registers differ at both seams: goals (base) → values (green) → call (base).
- **Rule 5.** Cards → band → a statement with a photograph.
- **The grid is unchanged:**

| Values | 1440 | 768 | 390 |
| --- | --- | --- | --- |
| 6 (Vision & Mission, measured) | 3 + 3 | 2 + 2 + 2 | one column |
| 5 (the President's Message, the same component, measured) | 5 in one row | 2 + 2 + one card across the row | one column |

A sixth value leaves no card alone: five stand in one row from `xl` and the last spans its row at `md`. **The owner's brief counts five values; the local record already holds six** (Excellence, Teamwork, Integrity, Innovation, Sustainability, Transparency).

**Measured precedent (the President's Message, as built, green register).**

| Theme | Heading | Card boundaries |
| --- | --- | --- |
| Light | 9.40 | 5.90–7.17 |
| Dark | 9.40 | **1.38–1.92** |
| High contrast | 21 | 1.00 against white, with a black edge at 21 |

### Amendment to ADR-0072 D1 — the item edge in dark (recorded before the change)

| | Text |
| --- | --- |
| **Old** | "Light and dark draw no edge (the card's own ground), high contrast draws it black." Dark `--color-item-N-edge` = the item's surface step (`green.800`, `teal.800`, `steel-blue.900`, `desert-sand.900`). |
| **New** | Light draws no edge. Dark draws the edge in each ramp's **200** step: `green.200`, `teal.200`, `steel-blue.200`, `desert-sand.200`. High contrast is unchanged: black. |
| **Why** | The owner's condition on option 1: card boundaries at least 3:1 in dark on the green register, measured at 1.38–1.92 as built. The 200 step is the one step that clears 3:1 against the green register for all four ramps. Computed from the token hex values: 4.72, 4.72, 3.96 and 5.69 on `#005226`; 7.9 or more on the dark base `#131210`. Steel-blue's ink step, `.300`, computes 2.66 there. |
| **Scope** | Every item card in dark: the goals and values on Vision & Mission, and the values on the President's Message. The pairing record for `--color-item-N-edge` keeps its 3:1 floor and its light-theme exemption, and now names the test that holds dark. |

**Built** (`colors.dark.json`, `pairings.json`, `npm run build`):
- **The guard went red first.** A new test in `token-lists-contract.spec.ts` failed on all 12 pairs (the four dark edges against base, sunken and the green register), then passed.

**Measured after the change, in the browser, 1440, Arabic: edge against its section's ground.**

| Section | Light | Dark | High contrast |
| --- | --- | --- | --- |
| Vision & Mission, values (green register) | 5.90–7.17 (no edge; the card's ground) | **3.96–5.69** (was 1.38–1.92) | 21 |
| Vision & Mission, goals (base) | 1.25–1.52 (unchanged) | **7.90–11.35** (was 1.04–1.45) | 21 |
| The President's Message, values (green register) | 5.90–7.17 | **3.96–5.69** | 21 |

**Unchanged:**
- Card text on its own ground: 5.67 or more in light, 5.09 or more in dark (the goals' numbers), 21 in high contrast.
- Headings: 9.40 on green, 17.91 or more on the page grounds.

## D3 — Group B's short stroke (M3): diagnosed and presented, not built

Measured on the three seams at 390, captured at 3×.

| Stroke | Length | Thickness | Contrast, light / dark / high contrast |
| --- | --- | --- | --- |
| A red (Arabic) | 48.2px | 1.83px | 5.63–5.35 / 3.18–3.57 / 5.88 |
| A green (Arabic) | 96.0px | 4.21px | 4.60–4.37 / 3.89–4.37 / 4.81 |
| B black (English) | 66.2px | 2.48px | 20.09–19.09 / 17.91–20.09 (drawn light) / 21 |
| **B red (English)** | **27.7px** | **1.08px** | 5.63–5.35 / **3.18**–3.57 / 5.88 |

**Diagnosis: the short red stroke alone, not the group.**
- At the light weight (a third of the ribbon's thickness for its length), B's red is the page's only stroke under 2px thick. Anti-aliased, it reads as a sliver, faintest in dark at 3.18:1.
- B's black stroke is 2.48px and holds.
- The group's structure is the logo's order and spacing (IL-2), unchanged.

**Options (comparison: `scratchpad/b2/m3-group-b-comparison.png`, 390 in both languages):**

| Option | English | Arabic | Cost |
| --- | --- | --- | --- |
| **(a) A minimum length: B's red at A's red length (40.8 units)** | the red becomes 48px long and about 1.9px thick | unchanged (group A) | a change to the logo-derived proportions of B only; keeps the A/B mirror |
| (b) Group B in both languages | unchanged: the sliver stays | group B at the frame's left: the sliver appears in Arabic too | an IL-3 evolution; removes Arabic's echo of the photographs' red and green, spreads the defect |

**Recommendation: (a).** It fixes the measured defect where it is. (b) does not fix it in either language.

## D4 — No text under 13px (M4)

Chapter 4 §4.10: no text under 13px. `text-label` and `text-caption` are 12px on a phone (§4.4). The owner's decision: fix the usage, never lower the minimum.

**Changed.**
- The statements' names: `text-label` → `text-body-sm`.
- The President's signature date: `text-caption` → `text-body-sm`. 13px on a phone, 14px from `md`.

**Measured after** (every visible text run, 390 and 1440, both languages):
- `<main>` on Vision & Mission, the President's Message and the board page: **0** runs under 13px.
- The shared header and footer at 390: 37 runs at 12px (`text-caption`, `text-label`, the language toggle). Protected: OUT OF SCOPE, reported. The contact page's cards also use `text-label`: outside the three pages.

## D5 — Rule 6 as a publishing gate (M5)

**The eight assets, each opened and looked at.** Six texts matched their pictures. Two were corrected on the local database. The media API has no update route, so the write was direct, filtered on the text read before it.

| Asset | Was | Now |
| --- | --- | --- |
| `contact-hero` | «عدّاؤون على مضمار مدينة زايد الرياضية عند الغروب» / "Runners on the track at Zayed Sports City at dusk". The aerial view shows no runners | «منظر جوي لمدينة زايد الرياضية عند الغروب، وملعبها يحيط به مضمار أحمر» / "Aerial view of Zayed Sports City at dusk, its stadium ringed by a red running track" |
| `image-5ac5e6c8` (portrait) | English field «محمد المر», in Arabic | "Dr. Muhammad Abdullah Al-Murr", the name the record gives in `signatoryName.en` |

**The gate** (guide §٨, rule 6):
- **What is read:** the text names what is seen; nothing in it is absent from the picture; each field is in its language.
- **Who reads it, and when:**
  - the uploader, at upload;
  - whoever approves publication, before every publish of a page showing a new or changed picture;
  - the developer, when building or changing a page, and at the end of every batch.
- **Automated part:** `page-rules.spec.ts` "rule 6" fails on a content picture with no text, with Arabic text on the English page, or with no Arabic letter on the Arabic page. Whether a text matches its picture is a human reading.
- **Known gap (FOLLOW-UP, backend):** no route edits an asset's text after upload.

## D6 — Visual Identity Density (M6): a review principle, not a rule

> «يجب ألا تتراكم مجموعات الخطوط حتى تصير عنصرًا منافسًا للمحتوى.»

- No number, no automated check, no `PENDING` entry.
- **Reviewed:** once at the end of each batch that adds strokes, on a half-scale 1440 capture in both languages.
- **Reconsidered as a rule:** when the accumulation recurs on three pages or more.

**Current reading** (1440, Arabic, after D1 and D2): eight sets.
- two in the hero;
- one on the seam before the goals;
- three on photographs (vision, mission, call);
- two in the footer.

During the batch, with the vision's photograph removed, the mission's and the ledger's seams brought it to nine, four of them group A on the page's left edge. Both seams left with D1 and D2.

## D7 — The section reader (M7)

`page-rules.spec.ts` now reads the page as bands, checked first on one page per hero the site has today:
- the identity hero with a photograph (Vision & Mission) and with a portrait (the President);
- the listing hero on a register (the board) and on a preparing page (the strategic plan);
- the contact hero.

**What changed.**
- **The hero** is the band that holds the page's `h1`. It used to be read from `data-composition`, which only the identity hero sets.
- **A picture** counts where the page offers it as content: a non-empty alternative text, not hidden from assistive technology. The contact page's five social icons no longer count.
- **Sections that share a stretch of the page's height** are one band: the contact form and map from `xl`.
- **Rule 3's seam after the hero** is read from the band being the hero, as the rule's text says, not from a differing `data-register`. The contact hero has none.

**Evidence.** Before: 12 of 20 failing (board, strategic plan and contact, both languages, 1440 and 390). After: 20 of 20.

**Known limit.** A contact hero without its photograph paints the black register from an inner layer the reader does not read. It is not reachable locally (the record has a photograph); in CI the rules that read registers are skipped without photographs.

## D8 — Calibration on two pages the rules were not written for (M8)

`/about/president` and `/about/board-members` were added to `page-rules.spec.ts` at 1440, 768 and 390 in both languages.

| Page | Section | Rule | Finding | Remedy |
| --- | --- | --- | --- | --- |
| President | The message (after the green portrait hero) | 1 | a reading column, no section-scale element | **new composition** (presented). Seam lines would stand half on the green register, where their green measures 1.95:1 and their red 1.60:1 (computed from the tokens) |
| President | The call to action (neutral, after the green values) | 1 | no photograph field, no strokes | **new composition or a schema field** (presented); the same seam-line limit |
| Board | The members' list (after the green hero) | 1 | cards only | **new composition** (presented); the same seam-line limit. Members have a `photoId` the page does not print |
| Both | every seam | 3, 5 | hold | — |
| Both | — | 4 | no numbered list; the test now requires none to appear unmeasured | — |
| President | the portrait | 6 | the English text was Arabic | **fixed** (D5) |
| President | the signature date | §4.10 | 12px on a phone | **fixed** (D4) |

The three rule 1 findings stand in `PENDING` for these pages, so the list fails once any is fixed.

**Did the six rules hold on two pages they were not written for?** Yes. None needs a change to what it demands. Two need their scope or reading made exact, and one exposed a gap in the components rather than in the rule:
- **Rule 1 held, and its remedies did not travel.** The only component that supplies identity without content is `SeamLines`. After a coloured band its upper half stands on that band at under 3:1. Every neutral section after a green hero or band therefore needs a photograph or a new composition. This is a missing component variant, not a defective rule. Proposal, not built: a seam-lines variant drawn below the seam only.
- **Rule 2 needs its scope written.** Its text is written for sport and venue pictures. A portrait of the federation's president and a map cannot show athletics and are not violations; rule 6 governs them. Proposed wording in the guide, not adopted.
- **Rule 3's register change does not hold in high contrast.** Every register and item surface is `#FFFFFF` there, so a register change marks a seam in light and dark only. That applies to every page with a coloured band, including this one's values and the President's. Proposal, not built: a register change counts in high contrast only with an edge or seam lines. This is an accessibility-mode question for the owner.
- **Rules 3, 4, 5 and 6 held as written.** Rule 6 found a real defect on the President's page.

## D9 — The critique's lost points (M9)

The earlier critique (2026-09-15 06:49Z, 18/28, heuristics 5, 9 and 10 not applicable) lost ten points. Recorded as the review wrote them; no fix in this batch.

| # | Heuristic | Points lost | Named reason |
| --- | --- | --- | --- |
| 1 | Visibility of system status | 1 | no visible trail (owner decision, ADR-0072 D7) |
| 2 | Match between system and real world | 2 | the football stadium beside the athletics vision; the ordinals 01/02 collide with the goals' 01–06 |
| 3 | User control and freedom | 1 | a long phone page with no early route to the strategic plan |
| 4 | Consistency and standards | 2 | the statements' names at label size against the goals' and values' h2; one seam marked and the next not |
| 6 | Recognition rather than recall | 1 | **not named** in the snapshot (its key-issue cell is "—") |
| 7 | Flexibility and efficiency | 1 | "landmarks and h2 run" (the snapshot does not say what the point was lost for) |
| 8 | Aesthetic and minimalist design | 2 | twelve near-identical cards; eight stroke sets; ordinals heavier than their names |

**What this batch changed of them, without targeting them:**
- §2's football stadium is gone.
- §4's label size and the unmarked second seam are resolved.
- §8's twelve identical cards are now six cards on a neutral ground and six on the green register.

**The critique after this batch** (dual review on the final page, both languages, 1440 and 390, light, dark and high contrast): **22/28**, with heuristics 7, 9 and 10 not applicable. That is not like-for-like with 18/28, which scored 7 and marked 5 not applicable. No P0, one P1. Six points lost:

| # | Heuristic | Points lost | Named reason |
| --- | --- | --- | --- |
| 1 | Visibility of system status | 1 | no visible location on the page (ADR-0072 D7) |
| 2 | Match between system and real world | 1 | "Excellence" and "Transparency" recur in the mission, the goals and the values, so a goal and a value cannot be told apart by wording |
| 4 | Consistency and standards | 1 | small drift: 01 near-black and 02 teal in light; the English ordinals 38px apart; the two buttons 49 and 51px tall |
| 5 | Error prevention | 1 | the primary call leads to a page in preparation without saying so |
| 6 | Recognition rather than recall | 1 | the goals have no anchors although the plan cites them by number |
| 8 | Aesthetic and minimalist design | 1 | 128px ordinals are 3.2× the 40px h1; eight stroke sets |

**The detector.** The CLI found 0 in 8 files; a canary proved `.tsx` is scanned. In the browser it found 16, 15, 15 and 31 hits. All are false positives or heuristic hits on approved values, each measured:
- the hero title read against the body ground instead of the photograph and scrim (8.12:1 at worst);
- the approved card text pairings;
- the approved item-2 ink in dark;
- the hero's parallax layer;
- the H2-size title paragraph.

**Priority issues, classified (none fixed here; this batch's M9 asks only for them to be written):**

| Priority | Issue | Class |
| --- | --- | --- |
| P1 | "استكشف الخطة الاستراتيجية" leads to "هذه الصفحة قيد الإعداد" | DESIGN DECISION REQUIRED (CTA order and copy) |
| P2 | Goals and values read as one set; in high contrast nothing separates them | DESIGN DECISION REQUIRED (D2, D8 rule 3 in high contrast) |
| P2 | The hero title is outranked by the ordinals and the stroke reserves | DESIGN DECISION REQUIRED (guide §6, the ordinal size) |
| P2 | Photographs upscaled 1.18–1.54× at 1440, about 1.4× in the hero at 390 | FOLLOW-UP (ADR-0073, `slanted-photo.tsx`, `identity-hero.tsx`) |
| P3 | Stroke sets gather on one edge: 6 of 8 are the red/green pair | Visual Identity Density review (D6), presented |

Snapshot: `.impeccable/critique/`, slug `pp-locale-about-governance-vision-mission-page-tsx`.

## D10 — Replacing a picture from the dashboard

Tested end to end on 2026-09-15, as `admin@uaeaf.ae` on the local database. The audit log was read before every write.

**Found first: the dashboard saved but could not publish.**
- **What failed.** Saving a draft answered 200. Publishing, the version list and the editorial state all answered Next.js's own HTML 404 page. The routes nested under `api/admin/editorial/[entityType]/[id]/` were not registered, while the API behind them answers those paths (401 without a token).
- **The cause:** the dev server's route cache after a cold start, the pitfall recorded for this machine.
- **The fix, by the recorded procedure:**
  - the dashboard's Next processes stopped: three, including a `start-server.js` still holding port 3002 after its task was stopped;
  - `apps/dashboard/.next/dev` deleted;
  - the server restarted.
- **After the fix:** three consecutive probes answered 200 (state), 200 (versions), 409 `staleRecord` (a deliberately stale publish, refused) and 404 `notFound` (an unknown action).
- No application code changed. On the slow E: drive it can recur after a cold start; its first sign is the versions panel reading «تعذّر الوصول إلى الخادم».

**The test.**

| Step (dashboard) | Result on the public side |
| --- | --- |
| Vision & Mission, the vision's picker: `vision-mission-values` (1344×768), «حفظ المسودة» | draft only |
| «نشر الآن» → «نشر» | published at 10:09:06Z. The publish came from the owner's own dashboard tab (confirmed by the owner) while this session's own attempt had met the 404 above |
| the vision's picker: `contact-hero` (1536×672), save, «نشر الآن» → «نشر» | published at 10:17:34Z. The public record serves `contact-hero` with its corrected alternative text |
| The President's portrait: the picker's upload form with a byte-identical copy of the portrait (491×508), its alternative text written from the picture, then save and publish | the public record served the copy (`president-7a3177ba.png`) |
| the original selected again, save, publish | the public record serves the original (`image-5ac5e6c8.png`) again |
| the copy archived through the API (`DELETE /media-assets/:id`; the dashboard has no archive action) | archived at 10:24:05Z. Not purged, because a published revision names it |

The first upload run read the database 8 seconds after «رفع الصورة», before the upload had returned, and stopped without saving. The second run selected the copy the first had created rather than uploading twice.

**Different dimensions, measured on the public page in both languages.**

| Asset | 1440 | 768 | 390 | Sideways overflow |
| --- | --- | --- | --- | --- |
| `vision-mission-values`, 1344×768 | frame 568×407, cover; file served 604×345, scale 1.18 | 768×439, the file's ratio | 390×223 | 0 |
| `contact-hero`, 1536×672 | frame 568×407, cover; file served 604×264, scale 1.54 | 768×336 | 390×171 | 0 |

- **From `lg`** the section keeps its 407px and the picture is cropped to it.
- **Below `lg`** the stacked picture takes its file's ratio, so the section's height follows the picture (958px against 855px at 768).
- **The desktop crop is upscaled.** `sizes` (42vw) picks the 604px candidate, while the cover crop needs about 930px of the 1536px file. The file has the resolution; the delivery asks for too little. That is ADR-0073's recorded FOLLOW-UP in `ui/slanted-photo.tsx`, not the asset.

**Which slots are replaceable (the three built pages).** The table is in ADR-0073's suspension item. Every slot the pages print is a record field with a dashboard picker, except two:
- **The President's call to action has no image field.**
- **The board page prints no member photograph,** although the public record carries `photoId`.

Each is a code change the day the client wants a picture there, and the first is also a schema change. This is known before the Figma pages, not after.

## Tests

| Check | Red first | Result |
| --- | --- | --- |
| `vision-mission.spec.tsx`, `president-page.spec.tsx` | 4 failing: the names and the date under 13px; no seam lines on the mission when the photographs do not meet; the mission clipping its strokes | 48/48 in the two files |
| `token-lists-contract.spec.ts`: the dark item edges at 3:1 or more on base, sunken and the green register | 12 failing pairs | 21/21; with `token-contract.spec.ts`, 25/25 |
| `e2e/page-rules.spec.ts`, the section reader: five heroes × Arabic and English × 1440 and 390 | 12 of 20 failing (board, strategic plan, contact) | 20/20 |
| `e2e/page-rules.spec.ts`, every route, all tests (reader, rules 1/3/5, rule 4, rule 6; Vision & Mission, the President's Message and the board page at 1440, 768 and 390 in both languages) | calibration: the President's page 6 failing and the board page 6 failing, all rule 1, now held in `PENDING` | **74/74** |
| A temporary copy of the same spec against a broken page (1440, both languages): the goals' seam lines removed, the values read as neutral, the first picture's alternative text in the other language | **4/4 failing as intended**: rules 1 and 3 on the goals, rules 1, 3 and 5 on the values, rule 6 in both languages | the copy was deleted. The run also named rule 1 on the vision, because the vision was still published without its photograph at that moment (D1) |
| Every visible text run under 13px: three pages × 390 and 1440 × both languages | the statements' names and the President's date at 12px on a phone | `<main>`: 0. The protected header and footer: 37 at 390 (D4) |
| The whole web unit suite, two workers, servers running | — | 393/394. `site-header.test.tsx` "opens a panel on click" timed out at 5.2s under load; alone, 24/24. Protected file, not changed |
| `tsc --noEmit` · `eslint` on every changed file | — | 0 · 0, fresh run after the last change |
| Captures: Vision & Mission × both languages × 1440/768/390 × light/dark/high contrast | — | 18 captures, 0 sideways overflow |
| `e2e/identity-lines.spec.ts`, Vision & Mission on every viewport, both languages | — | **43/44**; the one miss was the first photographs-and-seams case (Arabic 360×640), timed out at 180s under load. Alone, both 360×640 cases pass (38.1px; Arabic took 107s). Hero strokes at least **37.0px** (English 640×960). Strokes on photographs and seams at least **36.8px** (Arabic 375 and 390, the seam before the goals). 8 strokes per case (three photographs, one seam), 0 sideways-overflow frames |
| `e2e/vision-mission-text.spec.ts`, `e2e/president-text.spec.ts` | — | 4/4: both pages print their stored records |
| The API suite | — | not run: no API code changed in this batch (data only) |

## D11 — Pending Figma back-sync

1. The values on the green register and the call to action on the page's ground (Vision & Mission, both languages, desktop and phone).
2. The vision's photograph (`contact-hero`) and the absence of seam lines on the mission when both statements carry photographs.
3. The item cards' dark edge in the 200 step.
4. The statements' names and the President's date at `body-sm`.

## Content for the client

- **Urgent:** the federation's real photographs.
  - Seven of the eight library pictures are generated by a trained model, by their own content credentials (D1).
  - They are on show under a temporary suspension until 2026-10-02, and must be replaced.
  - Slots: Vision & Mission's hero, vision, mission and call to action; the contact hero and map.
- The contact map's place names are garbled text: a real map is needed with the photographs.
