# ADR-0078 — The First Screen Is the Header Plus the Hero

**Status:** **Accepted and built** — 2026-09-16, by the owner's decision in the hero session, answering the phase-1 stop point recorded in `docs/plans/homepage-hero-design.md` §٢٣.
**Date:** 2026-09-16
**Authority:** The owner, verbatim:

> ١. الهيدر + الهيرو فقط = ارتفاع الشاشة. شريط الرعاة خارج الشاشة الأولى ويبدأ مباشرة تحت الهيرو.
> ٢. ارتفاع الهيرو = 100svh − var(--header-height)، مع vh بديلًا.
> ٣. الحد الأدنى الوحيد: الهيرو لا يصغر عن ارتفاع محتواه الحقيقي (min-height مقاس باللغتين). في الشاشات القصيرة جدًا فقط يطول الهيرو عن الشاشة، والمحتوى لا يُقص أبدًا.
> ٤. لا رافعات تصغير (L1–L4) ولا شريط مضغوط 72px. شريط الرعاة يبقى بمواصفات Figma، ويُحسم في جلسة الرعاة.
> ٥. هذا يلغي قرار «الهيرو + الشريط = الشاشة» في البرومبت السابق.
> ٦. نفس القاعدة (100svh − الهيدر) لكل هيرو في الموقع، بما فيها الصفحات الأربع المبنية.
> ٧. الموبايل: بطاقة «الحدث القادم» وأدوات التحكم داخل الهيرو في أسفله.

**Amends:** ADR-0067 D2 (the formula becomes a token and a class) · ADR-0071 D6 (**retired**: `IdentityHero` no longer takes `height`) · ADR-0072 and ADR-0075's page tables, where the hero is listed as "content height".
**Cancels:** the earlier instruction of the same day that the homepage hero **plus the sponsor strip** fill the screen, and every shrink lever (L1–L4, a 72px compact strip) proposed to make that fit.
**Does not amend:** ADR-0043 and ADR-0077 (the sponsor strip keeps its Figma specification; its height is decided in the sponsors session) · ADR-0009 · the identity-lines guard and its 32px threshold · `row-capacity.ts`.

---

## Context

Two rules for the first screen existed side by side:

- **ADR-0067 D2:** a hero with a picture fills `100svh − 96px`, written inline as `min-h-[calc(100svh − var(--space-24))]`.
- **ADR-0071 D6:** Vision & Mission opted out with `height="content"`, and Strategic Plan copied it (ADR-0075). Those heroes were bands: 628 of 900px at 1440.

The homepage brief then asked for the hero **and** the sponsor strip to fill the screen. Measured with the worst content the client may enter, that could not hold at 1366×650: the English hero alone needed 601px of 554 available, and 713px with the strip. The owner chose a single rule instead of levers.

---

## D1 — One token for the header, one class for the first screen

```css
:root { --header-height: var(--space-24); }

.hero-first-screen {
  min-height: calc(100vh - var(--header-height));
  min-height: calc(100svh - var(--header-height));
}
```

- `--header-height` is **96px**, measured on the built header at 15 widths × both languages. The header itself now reads it (`h-[var(--header-height)]`), so the two cannot drift.
- `vh` is the fallback for engines without `svh`; the second declaration wins where `svh` is understood.
- `svh`, not `dvh`: the height does not change while the mobile address bar moves, so nothing below the hero shifts (CLS).
- **`min-height`, never `height`:** the content is the only floor. Where the text needs more than the screen, the hero grows; nothing is clipped, and no `clamp` maximum exists.
- No JavaScript measures anything.

`HERO_VIEWPORT` in `ui/surface.ts` is this class. The portrait cap (`--pm-portrait-cap`) reads the same token.

## D2 — Every hero with a picture uses it

