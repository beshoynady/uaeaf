# Contact Us (تواصل معنا / Contact Us) — Implementation Spec

> **⚠️ THIS FILE IS THE SOURCE OF TRUTH FOR THIS PAGE.**
> Every value below was read directly from the live Figma file on the extraction date. The file is
> **read-only** — editing is locked — so nothing here can be corrected upstream. Where a value could not be
> read, this file says `NOT EXTRACTED — <reason>` rather than guessing.
>
> **§8's five conflicts are RESOLVED — see `ADR-0064`.** The rulings override the frame values wherever
> the two disagree: the heading sits above the cards, the four cards form a green-ramp ladder, the AR
> treatment is the bilingual reference, and the pin subtitle is 13px. Read ADR-0064 alongside §2–§6.

| Field | Value |
|---|---|
| Figma file key | `hpO727vjwl18g3s3LTICAY` |
| Section node | `2616:1382` — **"Section 9"** (verified: contains `contact-*` frames and `Hero - تواصل معنا`) |
| Extraction date | 2026-09-09 |
| Extraction method | `get_metadata` (structure/geometry), `get_design_context` (fills, typography, copy, token bindings), `get_variable_defs` (bindings), `get_screenshot` (visual verification of every frame cited) |
| Figma editability | **LOCKED** — read access confirmed working on the extraction date |
| Governing rules | CLAUDE.md §1, §2, §3, §12, §13, §14, §16; ADR-0050, ADR-0059, ADR-0060, ADR-0063 |

## Node index — all six frames verified to exist

| Language | Breakpoint | Node id | Frame name | Size (W × H) |
|---|---|---|---|---|
| AR | Desktop 1440 | `862:383` | Page - Contact (AR) - تواصل معنا - /contact | 1440 × 1848.41 |
| AR | Tablet 768 | `1472:2508` | contact-tablet-ar | 768 × 2248.64 |
| AR | Mobile **390** | `1472:2640` | contact-mobile-ar | 390 × 3252.19 |
| EN | Desktop 1440 | `1475:2509` | contact-desktop-en | 1440 × 2186.00 |
| EN | Tablet 768 | `1475:2698` | contact-tablet-en | 768 × 2172.41 |
| EN | Mobile **390** | `1475:2837` | contact-mobile-en | 390 × 3172.00 |

Mobile is **390**, not the 375 used by `page-president-message.md`. 390 is the width already used by this
project's live-browser sweeps, so no reconciliation is needed.

Header and footer frames inside these nodes are **out of scope**: both were rebuilt after this Figma file
was locked (ADR-0061, ADR-0062, ADR-0063 D2), so the frames no longer describe the shipped components.
This spec covers everything between them.

---

## 1. Section order and responsive ramp

The page is three sections: **Hero → Contact Cards → Form + Map**. What moves between breakpoints is where
the cards live and whether the form and map sit side by side.

| | Desktop 1440 | Tablet 768 | Mobile 390 |
|---|---|---|---|
| Page gutter | 96px (`px-[96px]` on the section) | 40px | 20px |
| Content width | 1248 | 688 | 350 |
| Hero height | 550 | 551 | 300 |
| Hero title | 56px | 28px | `NOT EXTRACTED` — box 175 × 34, same as tablet |
| Hero subtitle | 18px, opacity .85, w 600 | 15px, opacity .85, full width | box 350 × 18 |
| Cards | **inside the hero**, absolute at y 341.6, 4 across | **inside the hero**, y 230, 2 × 2 grid | **own section** below the hero, 4 stacked |
| Card size | flex-1 of (1248 − 3×24) ÷ 4 = 294 | 336 × 141 (2 cols, gap 16) | 350 × 141 |
| Card padding | px 24 / py 32, gap 12 | `NOT EXTRACTED` | px 16 / py 24, gap 8 |
| Card icon ring | 52 (radius 26), icon 22 | `NOT EXTRACTED` | 44 (radius 22), icon 18 |
| Card label / value | 13 / 16 | 13 / `NOT EXTRACTED` | 13 / 14 |
| Form + Map | side by side, gap 48 | **stacked**, form then map | **stacked**, form then map |
| Form card | p 40, gap 24 | 688 × 596, p 32, fields 624 | 350 × 738, p 20, fields 310 |
| Field rows | 2-up where paired | 2-up (304 + 304, gap 16) | all 1-up |
| Control height | 44 (py 13 + 16px line) | 44 | 44 |
| Textarea height | 110 | 100 | 100 |
| Submit height | 52 | 48 | 44 |
| Map height | 380 | 300 | 220 |
| Map CTA row | 2 buttons side by side, gap 12 | 2 buttons side by side (339 + 337) | **stacked**, 2 × (350 × 40), gap 10 |
| Pin bubble | px 12 / py 8, gap 4 | box 186 × 49 | box 156 × 25 |

