# ADR-0061 — Header/Footer Reading Direction, Logo Theme Variant, and the Primary-Navigation Threshold

**Status:** Accepted (implementation), with one item marked DESIGN DECISION REQUIRED
**Date:** 2026-09-08
**Scope:** `apps/web` global header and footer only. No backend, no schema, no content, no Figma edit.
**Supersedes in part:** ADR-0060 §D-nav (the `xl` navigation threshold), and the footer decoration note in `site-footer.tsx` as originally written.

---

## 1. Context

The public site's header and footer passed 112/112 automated width checks and a full
guarded suite, and were still visibly wrong when the Product Owner opened them. Four
defects were reported by eye and then reproduced by measurement on a live browser:

1. Footer text and column content aligned against the reading direction in **both**
   languages.
2. The nine-item primary navigation overlapped the utility cluster in English.
3. The language switcher showed `AR | EN` — both languages, no state.
4. The full-colour logo was rendered on the dark theme's ground.

Every one of these is a *rendered* property. None of them changes the DOM, the
document's scroll width, or any structural assertion, which is exactly why the
existing suite could not see them.

---

## 2. Decisions

### D1 — Footer alignment uses the reading START, not the reading END

**Evidence.** Measured at 1440px on the production build: the "Quick Links" heading
sat at x=744 in Arabic and x=984 in English, inside the same 744–1036 column — exact
mirror images, each pinned against its own reading direction.

**Cause.** `items-end` / `text-end`. Those *are* logical values and *do* follow `dir`
— into the wrong side of it. `end` means "where this language stops reading": the LEFT
under `dir="rtl"`, the RIGHT under `dir="ltr"`.

**Decision.** `items-start` / `text-start` throughout the footer. Arabic aligns right,
English aligns left, from one declaration.

**Governing rule.** Chapter 4 §4.11 Architectural Rule (MUST): *"No text in the code
MUST assume a fixed language — every Direction and Font Family is derived from the
actual language token."* `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §RTL/LTR adaptation
names text alignment first in its list.

**Not changed.** The column ORDER. Brand → Quick Links → Location → Contact already
puts Brand at the reading start in both directions, so the approved Arabic composition
is reproduced and English is its mirror.

### D2 — Footer brand artwork: placement is logical, angle stays physical

**Evidence.** With D1 applied, the green swoosh crossed the English "UAE Athletics
Federation" heading by 152px and its description by 171px (1440px, dark).

**Cause.** Two properties of the artwork had been conflated under one physical
`left`/`right` inset.

**Decision.** Separate them.

| Property | Behaviour | Why |
| --- | --- | --- |
| Angle (`-rotate-35`) | Physical, never mirrors | ADR-0059 §D7.1 — the ascent vector is brand geometry, not reading direction |
| Placement (`start`/`end`) | Logical, mirrors with the composition | The art is positioned against the Brand and Contact columns, and those columns swap sides |

Arabic is unchanged to the pixel (`end` resolves to left, `start` to right under
`dir="rtl"`, which is what the previous literals were). Verified: decoration mirror
parity ar↔en is **14/14** across 7 widths × 2 themes.

### D3 — The brand artwork is drawn only from `xl`

**Evidence.** A defect older than D1/D2 and present in Arabic all along: the artwork
carries fixed pixel sizes (259px, 204px…) composed against the 1440px root frame,
while the columns shrink with the viewport.

- **1024px** — the white swoosh runs straight through the words "Asian Athletics" in
  the brand description. White artwork under white text: not a contrast shortfall, the
  total loss of two words.
- **375px** — the green/red pair crosses the brand heading and three description lines.
- **1280px** — every stroke clears every glyph (the white one passes under
  "Federation." and behind the social buttons). Confirmed by screenshot, not inferred.

**Decision.** `hidden xl:block` on the decorative spans. Below `xl` the artwork is not
drawn.

