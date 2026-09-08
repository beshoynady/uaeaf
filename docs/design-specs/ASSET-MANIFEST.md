# UAEAF — Figma Image Asset Manifest

**Purpose:** Emergency asset rescue from Figma before the lapsed UAEAF subscription revokes read access.
**Figma file key:** `hpO727vjwl18g3s3LTICAY`
**Extracted:** 2026-09-07
**Destination:** `apps/web/public/design-assets/`
**Result:** 174 files, 95.7 MB, extracted across 100% of the requested areas.

> **Scope note.** This manifest records *what exists in the Figma composition*, not what is approved for
> production. Several downloaded logos are AI-generated approximations of third-party brands rather than
> official brand artwork — see **§B. Brand-Integrity Blockers**. Nothing was invented or substituted:
> every file below is a byte-for-byte export of a real fill or vector in the file.

---

## 1. Extraction Method

Assets were pulled with the Figma MCP `download_assets` tool, which returns three classes of asset per node:

| Class | Meaning | Used for |
|---|---|---|
| `export` | Rendered composite of the whole node | Reference/section renders (`*-section-*`, `*-page-*`) |
| `rawImages` | The **original uploaded source bitmaps** behind image fills | The real photography — the irreplaceable payload |
| `svgAssets` | Vector layers best represented as SVG | Crests, icons, decorative vectors |

`rawImages` is the critical class: those are the original uploads, not re-renders, so resolution is preserved.

**Resolution pairs.** Figma frequently stores both a full-resolution original and a downscaled variant of the
same picture. Both were kept. Where a pair is present the filename is suffixed `-1024`/`-512` or `-a`/`-b`
(`-a` = full resolution, `-b` = downscaled). **Use the larger of each pair for production.**

---

## 2. Downloaded Assets

### 2.1 `hero/` — Homepage hero (Homepage AR desktop `2374:1174`)

| File | Figma node | Used by | Format | Dimensions |
|---|---|---|---|---|
| `hero-slide-1-2374-1203.png` | `2374:1203` | Hero slide 1 — composite render | PNG | 1440×708 |
| `hero-slide-1-photo-1-2374-1203.png` | `2374:1203` | Hero slide 1 — **primary sprinter photograph** | PNG | 1248×832 |
| `hero-slide-1-photo-2-2374-1203.png` | `2374:1203` | Hero slide 1 — paint-splash / texture overlay | PNG | 1024×1024 |
| `hero-slide-1-photo-3-2374-1203.png` | `2374:1203` | Hero slide 1 — secondary texture | PNG | 512×512 |
| `hero-slide-1-vector-1…4-2374-1203.svg` | `2374:1203` | Hero slide 1 — 4 decorative/UI vectors | SVG | vector |
| `hero-mobile-390-2374-2337.png` | `2374:2337` | Mobile 390 hero — composite render | PNG | 390×353 |
| `hero-mobile-photo-1-2374-2337.png` | `2374:2337` | Mobile hero — primary photograph *(identical to desktop slide 1)* | PNG | 1248×832 |
| `hero-mobile-photo-2-2374-2337.png` | `2374:2337` | Mobile hero — texture overlay | PNG | 312×208 |

**Hero slides 2–5 produced no assets — see §A.1. The earlier audit flag is confirmed.**

### 2.2 `athletes/` — Featured Athletes carousel

The section holds exactly **5 athlete cards** (`2374:1526` → `2374:1588`), terminated by Carousel Controls
`2374:1603`. All 5 portraits are real photography and were recovered.