### Section y-offsets, as measured

| | AR desktop | EN desktop | AR tablet | AR mobile |
|---|---|---|---|---|
| Hero | y 95.41, h 550 | y 96, h 550 | y 69.24, h 551 | y 69.24, h 300 |
| Cards | inside hero, y +341.59 | inside hero, y +341.60 | inside hero, y +230 | own section, y 369, h 648 |
| Form + Map | y 645.41 (parent h **763**) | y 646 (parent h 1088, inner y +120) | y 740, h 1158 | y 1041, h 1261 |

---

## 2. Hero

Node: AR `862:445`, EN `1475:2549`.

- **Background**: one full-bleed photograph, `object-cover`, plus an overlay
  `linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.55))`. Identical in both languages.
- **Title block**: `flex flex-col gap-16 items-center justify-center`, h 411, colour `--color-text-inverse`.
  - AR: Alexandria Black **56px**, `whitespace-nowrap`, `text-right`; positioned `left 109, top 204.59`.
  - EN: Inter Black **56px**, `min-w-full w-[min-content]` (renders flush left); positioned `left 0, top 0`.
  - Subtitle: 18px (`--typography-body-lg-desktop`), Regular, `opacity .85`, `w-[600px]`.
- **Decoration**: four brand swooshes, all rotated −35°, painted at 60 % opacity in the EN frame:
  red 202 × 23 @ (−17, 21.6), green 289 × 38 @ (10, 8.7), white 231 × 26 @ (1221, 369.5),
  red-small 145 × 17 @ (1310, 406.8). Angle is fixed brand geometry — ADR-0059 §D7.1 forbids mirroring it.

**Tablet**: title block is `flex flex-col gap-12 items-center justify-center px-40 text-center`, title
Alexandria Black **28px**, subtitle **15px** `opacity .85`. Sits at the top of the hero (y 40), not centred.

**Mobile**: title at y 32, subtitle at y 86; cards are a separate section below the hero.

---

## 3. Contact cards

Four cards: Phone, Email, Location, Working Hours. Each is
`flex flex-col items-center justify-center` with an icon ring, a label and a value.

| Part | Desktop | Mobile |
|---|---|---|
| Card | `rounded-[--radius-md]` 12, `backdrop-blur-12`, border 1 `rgba(255,255,255,0.2)`, `drop-shadow(0 12px 14px rgba(0,0,0,0.15))` | same, `rounded-12` |
| Padding / gap | px 24 / py 32, gap 12 | px 16 / py 24, gap 8 |
| Icon ring | `border-2` white, radius 26, size 52 | radius 22, size 44 |
| Icon | 22 | 18 |
| Label | Alexandria Bold **13** (`--typography-label-desktop`), white, centred | 13 |
| Value | Alexandria Medium **16** (`--typography-body-desktop`), white, centred | **14** |

The one card that departs from this is **AR desktop card 1 (الهاتف)**, which is
`bg-[--color-surface-base]`, `border 1 [--color-border-default]`,
`drop-shadow(0 4px 8px rgba(0,0,0,0.06))`, a **green** icon ring (`border-2 [--color-brand-primary]`),
label `--color-text-secondary` and value `--color-text-primary`. No other frame does this — see **§8 C2**.