- **Homepage:** the section is `hero-first-screen`, a flex column. The slide track takes the remaining height (`flex-1`), and the next-event band sits inside the hero at its foot. The picture is `absolute inset-0` so its intrinsic ratio cannot set the height (measured before the fix: 1140px at 1920×1080).
- **`IdentityHero`:** `height` is removed. A hero with a ground photograph or a portrait fills the first screen; a hero without one keeps its content's height (ADR-0067 D2's "no dead register" reasoning is unchanged).
- **Vision & Mission and Strategic Plan** lose `height="content"` and become first-screen heroes. **President and Contact** were already first-screen; their numbers are unchanged.

## D3 — The sponsor strip is below the first screen

The strip starts directly under the hero. It takes no share of the first screen, so no variable is reserved for it and nothing in the hero shrinks for it.

## D4 — Mobile: event card and controls inside the hero, at its foot

At every width the controls sit above the next-event band, and both are inside the hero. The track and its controls share a positioned wrapper that excludes the band, so the controls can never cover it (defect 6, `homepage-hero-design.md` §٢٠). Decision 7 names mobile because that is where the two competed for space.

---

## Measured — the rule held everywhere

`geometry.mjs`, Chromium, `localhost:3001`, reduced motion, fonts loaded. **"= screen"** means header + hero = viewport height exactly. **"text"** means the text needs more than the screen and the hero equals that need (±2px). Every row: no clipped text, no control overlap; homepage focal point inside the frame with `object-fit: cover`.

| Size | Home AR | Home EN | President AR | President EN | V&M AR/EN | Strategic AR/EN | Contact AR/EN |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1920×1080 | = screen | = screen | = screen | = screen | = screen | = screen | = screen |
| 1440×900 | = screen | = screen | = screen | = screen | = screen | = screen | = screen |
| 1366×650 | = screen | = screen | = screen | = screen | text +6 | text +68 | = screen |
| 1024×768 | = screen | = screen | = screen | = screen | = screen | = screen | = screen |
| 768×1024 | = screen | = screen | = screen | = screen | = screen | = screen | = screen |
| 390×844 | = screen | = screen | = screen | = screen | = screen | = screen | = screen |
| 360×640 | = screen | text +7 | = screen | text +46 | = screen | = screen | text +151 |
| 844×390 | text +143 | text +169 | text +224 | text +381 | text +112 | text +174 | text +262 |

**0 failures in 80 measurements** (16 homepage + 64 inner pages).

At 1440×900 the hero is 804px on every page; at 390×844, 748px.

---

## Consequences and debt

1. **Chapter 5 §5.10 (hero ≤ 90vh on mobile) — amended by this ADR** (owner decision 2026-09-16: «عدّله رسميًا باستثناء مكتوب»). The rule now reads: the hero exceeds the cap only when its content requires it; not clipping comes before the cap. It holds wherever the hero equals the screen: 748 ≤ 760 at 390×844, 544 ≤ 576 at 360×640. It is exceeded **only where the text governs**: President EN and Contact at 360×640, and every page in landscape 844×390. President and Contact exceeded it identically before this ADR, under ADR-0067 D2's same formula.
2. **Vision & Mission and Strategic Plan look different**: their heroes grow from a band (628px at 1440×900) to the first screen (804px). The start of the content is no longer in view on first load, which was ADR-0071 D6's stated reason. The owner's decision 6 overrides it by name.
3. **Heroes without a picture keep their content height — OPEN QUESTION** (owner decision 2026-09-16: «يبقى سؤالًا مفتوحًا حتى أول صفحة نصية. لا تغيير الآن»). Decision 6 says "every hero". Every built page's hero has a picture, so no built page is affected, but a typography-led page (§3.34.2) would get an empty first screen if the rule were forced on it. It is decided when the first such page is built.
4. **Figma:** not compared in this batch. **PENDING FIGMA BACK-SYNC** — the first screen at 1440×900 is header 96 + hero 804, with the strip below it; the mobile hero carries the controls and the event band at its foot.
