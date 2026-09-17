# ADR-0077 — The Sponsorship Model, Minimally Evolved, and the Global Sponsor Strip's Settings

**Status:** **Proposed** — nothing in this ADR is built. It records decisions taken in the owner's brainstorm session of 2026-09-16 for a later batch, so they are not re-litigated when that batch starts.
**Date:** 2026-09-16
**Authority:** The owner's brainstorm brief of 2026-09-16 (§٣.١–§٣.٤) and his answers during that session, each attributed below.

**Closes, on acceptance:** the four `DESIGN DECISION REQUIRED` items left open by **ADR-0043** (`CMP-GLOBALSPONSORSTRIP-001`): exact placement · whether the strip appears on the Homepage alongside the Grid · what the "concise sponsor text" field is · RTL travel direction.

**Does not amend:** ADR-0037 (Memberships MUST NOT be merged with Sponsors) · ADR-0043's core ruling that the Grid and the Strip are two distinct components · the `sponsors.restricted` sub-document or its permissions · the RBAC system · `02-Homepage-Specification.md` §15's Grid description.

---

## Context

`sponsors`, `sponsorships`, `partnerships` and `memberships` — Domain 9, four
collections — exist as a written specification in
`docs/product/07-Mongoose-Schema-Specification.md` and **nowhere else**. They
are not in `api/src`, and the local database has no such collections. The owner
confirmed in session that this specification is the schema to evolve.

Because no row exists anywhere, **every change below is additive or a
relaxation, no field is removed, no enum value is withdrawn, and there is no
data to migrate.**

---

## D1 — `sponsors`: unchanged

`name{en,ar}` · `logoId` · `website` · `categoryLabel{en,ar}` · `restricted{…}`
are used exactly as specified. `categoryLabel` is the sector line Figma already
prints on the sponsor card (`جهة حكومية`, `خدمات مالية`).

The `restricted` sub-document — contact e-mail, contact phone, contract value,
contract document — is a protected area. It is not touched, and it never reaches
a public response.

The sponsor is permanent; the **sponsorship** is what expires. That separation
is already in the specification, and it is what lets a sponsor's contract lapse
and later resume without duplicating the organisation's record.

---

## D2 — `sponsorships`: four changes

| # | Field | Today | Proposed | Why |
| --- | --- | --- | --- | --- |
| 1 | `endDate` | `Date`, **required** | optional; `null` means open-ended | Owner: a sponsorship may be open-ended. A relaxation, not a break |
| 2 | `scopeLabel{ar,en}` | — | new, optional, max 120 chars | "exactly what this sponsor sponsors", written freely by the admin — owner's decision |
| 3 | `isFeatured` | — | new, `Boolean`, default `false` | The VIP mark, **independent of `tier`** — owner's decision. More than one sponsorship may carry it; the brief says "رعاة VIP" in the plural |
| 4 | `displayOrder` | — | new, `Number`, default `0` | Manual ordering in the strip and the grid — owner's condition 2 for the strip |

### What does not change, and why

**`targetType` stays a closed list** — `Federation | Championship | Event`.

The owner first answered "an open free-text list". That answer was taken back to
him because his own §٣.٢ requires that "الإعلان عن راعي الحدث داخل صفحة الحدث أو
البطولة … البيانات يجب أن تدعمه من الآن" — and free text alone cannot answer
"who sponsors this championship?". He then chose **a closed link plus a free
display label**, which is what D2 #2 implements. Recorded because the reasoning,
not just the outcome, is what a future reader needs.

**`status` keeps its three values, and the system never writes `Expired`.**
Expiry is computed at read time, in `Asia/Dubai`, through the end of the
`endDate` day — owner's decision. No cron, no job: a stopped server for one night
cannot leave an expired sponsor on the public site, and nothing needs to be
back-filled. `Expired` remains in the enum for manual archiving and so the enum
is never narrowed.

### The banner is not a field on `sponsorships`

Which sponsorship fills the banner is a **page-composition** decision, not a
contract term. It lives at
`pageSections.configuration.bannerSponsorshipId` on the `SPONSORS` section.

This is what lets the admin pick one when several strategic sponsors exist —
the owner's chosen behaviour — without a uniqueness constraint spanning a whole
collection. `bannerAssetId` and `promotionalText` stay on `sponsorships` and are
read when that sponsorship is the chosen one.

**Edge cases, owner's decision:** one banner slot; surplus strategic sponsors
render as emphasised cards in the grid; **zero** strategic sponsors removes the
banner and keeps the grid — the same rule `CMP-LIVESTREAM-001` already sets, that
an empty shelf is never rendered.

---

## D3 — `partnerships` and `memberships`: one change each

`displayOrder: Number = 0`. A fixed row needs an order the admin owns.

No display fields are added: `partnerName` and `organizationName` are already
bilingual, which is what a "logo + name" card needs in both Arabic and English.

`partnerLogoId` and `organizationLogoId` stay optional. A record without a logo
renders its **name in the logo's place** — never an empty slot, never a
placeholder. This is the same rule the strip uses (D5, condition 8) and the same
rule the amended page rule 2 states.

---

## D4 — Two sections, cards only, a fixed row rather than a carousel