**Why not scale or reposition it.** There is no Figma frame for a small-screen
treatment of these swooshes. Producing one here would be fabricating a responsive
specification, which CLAUDE.md §13 forbids. The art is `aria-hidden` decoration, so
not drawing it costs no content and no meaning. Measured after the change:
decorations over text = 0 at 320/640/768/1024.

**Status.** PENDING FIGMA BACK-SYNC — the small-screen treatment of the swooshes is a
frame that does not exist yet.

### D4 — The logo follows ADR-0002 on dark grounds

**Evidence.** The header rendered `variant="color"` in every theme. Its five wordmark
paths resolve to `--color-brand-black` (`#000000`, theme-invariant in `base.css`,
correctly so — it is a Pantone value) against the dark theme's `--color-surface-base`
(`#131210`). **Measured 1.12:1.** The mark was not dim; it was absent.

**Decision.** Chapter 1 **ADR-0002** already settles this and is Accepted: *"In Dark
Mode, the white monochrome logo is used exclusively."* Implemented through three
custom properties declared in `globals.css`:

```css
:root            { --logo-ink: var(--color-brand-black);
                   --logo-green: var(--color-brand-primary);
                   --logo-red: var(--color-brand-secondary); }
[data-theme="dark"] { --logo-ink: currentColor;
                      --logo-green: currentColor;
                      --logo-red: currentColor; }
```

**Why the cascade and not a hook.** Chapter 7 §7.4 requires theme resolution to be
CSS-only. A `useTheme()` read would add a client boundary and would be wrong on the
first paint.

**Why not a semantic token.** Three properties for one component is app-level
indirection, not a design-system addition; minting tokens for it would be the silent
system evolution CLAUDE.md §16 forbids. `token-contract.spec.ts` now reads the app's
own CSS declarations, so a typo still fails.

**High contrast is deliberately untouched** — it paints a `#FFFFFF` surface, which is
exactly the "white/high-contrast background" the guide's background rule gives the
full-colour mark. It inherits `:root`.

**Measured after:** logo ink vs its own ground — **4.6:1 light**, **17.91:1 dark**, at
every width in both locales.

### D5 — The language switcher names its destination

**Evidence.** The control read `AR | EN` in both locales.

**Problems.** It named the language you are already in alongside the one you would
get, so it read as a status label rather than an action; it never indicated which half
was current; and neither half was marked up in its own language, so a screen reader
pronounced Arabic text with an English voice and the Arabic string rendered in the
Latin face (Chapter 4 §4.3 binds family to language, not to document).

**Decision.** The visible label is the destination's endonym — `English` on the Arabic
page, `العربية` on the English page — carried in a `<span lang>`. The endonyms live in
`src/i18n/routing.ts`, **not** in `messages/*.json`: an endonym is not translated
content, its invariance is the point, and a reader who cannot read the current page
still recognises their own language in their own script.

**Accessibility.** `Header.switchLanguage` became `"Switch to {language}"` /
`"التبديل إلى {language}"`. WCAG 2.2 SC 2.5.3 Label in Name requires the visible label
to appear inside the accessible name; a fixed "Switch to Arabic" against a visible
"العربية" would fail it outright, and would break silently the moment a third locale
is added.

### D6 — The primary navigation row moves to `2xl`

**Evidence.** ADR-0060 placed the row at `xl` (1280) from an **Arabic-only**
measurement: nine Arabic labels want 903px of link width. English wants **1002px** for
the same nine — "About the Federation", "Federation Events", "News & Articles", "Media
Center" — plus eight 12px gaps: **1098px** for the row.

What the browser reported on the previous build:

| Width | Row given | Result |
| --- | --- | --- |
| 1280px | 910px | "Media Center" at x=1025–1148 and "Contact Us" at x=1160–1250, both across the utility cluster at 1070–1256 |
| 1366px | 996px | "Contact Us" still crossed the cluster by 90px |
| 1440px | 1070px | "Contact Us" still crossed it by 20px |

