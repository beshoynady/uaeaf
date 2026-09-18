# ADR-0086 — The strip's pause control, a chosen pinned sponsor, its marker, and logo presence

| | |
| --- | --- |
| **Status** | Accepted (owner batch, 2026-09-18) |
| **Supersedes in part** | ADR-0085 D5.1 (the strip's pin follows the banner), ADR-0077 D5 (`pinTopTier`) |
| **Builds on** | ADR-0085 D7 and D9 (the strip), D6/D6.1 and D8 #3 (the logo plate) |
| **Authority** | Owner decision. Every visual value below cites the chapter it derives from; where a chapter says nothing, the measurement that chose the value is shown. |

---

## D1 — The pause control is reduced to a glyph, and is still the same control

**Built.** The button prints its glyph only. The sentence it used to print is
gone from the face and **unchanged as the name**: `aria-label` carries it
verbatim, so nothing a screen reader hears, and nothing any guard matches on,
is different.

**Why.** The strip exists to present sponsors. At 390px the full sentence
("إيقاف حركة شريط الرعاة") took most of the anchor's line and read as the
loudest thing in a band whose subject is somebody else. That is a visual
problem, and the fix for a visual problem is not to weaken the control.

**What is not traded for it.** Removing the control while the row still moves
would fail WCAG 2.2.2, which this project treats as mandatory. So:

- The control stays, and stays **visible at every width** — never revealed on
  hover, because a touch reader has no pointer to reveal it with.
- Its target is **44×44px** (Chapter 5's interactive minimum, `TOUCH_TARGET`).
- Its ink is `--color-section-black-text`, its edge
  `--color-section-black-border` — the register's own tokens, measured 9.04:1
  and 6.78:1 on the dark band and 21:1 and 3.32:1 on the light one. Quiet is
  achieved by dropping the heavy ground, not by dropping contrast.
- `prefers-reduced-motion` hides it, unchanged: nothing moves, so there is
  nothing to stop.
- `aria-pressed` and the `aria-hidden` glyph are unchanged.

---

## D2 — The pinned sponsor is chosen, not derived

**Built.** `siteSettings.sponsorStrip` gains one field:

```ts
/** The one sponsorship held still at the head of the strip; `null` when
 *  none is. Replaces `pinTopTier` (ADR-0086 D2). */
@Prop({ type: Types.ObjectId, default: null })
pinnedSponsorshipId: Types.ObjectId | null;
```

placed where `pinTopTier` was, and **`pinTopTier` is removed** rather than kept
beside it.

**Why one nullable id, and why a replacement.** "At most one pinned at a time,
and choosing another replaces it" is not a rule to enforce — with a single
nullable field it is the only shape the data has. A list would allow two and
need a guard; a boolean beside it would be a second way to say the same thing,
which is the two-mechanisms-for-one-outcome problem D9.1 has just finished
removing from this component.

**The four states, and what each draws.**

| Setting | Strip |
| --- | --- |
| `null` | Nobody is held; every running sponsorship travels in the loop |
| a running sponsorship | That one is held at the head and **excluded from the loop**, so it never appears twice |
| a sponsorship that is unpublished, cancelled or outside its window | Nothing is held, no gap is left where it was, and the rest travel — the existing window logic decides this, not a second rule |
| changed to another | The previous one rejoins the loop and the new one is held |

**What this costs, stated plainly.** ADR-0085 D5.1 made the strip pin whatever
the sponsors section banners, so the two could never emphasise different
sponsors. A chosen pin can disagree with the banner. That guarantee moves from
the code to the editor, and the settings screen names the banner's sponsor so
the choice is informed rather than blind. The owner's instruction is explicit
that the pin comes from the settings and not from the tier; this records what
it replaces.

---

## D3 — The pinned sponsor's marker is **not** the medal gold

**The question asked.** Gold in this system is a medal. `TDR-002` defines
`gold.500` as "Medal Gold reference (Chapter 1)", and the design orchestration
rules say in as many words: *"Do not use achievement colors as generic
decoration. Do not use Gold merely because it looks premium."*

**The answer.** A pinned sponsor is a commercial arrangement, not an
achievement. Marking it with the medal colour, in a federation whose gold
means a medal, says the sponsor won something — and spends the one colour that
should still mean a podium when a podium is what is being shown.

**And the measurement agrees, independently.** `--color-semantic-medal-gold`
is re-pointed per theme and becomes `#60490A` in high contrast, which measures
**2.45:1** on the black register — below the 3:1 a non-text mark needs
(WCAG 1.4.11). It cannot be used here even if the meaning were right. The flat
brand reference `--color-brand-medal-gold` (`#D4A017`) does clear it in all
three lists, but reaching past the semantic layer to a brand primitive to get
a number is exactly the move §16 forbids.

**Built instead:** a token of its own, whose meaning is the thing it marks.

```json
"--color-logo-pinned-edge": light {color.gold.500} · dark {color.gold.400}
                               · high contrast {color.white}
```

| List | Value | On the black register | |
| --- | --- | --- | --- |
| light | `#D4A017` | on `#000000` | **8.84:1** |
| dark | `#E9B836` | on `#4A4942` | **4.90:1** |
| high contrast | `#FFFFFF` | on `#000000` | **21:1** |

The hue is dropped in high contrast rather than darkened, which is what
ADR-0059 does with every register and ADR-0072 does with the item palette:
that list asks for legibility, not for brand expression. It is recorded in
`pairings.json` against both black-register grounds.

**Never colour alone.** The marker is an edge at `--border-width-thick` (2px)
where every other item's edge is `--border-width-default` — so the pinned
sponsor is distinguished by weight as well as hue, and the distinction
survives `forced-colors`, where the user's own scheme replaces every author
colour and only the weight is left. The tier line above the name
("الراعي الرسمي · Official Sponsor") is the third, non-visual cue.

---

## D4 — Logo presence, and the ceiling that cannot be crossed

**The hard rule.** No logo is ever drawn larger than **half its source in
pixels**. A 284px mark stops at 142px. This is enforced per logo, from the
stored `width`/`height`, rather than by choosing a card size and trusting it:
`max-inline-size` and `max-block-size` are set to half the source on the image
itself, so a small file cannot be stretched by a layout change later.

**The plate grows to 120px of content** (from 56px), inside a `h-36` plate with
its existing `p-3`.

**Why 120 and not more.** It is not chosen, it is the largest number that keeps
every logo the federation has at or under its own ceiling:

| Source | Half of it | Drawn at 120px tall | |
| --- | --- | --- | --- |
| 284×284 (Ultimate Power Solution) | 142×142 | 120×120 | under |
| 480×240 (sponsors, partners) | 240×120 | 240×120 | **exactly at the ceiling** |
| 400×400 (memberships) | 200×200 | 120×120 | under |

The 480×240 marks are what set it: at 121px they would cross. So 120px is the
ceiling of the ceilings, and a taller plate cannot be justified until the
federation supplies larger files.

**The card is re-proportioned, not just refilled** (Chapter 8's card keeps its
`gap-3`/`p-4` rhythm): a bigger mark in a tight card is a crowded card, and the
brief's priority is presence with room to breathe.

**The strip is out of this**: its height is set by its own layout (D9), and its
plate stays at 40px.

**The dashboard warns rather than refuses.** On upload, a file whose smaller
dimension is under **240px** (twice the largest place it is drawn) gets a
notice naming what it has and what the largest position needs. It does not
block the upload: a federation with only a small file still has to be able to
publish, and a warning that stops work gets worked around.

---

## D5 — One sponsor is not a loop

**Built.** `stripCopies` returns 0 below two sponsors, and the strip draws the
row once, standing: no track, no repetition, and no pause control, because
nothing is moving for it to stop.

**Why.** Photographed on 2026-09-18 at the count the federation actually
launches with — one. The arithmetic was right: 256px copy, 4.49s cycle,
57px/s, seven copies exactly as D9.3's table predicts. The result was
"Ultimate Power Solution" printed seven times across the line. It reads as
padding, and worse, it *misstates the count*: anyone scanning the band sees
seven marks and takes the federation to have seven sponsors. A loop needs
something to loop through; below two there is nothing, and repetition stops
being motion and becomes a claim.

**What this is not.** It must not be read as D9.1's "still while the row holds
its items" coming back. That rule measured the **viewport and the row's
capacity**, so the same sponsors stood still at one width and travelled at
another and the page's rhythm moved with the browser window. This asks one
question about **how many sponsors there are** — there is no width in it, no
breakpoint, and no media query. Two sponsors travel at 360px and at 2560px
alike.

**Above one, nothing changes**: the speed, the direction, the copy count and
the seamless wrap are exactly as D9 built them.

---

## Consequences

- `sponsor-strip.schema.ts`, its DTO, the public view and `SPONSOR_STRIP_DEFAULTS` carry `pinnedSponsorshipId` and no longer carry `pinTopTier`.
- `@uaeaf/content/sponsors`' `stripItems` selects the held sponsorship by id and excludes it from the travelling list.
- `pairings.json` gains `--color-logo-pinned-edge` with both black-register grounds.
- ADR-0085 D5.1's automatic strip/banner agreement is withdrawn. That guarantee moves from the code to the editor, which is a deliberate exchange: the settings screen names the banner's sponsorship, and warns when the held one differs, so a disagreement is a choice rather than an accident.
- `stripCopies` decides whether the strip loops at all (D5), so there is one place that answers it.
- `docs/engineering/how-sponsors-work.md` follows.