**Two separate sections.** Already settled by ADR-0037, which forbids merging
commercial sponsorship with governance affiliation. Not reopened.

**Logo + name only** for both partners and memberships — owner's §٣.١.

**A fixed row, not a carousel.** This departs from Figma and from ADR-0037's
"carousel/grid" wording, on four pieces of evidence:

1. The real counts are small: three partners on the current `uaeaf.ae`, four or
   five memberships.
2. `02-Design-Principles.md` §Anti-Patterns names "a carousel used merely
   because it is beautiful" as an anti-pattern.
3. ADR-0037 permits a grid; it does not require a carousel.
4. Figma's own carousel is internally inconsistent: five cards and five dots at
   desktop, **three dots for five cards** at 390.

Overflow behaviour follows the existing `row-capacity.ts` pattern — past the
count a row holds, the list takes the layout it already has on a phone, rather
than a composition nobody has approved.

Recorded as a **deviation from Figma with a written reason**, per `CLAUDE.md`
§1a.

---

## D5 — The Global Sponsor Strip: ADR-0043's four open items, closed

| ADR-0043 open item | Closed as | Source |
| --- | --- | --- |
| Exact placement | Immediately below the hero, on every page that has one | Owner §٣.٤ |
| Homepage too, alongside the Grid? | **Yes** | Owner §٣.٤; consistent with ADR-0043's own "across all website pages" |
| What the "concise sponsor text" is | Three display modes, admin-selected; default `logo + name` | Owner |
| RTL travel direction | **Follows the reading direction**: Arabic right→left, English left→right | ADR-0075's written precedent, "Horizontal travel follows the language". Horizontal travel alone follows language; the 45° ascent vector never mirrors |

### The strip's settings — owner's decision, in full

Settings live at `siteSettings.sponsorStrip`, an embedded sub-document.
`siteSettings` is the existing singleton for site-wide chrome (SEO, footer copy,
logos, policy links), and ADR-0043 forbids folding the strip into the Header or
Footer component definitions. Putting the settings there also satisfies
condition 10 below: a future per-page override layers on top of this global
default without moving a field.

1. **Display mode** — one setting for the whole strip, never per sponsor:
   `logo only` · `logo + name` (default) · `logo + name + what they sponsor`.
2. **Who appears** — all active sponsorships, or a manual selection.
3. **Order** — by tier, or manual.
4. **Pin the strategic sponsor to the centre** — yes/no.
5. **Speed** — three steps.
6. **Show/hide the strip.**
7. In `what they sponsor` mode: speed adapts to item length; a maximum total
   strip-text length whose counter is shown in the dashboard; and on mobile it
   **falls back automatically to `logo + name`**, with a line in the dashboard
   explaining that to the admin.
8. In `logo only` mode: the name remains the `alt` text, and a sponsor with no
   logo shows its name in the logo's place.
9. **The stop button and `prefers-reduced-motion` work in all three modes.**
   `prefers-reduced-motion: reduce` must stop the motion **entirely, not slow
   it** — ADR-0043 and Chapter 5 §5.8, with no exception for being secondary.
10. The settings are shaped so a future Header/Footer management system can add
    per-page overrides, without implementing that now.

### The English frame

The strip is **entirely absent from Figma's EN frame** (`616:98`), and that
absence is what makes every English section sit 112px higher than its Arabic
counterpart. It is built in both languages from one component: sponsor names are
bilingual in the record, and ADR-0043 exempts no language. Recorded as a
deviation from Figma with a written reason.

---

## D6 — The partner-stats trio is computed, not typed

Figma prints three fixed numbers with no source, and they contradict the page
they sit on: the strip says 8 partners, the marquee shows 9 + 1, the grid shows
5. Three different counts on one page.

Owner's decision: the three figures are **derived from the data** — active
sponsor count, the earliest `startDate`, and the number of championships with a
sponsorship this year — and are shown only when their data is complete. A figure
that cannot contradict the section beneath it is the only figure worth printing.

---

## Risks

1. **`scopeLabel` is free text, so it can contradict `targetType`.** Accepted:
   the machine-readable link is what other pages query; the label is what a
   reader sees. The dashboard shows both side by side so the contradiction is
   visible while it is being written.
2. **Read-time expiry means an expired sponsorship stays in the database
   looking active.** Accepted: the database row is the contract, and the
   contract did exist. Every public read applies the window.
3. **`isFeatured` and the banner slot are two different emphases** and could be
   confused by an admin. Mitigated by naming them differently in the dashboard:
   "VIP mark" on the sponsorship, "banner sponsor" on the section.
4. **`MEMBERSHIPS` is not in `PAGE_SECTION_TYPES`.** The closed list has
   thirteen values and does not include it, although ADR-0037 approves the
   section. Closed by adding an enum value — an addition, never a removal — when
   that section is built.

---

## Consequences on acceptance

- `docs/product/07-Mongoose-Schema-Specification.md` Domain 9 gains the six
  fields of D2 and D3, each marked with this ADR.
- ADR-0043's four open items are struck and replaced with a pointer here.
- `02-Homepage-Specification.md` §15 gains a note that the partner-stats trio is
  computed (D6), replacing the fixed figures.
- No migration: the four collections have no rows in any environment.