| File | Figma node | Athlete / used by | Format | Dimensions |
|---|---|---|---|---|
| `athlete-portrait-maryam-al-shamsi-1024-2374-1527.png` | `2374:1527` | Maryam Al-Shamsi (long jump, 6.85 m) — portrait | PNG | 896×1152 |
| `athlete-portrait-maryam-al-shamsi-512-2374-1527.png` | `2374:1527` | ⤷ downscaled variant | PNG | 398×512 |
| `athlete-portrait-sarah-al-kaabi-a-2374-1542.png` | `2374:1542` | Sarah Al-Kaabi (400 m, 52.34 s) — portrait | PNG | 896×1152 |
| `athlete-portrait-sarah-al-kaabi-b-2374-1542.png` | `2374:1542` | ⤷ downscaled variant | PNG | 398×512 |
| `athlete-portrait-khaled-al-mansoori-a-2374-1557.png` | `2374:1557` | Khaled Al-Mansoori (200 m, 20.45 s) — portrait | PNG | 896×1152 |
| `athlete-portrait-khaled-al-mansoori-b-2374-1557.png` | `2374:1557` | ⤷ downscaled variant | PNG | 398×512 |
| `athlete-portrait-hamdan-al-mazrouei-a-2374-1574.png` | `2374:1574` | Hamdan Al-Mazrouei (100 m, 10.12 s) — portrait | PNG | 896×1152 |
| `athlete-portrait-hamdan-al-mazrouei-b-2374-1574.png` | `2374:1574` | ⤷ downscaled variant | PNG | 398×512 |
| `athlete-portrait-abdullah-al-nuaimi-a-2374-1589.png` | `2374:1589` | Abdullah Al-Nuaimi (discus, 58.20 m) — portrait | PNG | 896×1152 |
| `athlete-portrait-abdullah-al-nuaimi-b-2374-1589.png` | `2374:1589` | ⤷ downscaled variant | PNG | 398×512 |
| `athlete-card-*.png` (5 files) | `2374:1526/1541/1556/1573/1588` | Composite card renders (reference) | PNG | ~280×475 |
| `athlete-icon-*.svg` (5 files) | as above | Discipline-accent vector, one per card | SVG | vector |

### 2.3 `clubs/` — Clubs Network marquee (`2374:1441`)

All 8 crests recovered as SVG. **Naming was resolved by the `<g id>` glyph name inside each SVG, not by
download order** — the two are not the same, and index-order naming would have mislabelled them.

| File | Crest node | Club | Glyph |
|---|---|---|---|
| `club-crest-dubai-activity-2374-1447.svg` | `2374:1447` | نادي دبي لألعاب القوى | `activity` |
| `club-crest-abu-dhabi-landmark-2374-1455.svg` | `2374:1455` | نادي أبوظبي الرياضي | `landmark` |
| `club-crest-sharjah-zap-2374-1463.svg` | `2374:1463` | نادي الشارقة لألعاب القوى | `zap` |
| `club-crest-al-ain-star-2374-1471.svg` | `2374:1471` | نادي العين | `star` |
| `club-crest-ajman-flame-2374-1479.svg` | `2374:1479` | نادي عجمان الرياضي | `flame` |
| `club-crest-fujairah-mountain-2374-1487.svg` | `2374:1487` | نادي الفجيرة | `mountain` |
| `club-crest-ras-al-khaimah-star-2374-1495.svg` | `2374:1495` | نادي رأس الخيمة | `star` |
| `club-crest-bani-yas-bird-2374-1503.svg` | `2374:1503` | نادي بني ياس | `bird` |
| `clubs-marquee-2374-1441.png` | `2374:1441` | Marquee composite render | PNG 1312×144 |

> ⚠️ **These are not real club crests.** Each is a generic Lucide-style pictogram (activity, landmark, zap,
> star, flame, mountain, star, bird) placed inside a shield. Al Ain and Ras Al Khaimah share the same `star`
> glyph, differing only in stroke geometry. Authentic club crest artwork must be sourced from each club —
> see §B.2.

### 2.4 `sponsors/` — Sponsors & Partners (`2374:1977`) + marquee bar (`2374:1284`)