The links carry `whitespace-nowrap`, so they overflow the nav box instead of wrapping,
and the header is `overflow: visible`, so they overlapped rather than extending the
document's scroll width. **That is why 112/112 width checks passed on a header that
was visibly broken: nothing scrolled.**

**Decision.** `2xl` (§5.2's ≥1536 band): 1536 − 48 padding − 120 logo − 186 utilities
− 16 gaps = **1166px** available against 1098px wanted — 68px spare, enough that a
scrollbar cannot reintroduce the overlap. `2xl:gap-5` is removed: it added 64px to the
widest row at the exact width with the least room.

**Why not 1440.** It is not a §5.2 breakpoint — it is §5.3's max container width — and
using it as one would invent a breakpoint (CLAUDE.md §2, §1a.2). With `gap-5` it also
left only 4px of slack.

**DESIGN DECISION REQUIRED.** The cost is real: 1280–1535px, which includes the very
common 1366 and 1440 laptop widths, now gets the disclosure drawer instead of the row.
Nine items do not fit there in English by any means that does not change approved
content. Restoring the row across that band requires one of:

- **A.** Shorter English labels (About / News / Media). Content change — §2 and §12.
- **B.** Fewer than nine items. IA change — §11 and the §8.1 owner ruling.
- **C.** A smaller nav type step at `xl`. Design-system change — Chapter 4 §4.4.

None may be chosen here. Recommendation if the owner wants the row back at 1440:
**A**, because it changes the fewest governed things (English labels only; Arabic is
already short enough) and is reversible.

---

## 3. Verification

Measured on the production build (`next build` + `next start`), a real headless Chrome
driven over CDP — not assumed.

**28 combinations** = 7 widths (320 + the six §5.2 bands) × 2 locales × 2 themes, on
`/records`. All clean:

| Criterion | Result |
| --- | --- |
| `scrollWidth == clientWidth` | 28/28 |
| Nav link vs logo / utility overlap | 0 in 28/28 |
| Header descendant leaving the viewport | 0 in 28/28 |
| Row and menu button mutually exclusive | 28/28 |
| Footer heading at its column's reading-start edge | offset 0px in 28/28 |
| Footer body text at its box's reading-start edge (rendered text rect, not `text-align`) | 0px in 28/28 |
| Logo ink vs its own ground | 4.6:1 light · 17.91:1 dark |
| Switcher label | "English" on `ar`, "العربية" on `en`, with `lang`, in 28/28 |
| Console errors | 0 |
| Decoration mirror parity ar↔en | 14/14 |
| Decorations over text below `xl` | 0 |

**Note on one measurement method.** `getComputedStyle().textAlign` returns the logical
keyword (`start`) and proves nothing about which side the glyphs landed on. The first
sweep failed 28/28 on that basis and the *check* was wrong, not the code. Alignment is
measured from the rendered text rect (`Range.getBoundingClientRect`) instead.

**Visual confirmation** (the owner's explicit requirement): header row, open drawer,
footer at 1440, and footer at 375 were captured and inspected in both locales and both
themes. The 1024px white-on-white artwork collision in D3 was found this way, not by
measurement — the axis-aligned box of a rotated element over-reports, so the numbers
alone could not distinguish an approved adjacency from an obliterated word.

**Suite:** 151/151 tests, 11 files (was 149/150). `tsc --noEmit` clean, `eslint .`
clean. Six new rules in `direction-and-logo-contract.spec.ts` cover D1–D5; they were
written first and observed failing (6 of 9 red) before the fixes.

---

## 4. What is NOT covered

- The drawer's presentation at 1280–1535px is a full-width panel with the mobile
  stack. It is functional, accessible, and honest, but it is the mobile composition on
  a desktop width and no frame exists for a desktop disclosure panel. PENDING FIGMA
  BACK-SYNC.
- `SOCIAL_LINKS` and `LEGAL_LINKS` are still stored in RTL DOM order. Both read in the
  same logical order under `dir="ltr"`, so nothing is wrong today; if the Figma export
  order is ever taken as canonical for English, this is where it would be reconciled.
- No commit has been made.