### Card fills, as measured in each frame

| Frame | Phone | Email | Location | Working Hours |
|---|---|---|---|---|
| AR desktop | **white** `--color-surface-base` | `#00843d → #005c2e` | `#14b8a6 → #0f766e` | `#2563eb → #1e40af` |
| AR tablet | `#00843d → #005c2e` | `#00843d → #005c2e` | teal | blue |
| AR mobile | `#00843d → #005c2e` | `#00843d → #005c2e` | teal | blue |
| EN desktop | `var(--color-green-500) → var(--color-green-600)` | same | same | same |
| EN tablet | green (translucent) | teal (translucent) | blue (solid) | green (translucent) |
| EN mobile | `NOT EXTRACTED` — geometry matches AR mobile | | | |

Six frames, **four different colour schemes**. Only the EN desktop row is bound to design-system
variables. See **§8 C2** — this is the decision that blocks the build.

---

## 4. Form

| Field | AR label | EN label | Required | AR placeholder | EN placeholder | AR icon |
|---|---|---|---|---|---|---|
| Name | الاسم | Name | **yes, both** | مثال: محمد أحمد | e.g., John Doe | user 18 |
| Phone | رقم الهاتف | Phone Number | no | مثال: ‎+971 50 123 4567 | e.g., +971 50 123 4567 | phone 18 |
| Email | البريد الإلكتروني | Email Address | **AR no · EN yes** | example@email.com | example@email.com | mail 18 |
| Message type | نوع الرسالة | Message Type | **yes, both** | اختر: اقتراح / شكوى / استفسار | Select: Suggestion / Complaint / Inquiry | chevron-down 18 |
| Subject | موضوع الرسالة | Subject | no | عنوان مختصر لرسالتكم | Brief title of your message | tag 18 |
| Message | الرسالة | Message | **yes, both** | اكتب رسالتكم بالتفصيل هنا... | Write your message in detail here... | — |

Row grouping on desktop and tablet: `[Name | Phone]`, `[Email]`, `[Message type | Subject]`, `[Message]`.
Mobile stacks all six.

**Controls.** `border 1 [--color-border-default]`, `rounded-[--radius-md]` 12,
`bg-[--color-surface-base]`, `px 14 / py 13`, gap 10, placeholder Regular 16 `--color-text-secondary`.
The AR frame adds an inner shadow `inset 0 2px 6px rgba(0,0,0,0.07)` and a trailing 18px icon; the EN
frame has neither, and renders the select's chevron as the literal character `⌄` at Inter Bold 14.

**Labels.** Medium 13 (`--typography-label-desktop`), `--color-text-primary`, with the required marker as
a Bold span in `#d32f2f` (`--color-semantic-danger`). Gap between label and control: 6.

**Submit.** Full width, `rounded-[--button-radius]` 8, label Bold 16 `--color-text-inverse`.
- AR: h 52, `linear-gradient(174.29deg, --color-green-500 25%, --color-green-600 75%)`,
  `border 1 rgba(255,255,255,0.2)`, `shadow: 0 2px 8px rgba(0,0,0,.1), 0 10px 24px rgba(0,132,61,.25)`.
- EN: h 52, flat `--color-brand-primary`, no border, no shadow.

**Consent line.** Regular 13 (`--typography-caption-desktop`), `--color-text-secondary`, full width, with
the policy name as a Medium span in `#00843d`.
- AR: «بإرسال هذا النموذج، فإنك توافق على معالجة البيانات المقدمة وفقًا ل» + «سياسة الخصوصية المعتمدة لدى الاتحاد.»
- EN: "By sending this form, you agree to the processing of the provided data in accordance with the " +
  "Privacy Policy approved by the Federation."

