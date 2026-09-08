# Strategic Plan (الخطة الاستراتيجية) — Implementation Spec

> **⚠️ THIS FILE IS NOW THE SOURCE OF TRUTH.**
> The UAEAF Figma subscription has lapsed. **Editing is permanently locked**; read access was available only
> during this extraction window and may disappear at any moment. Do not assume the Figma file can be
> re-consulted, re-measured, or corrected. Every value below was read directly from the live file on the
> extraction date and supersedes any earlier derived documentation.
> Where a value could not be read, this file says `NOT EXTRACTED — <reason>` rather than guessing.

| Field | Value |
|---|---|
| Figma file key | `hpO727vjwl18g3s3LTICAY` |
| Extraction date | 2026-09-07 |
| Extraction method | `get_metadata` (structure), `get_design_context` (real values/tokens/copy), `get_variable_defs` (bindings) |
| Figma editability | **LOCKED — permanent** |
| Governing rules | CLAUDE.md §1 (Source of Truth), §2 (No Arbitrary Values), §13 (Responsive), §16 (Tokens) |

## Node index

| Language | Breakpoint | Root node id | Root frame name | Frame size (W × H) |
|---|---|---|---|---|
| AR | Desktop 1440 | `720:624` | Page - Static (AR) - الخطة الاستراتيجية | 1440 × 3955.41 |
| AR | Tablet 768 | `2764:3067` | strategic-plan-tablet-ar | 768 × 3095 |
| AR | Mobile 375 | `2764:3257` | strategic-plan-mobile-ar | 375 × 3789 |
| EN | Desktop 1440 | `2764:3420` | strategic-plan-desktop-en | 1440 × 4287 |
| EN | Tablet 768 | `2764:3606` | strategic-plan-tablet-en | 768 × 3768 |
| EN | Mobile 375 | `2764:3726` | strategic-plan-mobile-en | 375 × 3864 |