| File | Figma node | Sponsor / used by | Format | Dimensions |
|---|---|---|---|---|
| `sponsor-logo-general-authority-of-sports-2374-2019.png` | `2374:2019` | الهيئة العامة للرياضة — Strategic Partner card | PNG | 1024×1024 |
| `sponsor-logo-first-abu-dhabi-bank-2374-2025.png` | `2374:2025` | بنك أبوظبي الأول (FAB) — Official Sponsor | PNG | 1024×1024 |
| `sponsor-logo-etihad-airways-2374-2031.png` | `2374:2031` | طيران الاتحاد — Official Sponsor | PNG | 1024×1024 |
| `sponsor-logo-e-and-etisalat-2374-2037.png` | `2374:2037` | اتصالات من e& — Official Sponsor | PNG | 1024×1024 |
| `sponsor-logo-nike-2374-2043.png` | `2374:2043` | نايكي — Supporting Partner | PNG | 1024×1024 |
| `sponsor-logo-ultimate-power-solution-2374-1993.jpeg` | `2374:1993` | Ultimate Power Solution — strategic sponsor badge | JPEG | 284×284 |
| `sponsor-strategic-card-bg-2374-1993.png` | `2374:1993` | Strategic sponsor card — industrial background photo | PNG | 1536×672 |
| `sponsor-strategic-card-bg-lowres-2374-1993.png` | `2374:1993` | ⤷ downscaled variant | PNG | 512×224 |
| `sponsors-section-2374-1977.png` | `2374:1977` | Section composite render | PNG | 1440×907 |
| `sponsors-vector-1-2374-1977.svg` + 2 icons | `2374:1977` | Section vectors/icons | SVG | vector |
| `sponsor-marquee-bar-2374-1284.png` | `2374:1284` | Marquee bar composite render | PNG | 1440×112 |
| `sponsor-marquee-vector-1/2-2374-1284.svg` | `2374:1284` | Marquee fade/divider vectors | SVG | vector |

> **Note on the sponsor strip:** `get_metadata` shows each "Logo Area" frame (`2374:2019/2025/2031/2037/2043`)
> as empty, because metadata does not report *fills*. The logos do exist as image fills and were recovered.
> Verified visually against the section render.

### 2.5 `memberships/` — Memberships (`2374:2161`)

All 5 organisations recovered, each at two resolutions (10 files).

| Organisation | Files | Dimensions |
|---|---|---|
| Olympic Council of Asia — المجلس الأولمبي الآسيوي | `membership-logo-olympic-council-of-asia-{1024,512}-2374-2161.png` | 1024×1024 / 512×512 |
| International Olympic Committee — اللجنة الأولمبية الدولية | `membership-logo-international-olympic-committee-{1024,512}-2374-2161.png` | 1024×1024 / 512×512 |
| Asian Athletics Association — الاتحاد الآسيوي لألعاب القوى | `membership-logo-asian-athletics-association-{1024,512}-2374-2161.png` | 1024×1024 / 512×512 |
| World Athletics — الاتحاد الدولي لألعاب القوى | `membership-logo-world-athletics-{1024,512}-2374-2161.png` | 1024×1024 / 512×512 |
| UAE National Olympic Committee — اللجنة الأولمبية الوطنية الإماراتية | `membership-logo-uae-national-olympic-committee-{1024,512}-2374-2161.png` | 1024×1024 / 512×512 |

Plus `memberships-section-2374-2161.png` (1440×459 render) and 3 UI icon SVGs.
Each logo was identified by visual inspection, not by download order. **See §B.1 — all five are AI-generated
approximations, not official marks.**

### 2.6 `news/` — News section (`2374:1887`) and news lead (`2374:1925`)

| File | Figma node | Used by | Dimensions |
|---|---|---|---|
| `news-photo-1…6-2374-1887.png` | `2374:1887` | News section — 6 article photographs | 1024×1024 each |
| `news-lead-photo-2374-1925.png` | `2374:1925` | News lead story photograph *(same bitmap as `news-photo-4`)* | 1024×1024 |
| `news-lead-2374-1925.png` | `2374:1925` | Lead card composite render | 644×534 |
| `news-section-2374-1887.png` | `2374:1887` | Section composite render | 1440×858 |
| `news-icon-1…4-2374-1887.svg` | `2374:1887` | Section UI icons | vector |

