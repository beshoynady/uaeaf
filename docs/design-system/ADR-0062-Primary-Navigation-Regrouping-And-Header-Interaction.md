# ADR-0062 — Primary Navigation Regrouping, Disclosure Pattern, and Header Interaction

**Status:** Accepted (owner decisions of 2026-09-09). The documentation conflicts it raised are resolved in §D2.
**Date:** 2026-09-09
**Scope:** `apps/web` primary navigation and header interaction. No backend, no schema, no Figma edit.
**Relates to:** IA §8.1 (Product Owner ruling), ADR-0042, IA §15.1a, ADR-0061 §D6

---

## 1. Context

ADR-0061 §D6 had to push the navigation row out to `2xl` (1536px) because nine flat
English labels wanted 1098px of row and 1440px offers 1070px. That left the drawer on
1366 and 1440 — the two commonest laptop widths — and the ADR recorded three ways out,
all of which changed approved content.

The Product Owner rejected all three and supplied a fourth: **group the navigation into
disclosure panels**, which shortens the row without shortening a single label.

Reviewed against `01-Information-Architecture.md` §8.1 before implementation, per the
owner's explicit instruction to report conflicts rather than resolve them silently. §8.1
— itself a Product Owner ruling that supersedes an older seven-item description — already
specifies dropdowns, and the proposal matched it exactly on About (including the nested
Governance & Strategy submenu), Media Centre, Championships and Contact. It differed on
four points, each put to the owner and each decided:

| Conflict | §8.1 as written | Owner decision (2026-09-09) |
| --- | --- | --- |
| Clubs | Top-level link — "= General Assembly members, per client clarification" | **Inside Members**, with the General Assembly meaning kept as a description line |
| News | Two-item dropdown: News & Articles · **UAEAF in the Media** | **Plain link.** "UAEAF in the Media" becomes a SECTION of the news page, not a page |
| Members | + nested submenu "المواهب والمتطوعون" (Talents, Volunteers) | **Deferred** — held out of the header pending review with the Federation; IA §8.1 keeps it as the approved target state |
| Home | Item 1 | **Kept** |

A fifth point was not a conflict: shortening "فعاليات الاتحاد / Federation Events" to
"الفعاليات / Events" restores §8.1's own wording, which the build had drifted from.
CLAUDE.md §11 protects the *distinction* between Events and Championships, which §8.1
restates explicitly and this change does not touch.

---

## 2. Decisions

### D1 — The structure

Eight top-level items; three carry a panel; one panel carries one nested group.

| # | Item | Type | Children |
| --- | --- | --- | --- |
| 1 | الرئيسية / Home | link | — |
| 2 | عن الاتحاد / About the Federation | panel | نبذة · كلمة الرئيس · مجلس الإدارة · اللجان · الهيكل التنظيمي · **الحوكمة والاستراتيجية** (nested: الرؤية والرسالة · الخطة الاستراتيجية · السياسات واللوائح) |
| 3 | الأعضاء / Members | panel | الأندية *(أعضاء الجمعية العمومية)* · الرياضيون · المدرّبون · الحكّام |
| 4 | البطولات / Championships | link | — |
| 5 | الفعاليات / Events | link | — |
| 6 | الأخبار والمقالات / News & Articles | link | — |
| 7 | المركز الإعلامي / Media Center | panel | ألبوم الصور · الفيديوهات |
| 8 | تواصل معنا / Contact Us | link | — |

**Labels changed in both languages together, and only where the owner named them.** Events
is the one shortening. "News & Articles" keeps the words the product
documentation uses: the owner's list wrote them in shorthand, but CLAUDE.md §12 forbids
rewriting approved terminology for the sake of it, and only one rename was explicit.

**Every existing URL is unchanged**, including `/events/federation-events` behind the
shorter label. Nine destinations have no page yet and take paths derived from the pattern
already in use (`/about/board-members`): `/about`, `/about/president`,
`/about/organisational-structure`, `/about/governance/{vision-mission,strategic-plan,policies}`,
`/officials`, `/championships`, `/events/federation-events`.

### D2 — Documents this contradicts — RESOLVED 2026-09-09

Reported first, then resolved on the owner's instruction. Each with a non-destructive
amendment notice; nothing was deleted.

1. **IA §15.1a** — amended. `/media-coverage` is withdrawn as a route; "UAEAF in the Media"
   becomes a section of `/news`. The affected rows (dedicated destination, bilingual routing,
   archive indexability, the open navigation dependency) are each superseded in place, with
   the original preserved as history. `02-Homepage-Specification.md` §11b and §18 carry the
   matching amendments, and its four remaining `/media-coverage` mentions each carry a pointer.
2. **ADR-0042 needs no amendment**, correcting this ADR's own first reading of it. Its
   Consequences clause states explicitly that it does not decide route, navigation,
   indexability or homepage exposure — those were always IA §15.1a's to decide. Its content
   model, ownership boundary, editorial workflow and localisation rules are untouched.
