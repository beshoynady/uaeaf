# ADR-0070 — Vision & Mission: Schema, Editorial Routes, Shared Editor Parts, and the Identity-Lines Hero

**Status:** Accepted
**Date:** 2026-09-14
**Owner approval:** the batch brief of 2026-09-14 ("دفعة: صفحة الرؤية والرسالة — schema ثم الصفحة"), which directs this page to assemble what the President's Message built, to apply D10's lines and safety distances to its hero, and to record the batch's decisions in one record. That brief is the separate owner decision ADR-0069 D10 requires before the identity lines are used on another page.
**Extends:** ADR-0069 D2 (closed icon keys), D3 (explicit public projection), D4/D5 (policy-bound publishing, direct publish as its own grant), D10 (identity lines, one-shot reveal); ADR-0064 (the contact page's rendering rule)
**Depends on:** IA §8.1 (route and breadcrumb), Chapter 4 §4.6 (measure), Chapter 5 §5.2 (breakpoints), Chapter 14 §3/§4/§11, ADR-0065 R2, ADR-0068 D1

One record for the batch. It decides the schema, the editorial routes, what the screen and the page reuse, and where the content came from. Figma is read-only. It was first read by eye (screenshots of `720:483`, `1507:2495`, `1507:2831`); the comparison that closed the batch took inventory of all six frames by the *Method* below: Arabic desktop `720:483`, tablet `1504:2483` and phone `1504:2723`; English desktop `1507:2495`, tablet `1507:2726` and phone `1507:2954`. No visual treatment is taken from them.

---

## D1 — The schema: three one-line titles and `seo` added, `coreValues` closed

The frames print each statement as a one-line headline over a body, and head the goals with a sentence. The schema had the bodies only.

**The rule for images** (owner decision 2026-09-14, for this page and every content page after it): «كل صورة تظهر في صفحة محتوى هي محتوى له حقل في السجل، لا أصل ثابت في الكود.» Every picture a content page prints is content with a field on its record, not a fixed asset in the code. A section background is content exactly as the hero's picture is; having a field already is not the criterion.

| Figma element | Field | Before | Now |
| --- | --- | --- | --- |
| Hero title / subtitle / image | `heroTitle` · `heroSubtitle` · `heroImageId` | present | unchanged |
| Vision background photograph (`1172:2271`) | `visionImageId` | missing | **added** 2026-09-14, ref → `mediaAssets`, nullable |
| Mission background photograph (`1172:2298`) | `missionImageId` | missing | **added** 2026-09-14, nullable |
| Values background photograph (`1160:2166`) | `valuesImageId` | missing | **added** 2026-09-14, nullable |
| Call-to-action background photograph (`1178:2506`) | `ctaImageId` | missing | **added** 2026-09-14, nullable |
| Breadcrumb | — (IA §8.1) | not content | unchanged |
| Vision headline (`1172:2271`) | `visionTitle` | missing | **added**, `LocalizedText`, nullable |
| Vision text | `visionText` | present | unchanged |
| Mission headline (`1172:2298`) | `missionTitle` | missing | **added**, nullable |
| Mission text | `missionText` | present | unchanged |
| Goals sentence (`1499:2264`) | `goalsTitle` | missing | **added**, nullable |
| Six goals, title + text | `strategicGoals: ContentBlock[]` | present | unchanged (no icon, as the board defines) |
| Six values, icon + title + text | `coreValues` | `IconedContentBlock[]`, free `iconKey` | **retyped** `IconKeyedContentBlock[]` |
| Section names: Vision, Mission, Goals, Our Values | — | — | site copy (`VisionMission` messages), not stored |
| Call to the strategic plan (`1178:2506`), words and buttons | — | — | site copy, not stored (D4); its photograph is the row above |
| Search and sharing | `seo: PageSeo` | missing | **added**, as ADR-0069 D2 added it (Chapter 14 §3) |

**`coreValues` closed to the twelve keys.** The free string is how five icon hues reached the President's frames (ADR-0069 D2). Retyping needs no migration: `visionMissionPage` held **0 rows** when read on 2026-09-14.

**Who owns `coreValues`.** This page does: they are the federation's values, printed in the Values card (`1160:2166`). The President's Message keeps its own `values` (ADR-0069 D2), so editing the federation's values never rewrites a past president's statement. Nothing reads across the two.

`REVISION_READ_FIELDS` names the four new fields. `PUBLISH_REQUIREMENTS` stays empty: the page has no portrait, and its required text is required by the schema.

## D2 — Editorial routes and grants, as the President's Message has them

`PATCH :id`, `POST :id/publish`, `POST :id/submit`, `POST :id/restore`, `GET :id/editorial-state`, and `GET current/public`, all through the generic `PublishingService`. `visionMissionPage:Update` and `visionMissionPage:Publish` join the catalogue: editing never implies publishing.

- **Which version is current:** the newest Live publication among the collection's rows. The collection is not singleton-enforced, but it states one federation's vision.
- **The public projection** is an explicit field list (`VisionMissionPublicResponseDto`); `federationId`, `revisionId` and the bookkeeping never reach a visitor.
- **The action bodies** are shared: `PublishEditorialDto` and `RestoreEditorialDto`. The President's Message keeps its own identical copies.
- **The policy: direct publish** (`workflowRequired: false`), as the President's Message has it (owner decision 2026-09-14). The client has not named approvers, and moving to a workflow later is a policy setting, not code. Without the row publishing fails closed, so every database the page is published from needs it (`PUT /workflow-policies/visionMissionPage/Edit`); set on the local database on 2026-09-14.

## D3 — The dashboard screen assembles shared editor parts

`/vision-mission`, opened by `visionMissionPage:Update` or `workflowInstances:Approve`, one line in `EDITORIAL_ENTITIES`, one link in the navigation. The status and version panels, the toasts and the BFF are used unchanged.

Three parts the President's screen had built for itself are now general, in `components/admin/editorial-editor/`, because the next three pages need them:

- `EditorShell`: save bar, leave guard, inline failure, and the panels. `save` returns whether it landed (CLAUDE.md §31).
- `BlockListField`: any `{title, description, displayOrder}` list, with or without an icon, reordered by buttons with focus following the row.
- `SeoFields`: the search-and-sharing fields and preview.

Three more became shared before the next page (owner decision 2026-09-14), because every screen repeated them:

- `loadEditorialScreen` (`lib/admin/editorial-screen.ts`): the grants, the record and image reads, which row opens (`selectRecord`: the named row from this reader's own list, else the oldest), and the status panel's state, returned as refused, absent or ready. `EditorialScreenNotice` draws the first two.
- `editorialDraft` (`lib/admin/editorial-draft.ts`): a screen names each field's kind (`text`, `optionalText`, `image`, `seo`, `blocks`, `document`) and receives `toDraft`, `changedFrom` and `toPatchBody`. A field map that forgets a field, or gives one a kind its type cannot hold, does not compile. The SEO types and counters live there too.
- `PublicImageDto`, `PublicValueDto`, `PublicContentBlockDto` and `PublicSeoDto` (`api/src/common/dto/public-page.dto.ts`): the public shapes more than one projection is built from. With them, the two steps both page services had copied: `MediaAssetsService.resolvePublicImages` (every image a record points at, in one query, keyed by id) and `toPageSeo` (`common/dto/page-seo.dto.ts`, a validated `seo` body as the stored embed).

The President's screen loads through `loadEditorialScreen` and builds its draft with `editorialDraft`, its spec's assertions unchanged. Its editor still uses its own section copies; moving it onto the shared editor parts is outside this batch. The statements are short plain text, so no rich-text editor is loaded.

## D4 — The public page

> **Amended by ADR-0071 (2026-09-15).** The hero is a band on this page (D6, replacing D6.4 below). The statements carry the ordinals 01 and 02 and alternate with their photographs beside the words, with no panel and no scrim (D7), in a band that carries the identity lines (D8). The goals' numbers are at `display-l`. The bullets below describe the page before that record.

`/about/governance/vision-mission`, IA §8.1's route. Register **green** (guide §3.3, §3.34.2 Quiet/Institutional). Order is the frames': hero, statements, goals, values, call to action.

- **Hero:** `IdentityHero`, the President's portrait hero moved to `components/ui/` without a portrait and without the name line. The lines, reserves and entrance are D10's. The President's Message renders the same markup through a thin adapter, so its guard still holds it.
- **The reserve under the text, without a portrait.** D10 defined no portrait-less hero below `lg`. There the text column ends on the bottom edge where group B stands, and the guard measured the subtitle at 0px from B in 9 of 10 viewports below `lg`. The column now keeps clear, under the text, B's height plus `--space-8 × √2` plus the text's settle. That is the title reserve's construction mirrored (IL-5, IL-9: clearance wins over compactness). With a portrait, the portrait's inset already holds B off, so the President's hero is unchanged.
- **Without a picture or a portrait, the hero is its content's height.** ADR-0067 D2 gives the first screen only to a hero with something to fill it, as `PageHero` does. Held to the first screen, this hero left about 430px of empty green under the title at 1440×900, and about 400px on a phone. The reserve under the text then applies at every width, because group B's tails sit on the bottom of a shorter hero.
- **Arabic below `lg`, without a portrait, keeps IL-3.** D10's Arabic exception places group A beside the title, to fit the portrait hero into a short phone's first screen. Without a portrait the hero is short. There, A entering beside the title crossed the subtitle: the guard measured 23.7, 14.6 and 14.9px during the entrance. So both languages keep A above the title, with its reserve, and the exception and its shrunken line scale apply only with a portrait.
- **Statements:** each name is the `h2`; the one-line statement takes the h2 size without the element; one centred column at the President's measured measure. On its photograph, in a panel, when the record has one; otherwise one centred column. No numbered badge.
- **Goals:** an ordered list on the shared `CARD`. Numbered, because the frames number them and the strategic plan refers to them by number. One, two, then three columns.
- **Values:** the President's `ValuesBand`, which now places six values three across from `xl` (Figma's 3 × 2) and still places five across for five.
- **Call to action:** copy from the frames in the site messages. It links the strategic plan and About, routes the header already links. Buttons use the contact page's recipes. Both links stay while their pages are unbuilt (owner decision 2026-09-14): the strategic plan is the next page, and the header links it already, so hiding the button would not prevent the 404.
- **Rendering:** `force-dynamic` with the data cached, the contact page's rule, so a build without the API cannot bake a 404.

Figma's per-card tints are colour for decoration (ADR-0065 R2) and are not drawn. Its photographs are content (D1): a section whose record has one stands on it in a panel the width of the container, under the shared `HERO_SCRIM` (`PhotoGround`, `components/ui/photo-ground.tsx`), so white text clears AA whatever is uploaded; without one it stands on its band. An editor changes this by uploading or removing the picture, never by a setting. Until 2026-09-14 this paragraph called the photographs decoration and left them out; see *Method*.

## D5 — Content: where each string came from

The seed fixture (`api/seed/dev/visionMissionPage.json`) and the browser fixture carry the frames' words:

- **Arabic:** the desktop frame `720:483`, every section. The tablet frame agrees with it wherever it can be read (its values card clips values 04–06). The phone frame `1504:2723` does not, and is not used: its hero subtitle runs on («رؤيتنا لمستقبل ألعاب القوى في الإمارات ومسيرتنا الاستراتيجية نحو تمكين رياضيينا.»); its goals open with another sentence («أهدافنا الاستراتيجية الستة التي توجه رحلتنا لتطوير ألعاب القوى الوطنية:»), although the six goals match the record word for word; and its values come in another order (Integrity, Teamwork, Excellence, Transparency, Sustainability, Innovation), in shorter wording, under a sentence no other frame prints and no field holds («المبادئ الأساسية والركائز الأخلاقية التي تحكم ممارساتنا:»).
- **English, goals:** the desktop frame `1507:2495`. The mobile frame `1507:2954` carries a different translation.
- **English, values:** the tablet frame `1507:2831`, the only English frame that shows all six. The desktop card clips values 04–06, and its first three read differently.
- **The English shown is not approved** (owner decision 2026-09-14): used as the frames give it, listed for the client, and not retranslated here. The frames' English also differs by breakpoint: the tablet frame words the statements and the goals differently from the record, and the phone frame the hero subtitle, the statements, the goals and the values (in the phone's Arabic order). None is marked canonical.
- **Icons:** only Excellence has a glyph in the frames (`award`); the other five chips are empty. Chosen from the twelve keys by meaning (owner decision 2026-09-14), for review: Teamwork `users` and Innovation `zap`, the glyphs the President's Message already gives Cooperation and Innovation, so one meaning keeps one glyph across the site; Integrity `shield-check`; Transparency `eye`, for making information visible, although the President's Message uses `eye` for Vision (`handshake`, for trust, is the alternative); Sustainability `target`, a long-term aim, and the weakest fit, because none of the twelve says growth or continuity.
- **Images** (owner decision 2026-09-14): the frame's five photographs, exported as the design file holds them, at the largest size it has, unedited, as temporary stand-ins until the federation's own. Matched to their sections by content hash: hero `1160:2115` 1536×672, vision card `1172:2271` 1536×672, mission card `1172:2298` 1536×672, values card `1160:2166` 1344×768, call to action `1178:2506` 1536×672. Each section also holds a 512px copy of the same picture, which was not exported; the goals card holds no image, and the X icon belongs to the footer. **The hero and the vision card show a football stadium, with no running track.** Each has its field (D1): `heroImageId`, `visionImageId`, `missionImageId`, `valuesImageId`, `ctaImageId`. Uploaded through the image store (Cloudinary, the owner's choice for these five), linked, and published on the local database on 2026-09-14; each asset's alternative text only says what the picture shows, and is as temporary as the picture. **The frames do not agree on the hero's picture.** Only the Arabic desktop frame holds the stadium. The other five hold one other file, by hash: an athlete in the national kit on a track, which is generated, its bib text garbled ("AFRELETCS"). The four section pictures are the same files in all six frames.
- **One spelling:** the Arabic desktop and tablet frames print "العمل الجماعى" (the phone frame spells it correctly); the seed and the stored record say "العمل الجماعي" (owner decision 2026-09-14), and the frames are on the back-sync list.
- `federationId` points at a fixed id: no `federation` document exists in the database the fixtures come from.

## D6 — What the comparison with the frames decided (owner decisions 2026-09-14)

The comparison covered all six frames (*Method*). Each difference it found was already decided (D4, ADR-0065 R2, PM-D23/D27), was a defect in the frames (back-sync), or was put to the owner, who decided:

1. **The hero's picture stays the stadium, for now.** The athlete picture is not used: generated, with garbled text on the bib, it is unfit for an official site whatever else is decided. There is no field per language either: the complexity is not justified for a picture about to be replaced. Both pictures are on the client list.
2. **The vision card's stadium stays, for now**, and is on the client list.
3. **The President's pull-quote stays neutral** until the colour-system batch (ADR-0069 D11). ADR-0065 is not amended here.
4. **The hero keeps ADR-0067 D2.** *(Replaced by ADR-0071 D6, 2026-09-15: the owner made it a band its content's height.)* With a picture it fills the first screen, and nothing overlaps it. The frames give it 686px on desktop, 520px on tablet and 280px on a phone, with the vision card overlapping it on desktop and tablet. ADR-0067 D2 governs every page, and changing it for one page costs more than the difference. Back-sync.
5. **The vision headline wraps to two lines at 1440.** The reading measure (Chapter 4 §4.6) is a measured rule; the frames' single line is not.
6. **The buttons keep `--button-radius`**, not the frames' pills. The shape of a button is a system decision, not a page's.
7. **On a phone the call to action stays a panel inside the container**, as built, not the frames' full-bleed band.

| What the tablet and phone frames show | Where | Decided by |
| --- | --- | --- |
| Hero 520px (tablet) and 280px (phone), title centred over the picture, the vision card overlapping it on tablet | `1504:2501`, `1504:2739`, `1507:2745`, `1507:2971` | decision 4; D4 (`IdentityHero`) |
| Statements with a numbered badge; on a phone, a headline at a smaller size | every frame | D4: no badge, the statement takes the `h2` size |
| Goals in tinted cards with coloured top edges, two across on tablet and one on a phone | every frame | ADR-0065 R2; the columns match (one, then two from `md`) |
| Values three across on the Arabic tablet, two across on the English | `1504:2584`, `1507:2831` | two across from `md`, as the English tablet; the Arabic card clips its second row (back-sync) |
| Values on a phone in another order, in shorter Arabic, under an extra sentence | `1504:2819`, `1507:3051` | D5: the record follows desktop; a field for the sentence is not decided |
| Call to action: the title on one line (tablet); on a phone a full-bleed band, a green rule above the title, buttons the full width | `1504:2642`, `1504:2874`, `1507:2897`, `1507:3112` | decisions 6 and 7; the title is an `h2`, like every section title (D4); the buttons' width is not decided |
| Breadcrumb: the phone frames show three levels, without Governance & Strategy | `1504:2739`, `1507:2971` | IA §8.5: up to four levels stay visible, and this trail has four |
| Header and footer | every frame | site chrome, excluded by name |

## Method — how a page is compared with its frames (owner decision 2026-09-14)

The first comparison for this page listed the texts it judged to be content and left the four section photographs out. They were seen, and treated as a visual treatment (D4 then said "not drawn"), but that judgement lived in prose and never became a row the owner could decide. The hero's picture was in the table only because a field for it already existed, which is not a criterion. For every page that follows, the comparison is built from the frame's inventory, not from a reading of it:

1. **Inventory before judgement.** `get_metadata` on the page frame names every section node and every text node. For each section, `download_assets` lists its original images; they are tied to their section by content hash, because the download links change on every call. Every text node and every image becomes a row of the D1 table.
2. **Every row carries a status**: present, missing → added, or excluded. An exclusion states its reason in the table (site copy, a smaller duplicate of an image already listed, the header's or footer's own assets), never only in the prose.
3. **An image is content by rule** (D1). Its row is a field whatever the picture looks like; the only images excluded are the shared header's, the footer's and the identity lines', by name.
4. **Each image row is checked against the rendered section** (`get_screenshot`), because the metadata names layers, not what they show, and the row records anything unfit for publishing (here: two football stadiums).
5. **Every frame's images are hashed, not one frame per language.** The hero's picture differs by frame, not by language (D5).

Two limits of the tools met on this page. `get_metadata` returned the photographed cards without their children, so their words were read from renders. A whole-frame export stops at 4096px tall and scales a taller frame down, so geometry comes from metadata, never from an export's pixels. Search the file's metadata for the page's frames before reporting one missing: the Arabic tablet and phone frames were once reported absent, and were there.

## Tests

- `apps/web/e2e/vision-mission-text.spec.ts`: every stored field, printed character for character, in both languages, without JavaScript. Written first; failed on the missing route.
- `apps/web/e2e/identity-lines.spec.ts`: the existing guard, now over both routes. How much of it to run is written in the file's header (owner decision 2026-09-14), so a narrowed run is never read as a relaxed rule: `ONLY_ROUTE` with `ONLY_VIEWPORTS=work` (360×640, 768×1024, 1440×900, both languages) while a page is built; the changed route on every viewport at the end of a batch; every route when `IdentityHero` changes; every route on every viewport in CI. A filter that matches nothing throws. **The guard failed open once, and no longer can** (found 2026-09-14): once this hero had a photograph, its parallax, a scroll-driven animation whose `endTime` is a CSS percentage, turned the frame loop's end into `NaN`. Every Vision & Mission case then passed having scrubbed no frame, with an infinite distance. The guard now scrubs time-based animations only, and each case also requires frames > 0, text found to measure against, and a finite distance; the tightened assertions were seen failing on this route before the fix, and passing after it with 122 frames measured.
- The CI fixture API serves both records.

## Pending Figma back-sync

1. The identity-lines hero on this page, without a portrait, at every breakpoint. With a picture it fills the first screen and nothing overlaps it (D6.4); the frames give it 686, 520 and 280px, with the vision card overlapping it on desktop and tablet.
2. The statements without badges; without a photograph, in one centred reading column; with one, a full-width panel under the shared scrim. Headlines at the `h2` size, wrapping at the reading measure: two lines for the vision at 1440 (D6.5).
3. The goals on the shared card, untinted, 1/2/3 columns.
4. The values band: on its photograph in a panel under the shared scrim (on the green register without one), two across from `md` and 3 × 2 from `xl`, one green icon chip, on the reading edge.
5. The call to action: on its photograph in a panel the width of the container, on a phone too (D6.7); its title at the `h2` size, on two lines at 768; primary action first in both languages, where the English frames put About first; buttons at `--button-radius` and at their own width, where the frames draw pills (D6.6), full width on a phone; no green rule above the title.
6. Section numbers dropped: every frame labels Values "03", and Goals "03" as well, except the English phone frame's "04".
7. The values cards in the frames: the English desktop card clips values 04–06 and its heading; the Arabic tablet card (`1504:2584`) clips its second row; on the English tablet (`1507:2831`) the "03" badge covers the heading.
8. The dashboard screen (ADR-0068 D8: no dashboard frame exists).
9. "العمل الجماعى" in the Arabic desktop and tablet values cards, to read "العمل الجماعي", as the phone frame already does (owner decision 2026-09-14).
10. The hero's picture: five frames hold the generated athlete and the Arabic desktop frame the stadium; the page shows the stadium until the federation's photographs arrive (D6.1).
11. The phone frames' own content: the longer hero subtitle, the goals' opening sentence, the values' order and wording, and the sentence under the values heading (D5).
12. The English phone vision card (`1507:2994`): its body runs into the card's bottom edge.

## Client content list

1. **صور صفحة الرؤية والرسالة مصدَّرة من تصميم Figma كبديل مؤقت — تحتاج الصور الأصلية بدقة عالية من الاتحاد** (the Vision & Mission images are exported from the Figma design as temporary stand-ins; the federation's original high-resolution photographs are needed), each with alt text in both languages. Three pictures are named (owner decisions 2026-09-14, D6.1 and D6.2):
   **الصور الثلاث مصدَّرة من Figma كبديل مؤقت، واثنتان منها تُظهران ملعب كرة قدم لا مضمارًا.**
   - صورة الواجهة المنشورة: ملعب كرة قدم. تبقى مؤقتًا حتى تصل صورة الاتحاد.
   - خلفية بطاقة الرؤية المنشورة: ملعب كرة قدم. تبقى مؤقتًا حتى تصل صورة الاتحاد.
   - صورة العدّاء التي تضعها إطارات Figma الخمسة الأخرى في الواجهة: على مضمار، لكنها مولَّدة ونص صدريتها مشوّه («AFRELETCS»)، فلا تُنشر.

   The mission, values and call-to-action pictures show running tracks and are just as temporary.
2. Search title, description and share image, in both languages.
3. **The English translation shown is not approved.** The goals carry the desktop frame's English and the values the tablet frame's, as the frames give them; the canonical English for both is the client's to supply.
4. **أيقونتا الاستدامة (`target`) والشفافية (`eye`) اختيار مؤقت — تحتاج اعتماد الاتحاد، والبدائل المتاحة ضمن الـ 12 مفتاحًا** (the Sustainability and Transparency icons are a temporary choice that needs the federation's approval). The alternatives within the twelve keys: for Transparency, `handshake` (trust) or `lightbulb` (clarity); for Sustainability none says growth or continuity, and the nearest are `flag` or `star`. The twelve keys are not extended for this (owner decision 2026-09-14): choosing an icon is an editorial decision, not a technical one.

## What this record does not decide

- Who approves this type, if it moves to a workflow (the client has not named approvers; D2).
- Moving the President's Message screen onto the shared editor parts.
- A `federation` record.
- A field for the sentence under the values heading, which only the phone frames print (`1504:2819`, `1507:3051`). It would be a schema change, made only with approval.
- Whether the call to action's buttons span the width on a phone, as the phone frames draw them. Chapter 8 L1 asks full width of primary buttons in forms only (`08-L1-Foundation-Components.md`, Responsive Behavior).
- The pull-quote's colour on the President's Message (ADR-0069 D11), and any change to ADR-0065: both belong to the colour-system batch.