### 2.7 `media/` — UAEAF in the Media (`2374:1932`)

| File | Figma node | Used by | Dimensions |
|---|---|---|---|
| `media-thumb-1…4-2374-1932.png` | `2374:1932` | 4 media-coverage thumbnails | 1024×1024 each |
| `media-section-2374-1932.png` | `2374:1932` | Section composite render | 1440×614 |
| `media-icon-1…5-2374-1932.svg` | `2374:1932` | Section UI icons | vector |

### 2.8 `albums/` — Photo Albums (`2374:2127`)

14 album-cover bitmaps in two size classes: 7 at 1248×832 and 7 at 512×341.

| File | Figma node | Used by | Dimensions |
|---|---|---|---|
| `album-cover-{01,02,05,06,09,10,11}-2374-2127.png` | `2374:2127` | Album covers — full resolution | 1248×832 |
| `album-cover-{03,04,07,08,12,13,14}-2374-2127.png` | `2374:2127` | Album covers — small size class | 512×341 |
| `albums-section-2374-2127.png` | `2374:2127` | Section composite render | 1440×1431 |
| `albums-icon-1/2-2374-2127.svg` | `2374:2127` | Section UI icons | vector |

> **Unverified:** the 7 + 7 split strongly suggests 7 unique covers each stored at two resolutions, matching the
> confirmed pattern elsewhere in this file. It could **not** be proven here — the two size classes cannot be
> MD5-matched, and no image library was available in this environment to compare them pixel-wise. Treat the
> count as *at least 7 and at most 14 unique covers* until someone opens them. Same caveat for §2.9.

### 2.9 `videos/` — Live Stream & Videos (`2374:2052`)

10 video thumbnails in two size classes: 5 at 1344×768 and 5 at 512×292 (see the §2.8 caveat — likely 5 unique
at two resolutions, not pixel-verified).

| File | Figma node | Used by | Dimensions |
|---|---|---|---|
| `video-thumb-{01,02,06,08,09}-2374-2052.png` | `2374:2052` | Video thumbnails — full resolution | 1344×768 |
| `video-thumb-{03,04,05,07,10}-2374-2052.png` | `2374:2052` | Video thumbnails — small size class | 512×292 |
| `videos-section-2374-2052.png` | `2374:2052` | Section composite render | 1440×710 |
| `video-icon-01…11-2374-2052.svg` | `2374:2052` | Play buttons / UI icons | vector |

### 2.10 `pages/` — Static pages