3. **IA §8.1** — amended, with each of the three differences attributed to the side that was
   actually wrong: **the document** for Clubs and for News (owner rulings, build correct);
   **neither** for المواهب والمتطوعون, which the owner instructed on 2026-09-09 to hold out of
   the header pending review with the Federation — so the document keeps it as the approved
   target state and the build's omission is a scheduling decision, not a deviation.
4. **"Championships" vs "Tournaments"** — decided on evidence, not preference, and applied to
   document, code and both message catalogues together. The document was right; the build was
   wrong. A championship confers a title, a tournament is a knockout structure athletics does
   not use; the approved Arabic بطولات is the title-conferring sense; World Athletics, the
   Asian Athletics Association and the peer national federations all say Championships; and
   the API already models the concept as `championship`. The web route was renamed
   `/tournaments` → `/championships` rather than redirected, because no page exists at it —
   there is no live URL, inbound link or index entry to preserve.

### D3 — Disclosure navigation, not an application menu

The owner asked for `role="menu"` "where it applies". It does not apply here, and the
implementation uses WAI-ARIA APG's **Disclosure Navigation** pattern instead: a `<button>`
with `aria-expanded` + `aria-controls`, revealing a plain `<ul>` of ordinary links.

`role="menu"` / `menuitem` is the APG's pattern for menus of *commands* in an application.
Applied to site navigation it strips the links of their link semantics: a screen reader
stops counting them as links, drops them from its links list, and announces "menu item"
for something that navigates. §8.1 asks for "the WAI-ARIA APG nested-menu pattern"; this
is that pattern's navigation variant, which is the one the APG points site navigation at.
Guarded: `site-header.test.tsx` fails if `role="menu"`, `menuitem` or `menubar` appears.

A group is a button and never also a link. A control that both navigates and discloses can
do neither unambiguously from the keyboard.

### D4 — The drawer nests in flow, not as a second floating layer

The owner asked to be told if two-level nesting hurts the small-screen experience. It does,
as a *flyout*: a second floating layer has no hover to open it on touch, covers the list it
came from, and leaves no visible way back.

The drawer therefore renders the same tree as an **inline accordion** — identical
hierarchy, three visible indentation levels, no layer over a layer. The row keeps the
flyout §8.1 specifies. One `<ul>` produces both; a second copy for small screens would
double the tab order and the accessible names.

### D5 — The row threshold, re-derived by measurement

`xl` (1280px), which is `--breakpoint-xl` and §5.2's fifth band.

The threshold has now moved twice for the same reason — someone measured one language.
This time both were measured, on the production build, with a real scrollbar:

| | Row needs | Room at 1280 | Slack |
| --- | --- | --- | --- |
| Arabic | 797px | 907px | 110px |
| English | 863px | 911px | **48px** |

The first measurement gave English only 12px, which is not a margin. `xl:px-1` on row
items (`px-2` retained in the drawer, where width is free) and `xl:gap-2` between them
bought the rest: 16px of separation between labels, unchanged rhythm, 48px of room to
spare. Guarded: `direction-and-logo-contract.spec.ts` asserts the `matchMedia` constant,
the Tailwind variant and the `--breakpoint-xl` token are the same number, and that the row
and the drawer trigger appear at the same width.

### D6 — Motion, entirely from tokens

Every value is a design token; nothing was invented. The design system had already encoded
the owner's own principle — *the exit is faster than the entrance* — as a pair of tokens
that had never been used:

| Token | Value | Used for |
| --- | --- | --- |
| `--motion-transition-enter` | 220ms `cubic-bezier(0,0,0.2,1)` | panel opening |
| `--motion-transition-exit` | 150ms `cubic-bezier(0.4,0,1,1)` | panel closing, chevron, indicator rest |
| `--motion-transition-overlay` | 220ms standard | drawer scrim |
| `--motion-duration-fast` | 150ms | the `visibility` hand-off, hover grace |
| `--motion-ascent-offset` | 16px | the rise vector on panels |
| `--motion-ascent-stagger` | 60ms | drawer item sequence |
| `--opacity-overlay` | 0.6 | scrim |

Ten of the nineteen motion tokens were unused before this slice (not eleven of sixteen —
the previous slice had already consumed several). Six are consumed here.

**The Rise**: panels enter along the 45° ascent vector, `translate(−16px, +16px) → 0`,
paired with a fade. The translate is physical and never mirrors (ADR-0059 §D7.1). The nav
indicator does the same at `--space-1` magnitude on hover and on `:focus-visible`, so a
keyboard gets the affordance a pointer gets. **The bar moves, never the label** — a label
that lifts on hover shifts text the reader is in the middle of.

**Only `opacity` and `transform` animate.** The header is sticky and gains elevation on
scroll rather than shrinking: animating a sticky header's height re-lays-out the whole
document beneath it on every frame, which the brief's own performance rule exists to
prevent, and it makes the text the reader is following jump.

