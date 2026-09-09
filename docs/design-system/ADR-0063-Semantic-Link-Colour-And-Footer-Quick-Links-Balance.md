# ADR-0063 — Semantic Link Colour, and the Footer Quick-Links Balance

**Status:** Accepted
**Date:** 2026-09-09
**Owner approval:** explicit, on both items, before implementation.
**Supersedes:** nothing. Amends the `color.text.link` value in
`tokens/semantic/colors.light.json` and `colors.dark.json`, and the quick-links
list in `apps/web/src/components/layout/site-footer.tsx`.

---

## D1 — The identity green is not a text colour

### Context

A live-browser sweep of the twelve public routes reported a WCAG 1.4.3 failure
on two of them: every email link on `/contact` and every board member's email
on `/about/board-members` measured **3.39:1** against the ground behind it in
the dark theme. Seven links per page, at 14px and 16px.

No test saw it. The token being used was real, correctly spelled, correctly
declared, and referenced through the approved `var(--…)` form, so
`token-contract.spec.ts` had nothing to object to. The token was
`--color-brand-primary`.

That is the failure's whole shape. `--color-brand-primary` is `#00843D`,
Pantone 348 C, and it is declared in `base.css` — **one value for every
theme**, on purpose: Chapter 1 ADR-0003 and the brand guide §5.1 forbid
shifting it, and a token that changed with the theme would stop being the
identity. A colour that cannot move cannot answer to the ground behind it. Used
as a fill it is exactly right, which is why it exists; used as *text* it is a
contrast failure waiting for a dark theme, and the dark theme arrived.

The design system already publishes the token that does answer to the ground:
`color.text.link`. It was simply not what the pages reached for.

### Decision

**D1.1 — The two public pages bind to the semantic role.**
`text-[color:var(--color-brand-primary)]` → `text-[color:var(--color-text-link)]`
in `contact/page.tsx` and `about/board-members/page.tsx`. Root-cause correction
per CLAUDE.md §19: the defect is not a colour that needs adjusting, it is a
role token that was bypassed.

**D1.2 — `color.text.link` itself is repointed, in both themes.**
Binding the pages to the semantic token was necessary and not sufficient. A new
contract test (D1.3) measured the token for the first time and found it failing
too:

| Theme | Was | on `surface.base` | `raised` | `sunken` |
|---|---|---|---|---|
| light | `{color.brand.primary}` `#00843D` | 4.60 | 4.81 | **4.37** ✗ |
| dark | `{color.green.400}` `#1A9448` | 4.79 | **4.17** ✗ | 5.37 |

The dark value shipped with the comment *"Lighter step for AA contrast on dark
surface"* — a claim, never a measurement. `raised` is the card surface, which
is what `/about/board-members` renders every member into.

New values, both taken from the published green ramp — no new value is minted,
and the identity `green.500` is untouched:

| Theme | Now | `base` | `raised` | `sunken` |
|---|---|---|---|---|
| light | `{color.green.600}` `#006B31` | 6.38 | 6.67 | 6.07 |
| dark | `{color.green.300}` `#3DAD65` | 6.56 | 5.72 | 7.36 |

High-contrast is unchanged at `#000000`, deliberately identical to
`text.primary`: at that contrast level the underline carries the link cue, not
colour, and its own token comment has always said so.

**D1.3 — The page text ladder is measured, not asserted.**
`register-contrast.spec.ts` measured every tier of every coloured register on
every ground, in all three themes — thoroughly. It never measured the *page*:
no test in this repository had ever compared a `--color-text-*` token to a
`--color-surface-*` token. That is the gap that let a wrong comment stand in
for verification. `primary`, `secondary`, `muted` and `link` are now each
measured against `base`, `raised` and `sunken` in all three themes — 36
assertions. `disabled` is excluded, not exempted: WCAG 1.4.3 exempts inactive
components and both theme files say so.

**D1.4 — A guard so the bypass cannot recur.**
`token-contract.spec.ts` now fails on any `text-[color:var(--color-brand-*)]`
in `apps/web`. Scoped to `text-` utilities on purpose: a brand-coloured fill,
border or ring is the identity used as identity. The guard was verified to fail
by reintroducing the original class — a rule that has never been seen to fail
is a rule that may be passing vacuously, and the first version of this one was
(a stray control byte in the pattern; it matched nothing and reported clean).

### Consequences

- Three dashboard call sites still paint text with `--color-brand-primary`
  (`user-directory.tsx`, `role-workbench.tsx`, `page-editor.tsx`). They are the
  same class of defect and are **not** fixed here: they are button and control
  labels, not links, so `text.link` is the wrong role for them and choosing the
  right one is a separate decision. Reported to the owner, not silently
  repointed. The guard above covers `apps/web` only, for the same reason.
- Contrast is now a computation in three places instead of a comment in one.

---

## D2 — The footer quick-links column, rebalanced

### Context

ADR-0062 regrouped the header into eight items, three of them disclosure
groups. `FOOTER_QUICK_LINKS` was reconciled with it 1:1 by *destination* (the
owner's decision, recorded there), which took the column from nine links to
nineteen.

Measured at 1440px, the four footer columns then stood at **210 / 732 / 210 /
165**. The quick-links column was 3.5× its neighbours. The approved
composition is four columns of comparable height; that is not it. The defect
was introduced by ADR-0062's own reconciliation and no test caught it, because
nothing about it is structural — every link is present, correct, and in order.

### Decision

Two sub-columns inside the same column, via CSS multi-column.

Not a second `<nav>` and not a nested grid: the DOM stays one list inside one
landmark, so reading order, tab order and `FOOTER_QUICK_LINKS` order remain the
single source they already were, and the flow follows `dir` for free — the
first item heads the right-hand sub-column under `dir="rtl"` and the left-hand
one under `dir="ltr"`. The four-column grid CLAUDE.md §3 protects is untouched.

Two things had to change with it, and neither was predictable from the source:

- **The list had to become `w-full`.** As `flex flex-col items-start` it shrank
  to its content — measured at 106px in Arabic and 142px in English — so
  `columns-2` would have split *that*, not the 288px column it sits in.
- **`whitespace-nowrap` had to go.** At 1440 the sub-columns are 136px and
  exactly one label of the nineteen is wider: "Organisational Structure" at
  142px. Nowrap would have pushed it across the gutter.
  `break-inside-avoid` keeps a wrapped label's lines together.

### Result, measured on a live browser

At 390 / 768 / 1024 / 1280 / 1440, both languages — heights and per-link
overflow measured, not inferred. The column falls from **732px to 394px** at
1440 in both languages. **Nothing overflows at any width.**

One band stays heavier: **English at exactly 1280px**, where the column is
248px, the sub-columns 116px, and four labels wrap instead of one — 457px, or
2.18× its tallest neighbour. Reported rather than tuned away: closing it would
mean narrowing the approved 48px column gap or shortening approved copy, and
§3 and §12 protect both. A 12px gutter was tried and measured before settling;
it moved nothing, because the labels that wrap miss by more than the 2px it
buys.

### Consequences

- **PENDING FIGMA BACK-SYNC.** The approved frame shows one nine-item column.
  No frame exists for a two-sub-column list, in either language.
- The 2× balance ratio used above is a **measurement threshold for this
  verification only**. It is not proposed as a design-system rule and is not
  written into any chapter; §16 forbids minting one silently.