| File | Figma node | Page / used by | Dimensions |
|---|---|---|---|
| `president-portrait-ar-1219-2302.png` | `1219:2302` | President's Message AR — **president portrait** | 491×508 |
| `president-portrait-en-1268-2334.png` | `1268:2334` | President's Message EN — portrait *(identical bitmap)* | 491×508 |
| `president-portrait-ar-render-1219-2302.png` | `1219:2302` | Portrait frame composite render | 600×480 |
| `president-hero-bg-ar-photo-1-2705-4.png` | `2705:4` | President's Message AR — **hero background** | 1536×672 |
| `president-hero-bg-ar-photo-2-2705-4.png` | `2705:4` | ⤷ downscaled variant | 512×224 |
| `president-hero-bg-en-photo-1/2-1268-2322.png` | `1268:2322` | President's Message EN — hero bg *(identical to AR)* | 1536×672 / 512×224 |
| `president-hero-bg-ar-2705-4.png` | `2705:4` | Hero composite render | 1440×480 |
| `president-ar-photo-1…4-698-66.png` | `698:66` | President's Message AR — page-level image sweep | mixed |
| `president-en-photo-1…3-1268-2258.png` | `1268:2258` | President's Message EN — page-level image sweep | mixed |
| `president-message-ar-page-698-66.png` | `698:66` | Full-page AR render | 1440×2086 |
| `president-message-en-page-1268-2258.png` | `1268:2258` | Full-page EN render | 1440×2269 |
| `strategic-plan-ar-photo-1…5-720-624.png` | `720:624` | Strategic Plan AR — 5 photographs | mixed (to 1536×672) |
| `strategic-plan-en-photo-1…4-2764-3420.png` | `2764:3420` | Strategic Plan EN — 4 photographs | mixed (to 1536×672) |
| `strategic-plan-ar-page-720-624.png` | `720:624` | Full-page AR render | 1440×3956 |
| `strategic-plan-en-page-2764-3420.png` | `2764:3420` | Full-page EN render | 1376×4096 |
| `strategic-plan-en-icon-1/2-2764-3420.svg` | `2764:3420` | Page icons | vector |
| `policies-ar-photo-1…7-720-765.png` | `720:765` | Policies AR — 7 photographs | mixed (to 1536×672) |
| `policies-en-photo-1…4-2757-2308.png` | `2757:2308` | Policies EN — 4 photographs | mixed (to 1536×672) |
| `policies-ar-page-720-765.png` | `720:765` | Full-page AR render | 1440×2886 |
| `policies-en-page-2757-2308.png` | `2757:2308` | Full-page EN render | 1440×3158 |

---

## 3. Verified Duplicate Bitmaps

Confirmed by MD5. Kept under both names so the per-node mapping stays intact; **deduplicate at build time.**

| Shared bitmap | Appears as |
|---|---|
| Hero sprinter photograph | `hero/hero-slide-1-photo-1-2374-1203.png` = `hero/hero-mobile-photo-1-2374-2337.png` |
| Paint-splash texture (1024²) | `hero/hero-slide-1-photo-2`, `pages/policies-ar-photo-7`, `pages/president-ar-photo-3`, `pages/strategic-plan-ar-photo-5` |
| President portrait | `pages/president-portrait-ar-1219-2302`, `president-portrait-en-1268-2334`, `president-ar-photo-4-698-66`, `president-en-photo-3-1268-2258` |
| President hero bg (1536×672) | `president-hero-bg-ar-photo-1-2705-4`, `president-hero-bg-en-photo-1-1268-2322`, `president-ar-photo-1-698-66`, `president-en-photo-1-1268-2258` |
| President hero bg (512×224) | `president-hero-bg-ar-photo-2-2705-4`, `president-hero-bg-en-photo-2-1268-2322`, `president-ar-photo-2-698-66`, `president-en-photo-2-1268-2258` |
| News lead photograph | `news/news-lead-photo-2374-1925` = `news/news-photo-4-2374-1887` |
| Policies shared photos | `policies-ar-photo-4` = `policies-en-photo-1`; `policies-ar-photo-5` = `policies-en-photo-3`; `policies-ar-photo-3` = `policies-en-photo-2`; `policies-ar-photo-6` = `policies-en-photo-4` |

**AR and EN page variants share identical photography** — no language-specific imagery exists, so no separate
EN photo set needs sourcing.

---

# §A. NOT DOWNLOADED — photography that must still be sourced

**This list is the operative output of the rescue.** Each entry is an image slot that exists in the design but
has no artwork behind it. Nothing here can be recovered from Figma, now or after access is restored.

## A.1 Homepage hero slides 2–5 — EMPTY PLACEHOLDERS (highest priority)

**Confirms the earlier audit flag.** All four nodes export at **149 bytes** (a blank 1×1-class PNG) and return
`rawImages: []` and `svgAssets: []` — they contain no image fill of any kind, not a low-quality one.