**`--motion-transition-celebratory` is deliberately NOT used here.** Chapter 5 §5.6 reserves
`slower` + `spring` for "record/medal celebratory moments". A 480ms overshoot on a
navigation menu would be the design-system rule broken to satisfy a checklist. It stays on
the National Records page.

**Framer Motion was not added.** This project has no such dependency and its motion is
CSS-token-driven; a 30KB+ runtime to reproduce what `transition` already does from the
same tokens would contradict the brief's own performance constraint.

### D7 — A defect the measurement found: `[hidden]` cannot be overridden

The floating panel carried the `hidden` attribute so it would leave the accessibility tree
and the tab order without depending on a stylesheet. It also carried a CSS rule setting
`display: block` at the row breakpoint, so the fade would have something to paint.

The rule never applied. Tailwind's preflight declares
`:where([hidden]:not([hidden="until-found"])) { display: none !important }` in the `base`
layer, and **for `!important` declarations the cascade reverses layer order** — an
important rule in `base` beats an important rule in `utilities`. Neither specificity nor
`!important` could win. Measured on the live build: `display: none` on a panel whose
computed transition read 220ms. The panels were snapping in and out with no animation at
all while every computed style said otherwise.

The fix is to apply the attribute from the layout state (`hidden={!isOpen && !isRow}`)
rather than fight it in CSS: in the stack the panel is in flow and must take no space, so
the attribute is right; in the row it floats and `visibility: hidden` does the same job
while remaining animatable. It is safe before hydration because `isRow` is false on the
server and a closed panel is invisible either way.

---

## 3. Verification

Measured on the production build (`next build` + `next start`), driven over CDP with real
key events — `.focus()` does not satisfy `:focus-visible`.

**28 combinations** = 7 widths (320 + the six §5.2 bands) × 2 locales × 2 themes:

| Criterion | Result |
| --- | --- |
| Nav link overlapping the logo or the utility cluster | 0 in 28/28 |
| `scrollWidth == clientWidth` | 28/28 |
| Row and drawer trigger mutually exclusive | 28/28 |
| 8 top-level items, 4 disclosure triggers, 0 expanded at rest | 28/28 |
| Focusable elements inside a closed panel | 0 in 28/28 |
| `role="menu"` / `menuitem` / `menubar` | 0 in 28/28 |
| Every nav target ≥ 44px tall | 28/28 |
| Header `position: sticky` | 28/28 |
| Console errors | 0 |

**Keyboard, both locales:** Tab reaches a trigger with `:focus-visible` true · Enter opens
(`aria-expanded="true"`) · ArrowDown moves focus onto the first child, still
`:focus-visible` · Escape closes and returns focus to the trigger it came from.

**Motion, sampled mid-flight:** closed — `opacity 0`, `matrix(1,0,0,1,-16,16)`, 150ms
accelerate. 60ms into opening — `opacity 0.54`, `matrix(1,0,0,1,-7.3,7.3)`. Open —
`opacity 1`, `transform: none`, 220ms decelerate. 60ms into closing — `opacity 0.84`,
`matrix(1,0,0,1,-2.6,2.6)`. Drawer stagger delays: `0s, 0.06s, 0.12s`.

**Reduced motion:** transition duration `1e-05s`, delay `0s`, transform `none`, panel
opacity 1 and visible, every link laid out and readable.

**Scroll:** `data-scrolled` flips, box-shadow appears, header stays at `top: 0`.

**Contrast:** worst panel text against its own ground — **9.04:1 light, 8.57:1 dark**.

**Suite:** 155/155 across 11 files. `tsc --noEmit` clean, `eslint .` clean.

**Looked at, not only measured:** the row with a nested flyout open and the drawer with a
two-level accordion open, in both locales and both themes. Two defects were found that way
and fixed — panel children had no indentation in the drawer, so the hierarchy did not
read; and the nav indicator sat at the opposite edge of a full-width row, reading as a
stray dash detached from its label.

---

## 4. Open items

1. **Nine of eighteen destinations resolve to the 404 screen.** The owner's explicit
   decision (2026-09-09): show the full approved structure now rather than hide the
   unbuilt half. PR-010 forbids "Coming Soon", so the 404 says the link does not resolve
   and offers what exists. `prefetch={false}` on every unbuilt route keeps the prefetch
   404s out of the console.
2. **المواهب والمتطوعون (Talents & Volunteers)** — held out of the header on the owner's
   instruction of 2026-09-09, pending review with the Federation. IA §8.1 still carries it as
   the approved target state; adding it later is a one-entry change to `PRIMARY_NAV`.
4. The drawer at 1024–1279px is still the mobile composition on a desktop width, with no
   Figma frame of its own. PENDING FIGMA BACK-SYNC.
5. Text-only zoom above roughly 110% will overflow the row before the breakpoint reacts;
   full-page zoom is handled correctly, because it reduces the layout viewport and the
   drawer takes over.