**Form card shell.**
- AR: `backdrop-blur-14`, `linear-gradient(to right, #fffdf5, #f3f4f6)`, `border 1 rgba(0,132,61,0.2)`,
  `drop-shadow(0 10px 14px rgba(0,0,0,0.08))`, p 40, gap 24, `rounded-[--radius-lg]` 16.
- EN: `bg-[--color-surface-base]`, `border 1 [--color-border-default]`,
  `drop-shadow(0 4px 8px rgba(0,0,0,0.06))`, same padding, gap and radius.

**Heading.** Black 32 (`--typography-h2-desktop`), `--color-text-primary`.
AR «أرسل لنا رسالة» · EN "Send Us a Message". The AR frame adds a `title-block`: a 120 × 6 green bar
(`--color-green-500`, radius 999) under the heading plus two absolutely-placed 64 × 4 accent lines at
`right −12 / top −12` and `right −12 / bottom −12`. The EN frame has none of this.

---

## 5. Map

**Heading.** Black 32. AR «موقعنا» in `--color-green-500`; EN "Our Location" in `--color-text-primary`.

**Map frame.** h 380 (desktop), `w-full`, `bg-[--color-surface-sunken]`, `border 1 #00843d`,
`rounded-[--radius-lg]` 16, `shadow 0 6px 18px rgba(0,0,0,0.1)`, `overflow-clip`. It holds a raster image
fill — a static picture of Abu Dhabi / Zayed Sports City, **not a live map embed**.

**Pin bubble**, centred: `bg-[--color-surface-base]`, `drop-shadow(0 4px 6px rgba(0,0,0,0.12))`,
`px 12 / py 8`, `rounded-8`, gap 4, over a 12px anchor pin with an 8px gap.
- Row: 14px map-pin icon + title, Bold **13**, `--color-text-primary`.
  AR/EN both read "UAEAF Headquarters".
- Subtitle, Regular **11px**, `--color-text-secondary`.
  AR «مدينة زايد الرياضية، أبوظبي» · EN "Zayed Sports City, Abu Dhabi".
  **11px is below Chapter 4's 13px floor and is not covered by either ADR-0041 exception — see §8 C4.**

**CTA row.** `flex gap-12 items-center w-full`, buttons `px 16 / py 14`,
`rounded-[--button-radius]` 8, label SemiBold 14.
- Primary — AR «عرض الموقع على خرائط Google» / EN "View on Google Maps".
  AR: `bg-[--color-surface-base]` + `border 1 [--color-green-500]`, label `--color-green-500`.
  EN: `bg-[--color-brand-primary]`, label `--color-text-inverse`.
- Secondary — AR «فتح الاتجاهات» / EN "Open Directions":
  `border 1 [--color-border-strong]`, label `--color-text-primary`. Identical in both.
- Order mirrors correctly: the primary sits at the reading start in both languages (right in AR, left in
  EN). Mobile stacks them, secondary above primary.

**Note.** Regular 13, `--color-text-secondary`, full width.
- AR «* سيتم تفعيل الرابط فور اعتماد عنوان خرائط Google الرسمي من الاتحاد.»
- EN "* The link will be activated once the official Google Maps address is approved by the Federation."

**Map column shell.** AR wraps the whole column in a panel:
`linear-gradient(to right, #e8f5ed, #d1fae5)`, p 24, `rounded-[--radius-lg]` 16, `items-end`, gap 20.
The EN frame has no panel — the heading, map, CTAs and note sit directly on the section ground.

---

## 6. Section ground

- AR `Contact Content`: `linear-gradient(to right, #f7f7f8, #f3f4f6 50%, #e8f5ed)`.
- EN `Form + Map Section`: flat `--color-surface-base`.

Section padding, both: `pt 16 / pb 80 / px 96`, column gap 48.

**Column order mirrors correctly.** AR places the form left and the map right; EN places the map left and
the form right. Under `dir`, both put the **map at the reading start** — the composition mirrors, and no
locale conditional is needed, only logical properties.

---

## 7. Token bindings read from the file