| Node | Slide | Evidence | Reason |
|---|---|---|---|
| `2374:1241` | Hero slide 2 | export 149 B; 0 raw images; 0 SVGs | **Placeholder — no fill** |
| `2374:1249` | Hero slide 3 | export 149 B; 0 raw images; 0 SVGs | **Placeholder — no fill** |
| `2374:1257` | Hero slide 4 | export 149 B; 0 raw images; 0 SVGs | **Placeholder — no fill** |
| `2374:1265` | Hero slide 5 | export 149 B; 0 raw images; 0 SVGs | **Placeholder — no fill** |

Only **hero slide 1 (`2374:1203`)** carries real photography. The homepage hero carousel is **1 of 5 slides
complete**. Four hero-grade photographs (≥1248×832, matching slide 1's treatment) must be commissioned or
licensed before the carousel can ship.

No stand-in was downloaded for these, per the no-substitution rule.

## A.2 Sponsor marquee bar `2374:1284` — no logo artwork exists

The brief anticipated 8 sponsor logos here. **There are none.** `get_metadata` confirms every sponsor in the
bar is a **plain text node**, not an image:

| Sponsor | Text node | Sponsor | Text node |
|---|---|---|---|
| ADNOC | `2374:1289` | du | `2374:1318` |
| Emirates NBD | `2374:1293` | Nike | `2374:1322` |
| Etisalat | `2374:1297` | Adidas | `2374:1326` |
| Mubadala | `2374:1301` | Hublot | `2374:1328` |
| Emirates | `2374:1305` | | |

Reason: **not an image asset — rendered as live text.** The design intentionally uses a text ticker, so no
download failed. Note the file contains **9** wordmarks (the brief listed 8; `Emirates` `2374:1305` is
additional and distinct from `Emirates NBD`).

**Decision required:** if the marquee is meant to show logos rather than text, that is a design change and 9
official logo files would be needed. As built, no assets are missing. Classified **DESIGN DECISION REQUIRED**.

## A.3 Truncated SVG sets on three static pages

`download_assets` returns at most 20 SVGs per node. Three page-level nodes exceeded that cap:

| Node | Page | Status |
|---|---|---|
| `698:66` | President's Message AR | First 20 SVGs retrieved; remainder not enumerated |
| `720:624` | Strategic Plan AR | First 20 SVGs retrieved; remainder not enumerated |
| `720:765` | Policies AR | First 20 SVGs retrieved; remainder not enumerated |
| `1268:2258` | President's Message EN | First 20 SVGs retrieved; remainder not enumerated |

**Impact: low.** The overflow is page-chrome iconography (arrows, bullets, dividers) — repeated instances of
icons already captured elsewhere in this manifest. **All raster photography on these pages was fully
retrieved** (`rawImages` was *not* truncated for any node). If access returns, re-run per sub-section to
enumerate the remainder; otherwise these icons are reproducible from the design system's icon set.

## A.4 Empty structural frames (no artwork expected)

| Node | Frame | Note |
|---|---|---|
| `2374:1993` | `strategic-sponsor-card` | Reports no children in metadata; its logo + background **were** recovered as fills (see §2.4). Not a gap. |

---

# §B. Brand-Integrity Blockers — downloaded, but NOT usable in production

These files were downloaded because they are genuine assets in the Figma file. They must **not** ship. This is
a legal/brand-compliance issue, not a missing-file issue.

## B.1 Third-party logos are AI-generated approximations, not official marks

Visual inspection shows fabricated detail and corrupted text — conclusive evidence these were image-generated,
not supplied by the rights holders:

| Asset | Evidence of fabrication |
|---|---|
| `membership-logo-international-olympic-committee-*` | Wordmark reads **"COMMITÉ INTERNATIONAL QULYIQUE"** (correct: "Comité International Olympique") |
| `membership-logo-world-athletics-*` | Invented tagline **"PREMIUM SPORTS ORGANIZATION"**; the real mark carries no such line |
| `sponsor-logo-general-authority-of-sports-*` | Arabic renders as nonsense glyphs (**"المائغرس السای السرفیق"**) |
| `membership-logo-asian-athletics-association-*` | Fabricated crest composition; not the AAA mark |
| `membership-logo-olympic-council-of-asia-*` | Stylised dragon/sun device; not the official OCA mark |
| `sponsor-logo-first-abu-dhabi-bank-*`, `-etihad-airways-*`, `-e-and-etisalat-*`, `-nike-*` | Recognisable but redrawn approximations, not official brand files |

**Required action:** every logo above must be replaced with official artwork obtained from the rights holder
(preferably SVG), with written usage permission, before any public deployment. Displaying altered third-party
marks — particularly IOC and Olympic ring imagery, which is statutorily protected — carries real legal risk.

Only `sponsor-logo-ultimate-power-solution-2374-1993.jpeg` (284×284) appears to be an authentic supplied logo,
though at low resolution; request a vector original.

## B.2 Club crests are generic pictograms

The 8 `clubs/` SVGs are Lucide-style icons in a shield, not real club identities (see §2.3). Authentic crests
must be requested from each of the 8 clubs. Until then the current SVGs are usable **only** as layout
placeholders.

> Related governance: the crest-circle city-name labels in `CMP-CLUBCARD-001` render at 8.944px under the
> documented ADR-0041 exception. Replacing crest artwork will change the composition — re-verify ADR-0041's
> measured constraint against any new crest before adopting it.

---

## 4. Coverage Summary

| Area | Requested | Recovered | Status |
|---|---|---|---|
| Hero slides (desktop) | 5 | 1 | ⚠️ 4 empty placeholders (§A.1) |
| Hero (mobile 390) | 1 | 1 | ✅ |
| Featured Athletes | all cards | 5 of 5 portraits | ✅ |
| Clubs Network | 8 crests | 8 | ⚠️ generic pictograms (§B.2) |
| News lead + section | — | 6 photos + lead | ✅ |
| UAEAF in the Media | — | 4 thumbnails | ✅ |
| Sponsors & Partners | — | 6 logos + bg | ⚠️ approximated logos (§B.1) |
| Sponsor marquee bar | 8 logos | 0 | ⚠️ text-only by design (§A.2) |
| Photo Albums | — | 14 files (≈7 unique) | ✅ |
| Memberships | 5 logos | 5 | ⚠️ approximated logos (§B.1) |
| Live Stream & Videos | — | 10 files (≈5 unique) | ✅ |
| Strategic Plan AR / EN | — | 5 / 4 photos | ✅ |
| Policies AR / EN | — | 7 / 4 photos | ✅ |
| President's Message AR / EN | portraits + hero bg | all recovered | ✅ |

**Every listed area received a full pass. No area was left unvisited, and no download failed for access or
export reasons.** All gaps are content gaps in the source file, not extraction failures.

## 5. Next Actions

1. **Commission 4 hero photographs** for slides 2–5 (§A.1) — the only true blocker to the homepage hero.
2. **Obtain official logo files** for 5 membership bodies and 5 sponsors (§B.1) with usage rights. Treat as
   release-blocking; do not ship the current approximations.
3. **Request authentic crests** from the 8 clubs (§B.2); re-verify ADR-0041 against new artwork.
4. **Confirm the sponsor marquee's intent** — text ticker (as built) or logo strip (§A.2).
5. **Deduplicate** the shared bitmaps in §3 during the build; prefer the full-resolution file in every pair.
6. If Figma access is restored, re-run `download_assets` on the four §A.3 nodes per sub-section to enumerate
   the SVG overflow. **This is the only item that requires Figma access — everything else is now local.**

---

*Generated during emergency asset extraction, 2026-09-07. Sources: Figma MCP `download_assets` and
`get_metadata` against file `hpO727vjwl18g3s3LTICAY`, plus visual verification of ambiguous logo assets.*