**Critical note on AR vs EN:** these are **not** two localisations of one composition. They are two
independently authored page architectures that happen to share a page title. See
[§4 Structural AR-vs-EN differences](#4-structural-ar-vs-en-differences) before implementing.

---

## 1. Responsive comparison table — the reusable responsive system

This is the highest-value artefact in this file: it is the only complete, designer-authored responsive
system in the UAEAF Figma file. Treat it as the reference ramp for future pages.

### 1.1 AR responsive system (`720:624` → `2764:3067` → `2764:3257`)

| Section | Desktop 1440 | Tablet 768 | Mobile 375 |
|---|---|---|---|
| **Page gutter** | 64px (content 1312) | 40px (content 688) | 20px (content 335) |
| **Header** | 1440 × 95.41, full 9-item RTL nav + utilities + logo | 768 × 80, nav collapsed to a 100×100 placeholder, utilities left, logo + wordmark right | 375 × 80, **search only** + logo — no nav, no lang switch |
| **Hero** | 1440 × 420, full-bleed editorial image, text overlaid, `items-end`, px-64, gap-16 | 768 × 400, full-bleed image + overlaid text, px-40 | 375 × 380, full-bleed image + overlaid text, px-20 |
| **Hero eyebrow** | 14px Medium brand-primary | 16px-box (`2764:3097`) | replaced by a **badge row** (`2764:3272`, 167×20) |
| **Hero H1** | 40px Alexandria Black | 39px box (`2764:3098`) | 64px-tall box, 2 lines (`2764:3276`) |
| **Breadcrumb** | 4 levels, pill, 464 wide | 4 levels, 375 wide, split into per-crumb sub-frames | **omitted entirely** — replaced by badge row |
| **Overview** | 800 wide, right-offset at x=576 | 688 full-width | 335 full-width |
| **Divider after overview** | 1312 × 1 (`756:234`) + separate 1312 × 2 timeline connector (`809:374`) | 688 × **2** (`2764:3104`), no connector | 335 × **1** (`2764:3282`), no connector |
| **Timeline / phases** | **4 columns**, cards 300 wide, gap 37.33, icon 44px above numeral | **1 column**, cards full-width 688, badge-accent row (label + 32px numeral chip) right-aligned | **1 column**, cards 335, text column left + 32px icon chip right, gap 12 |
| **Timeline card height** | 219 | 104 | 83 |
| **Pillars grid** | **3 × 2** (2 rows of 3), card 424 × 159, gaps 20/20 | **1 column**, card 640 × 122, stacked | **1 column**, card 303 × 115, gap 12 |
| **Pillar accent bar** | 8px, **LEFT edge** (`left:-1`) | 6px, **RIGHT edge** (`right:-1`) | 4px, **RIGHT edge** (`right:-1`) |
| **Pillar radius / padding / gap** | 12 / 20×24 / 10 | 12 / 20 / 10 | 8 / 14 / 8 |
| **Pillar numeral** | 22px Bold `--color-green-600` | 20px Bold `#00843d` | 16px Bold `#00843d` |
| **Pillar title** | 18px SemiBold | 15px SemiBold | 14px SemiBold |
| **Pillar body** | 14px Regular, lh 1.5 | 13px Regular, lh 1.5 | **12px** Regular, lh 1.4 |
| **Pillar border** | `--color-green-500` | `--color-green-400` | `--color-green-400` |
| **Objectives** | 5 rows, full-width 1312 × 112, 6px accent bar, 1px dividers between | 5 cards 688 × 96, 6px accent, gap 14, no dividers | 5 cards 335 × 98 (last 81), 4px accent, gap 12 |
| **KPIs** | **4 columns**, stat 280 × 129, gap 20, row inset x=66 (1180 wide) | **1 column**, cards full-width 624 × 106 | **1 column**, cards full-width 295 × 74 |
| **KPI numeral** | 56px Alexandria Black, white on green-500 | 44px box | 29px box |
| **KPI label** | 12px Bold, tracking 0.72px | 16px box | 13px box |
| **Execution flow** | **VERTICAL**, 154 × 212, 5 steps + ↓ arrows, English step labels | **HORIZONTAL**, 642 × 17, 5 steps + ← arrows, Arabic step labels | **section absent** |
| **Documents** | 1 doc card, full-width 1312 × 100, buttons left / info right | heading + **empty** 688 × 100 wrapper | **heading only**, no card |
| **Final CTA** | 1312 × 246 | 688 × 247 | 335 × 238 |
| **Footer** | **4 columns** (Contact / Map / Quick Links ×11 / Brand+Social ×5), 1440 × 440 | **3 columns** (Brand / Quick Links ×4 / Contact), 768 × 411, no map, no social icons rendered | **1 column stack** (Brand / Quick Links ×4 / Contact), 375 × 725 |
| **Footer legal** | links left, copyright right, 1312 × 64 | copyright left, 2 links right, 672 × 33 | copyright, then links below, 335 × 58 |

### 1.2 EN responsive system (`2764:3420` → `2764:3606` → `2764:3726`)

| Section | Desktop 1440 | Tablet 768 | Mobile 375 |
|---|---|---|---|
| **Page gutter** | 64px (content 1312) | 40px (content 688) / 24px in footer block | 24px (content 327) |
| **Header** | 1440 × 80, logo + 2-line wordmark, **6** nav links, EN + Search utilities | 768 × 80, **4** nav links | 375 × **64**, wordmark only (subtitle dropped), **no nav, no hamburger** |
| **Hero** | 1440 × 420, **2-column split**: text 784 / visual 656 | 768 × 458, **stacked**: visual 240 on top, content box 218 below | 375 × 320, **empty banner frame** |
| **Hero breadcrumb** | 4 crumbs as separate nodes | **single flattened string** "Home > About > Strategic Plan" | **absent** |
| **Hero eyebrow** | "GOVERNANCE & STRATEGY" 195 × 17 | absent | absent |
| **Overview / intro** | own 1440 × 256 band, divider inside | 768 × 186 band | 375 × 137 band |
| **Timeline / phases** | **4 columns**, card 310 × 168, gap 24, 44px numeral circle + label | **2 × 2**, card 336 × 98, gaps 16/16 | **1 column**, card 327 × 88, gap 16 |
| **Pillars grid** | **3 × 2**, card 421.33 × 178 (card 6 = 198), gaps 24/24, 44px numeral circle | **2 × 3**, card 336 × 98, gaps 16/16 | **1 column**, card 327, heights 69/69/82/82/82/82 |
| **Objectives** | **4** cards, 1312 × 88, gap 16, top row = title + right-aligned category tag | **5** cards, 688 × 50, gap 12, title left + description right on one line | **5** cards, 327 × 100, gap 12, numeral / title / body stacked |
| **KPIs** | **4 columns**, card 310 × 136, gap 24, numeral 59-box | **2 × 2**, card 336 × 94, gaps 16/16 | **2 × 2**, card 157.5 × 53, gaps 12/12, numeral + label side-by-side |
| **Execution flow** | **HORIZONTAL**, 764 × 40, 5 pill steps + ➔ | **HORIZONTAL**, 496 × 17, 5 steps + **←** (RTL arrow in an LTR page) | **VERTICAL**, 327 × 217, 5 steps + ↓ |
| **Execution placement** | own band `2764:3554` at page level | **nested inside the Footer Master** (`2764:3851`) | own band `2764:3919` at page level |
| **Documents** | 1 card, 410 × 255 (not full-width) | **heading only**, 768 × 104 | **heading only**, 375 × 70 |
| **Final CTA** | 1440 × 343, page level | 720 × 228, **inside the footer** (`2764:3864`) | 375 × 211, page level |
| **Footer** | **3 columns** (Brand / Quick Links ×4 / Contact), 1440 × 338 | **1 column stack**, 768 × 1390 (includes CTA + execution), Quick Links ×**11** | **1 column stack**, 375 × 731, Quick Links ×**5** |

### 1.3 Derived breakpoint rules (safe to reuse)

These hold consistently across both languages and all three widths, and are the parts of the system
most reusable on future pages:

1. **Gutters:** 1440 → 64px · 768 → 40px · 375 → 20px (AR) / 24px (EN).
   Content widths: 1312 / 688 / 335 (AR), 1312 / 688 / 327 (EN).
2. **Grid collapse:** 3-up → 1-up (AR) or 2-up (EN) at 768 → always 1-up at 375, except EN KPIs which
   stay 2-up at 375.
3. **Card radius ramp:** 16 (feature/stat) and 12 (pillar) at ≥768 → 8 at 375.
4. **Card padding ramp:** 24 → 20 → 14.
5. **Card inner gap ramp:** 16/10 → 10 → 8.
6. **Accent-bar ramp:** 8px → 6px → 4px.
7. **Type ramp (pillar family):** numeral 22/20/16 · title 18/15/14 · body 14/13/12.
8. **Section rhythm:** desktop sections separated by a 1px full-width divider at 33px above/below the
   section box; tablet uses a 2px green divider only after the overview; mobile uses a single 1px line.

---

## 2. Per-section specification

Fonts throughout are **Alexandria** (Regular 400 / Medium 500 / SemiBold 600 / Bold 700 / Black 900).
Token names below are the Figma variable names as bound; a raw hex means **no token was bound**.

### 2.1 Design tokens observed on this page

Bound on `720:624` (AR desktop) and `2764:3067` (AR tablet):

| Token | Value |
|---|---|
| `--color-text-primary` | `#000000` |
| `--color-text-secondary` | `#616058` |
| `--color-text-inverse` | `#ffffff` |
| `--color-surface-base` | `#fdfcfb` |
| `--color-surface-raised` | `#ffffff` |
| `--color-border-default` | `#e0dfdb` |
| `--color-brand-primary` | `#00843d` |
| `--color-brand-black` | `#000000` |
| `--color-green-50` | `#e8f5ed` |
| `--color-green-400` | `#1a9448` |
| `--color-green-500` | `#00843d` |
| `--color-green-600` | `#006b31` |
| `--color-gray-1000` | `#000000` (tablet only) |
| `--radius-lg` | `16` |
| `--typography-caption-desktop` | `13` |
| `Type/Caption` | Alexandria Regular, size `--typography-caption-desktop`, weight 400, lh 1.4, ls 0 |

Bound on `2764:3420` (EN desktop) — a **different, smaller** set:

| Token | Value |
|---|---|
| `--color-surface-base` | `#fdfcfb` |
| `--color-text-primary` | `#000000` |
| `--color-text-secondary` | `#616058` |
| `--color-border-default` | `#e0dfdb` |
| `--color-brand-primary` | `#00843d` |
| `--radius-lg` | `16` |
| `Elevation/1` | DROP_SHADOW `#0000000F`, offset (0,1), radius 2, spread 0 |

> The EN desktop frame binds **no green-scale tokens at all** — its greens are hardcoded. See §5.

### 2.2 AR Desktop `720:624`

| Section | Node | Position / size | Layout & values |
|---|---|---|---|
| Header | `720:625` | 0,0 · 1440 × 95.41 | "Header (Approved Master Component)". Utilities `720:626` at x 23.85 (☾ / بحث / AR \| EN, 16px). Nav `720:630` 1037.85 wide, 9 items RTL order: تواصل معنا · المركز الاعلامي▾ · الاخبار و المقالات▾ · الفاعليات · البطولات · الاعضاء▾ · الاندية · عن الاتحاد▾ · الرئيسية. Item label row 19px tall, 6px inset; active indicator 1.99px (2.48px on الرئيسية). Logo `720:675` 120 × 95.41. |
| Hero | `756:213` | 0,95.41 · 1440 × 420 | Editorial Image `756:202` full-bleed. Hero Text `756:210`: flex-col, `items-end`, `justify-center`, px 64, gap 16. |
| — Breadcrumb | `720:687` | 912,123.5 · 464 × 33 | Pill: radius 999, bg `rgba(0,0,0,0.4)`, backdrop-blur 8px, border `rgba(255,255,255,0.1)`, px 12 / py 8, gap 8. Current "الخطة الاستراتيجية" 14px Medium `--color-text-primary`. Separator "‹" 14px Regular `--color-text-secondary`. "الحوكمة والاستراتيجية" **12px Bold `--color-brand-primary`, tracking 0.96px**. "عن الاتحاد" / "الرئيسية" 14px Regular `--color-text-secondary`. |
| — Eyebrow | `756:211` | 1236,172.5 · 140 × 17 | "الحوكمة والاستراتيجية" — 14px Medium `--color-brand-primary`. |
| — H1 | `720:691` | 64,205.5 · 1312 × 49 | "الخطة الاستراتيجية" — **40px Alexandria Black**, `--color-text-primary`, right-aligned. |
| — Lede | `756:212` | 64,270.5 · 1312 × 26 | 16px Regular, lh 1.6, `--color-text-secondary`. Copy: "خارطة طريق واضحة لتطوير ألعاب القوى الإماراتية، وتعزيز الأداء الرياضي، وبناء منظومة مستدامة تضع الرياضي في قلب المستقبل." |
| Content wrapper | `720:686` | 0,515.41 · 1440 × 3000 | |
| Strategic Overview | `756:214` | 576,64 · 800 × 101 | H2 `756:215` "خارطة طريق نحو المستقبل" 320 × 29 (right-offset x 480). Body `756:216` 800 × 52. |
| Divider | `756:234` | 64,197 · 1312 × 1 | |
| Timeline connector | `809:374` | 64,230 · 1312 × 2 | Horizontal rule the 4 phase icons sit on. |
| Timeline Row | `756:217` | 64,264 · 1312 × 267 | 4 cards 300 × 219 at x 0 / 337.33 / 674.67 / 1012 (gap 37.33). Each: icon frame 44 × 44 at x 128 y 20 (inner glyph 22px); numeral 49px-tall box at y 72; title 22px-tall box at y 129; body 260 × 40 at (20,159). Icons: `layers` · `trending-up` · `trophy` · `sparkles`. |
| Divider | `756:235` | 64,563 · 1312 × 1 | |
| Strategic Pillars | `757:202` | 64,596 · 1312 × 441 | H2 `757:203` 229 × 29 right-aligned. Lede `757:204` 1312 × 26 at y 53. Grid `757:235` at y 103, 1312 × 338: Row 1 `757:236` (y 0) and Row 2 `757:237` (y 179) — row gap 20. Cards 424 × 159 at x 0 / 444 / 888 — column gap 20. |
| — Pillar card | `757:205` | 424 × 159 | bg `white`; border 1px `--color-green-500`; radius **12**; flex-col, `items-end`, gap **10**; px **20** / py **24**; `overflow-clip`. Accent bar `2701:21` 8px wide, **left edge**, `--color-green-400`, inset -1 top/bottom. Numeral 22px Bold `--color-green-600`. Title 18px SemiBold `--color-text-primary`. Body 14px Regular lh 1.5 `--color-text-secondary`. |
| Divider | `757:238` | 64,1069 · 1312 × 1 | |
| Strategic Objectives | `757:239` | 64,1102 · 1312 × 617 | H2 `757:240` 367 × 29. List `757:241` at y 53, 1312 × 564. 5 rows of 1312 × 112 at y 0/113/226/339/452, each followed by a 1312 × 1 divider (`757:246`, `757:251`, `757:256`, `757:261`). Each row: accent bar 6px left; numeral 16–19 × 17 at (1296/1293, 20); title 22px-tall at y 43; body 1312 × 21 at y 71. |
| Divider | `757:266` | 64,1751 · 1312 × 1 | |
| KPIs | `758:202` | 64,1784 · 1312 × 230 | H2 `758:203` 299 × 29 at y 24, centred. KPI Row `758:204` at (66,77), 1180 × 129 — 4 stats 280 × 129 at x 0/300/600/900 (gap 20). |
| — Stat card | `758:214` | 280 × 129 | bg `--color-green-500`; radius **16**; p **20**; flex-col, `items-center`, gap **6**; shadow `0 10 28 -10 rgba(0,0,0,0.25)`; `overflow-clip`. Value **56px Alexandria Black white**. Label **12px Bold white, tracking 0.72px**. Values: `2030` / `15` / `+30%` / `+25%`. Labels: أفق الخطة الاستراتيجية · برنامجًا للتطوير والتأهيل · زيادة المشاركة في المنافسات · نمو قاعدة المواهب. |
| Divider | `758:217` | 64,2046 · 1312 × 1 | |
| Execution | `758:218` | 64,2079 · 1312 × 333 | H2 `758:219` 313 × 29. Body `758:220` 760 × 52 at (276,49). Flow `758:221` at (579,121), 154 × 212 — **vertical**, 5 labels + 4 "↓", 24px step pitch. Labels are **English in an Arabic page**: STRATEGIC PILLAR / OBJECTIVE / INITIATIVE / MEASUREMENT / IMPACT. |
| Divider | `758:231` | 64,2444 · 1312 × 1 | |
| Documents | `758:232` | 64,2477 · 1312 × 149 | H2 `758:233` 228 × 29. Card `758:234` 1312 × 100 at y 49: Doc Buttons `758:238` at (28,31.5) 250 × 37 — "تحميل PDF" 115 × 37 and "عرض الوثيقة" 123 × 37, gap 12, label 17px-tall at (20,10). Doc Info `758:235` at (302,28) 982 × 44 — title "الخطة الاستراتيجية للاتحاد" 219 × 22, meta "وثيقة استراتيجية · PDF · الإصدار 01.0" 210 × 16. |
| Final CTA | `758:243` | 64,2658 · 1312 × 246 | Container only — **NOT EXTRACTED — frame has no child nodes; CTA content undefined in Figma.** |
| Footer | `720:693` | 0,3515.41 · 1440 × 440 | Grid `720:694` at (64,42) 1312 × 364, 4 columns 292 wide at x 0 / 340 / 680 / 1020 (gap 48). Contact `720:695` 162 tall · Map `720:704` 208 tall (placeholder 250 × 180) · Quick Links `720:713` 316 tall, 11 links, 30px pitch · Brand `720:725` 211 tall (logo 36.43 × 36, name 17px, blurb 260 × 84, social row 192 × 32 = 5 × 32 icons gap 8). Legal `720:751` at (64,406) 1312 × 64: 4 links left, copyright 351 × 16 right. |

Decorative vectors on every AR section: `swoosh-decor` ×3–4 plus the named brand swooshes
"خط أحمر — Red Swoosh", "خط أخضر — Green Swoosh", "خط أبيض/أسود — White/Black Swoosh",
"خط أحمر صغير — Red Swoosh Small", all rotated −35° (brand swooshes) or −33.45°/+21.84°/−15°/+18°
(generic decor). Export from Figma before access is lost if not already committed.

### 2.3 AR Tablet `2764:3067`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2764:3068` | 0,0 · 768 × 80 | Utilities `2764:3069` at (40,32) — "EN \| AR" then "بحث". Nav `2764:3072` at (292,−10) **100 × 100, empty placeholder**. Logo `2764:3073` at (549,20) 179 × 40 = mark 50 × 40 + wordmark "اتحاد ألعاب القوى" 121 × 17. |
| Hero | `2764:3080` | 0,80 · 768 × 400 | Hero Image `2764:3081` full-bleed. Red + Green swooshes at (10,40) and (25,65). Text `2764:3084`: breadcrumb row `2764:3085` at (353,112) 375 × 25 with per-crumb sub-frames; eyebrow at (592,153) 136 × 16; H1 at (40,185) 688 × 39; lede at (40,240) 688 × 48. |
| Content wrapper | `2764:3100` | 0,480 · 768 × 2204 | Named "Strategic Overview" but contains the whole body. |
| Overview header | `2764:3101` | 40,56 · 688 × 89 | H2 320 × 29 right-aligned; body 688 × 48. |
| Green divider | `2764:3104` | 40,185 · 688 × **2** | |
| Timeline | `2764:3105` | 40,227 · 688 × 146 | H3 `2764:3106` 224 × 22. Grid `2764:3107` at y 46, 688 wide. 4 phase cards `2764:3108/3114/3120/3126`, each **688 × 104, full width, auto-layout stacked**. Each: badge accent right-aligned (label 20px-tall + 32 × 32 numeral chip, gap 8) at y 20; body 648 × 20 at (20,64). |
| Pillars | `2764:3132` | 40,413 · 688 × 244 | H2 at (454,24) 210 × 27; lede at (24,75) 640 × 21. Grid `2764:3135` at (24,120) 640 wide — **6 cards 640 × 122, 1 column, auto-layout**. |
| — Pillar card | `2764:3136` | 640 × 122 | bg `white`; border 1px `--color-green-400`; radius **12**; p **20**; gap **10**; `items-end`. Accent `2764:3137` **6px, right edge**, `#00843d`. Numeral **20px Bold `#00843d`**. Title **15px SemiBold** `--color-text-primary`. Body **13px Regular lh 1.5** `--color-text-secondary`. |
| Objectives | `2764:3166` | 40,697 · 688 × 583 | H2 336 × 27. Stack `2764:3168` at y 47 — 5 cards 688 × 96 at y 0/110/220/330/440 (gap 14). Each: 6px accent right; numeral 15–18 × 16 at y 16; title 20px-tall at y 36; body 640 × 20 at (20,60). |
| Execution flow | `2764:3194` | 40,1320 · 688 × 109 | H2 349 × 24 centred. Flow `2764:3196` at (23,68) 642 × 17 — **horizontal, RTL**, Arabic labels: مستهدف الأثر ← مؤشر القياس ← مبادرات التنفيذ ← الأهداف التفصيلية ← المحور الاستراتيجي. |
| KPIs | `2764:3206` | 40,1469 · 688 × 212 | H2 250 × 24 centred. Grid `2764:3208` at (32,80) 624 wide — 4 cards **624 × 106, full width, stacked**. Numeral 44px-tall box, label 16px-tall. |
| Documents | `2764:3221` | 40,1721 · 688 × 140 | H2 190 × 24. Wrapper `2764:3223` 688 × 100 — **empty**. |
| Final CTA | `2764:3224` | 40,1901 · 688 × 247 | **NOT EXTRACTED — no child nodes.** |
| Footer | `2764:3230` | 0,2684 · 768 × 411 | Grid `2764:3231` at (48,56) 672 × 258, **3 columns 197.33 wide** at x 0 / 237.33 / 474.67 (gap 40). Brand 258 tall (social row `2764:3239` is a **100 × 100 empty placeholder**). Quick Links **4 items** 28px pitch. Contact 100 tall. Legal `2764:3251` at (48,354) 672 × 33 — copyright 297 left, 2 links right. |

### 2.4 AR Mobile `2764:3257`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2764:3258` | 0,0 · 375 × 80 | Utilities `2764:3259` at (16,32) = **"بحث" only**. Logo `2764:3261` at (309,20) 50 × 40. **No hamburger, no AR\|EN switch.** |
| Hero | `2764:3267` | 0,80 · 375 × 380 | Image `2764:3268` full-bleed. Red/Green swooshes at (5,30)/(15,50). Text `2764:3271`: badge row `2764:3272` at (188,192) 167 × 20 — "خطة 2030" ★ "الخطة الاستراتيجية" (12px). H1 `2764:3276` at (20,224) 335 × 64. Lede `2764:3277` at (20,300) 335 × 40. |
| Content wrapper | `2764:3278` | 0,460 · 375 × 2604 | |
| Overview | `2764:3279` | 20,40 · 335 × 94 | H2 266 × 24 at x 69; body 335 × 60. |
| Green line | `2764:3282` | 20,162 · 335 × 1 | |
| Timeline | `2764:3283` | 20,191 · 335 × 400 | H3 199 × 20. 4 phase cards 335 × 83 at y 32/127/222/317 (gap 12). Each: Text Column 263 × 55 at (14,14) — title 17px-tall + body 34px-tall (gap 4); Icon Holder 32 × 32 at (289,25.5) with numeral. |
| Pillars | `2764:3309` | 20,619 · 335 × 820 | H2 172 × 22 at y 16. Stack `2764:3311` at (16,54) 303 wide — 6 cards 303 × 115 at y 0/127/254/381/508/635 (gap 12). |
| — Pillar card | `2764:3312` | 303 × 115 | bg `white`; border 1px `--color-green-400`; radius **8**; p **14**; gap **8**; `items-end`. Accent `2764:3313` **4px, right edge**, `#00843d`. Numeral **16px Bold `#00843d`**. Title **14px SemiBold**. Body **12px Regular lh 1.4** `--color-text-secondary`. |
| Objectives | `2764:3342` | 20,1467 · 335 × 555 | H2 249 × 22. 5 cards 335 wide at y 34/144/254/364/474 (gap 12); heights 98 × 4 then 81. 4px accent right; numeral 15px-tall at y 12; title 17px-tall at y 31; body 311 wide at (12,52). |
| KPIs | `2764:3369` | 20,2050 · 335 × 176 | H3 210 × 20 at y 20 centred. Grid `2764:3371` at (20,56) 295 wide — 4 cards **295 × 74, full width, stacked**. Numeral 29px-tall, label 13px-tall 267 wide. |
| Documents | `2764:3384` | 20,2254 · 335 × 20 | **Heading only** — "الوثائق الاستراتيجية" 152 × 20. No card. |
| CTA | `2764:3386` | 20,2302 · 335 × 238 | **NOT EXTRACTED — no child nodes.** |
| Footer | `2764:3390` | 0,3064 · 375 × 725 | Grid `2764:3391` at (20,56) 335 × 547 — 1 column: Brand 239 (social row `2764:3399` again a 100 × 100 placeholder) at y 0 · Quick Links 128 (4 items) at y 279 · Contact 100 at y 447. Legal `2764:3411` at (20,643) 335 × 58. |

### 2.5 EN Desktop `2764:3420`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2764:3421` | 0,0 · 1440 × 80 | **"Header Master" — a different master from AR.** Logo container at (40,22) 224 × 36 = mark 36 + text branding 180 × 28 ("UAE ATHLETICS FEDERATION" 15px-box / "Strategic Plan 2026 - 2030" 11px-box). Nav `2764:3430` at (515.5,32) 557 wide, **6 links**: Strategic Plan · About Us · Clubs · Athletes · Championships · Media Center. Utilities at (1324,32.5) 76 wide: "EN" + "Search". |
| Hero | `2764:3440` | 0,80 · 1440 × 420 | **2-column split.** Text column `2764:3441` 784 wide; visual column `2764:3453` 656 wide at x 784 (**no child nodes — image not placed**). Breadcrumb `2764:3442` at (64,112.5) 320 × 29, 4 crumbs with ">" separators. Eyebrow "GOVERNANCE & STRATEGY" at (64,157.5) 195 × 17. H1 "Strategic Plan" at (64,190.5) 297 × 49. Lede at (64,255.5) 656 × 52. |
| Overview | `2764:3456` | 0,500 · 1440 × 256 | H2 "A Roadmap to the Future" at (64,80) 372 × 34. Body at (64,138) 1312 × 52. Divider `2764:3459` at (64,214) 1312 × 2. |
| Timeline band | `2764:3460` | 0,756 · 1440 × 389 | H2 at (64,80) 382 × 29. Container at (64,141) 1312 × 168 — 4 cards 310 × 168 at x 0/334/668/1002 (**gap 24**). Card: icon wrapper at (24,24) = 44 × 44 numeral circle + label 22px-tall at x 56; body 262 × 60 at (24,84). Labels: Foundation / Development / Competitiveness / Impact. |
| Pillars | `2764:3487` | 0,1145 · 1440 × 664 | Title group at (64,80) 526 × 64. Grid at (64,184) 1312 × 400: Row 1 `2764:3807` (y 0, h 178), Row 2 `2764:3814` (y 202, h 198) — **row gap 24**. Cards 421.33 wide at x 0 / 445.33 / 890.67 (**gap 24**). Card 6 is 198 tall (body wraps to 60). Card: 44 × 44 numeral circle at (24,24); title 22px-tall at y 80; body 40px-tall at y 114, 373.33 wide. |
| Objectives | `2764:3516` | 0,1809 · 1440 × 624 | H2 at (64,80) 409 × 32. Stack at (64,144) 1312 × 400 — **4** cards 1312 × 88 at y 0/104/208/312 (gap 16). Card: Top Row 1272 × 20 at (20,20) = title left + right-aligned category tag (15px-tall); body 1272 × 20 at (20,48). Tags: ACTIVE PERFORMANCE / COMMUNITY ENLISTMENT / ATHLETIC RANGE / UPGRADED TOURNAMENTS. |
| KPIs | `2764:3539` | 0,2433 · 1440 × 370 | H2 at (506.5,80) 427 × 34, centred. Row at (64,154) 1312 × 136 — 4 cards 310 × 136 at x 0/334/668/1002 (gap 24). Card: value 59px-tall at (24,24) **left-aligned**; label 17px-tall at (24,95). |
| Execution | `2764:3554` | 0,2803 · 1440 × 332 | H2 at (521,80) 398 × 32. Body at (340,144) 760 × 36. Flow `2764:3557` at (338,212) 764 × 40 — **horizontal**, 5 pill steps + "➔": Strategic Pillar (139) ➔ Objective (104) ➔ Initiative (100) ➔ Measurement (133) ➔ Impact (88); label at (20,12), 16px-tall. |
| Documents | `2764:3572` | 0,3135 · 1440 × 471 | H2 at (64,80) 288 × 32. Card `2764:3821` at (64,136) **410 × 255** (not full-width). Card: Top Row 362 × 23 at (24,24) = Type Badge 53 × 23 + PDF Icon 36 × 11 at x 326; title 362 × 21 at y 61; body 362 × 60 at y 96; Meta Row 181 × 15 at y 170; divider 362 × 1 at y 199; Actions Row 362 × 17 at y 214. |
| Final CTA | `2764:3574` | 0,3606 · 1440 × 343 | **NOT EXTRACTED — no child nodes.** |
| Footer | `2764:3580` | 0,3949 · 1440 × 338 | Grid at (64,64) 1312 × 155 — **3 columns 405.33** at x 0 / 453.33 / 906.67 (gap 48). Brand 155 tall (logo 40 × 40). Quick Links 129 tall, 4 items, 28px pitch. Contact 101 tall. Legal at (64,267) 1312 × 39. |

### 2.6 EN Tablet `2764:3606`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2764:3607` | 0,0 · 768 × 80 | Same master as EN desktop. Nav `2764:3616` at (264,32) 417 wide, **4 links**: Strategic Plan · About Us · Championships · Media Center. Utilities at (681,32.5). |
| Hero | `2764:3624` | 0,80 · 768 × 458 | **Stacked, not overlaid.** Hero Visual `2764:3625` 768 × 240 at y 0 (**empty**). Hero Content Box `2764:3626` 768 × 218 at y 240: breadcrumb `2764:3627` at (40,40) 191 × 25 — a **single flattened string** "Home > About > Strategic Plan"; H1 at (40,81) 237 × 39; lede at (40,136) 688 × 42. |
| Overview | `2764:3631` | 0,538 · 768 × 186 | H2 at (40,40) 291 × 29; body at (40,85) 688 × 44; rule at (40,145) 688 × 1. |
| Timeline | `2764:3635` | 0,724 · 768 × 340 | H2 at (40,40) 174 × 24. Grid at (40,88) 688 × 212 — **2 × 2**: Row 1 `2764:3838` (y 0), Row 2 `2764:3839` (y 114) → row gap 16. Cards 336 × 98 at x 0 / 352 → col gap 16. Card: title 20px-tall at (20,20); body 296 × 30 at (20,48). |
| Pillars | `2764:3650` | 0,1064 · 768 × 457 | H2 at (40,40) 182 × 27. Grid at (40,91) 688 × 326 — **2 × 3**: rows at y 0 / 114 / 228. Cards 336 × 98, x 0 / 352. |
| Objectives | `2764:3671` | 0,1521 · 768 × 421 | H2 "Our Goals" at (40,40) 111 × 27. Stack at (40,83) 688 × 298 — **5** cards 688 × 50 at y 0/62/124/186/248 (gap 12). Card: title 18px-tall at (16,16); description on the **same line** to the right. |
| KPIs | `2764:3683` | 0,1942 · 768 × 332 | H2 at (233,40) 302 × 24, centred. Grid at (40,88) 688 × 204 — **2 × 2**, rows y 0 / 110, cards 336 × 94 at x 0 / 352. Card: value 39px-tall at (16,16); label 15px-tall at (16,63). |
| Documents | `2764:3698` | 0,2274 · 768 × 104 | **Heading only** — "Strategic Files" 149 × 24. No card. |
| Footer Master | `2764:3700` | 0,2378 · 768 × **1390** | **Contains two page-level sections that belong outside the footer:** "Turning Strategy into Reality" `2764:3851` at (24,64) 720 × 216 (flow `2764:3854` 496 × 17, horizontal, **"←" arrows in an LTR page**), and CTA Section `2764:3864` at (24,328) 720 × 228 (empty). Footer Grid `2764:3701` at (24,604) 720 × 628 — 1-column stack: Brand 134 · Quick Links 297 (**11 items**, 28px pitch) · Contact 101. Legal at (24,1280) 720 × 78. |

### 2.7 EN Mobile `2764:3726`

| Section | Node | Position / size | Notes |
|---|---|---|---|
| Header | `2764:3727` | 0,0 · 375 × **64** | Logo container at (16,14) 224 × 36; text branding **drops the "Strategic Plan 2026 - 2030" subtitle**. Utilities at (341,24.5) = **"EN" only**. **No nav, no hamburger.** |
| Hero | `2764:3737` | 0,64 · 375 × 320 | **"Mobile Hero Banner" — no child nodes. No title, no breadcrumb, no lede.** |
| Intro | `2764:3743` | 0,384 · 375 × 137 | H2 at (24,24) 242 × 24; body at (24,60) 327 × 40; rule at (24,112) 327 × 1. |
| Timeline | `2764:3747` | 0,521 · 375 × 484 | H3 at (24,24) 139 × 20. 4 cards 327 × 88 at y 60/164/268/372 (gap 16). Card: title 18px-tall at (16,16); body 295 × 30 at (16,42). |
| Pillars | `2764:3755` | 0,1005 · 375 × 632 | H2 at (24,24) 149 × 22. 6 cards 327 wide at y 62/147/232/330/428/526; heights 69/69/82/82/82/82 (gap 16). Card: title 18px-tall at (16,16); body at (16,40). |
| Objectives | `2764:3896` | 0,1637 · 375 × 634 | H2 at (24,24) 280 × 22. Stack at (24,62) 327 × 548 — **5** cards 327 × 100 at y 0/112/224/336/448 (gap 12). Card: numeral 17px-tall at (12,12); title 17px-tall at (12,35); body 303 × 30 at (12,58). |
| KPIs | `2764:3763` | 0,2271 · 375 × 202 | H3 "Metrics" at (24,24) 62 × 20. Wrapper at (24,60) 327 × 118 — **2 × 2**, rows y 0 / 65, cards **157.5 × 53** at x 0 / 169.5. Card: value 29px-tall at (12,12) with label **beside it**, 12px-tall. |
| Execution | `2764:3919` | 0,2473 · 375 × 379 | H2 at (24,24) 272 × 22; body at (24,62) 327 × 60. Flow `2764:3922` at (24,138) 327 × 217 — **vertical**, 5 caps labels + "↓", 25px pitch. |
| Documents | `2764:3932` | 0,2852 · 375 × 70 | **Heading only.** |
| CTA | `2764:3934` | 0,2922 · 375 × 211 | **NOT EXTRACTED — no child nodes.** |
| Footer | `2764:3780` | 0,3133 · 375 × 731 | Grid at (24,64) 327 × 509 — Brand 155 · Quick Links 157 (**5 items**) · Contact 101. Legal at (24,621) 327 × 78. |

---

## 3. Real copy

### 3.1 Arabic (desktop `720:624` unless noted)

- **H1:** الخطة الاستراتيجية · *(mobile `2764:3276`: **الخطة الاستراتيجية للاتحاد**)*
- **Eyebrow:** الحوكمة والاستراتيجية
- **Hero lede:** خارطة طريق واضحة لتطوير ألعاب القوى الإماراتية، وتعزيز الأداء الرياضي، وبناء منظومة مستدامة تضع الرياضي في قلب المستقبل.
  *(mobile `2764:3277`: رؤية وطنية طموحة تسعى لبناء منظومة رياضية متكاملة تضع البطل الإماراتي الشاب في قلب التطوير.)*
- **Overview H2:** خارطة طريق نحو المستقبل
- **Overview body:** تمثل الخطة الاستراتيجية إطارًا متكاملًا لتوجيه أعمال الاتحاد وتحديد أولوياته، وتحويل الطموحات إلى أهداف قابلة للتنفيذ والقياس.
  *(mobile `2764:3281`: نعمل في اتحاد الإمارات لألعاب القوى وفق خارطة طريق واضحة الأهداف، تهدف إلى تطوير الحوكمة وصناعة جيل رياضي متفوق.)*
- **Phases:** 01 الأساس — بناء منظومة مؤسسية قوية ترتكز على الحوكمة والكفاءة. · 02 التطوير — الاستثمار في الرياضيين والمواهب والكفاءات الفنية. · 03 التنافسية — رفع مستوى الأداء وتعزيز حضور ألعاب القوى الإماراتية. · 04 الأثر — تحقيق نتائج مستدامة وصناعة إرث رياضي للأجيال القادمة.
- **Pillars H2:** محاورنا الاستراتيجية — **lede:** نركز جهودنا على مجموعة من الأولويات التي تشكل الأساس لتحقيق رؤيتنا وتطوير منظومة ألعاب القوى.
  1. تطوير الرياضيين — توفير منظومة متكاملة لدعم الرياضيين ورفع مستويات الأداء والتنافسية.
  2. اكتشاف المواهب — توسيع نطاق اكتشاف المواهب وتطوير مسارات واضحة للانتقال من الموهبة إلى الإنجاز.
  3. التميز الرياضي — تعزيز جودة التدريب والمنافسات والبرامج الفنية بما يواكب المعايير الدولية.
  4. تطوير الكفاءات — تمكين المدربين والحكام والإداريين من خلال برامج تطوير وتأهيل مستمرة.
  5. الحوكمة المؤسسية — تطوير منظومة إدارية فعالة تقوم على الشفافية والمساءلة وجودة اتخاذ القرار.
  6. الشراكة والاستدامة — بناء شراكات فاعلة مع الأندية والمؤسسات والقطاع الخاص لدعم مستقبل ألعاب القوى.
- **Objectives H2:** من المحاور إلى أهداف ملموسة *(mobile `2764:3343`: **الأهداف التفصيلية ملموسة**)*
  1. رفع مستوى الأداء الرياضي — تطوير بيئة التدريب والإعداد بما يساعد الرياضيين على الوصول إلى مستويات تنافسية أعلى.
  2. توسيع قاعدة المواهب — إنشاء مسارات أكثر فعالية لاكتشاف المواهب وتطويرها في مختلف مراحلها.
  3. تعزيز المشاركة — زيادة انتشار ألعاب القوى وتشجيع المشاركة في مختلف الفئات والمجتمعات.
  4. تطوير منظومة المنافسات — الارتقاء بجودة البطولات والفعاليات وتنظيمها وفق أفضل الممارسات.
  5. تعزيز الحوكمة — بناء منظومة مؤسسية أكثر كفاءة وشفافية واستدامة.
- **KPI H2:** نقيس التقدم، ونصنع الأثر *(mobile `2764:3370`: **مؤشرات قياس الأثر والنجاح**)* — `2030` أفق الخطة الاستراتيجية · `15` برنامجًا للتطوير والتأهيل · `+30%` زيادة المشاركة في المنافسات · `+25%` نمو قاعدة المواهب
- **Execution H2:** نحوّل الاستراتيجية إلى واقع *(tablet `2764:3195`: **نحوّل الاستراتيجية إلى واقع ملموس**)* — **body:** لا تقاس الاستراتيجية بما نكتبه، بل بما ننجزه. لذلك نربط كل هدف بمبادرات واضحة ومؤشرات أداء تساعدنا على متابعة التقدم وتحقيق الأثر.
- **Documents H2:** الوثائق الاستراتيجية — card: الخطة الاستراتيجية للاتحاد · وثيقة استراتيجية · PDF · الإصدار 01.0 · buttons تحميل PDF / عرض الوثيقة

### 3.2 English (desktop `2764:3420` unless noted)

- **H1:** Strategic Plan — **Eyebrow:** GOVERNANCE & STRATEGY
- **Hero lede:** A clear roadmap for developing UAE athletics, enhancing performance, and building a sustainable sports ecosystem with the athlete at the very center.
  *(tablet `2764:3630`: A detailed blueprint targeting athletic talent nurturing and sports framework modernization inside the UAE.)*
- **Overview H2:** A Roadmap to the Future *(tablet/mobile: "Roadmap to the Future")* — **body:** Our strategic plan represents a comprehensive framework to guide the federation's operations, prioritize actions, and transform ambitious visions into measurable athletic success on both continental and global stages.
- **Phases (desktop):** 01 Foundation — Establishing robust institutional governance, procedural efficiency, and infrastructure standards. · 02 Development — Directly investing in professional talent, young scouts, and technical administrative coaching tiers. · 03 Competitiveness — Elevating active performance benchmarks and solidifying UAE presence in international contests. · 04 Impact — Realizing deeply sustainable records and leaving a monumental legacy for upcoming athletic generations.
  *(tablet and mobile carry **different, shorter** descriptions for all four phases.)*
- **Pillars (desktop):** Athletic Excellence · Talent Discovery · Athlete Development · Governance & Institutional · Partnerships & Sustainability · Capacity Building
  *(each with a different description at each of the three breakpoints.)*
- **Objectives (desktop, 4):** 01. Elevate Athletic Performance [ACTIVE PERFORMANCE] · 02. Expand Stakeholder Base [COMMUNITY ENLISTMENT] · 03. Enhance Participation [ATHLETIC RANGE] · 04. Develop Competition System [UPGRADED TOURNAMENTS]
  *(tablet and mobile add a 5th: **05. Strengthen Governance**.)*
- **KPIs (desktop):** `2030` Strategic Plan Horizon · `15` Strategic Objectives Set · `+30%` Participation Growth · `+25%` Stakeholder Base Expansion
  *(tablet: Target Year / Strategic Objectives / Participation / Stakeholders — mobile: Plan Target / Objectives / Participation / Stakeholders.)*
- **Execution H2:** Turning Strategy into Reality — steps Strategic Pillar → Objective → Initiative → Measurement → Impact
- **Documents (desktop card):** "UAE Athletics Federation Strategic Plan" — The official roadmap for developing UAE athletics, enhancing performance, and building a sustainable sports ecosystem.

---

## 4. Structural AR-vs-EN differences

These are **architecture** differences, not translation differences.

| # | Aspect | AR | EN |
|---|---|---|---|
| 1 | **Header master** | `Header (Approved Master Component)`, 1440 × **95.41**, **9** nav items, ☾ + بحث + AR\|EN | `Header Master`, 1440 × **80**, **6** nav items, logo lockup carries a 2-line wordmark with a "Strategic Plan 2026 - 2030" subtitle |
| 2 | **Hero construction** | Full-bleed editorial image with text **overlaid**, right-aligned, pill breadcrumb on a translucent blur | **Two-column split** (784 text / 656 visual), left-aligned, plain-text breadcrumb, no pill |
| 3 | **Section containers** | One `Static Page Content` wrapper (1440 × 3000) holding all sections with explicit 1px dividers | Each section is its **own full-width band** at page level; no shared wrapper |
| 4 | **Objective count** | **5** at every breakpoint | **4** on desktop, **5** on tablet and mobile |
| 5 | **Pillar card anatomy** | Accent bar + right-aligned numeral, no circle | **44px numeral circle**, no accent bar |
| 6 | **Timeline card anatomy** | 44px icon (`layers`/`trending-up`/`trophy`/`sparkles`) above a large numeral, centred | Numeral circle + label on one row, left-aligned, **no icons** |
| 7 | **Objective row anatomy** | Accent bar + numeral + title + body | Title + a right-aligned **ALL-CAPS category tag** (no accent bar, no such tag exists in AR) |
| 8 | **KPI card** | Green-filled, **centred**, value 56px white | Value **left-aligned** at (24,24) |
| 9 | **Execution flow orientation** | Desktop **vertical** / tablet horizontal / mobile **absent** | Desktop **horizontal** / tablet horizontal / mobile **vertical** |
| 10 | **Execution step labels** | English caps on desktop, Arabic on tablet | English at all breakpoints |
| 11 | **Documents card** | Full-width 1312 × 100 banner, buttons + info side by side | Compact 410 × 255 card with type badge, meta row, divider, actions row |
| 12 | **Footer columns** | **4** (Contact / Map / Quick Links ×11 / Brand+Social) — includes a map placeholder and 5 social icons | **3** (Brand / Quick Links / Contact) — **no map, no social icons at any breakpoint** |
| 13 | **Tablet page composition** | CTA and execution are page-level siblings | CTA **and** the execution section are nested **inside `Footer Master`** |
| 14 | **Token binding** | Full green scale + caption typography tokens bound | Only 6 tokens bound; greens hardcoded |

---

## 5. Defects

Severity: **P1** = blocks implementation · **P2** = visible inconsistency · **P3** = hygiene.

| ID | Sev | Node(s) | Defect | Evidence |
|---|---|---|---|---|
| SP-D01 | **P1** | `2764:3737` | **EN mobile hero is an empty frame.** 375 × 320 "Mobile Hero Banner" with zero children — no H1, no breadcrumb, no lede. The EN mobile page has no page title at all. | `get_metadata` returns a self-closing frame |
| SP-D02 | **P1** | `2764:3625`, `2764:3453` | **Hero visual containers are empty** on EN tablet (768 × 240) and EN desktop (656 × 420). No image is placed. | self-closing frames |
| SP-D03 | **P1** | `2764:3223`, `2764:3384`, `2764:3698`, `2764:3932` | **Documents section is unbuilt at 5 of 6 frames.** AR tablet has an empty 688 × 100 wrapper; AR mobile, EN tablet and EN mobile have a heading and nothing else. Only AR desktop (`758:234`) and EN desktop (`2764:3821`) contain a real card — and those two cards are different components. | see §2 |
| SP-D04 | **P1** | `758:243`, `2764:3224`, `2764:3386`, `2764:3574`, `2764:3864`, `2764:3934` | **Every Final CTA frame is empty** at every breakpoint in both languages. CTA copy, button labels and hierarchy are undefined in Figma. | self-closing frames |
| SP-D05 | **P2** | `757:205` vs `2764:3136` / `2764:3312` | **Pillar accent bar flips sides across breakpoints in the same RTL page.** Desktop places it on the **left** edge (`left:-1`); tablet and mobile place it on the **right** edge (`right:-1`). One of the three is wrong for RTL. | `get_design_context` |
| SP-D06 | **P2** | `757:205` vs `2764:3136` | **Pillar border token changes without a stated reason:** desktop binds `--color-green-500`, tablet/mobile bind `--color-green-400`. | `get_design_context` |
| SP-D07 | **P2** | `2764:3316` | **Body text below the 13px minimum.** AR mobile pillar description is **12px**. AR mobile KPI label box is 13px and the badge row is 12px. Not covered by ADR-0041, which is scoped to `CMP-CLUBCARD-001` and `CMP-AFFILIATIONS-001` only. | CLAUDE.md §5–6, §14 |
| SP-D08 | **P2** | `758:221` | **English UI strings inside the Arabic page.** The AR desktop execution flow renders STRATEGIC PILLAR / OBJECTIVE / INITIATIVE / MEASUREMENT / IMPACT. The AR tablet equivalent (`2764:3196`) is correctly Arabic — so desktop is the outlier. | metadata |
| SP-D09 | **P2** | `2764:3829`, `2764:3833`, `2764:3824` | **Untranslated Arabic strings inside the EN desktop document card:** type badge "لائحة", meta "الإصدار: 01.0" / "آخر تحديث: 2026", actions "تحميل PDF ↓" / "عرض الوثيقة ←". | metadata |
| SP-D10 | **P2** | `2764:3854` | **RTL arrow in an LTR page.** EN tablet execution flow uses "←" between steps; EN desktop uses "➔" and EN mobile uses "↓". | metadata |
| SP-D11 | **P2** | `2764:3700` | **CTA and the execution section are nested inside `Footer Master`** on EN tablet, making the footer 1390px tall and breaking the page/footer boundary that every other frame respects. | metadata |
| SP-D12 | **P2** | `2764:3072`, `2764:3239`, `2764:3399` | **100 × 100 empty placeholders shipped in the composition:** AR tablet nav, AR tablet social row, AR mobile social row. The AR tablet nav placeholder also sits at y = −10, overflowing the 80px header. | metadata |
| SP-D13 | **P2** | `2764:3258`, `2764:3727` | **No mobile navigation affordance in either language.** AR mobile header has only a search label; EN mobile header has only "EN". No hamburger, no menu. AR mobile also loses the AR\|EN language switch entirely. | metadata |
| SP-D14 | **P2** | AR mobile vs AR desktop | **Hero and overview copy diverge between breakpoints, not just in length.** Mobile H1 becomes "الخطة الاستراتيجية للاتحاد"; the hero lede and the overview body are different sentences, not truncations. Same pattern in EN across all three widths for phases, pillars and KPI labels. | §3 |
| SP-D15 | **P2** | `2764:3516` vs `2764:3671` / `2764:3896` | **EN objective count differs by breakpoint** — 4 on desktop, 5 on tablet and mobile. "05. Strengthen Governance" exists only below 1440. | metadata |
| SP-D16 | **P3** | `2764:3420` | **EN desktop binds no green-scale tokens.** `get_variable_defs` returns only 7 entries and no `--color-green-*`; the greens in that frame are raw hex. Violates CLAUDE.md §16. | `get_variable_defs` |
| SP-D17 | **P3** | `757:207`, `2705:7` | **22px type is used but is not in the approved scale** (H4 = 20, H3 = 24). This is the open **PB-GAP** DESIGN SYSTEM GAP from CLAUDE.md §7 recurring on this page. | CLAUDE.md §7 |
| SP-D18 | **P3** | `700:73`, `2748:2010` | **Hardcoded text colours** `#374151` (body) and `#111` (bold lead-ins) where `--color-text-secondary` / `--color-text-primary` exist. | `get_design_context` |
| SP-D19 | **P3** | `2764:3100` | **Misleading layer name:** the AR tablet wrapper holding the entire page body is named "Strategic Overview". | metadata |
| SP-D20 | **P3** | `2764:3627` | **Breadcrumb flattened to one text node** on EN tablet ("Home > About > Strategic Plan"), so crumbs cannot be linked individually; every other frame uses discrete nodes. Its labels also differ ("About" vs "About Us"). | metadata |

---

## 6. Assets to export before access is lost

Decorative vectors referenced on this page (SVG, available via `get_design_context` asset URLs which
**expire ~7 days after extraction**):

- `swoosh-decor` — generic, 3–4 instances per section, rotations −33.45° / +21.84° / −15° / +18°
- `خط أحمر — Red Swoosh`, `خط أخضر — Green Swoosh`, `خط أبيض — White Swoosh`,
  `خط أسود — Black Swoosh`, `خط أحمر صغير — Red Swoosh Small` — all rotated −35°
- Timeline icons: `layers`, `trending-up`, `trophy`, `sparkles` (22px glyph in a 44px frame)
- Footer icons: `map-pin`, `instagram`, `youtube`, `facebook`, `tiktok` (16px in a 32px button)
- `UAEAF Logo (Vector)` and `UAEAF Logo (Vector - White)`

**NOT EXTRACTED — hero photography.** The editorial hero images (`756:202`, `2764:3081`, `2764:3268`)
are image fills, not committed assets. Source files must be recovered from the design team, not Figma.