`--color-brand-primary` #00843d · `--color-brand-secondary` #c8102e · `--color-green-500` #00843d ·
`--color-green-600` #006b31 · `--color-text-primary` #000000 · `--color-text-secondary` #616058 ·
`--color-text-inverse` #ffffff · `--color-text-link` #00843d · `--color-surface-base` #fdfcfb ·
`--color-surface-sunken` #fafaf8 · `--color-border-default` #e0dfdb · `--color-border-strong` #757470 ·
`--color-semantic-danger` #d32f2f · `--radius-md` 12 · `--radius-lg` 16 · `--button-radius` 8 ·
`--typography-h2-desktop` 32 · `--typography-body-desktop` 16 · `--typography-label-desktop` 13 ·
`--typography-caption-desktop` 13.

Values the file uses **without** a binding, i.e. raw hex with no variable behind it:
`#14b8a6` `#0f766e` `#2563eb` `#1e40af` `#005c2e` `#fffdf5` `#f3f4f6` `#f7f7f8` `#e8f5ed` `#d1fae5`.
Every one is a CLAUDE.md §16 gap. See §8.

**Typeface.** The EN frames are set in **Inter**. The project's approved Latin face is IBM Plex Sans
(Chapter 3, `--font-ibm-plex-sans`); Inter is a Figma-side placeholder and must not be introduced.
The AR frames use Alexandria, which is correct.

---

## 8. Conflicts — all five resolved in ADR-0064

### C1 — The AR desktop hero title is invisible

The AR desktop title block sits at `top 204.59` with `h 411` and centres its content, putting the 56px
«تواصل معنا» at roughly y 365. The cards row starts at y 341.59 and is ~176 tall. **The cards cover the
title completely.** Verified by rendering `862:445`: no title appears, and only a fragment of the subtitle
(«…للإجا») shows between cards 3 and 4.

Every other frame keeps the title clear: EN desktop puts the block at `top 0`, AR tablet at y 40, AR
mobile at y 32. This is a stacking error in one frame, not a design intent.

**Recommendation:** treat the EN desktop composition as correct — title block at the top of the hero,
cards below it — and apply it to AR. Building the AR frame literally would ship a page whose `<h1>` is
invisible, which is also a WCAG 2.4.6 / SEO problem, not only a visual one.

### C2 — The four cards have four different colour schemes, and two colours are not UAEAF colours

See the matrix in §3. Beyond the inconsistency, `#14b8a6` / `#0f766e` (teal) and `#2563eb` / `#1e40af`
(blue) are **not in the UAEAF palette at all** — they are Tailwind's default `teal-500/700` and
`blue-600/800`. The identity is green, red and black (Chapter 1, ADR-0003), and ADR-0050 sets the usage
budget at ~70–80 % neutral / 15–20 % green / ≤5 % red. A four-colour card row with two foreign hues is
outside every one of those rules.

`#005c2e` is likewise not a step of the published green ramp (600 is `#006b31`, 700 is `#005226`).

**I cannot reproduce these colours without an explicit ruling** — CLAUDE.md §2 and §16 forbid it.

**Recommendation:** build the **EN desktop scheme** — all four cards `--color-green-500 → --color-green-600`,
white icon ring, white text. It is the only variant bound to design-system variables, it is
brand-compliant, and it is already the design in one of the six frames, so it is not an invention. If the
federation wants the cards visually distinguished, the systematic way is one green with four different
icons (already the case), not four unrelated hues.

### C3 — AR and EN desktop are two different design iterations

The AR desktop frame is materially richer than the EN one: gradient section ground, gradient glass form
card with a green-tinted border and accent bars, icons inside every input, an inner shadow on the
controls, a gradient submit button, and a tinted panel behind the map. The EN frame has none of these —
flat ground, plain white card, no input icons, flat submit, no map panel.

CLAUDE.md §12 requires bilingual consistency. One of the two is the current design and the other is stale.

