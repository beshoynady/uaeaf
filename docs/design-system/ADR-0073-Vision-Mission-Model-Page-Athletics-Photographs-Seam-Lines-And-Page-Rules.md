# ADR-0073 — The Model Page: Athletics Photographs, Seam Lines and the Five Page Rules

**Status:** Accepted and built, except the vision photograph (D1, awaiting the owner's choice), the values section (D5, awaiting the owner), and the sixth rule (D6, proposed).

**Amended by ADR-0074 (2026-09-15), the batch's closing brief:**
- D1: the vision shows `contact-hero` (red track), under the temporary suspension of rule 2 below.
- D5: the values stand on the green register, and the call to action on the page's ground.
- D6: accepted as a mandatory publishing gate.
- D8: the stroke-set cap is recorded as a review principle, "Visual Identity Density", with no number.
- *Remaining*: the `label` gap is resolved by the usage, not the token. `contact-hero`'s alternative text is corrected.
**Date:** 2026-09-15
**Authority:** the owner's brief of 2026-09-15, «دفعة: إصلاحات بصرية على الرؤية والرسالة، ثم قواعد للتعميم»:
- §4: four fixes on Vision & Mission.
- §5: five rules, each with its check.
- §7: what is presented rather than built.
- §10: authority to evolve a rule that blocks a better result, except contrast and accessibility.
- §11: the stop points.

**Amends:**
- ADR-0072 D2: the identity lines outside the hero gain the seam.
- ADR-0072 D5: a page's rhythm is no longer carried by the grounds alone.
- `page-building-guide.md` §2: ground alternation is not a separator.
- ADR-0072 *Content for the client*.

**Does not amend:** any contrast floor · the header, the footer and the shared layout · any schema · Figma (locked; D7 lists the back-sync) · the President's Message and every other page (the rules are generalised only after the owner approves this page).

**Companion:** `docs/engineering/page-building-guide.md` §٨ (the rules and their checks, in Arabic).

---

## D1 — The photographs that showed another sport

**Finding.** The hero and the vision section printed floodlit **football** stadiums: a centre circle and penalty areas, with no track. Their own alternative text said so from the day they were uploaded: «ملعب كرة قدم مضاء…».

**The whole library, inspected.** `mediaAssets` on the local database holds 8 assets. Listed through its Admin API, the Cloudinary account holds the same 8 images and nothing else. A scan of every collection found no other image URL: the audit log holds only superseded copies of the contact images. Each picture was opened and looked at; its name and alternative text were not taken as evidence.

| Asset | Shows | Athletics | Used on |
| --- | --- | --- | --- |
| `vision-mission-hero` | football stadium at night, no track | **no** | V&M hero (until this ADR) |
| `vision-mission-vision` | football stadium at dusk, no track | **no** | V&M vision |
| `vision-mission-mission` | runners on a track at sunset, hurdles behind | yes | V&M mission |
| `vision-mission-values` (1344×768) | athletics stadium at night, red track filling the lower half | yes | **nothing** since ADR-0072 D5 |
| `vision-mission-cta` | runners on a stadium track at sunset | yes | V&M call to action |
| `contact-hero` | aerial view of Zayed Sports City at dusk; a thin track ring around a dominant pitch | weakly | Contact hero |
| `contact-map` | map | — | Contact |
| `image-5ac5e6c8` | the President's portrait | — | President's Message |

**Built: the hero.** The hero takes `vision-mission-values`. It is the one athletics picture that no page prints, and it was uploaded for this page. Its red track stays in view in any crop the band makes. It is dark, so it works under the scrim, and its alternative text describes it accurately.
- Saved and published on the local database as `admin@uaeaf.ae`. `MONGODB_URI` was checked local before each write.
- The draft matched the Live revision in every content field beforehand, so nothing else was published with it.
- Revision `6aa8dec17c23584778c869a3`, publication `6aa8dec17c23584778c869a4`, 2026-09-15 05:59:29Z.

**Not built: the vision (stop point, brief §11).** No unused athletics picture is left. The remaining candidates either repeat a picture or change the page's composition, and the brief reserves that choice for the owner:

| Option | Rule 2 | Rule 1 (identity) | Cost |
| --- | --- | --- | --- |
| **A. No photograph** (the statement becomes one centred column) | holds | the vision loses its section-scale element; its seam with the hero is still marked by the register change | an editor removes the picture; no code |
| B. Keep the football stadium until the federation's photograph arrives | **broken** | holds | none |
| C. `contact-hero` | weakly holds: the track is a thin ring in an aerial shot, and a narrow crop shows mostly pitch | holds | repeats the Contact hero, and its alternative text ("runners on the track") describes runners the picture does not show; correcting it changes the Contact page |
| D. The federation's own athletics photograph | holds | holds | content (client list) |

Recommendation: **A until D**. It is the owner's own rule 2 («القسم بلا صورة أفضل من قسم بصورة خاطئة»).

## D2 — Seam lines: the goals' identity and the seam before them

**Findings (brief §4.2, §4.3), measured.**
- The mission (sunken) and the goals (base) met with no visible transition. Base `#FAFAF8` and sunken `#F5F4F1` are **ΔE 2.13** apart in light, at the threshold of perception. In dark they are 5.63 apart. High contrast paints both `#FFFFFF`, so they are 0 apart.
- The goals already carried the accent rule (24 × 2px) and item cards. The owner read the section as having no identity element, so neither registers at section scale.

**Alternatives.**

| Option | Seam in all three themes | Identity | Governance | Chosen |
| --- | --- | --- | --- | --- |
| A stronger sunken step | yes | no | changes a token every page and every item colour is measured on | no (new value, owner approval) |
| A full-width hairline in `border-default` | yes | none; generic | approved token | no: separates without identity, and a second device would still be needed for §4.2 |
| **Identity strokes on the seam, in the corner the heading leaves empty** | marks it: strokes on one side, the previous section's photograph edge on the other | yes | the approved device in an empty place (owner rule of 2026-09-15; ADR-0072 D2) | **yes** |

`ui-ux-pro-max` returned no verified match for section separation (two queries), so it is not cited.

**Built: `SeamLines` (`ui/identity-hero.tsx`), drawn by `goals.tsx`.**
- **Placement.** The reading end of the seam: the frame's left in Arabic, where group A stands, and its right in English, where group B stands (IL-3). Each direction draws its own group and hides the other. The positions are physical (IL-7).
- **Scale.** IL-4's hero scale: the green stroke is 96px, then 104px from `md`, then 192px from `xl`.
- **Vertical position.** Each group is centred on the seam where the previous section's padding allows. It never rises nearer than `--space-8` to that section's content, because the sections share the rhythm's padding (48/64/96).

Measured in the browser after the final change (px from the seam; `--seam-pad` read back as 48, 64 and 96):

| Viewport | Arabic, group A: above / below | English, group B: above / below |
| --- | --- | --- |
| 390×844 | 16 / 53 | 16 / 32 |
| 768×1024 | 32 / 43 | 26 / 26 |
| 1440×900 | 64 / 75 | 48 / 48 |

- **No reserve.** Out of the flow, clipped to the 1440 frame, with no section height changed: goals 782px and values 616px at 1440 in Arabic, before and after.
- **Ink.** Red `brand.secondary` and green `brand.primary`; group B's black is `--logo-ink`. Measured as shapes on both grounds:

| Theme | Green | Red | Black / `--logo-ink` |
| --- | --- | --- | --- |
| Light | 4.60 / 4.37 | 5.63 / 5.35 | 20.09 / 19.09 |
| Dark | 3.89 / 4.37 | **3.18** / 3.57 | 17.91 / 20.09 |
| High contrast | 4.81 | 5.88 | 21 |

  The pairs are base / sunken. Every value is at least 3:1, although decorative strokes, hidden from assistive technology, are outside 1.4.11.
- **Motion.** Drawn at rest; each stroke grows from its tail once, when the seam enters the view (`data-reveal-part="draw"`). Nothing moves under reduced motion.

## D3 — The order of the goal cards (brief §4.4): correct, not changed

Measured at 1440 in Arabic, the cards read 01 at x=955, 02 at 509 and 03 at 64, then 04, 05 and 06 in the same way. English reads the other way. The grid inherits the page's direction, and DOM order is number order. **The reference is the one that jumps:** it places 01 at the left of the Arabic page. The implementation does not follow it there. Guarded now by `e2e/page-rules.spec.ts` (rule 4) at 1440, 768 and 390 in both languages.

## D4 — The five page rules

The rules are written in `page-building-guide.md` §٨. Each has its text, its check, its example on this page and what counts as a violation. Rules 1, 3, 4 and 5 are measured by `apps/web/e2e/page-rules.spec.ts`. Rule 2 is a reading of each picture, and the spec lists every picture's alternative text for it.

**Evolved while writing them (brief §10).** Each was evolved because the text as briefed would have passed the very defect the brief reports:

| Rule | As briefed | As written | Why | Scope |
| --- | --- | --- | --- | --- |
| 1 | an identity element may be the accent rule or coloured cards | it must be section-scale: identity strokes, a photograph or a coloured register; the accent rule and item cards do not count on their own | the goals carried both, and the owner saw no identity element | every page |
| 3 | "no two consecutive sections on the same ground without a separator" | base and sunken count as one ground; a photograph on one side of the seam is not a separator | ΔE 2.13 in light, 0 in high contrast; the mission's photograph touched the seam and the owner still saw none | every page |
| 5 | "the sections do not share one visual weight" | no two consecutive sections of one composition, except a mirrored pair of statements, never three | weight cannot be measured and composition can; the statements pair is the approved reference (ADR-0072 D5) | every page |

ADR-0072 D5 and guide §2 said a page's rhythm is "carried by the grounds". That stands for the rhythm, not for separation.

## D5 — What the rules find on this page and is left to the owner

The values section, after the goals:
- rule 1: item cards and the accent rule only;
- rule 3: its seam with the goals is base to sunken, unmarked;
- rule 5: a second card grid straight after the first.

The brief's §4 did not name it, and generalising a rule waits on the owner's approval, so it is not changed. It stands in the spec's `PENDING` list, which fails as soon as the section passes, so the list cannot outlive the fix.

| Option | Rules | Cost |
| --- | --- | --- |
| **V1. `SeamLines` on the values too** | 1 and 3 hold; 5 still broken | one line; guard runs |
| V2. A different composition for the values (for example the values as a list with icons on the ground, no cards) plus V1 | 1, 3 and 5 hold | a design decision (also ADR-0072 D15's "12 near-identical cards") |
| V3. Record it as an accepted exception | none | none |

## D6 — Proposed sixth rule (not built)

«The alternative text is written from the picture and read beside it before publishing.»

**Why.** Every wrong picture here said what it was in its alternative text, «ملعب كرة قدم», and was published anyway. The library also holds the reverse case: `contact-hero`'s text says runners are on the track, and the aerial picture shows none. Rule 2's first check is then a reading of text already in the record.

## D8 — The design critique after the fixes

`impeccable critique`, one pass. Two separate reviews:
- A design review from the screenshots and the source. No browser, because the guard held the dev server.
- A detector run: the static scan plus the detector injected into the page, with measurements.

**Score:** 18/28 (64%, acceptable). Three heuristics are not applicable: no input, no error states, no help.
**Detector:** the static scan found 0 in 9 files; a canary file proved `.tsx` is scanned. In the browser it found 31 (Arabic 1440) and 30 (English 390), all false positives or heuristic hits on approved values:
- `ai-color-palette`: item-2's dark ink.
- `gray-on-color`: 6.81:1.
- `clipped-overflow-container`: the hero's parallax layer.
- `tight-leading`: the H2 style on a `p`.

| Finding | Priority | Outcome |
| --- | --- | --- |
| The vision photograph is a football stadium | P1 | **Presented:** D1 |
| Goals → values: an unmarked seam between two identical grids | P2 | **Presented:** D5. The review prefers V2 over V1: strokes alone leave the sameness |
| The seam lines repeat the mission photograph's red and green in Arabic, and group B's short red stroke reads as a sliver at 390 in English | P2 | **Presented:** keep them, or draw group B in both languages. B stands on a band's bottom edge in IL-3 and would differ from the photographs' A, but the short red stroke would then also appear on the Arabic phone. That is an IL-3 evolution with an uncertain visual gain, so it is not built without a decision |
| The statements' ordinals outweigh their names, and "01" meets the goals' 01 | P2 | **Recorded:** owner direction, ADR-0071 D7 and ADR-0072 D15 |
| Photographs are upscaled: 1.44× (statements) and 1.53× (call to action) at a pixel ratio of 1, more on dense screens. `sizes` states the width, but a cover crop needs the section's height | P2 | **Recorded, FOLLOW-UP:** `ui/slanted-photo.tsx`. A `sizes` value derived from the crop's geometry needs measuring per breakpoint, not guessing. Not part of this brief's four fixes |
| The statements' name labels (`text-label`) compute 12px on a phone, under the 13px minimum | P2 | **Recorded:** see *Remaining* below |
| No visible trail · the goals subtitle repeats its heading · the hero scrim mutes the red track | P3 | **Recorded:** ADR-0072 D7 (owner) · content · ADR-0072 D12 (the green overlay, awaiting approval) |

**Also proposed from the review:** a cap on identity-stroke sets per page. At 1440 the page carries eight: two in the hero, three on photographs, one on the seam and two in the footer. Each new placement weakens the mark. It is a candidate rule beside D6, not written.

## Tests

| Check | Red first | Result |
| --- | --- | --- |
| `vision-mission.spec.tsx`: seam lines on the goals (drawn, hidden from assistive technology, out of the flow; group A for Arabic, group B for English) | 2 failing: no `[data-seam-lines]` | 27/27 |
| `e2e/identity-lines.spec.ts`, extended to the seam strokes; this route at the work viewports (360×640, 768×1024, 1440×900 × ar, en) | — | **16/16** in 15.3 min at these three viewports: the strokes outside the hero stay at least 38.1px from text, and hero strokes at least 37.1px. 8 strokes measured per case; 122 frames; no sideways-overflow frame |
| The same guard on every route and every viewport, at the end (`identity-lines.spec.ts` changed file, so every route) | — | **88/88** in 35.3 min, no overflow frame. Vision & Mission: strokes outside the hero at least **36.8px**, at Arabic 375×667 against the goals sentence. That is the seam, at a viewport outside the working set, with 4.8px to spare. Hero at least 37.0px (English 640×960, against the restored "Vision & Mission" title, measured after D9). The President's Message: hero at least 36.2px, unchanged |
| `e2e/vision-mission-text.spec.ts`, after D9 | — | 2/2: both languages print the stored record character for character |
| `e2e/page-rules.spec.ts` (new): rule 4 and rules 1/3/5 at 1440, 768 and 390 × ar, en | — | **12/12**, the values' three findings held in `PENDING` |
| The same spec against a broken page: a temporary copy reverses the goal cards with CSS `order` and removes the seam lines after load (1440, Arabic), then is deleted | **2/2 failing as intended**: rule 4 saw 05…01 where 01…05 was expected; rules 1 and 3 named the goals section | Copy removed; proves the checks can fail |
| `tsc --noEmit` (web) · `eslint` on the changed files | — | 0 · 0 |
| `token-contract.spec.ts`: every `var(--x)` is a token or an app-declared property | **1 failing** in the full suite: `identity-hero.tsx: --seam-pad`, set only through Tailwind arbitrary properties | 4/4 after `--seam-pad` got its base declaration in `styles/motion.css`, beside `--slant` |
| The whole web unit suite, servers running (owner decision, D9), two workers | A first run had 3 files whose workers failed to start under load (header, footer, contact form), so it was not counted | **389/389** in 27 files (387 before this batch, plus the 2 new seam tests) |
| The whole API suite | — | **Not run.** Owner decision (D9): another session uses the local API and MongoDB. The API's code is unchanged in this batch |

## D7 — Pending Figma back-sync

1. The seam lines between the mission and the goals, in Arabic (group A, left) and English (group B, right), at desktop and phone.
2. The hero's new photograph.

## D9 — A concurrent publish, and the English title restored

**What happened.** Another Claude session on this machine worked on the same local API during the batch. The audit log shows `admin@uaeaf.ae`, from `::1` with user agent `node`, doing three things after this batch's publish at 05:59:29Z:
- saved the draft at 06:47:43Z;
- published at 06:47:54Z;
- published again at 06:50:28Z.

Compared with this batch's revision, one field differed: the English `heroTitle`, which changed from "Vision & Mission" to "Vision Mission". The hero photograph was untouched.

**Owner decision (2026-09-15):**
- **The title:** restore "Vision & Mission" and publish. Before each write, `MONGODB_URI` was checked local and the draft was confirmed to still hold "Vision Mission". Revision `6aa8ec4ab70a0bf51ba228da`, publication `6aa8ec4ab70a0bf51ba228db`, 06:57:14Z. The public record now reads "Vision & Mission" with the athletics hero.
- **The servers:** leave the API and web servers running, because the other session uses them. Run the web unit suite in full and skip the API suite; the API's code is unchanged in this batch, and the change was data only.

**Also reported:** this batch stopped the dashboard dev server (port 3002) before the other session was noticed. The dashboard played no part in this batch.

## تعليق مؤقت للقاعدة ٢ — أصول ما قبل التسليم (temporary suspension of rule 2: pre-handover assets)

**Owner decision, 2026-09-15** (the closing batch's image-policy correction, and answer 1 in ADR-0074 D1). One item covers every slot.

**The suspension.** An asset that does not meet rule 2 may be shown in any image slot, **provided it can be replaced from the dashboard without a code change.**

**Known, not discovered later.**
- **Seven of the eight library assets are AI-generated,** by their own C2PA content credentials: "Google C2PA Media Services", `DigitalSourceType = trainedAlgorithmicMedia` (ADR-0074 D1). They stay on show under this item.
- **No new generated picture is added.**
- **Rule 6 is not suspended:** every alternative text describes the picture actually shown.

**Review date: 2026-10-02.** On that date the decision is reopened; it does not extend silently.

**What makes this different from a silent bypass:**
- it is recorded;
- it is bounded by a date;
- its table below is read in one review.

| Page | Section | Asset shown | Meets rule 2 | Replaceable from the dashboard | Needed from the client |
| --- | --- | --- | --- | --- | --- |
| Vision & Mission | Hero | `vision-mission-values` (generated) | yes: the red track | yes: *Vision & Mission* editor, «صورة الخلفية» | a real athletics photograph |
| Vision & Mission | Vision | `contact-hero` (generated) | yes: the track ring in the aerial view | **yes, tested end to end** (ADR-0074 D10) | a real athletics photograph |
| Vision & Mission | Mission | `vision-mission-mission` (generated) | yes: runners, a track, hurdles | yes: «خلفية قسم الرسالة» | a real photograph |
| Vision & Mission | Call to action | `vision-mission-cta` (generated) | yes: runners on a track | yes: «خلفية قسم الدعوة» | a real photograph |
| Vision & Mission | Share image | none set; the hero stands in | — | yes: «صورة المشاركة» | — |
| President's Message | Portrait | `image-5ac5e6c8` (no credentials) | not applicable: a portrait (ADR-0074 D8) | **yes, upload tested** (ADR-0074 D10) | — |
| President's Message | Hero ground | none (the portrait on the green register) | — | yes: «صورة الخلفية» (optional) | — |
| President's Message | Call to action | none | — | **no: not a record field. A picture here is a code and schema change** | whether the design needs one |
| Board members | Hero | none | — | yes: *Pages* editor, hero picker (optional) | optional |
| Board members | Each member | not printed; the record has `photoId` | — | **no: the page prints no member photograph. Showing them is a code change** | photographs, if the design shows them |
| Contact (outside the three pages) | Hero | `contact-hero` (generated) | weakly: an aerial view | yes | a real photograph |
| Contact (outside the three pages) | Map | `contact-map` (generated; garbled place names) | not applicable: a map | yes | a real map |
| Strategic Plan (ADR-0075) | Hero | `vision-mission-values` (generated; also Vision & Mission's hero) | yes: the red track | yes: *Strategic Plan* editor, «صورة الخلفية» | a real athletics photograph |
| Strategic Plan | Overview | `contact-hero` (generated; also the vision's) | yes: the track ring in the aerial view | yes: «خلفية النظرة العامة» | a real photograph |
| Strategic Plan | Objectives | `vision-mission-cta` (generated; also Vision & Mission's call) | yes: runners on the track | yes: «خلفية الأهداف» | a real photograph |
| Strategic Plan | Indicators | **McKenzie Community Track** — a real photograph (Rick Obst, CC BY 4.0, Wikimedia Commons; licence and source in the asset's caption) | yes: an eight-lane track with its lane numbers | yes: «خلفية المؤشرات» | the federation's own track, when photographed |
| Strategic Plan | Call to action | `vision-mission-mission` (generated; also the mission's; the runners' faces are synthetic, no real person) | yes: runners, a track, hurdles | yes: «خلفية الدعوة» | a real photograph |

**Rule 2's scope (owner decision, brief 2026-09-15 §٣; ADR-0075).** Rule 2 is written for sport and venue pictures. **Portraits, maps and documents are outside it**: they are not expected to show athletics and are never a rule 2 violation. Rule 6 alone governs their alternative text. The President's portrait and the contact map are the standing cases.

## Remaining

| Item | Class | Evidence | Next |
| --- | --- | --- | --- |
| `font.size.label` is 12px on mobile, below the 13px minimum. The statements' names use it | DESIGN SYSTEM GAP | `tokens/primitive/typography.json`: `label` 13px desktop, 12px mobile; measured 12px at 390 in both languages | The Design System owner decides: raise the mobile step, or name the statements differently. Not this page's call |
| Photographs upscaled 1.44–1.53× at a pixel ratio of 1 | FOLLOW-UP (P2, `ui/slanted-photo.tsx`) | Measured: 640×280 files rendered at 562×403 and 562×429 | A `sizes` value from the crop geometry, measured per breakpoint |
| `contact-hero`'s alternative text describes runners the picture does not show | FOLLOW-UP (low, Contact) | The asset viewed; D1 table | Correct the asset's text in the dashboard |
| The browser tools write their session logs to `.playwright-mcp/` in the repository root, which is not in `.gitignore` | FOLLOW-UP (low, tooling) | Seen during the critique run; the folder existed before | The owner decides whether to ignore it |

## Content for the client

- The vision's football stadium: temporary, awaiting D1's choice or the federation's photograph.
- The hero's night athletics stadium: a library picture, pending the federation's own.
- `contact-hero`'s alternative text describes runners the picture does not show. **FOLLOW-UP**, Contact page, low severity: correct the asset's text in the dashboard.