**Recommendation:** the AR desktop frame is the later iteration (it is the one the owner sent as "the
design"), so take it as the visual target and **mirror its treatment into English**, with C2's colour
ruling applied. That means English gains the accent bar, the input icons, the gradient submit and the map
panel — which the EN Figma frame does not show.

### C4 — The map pin subtitle is 11px

Chapter 4 sets a 13px floor and ADR-0041 documents exactly two exceptions, neither of which is this
component. 11px also fails the readability bar for a real address.

**Recommendation:** render it at `text-caption` (13px). The bubble has room; nothing else moves.

### C5 — Two dead artefacts in the AR desktop frame

`Contact Cards Row Hidden` (`1192:2590`) sits inside `Contact Content` at height ≈ 0 and holds a second,
white-card copy of all four cards. And `Contact Content` declares `h 763` while its only real child,
`Form + Map Section`, is `h 888` — a 125px overflow. The EN frame is internally consistent
(1088 = 120 + 888 + 80).

**No decision needed** — these are leftovers, recorded so a future reader does not treat them as intent.
The EN arithmetic is the one to build to.

---

## 9. What the design does not specify

Per CLAUDE.md §1a, each of these is derived from an approved rule and cited, not invented.

| Gap | Resolution | Authority |
|---|---|---|
| Dark theme | Every colour resolves through the semantic tokens, which already carry all three themes. The hero overlay stays as designed — it sits over a photograph, not over a theme surface. | ADR-0059, ADR-0063 |
| Hover / active / focus states | Project `FOCUS` and `TRANSITION` primitives from `components/ui/interactive.ts`; focus ring `--a11y-focus-ring` with a painted offset. | Chapter 12; ADR-0060 |
| Motion | `--motion-*` tokens only, transform and opacity only, exit faster than enter, full `prefers-reduced-motion` compliance. | ADR-0060, ADR-0062 |
| Breakpoints between the three designed widths | Chapter 5 §5.2 bands: xs ≤639, sm 640–767, md 768–1023, lg 1024–1279, xl 1280–1535, 2xl ≥1536. Tablet frame governs md; mobile governs xs/sm; desktop governs xl+. `lg` interpolates — cards stay 4-across, form and map stay side by side. | Chapter 5 §5.2, §5.10 |
| Form validation and error states | Not designed. Inline messages below the control, `aria-describedby`, `aria-invalid`; error text `--color-semantic-danger` at 13px. | Chapter 12; WCAG 3.3.1 / 3.3.3 |
| Submit success / failure feedback | Not designed. Live region announcing the outcome. | WCAG 4.1.3 |
| Map interaction | Out of scope by owner instruction: a correctly-sized placeholder, no map integration. | Owner, 2026-09-09 |

---

## 10. Content elements → schema fields

Every visible content element, and where it must come from. `contactUsPage` today carries
`heroImageId`, `heroTitle`, `heroSubtitle`, `email`, `phones[]`, `address`, `googleMapsUrl`,
`officeHours`, `website`, `socialLinks`.

| Element | Field | Status |
|---|---|---|
| Hero background photo | `heroImageId` | present |
| Hero title | `heroTitle` | present |
| Hero subtitle | `heroSubtitle` | present |
| Card 1 label + value | `phones[].label`, `phones[].number` | present |
| Card 2 value | `email` | present |
| Card 3 value «أبوظبي، الإمارات» | — | **missing** — a short display location, distinct from the 8-part postal `address` |
| Card 4 value | `officeHours` | present |
| Card 2/3/4 labels | — | **missing** — decide content vs. UI string |
| Form heading | — | **missing** |
| Message-type options | — | **missing** — the select has no source of options |
| Consent line + policy link | — | **missing** |
| Map heading | — | **missing** |
| Map image | — | **missing** — no `mapImageId` |
| Pin bubble title + subtitle | — | **missing** |
| "View on Google Maps" target | `googleMapsUrl` | present |
| "Open Directions" target | — | **missing** — a second URL |
| Map note | — | **missing** |
| Postal address | `address` | present (footer / SEO, not shown on this page) |
| Social links, website | `socialLinks`, `website` | present (footer) |
