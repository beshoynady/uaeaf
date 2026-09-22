# ADR-0064 — The Contact Page, and the Five Conflicts in Figma Section 9

**Status:** Accepted
**Date:** 2026-09-09
**Owner approval:** explicit, on C2 and C1/C3, before any code was written.
**Source:** Figma `hpO727vjwl18g3s3LTICAY`, section `2616:1382` ("Section 9"), six frames.
**Companion:** `docs/design-specs/page-contact-us.md` — the extracted measurements.

---

## Context

The six frames for this page — AR and EN at 1440 / 768 / 390 — do not agree with
each other. Five conflicts had to be settled before "match the design" meant
anything. Two of them changed what the page is; the other three were defects in
one frame that every other frame contradicts.

---

## C1 — The hero heading was invisible, and is not any more

The AR desktop frame centres its title block at y≈365 inside a 411px box while
the card row begins at y 341.6 and stands ~176px tall. Rendering `862:445`
confirms it: no heading appears, and only a fragment of the subtitle shows
between two cards.

EN desktop places the same block at `top 0`; AR tablet puts it at y 40; AR
mobile at y 32. Four frames agree and one does not.

**Decision.** The heading sits above the cards at every width. An `<h1>` covered
by four opaque cards fails WCAG 2.4.6 and leaves the page's own name out of
what a crawler renders — it is a stacking error, not a composition.

---

## C2 — Four cards, four schemes, two colours that are not ours

| Frame | Phone | Email | Location | Working Hours |
|---|---|---|---|---|
| AR desktop | white surface | `#00843d → #005c2e` | `#14b8a6 → #0f766e` | `#2563eb → #1e40af` |
| AR tablet / mobile | green | green | teal | blue |
| EN desktop | `green-500 → green-600` (token-bound) | same | same | same |
| EN tablet | green | teal | blue | green |

`#14b8a6` / `#0f766e` and `#2563eb` / `#1e40af` are Tailwind's default
`teal-500/700` and `blue-600/800`. They are not in the UAEAF palette. `#005c2e`
is not a step of the published green ramp either (600 is `#006b31`, 700 is
`#005226`). Chapter 1 ADR-0003 fixes the identity as green, red and black, and
ADR-0050 budgets colour at ~70–80 % neutral / 15–20 % green / ≤5 % red.

**Decision — the owner chose a gradation inside the published green ramp.** Each
card is a two-stop gradient one step apart:

| Card | Gradient | White text on the lightest stop |
|---|---|---|
| Phone | `green-500 → green-600` | **4.81** |
| Email | `green-600 → green-700` | **6.67** |
| Location | `green-700 → green-800` | **9.40** |
| Working Hours | `green-800 → green-900` | **12.95** |

`green-500` is the lightest step that can carry white text at all — `green-400`
measures 3.91 and fails. First card against fourth measures 2.69:1, so the
gradation is visible rather than nominal. Guarded by
`contact-card-contrast.spec.ts`, which also fails if the component starts
painting from outside the ramp.

The text on these cards is `--color-text-on-brand`, not `--color-text-inverse`.
The second flips to black in the dark theme while the green ground — declared
once in `base.css` — does not; the guard caught that before it shipped.

---

## C3 — Two languages, two design iterations

The AR desktop frame is materially richer than the EN one: a gradient section
ground, a glass form card with a green-tinted border and accent bars, icons
inside every input, an inner shadow on the controls, a gradient submit button,
and a tinted panel behind the map. The EN frame has none of these.

**Decision — the AR treatment is the reference and English mirrors it.** It is
the frame the owner sent as "the design", and CLAUDE.md §12 does not allow the
two languages to ship as different products. English therefore gains the accent
bar, the input icons, the gradient submit and the map panel, none of which its
own frame shows. Recorded as **PENDING FIGMA BACK-SYNC**.

The column composition already mirrored correctly and was left alone: both
frames put the map at the reading start — right in Arabic, left in English —
which one `flex-row-reverse` reproduces without a locale conditional.

---

## C4 — The map pin subtitle was 11px

Chapter 4 sets a 13px floor and ADR-0041 documents two exceptions, neither of
which is this component. Rendered at `text-caption`. No decision was needed:
WCAG and Chapter 4 outrank a frame value.

---

## C5 — Two dead artefacts, recorded so they are not mistaken for intent

`Contact Cards Row Hidden` (`1192:2590`) sits inside AR desktop's
`Contact Content` at height ≈ 0, holding a second white-card copy of all four
cards. And that `Contact Content` declares `h 763` while its only real child is
`h 888` — a 125px overflow. The EN frame is internally consistent
(1088 = 120 + 888 + 80) and is the arithmetic the page was built to.

---

## Consequences

### Deviations from the frames, and why

- **Hero title size.** The design ramps 28 / 28 / 56. The approved scale has no
  28 step at `md`; `text-display-l` is the Text Style whose desktop value is the
  designed 56, so it is the binding, and tablet renders at 56 rather than 28.
  §8 forbids choosing a size by nearest numeric value.
- **EN typeface.** The EN frames are set in Inter. The approved Latin face is
  IBM Plex Sans (Chapter 3); Inter is a Figma-side placeholder and was not
  introduced.
- **Section gutter.** The design's 96px margin is reproduced by capping content
  at 1248px inside the project's own gutters: at the 1440 root frame that is
  exactly 96px a side, and narrower viewports keep the gutters every other page
  uses rather than a value only this page knows.
- **Map panel and section ground.** Built with `color-mix` over a theme surface
  rather than flat `green-50` / `green-100`. Those steps are one value for all
  three themes — right on the cards, which sit on their own saturated ground,
  and wrong on a panel, which stayed a bright patch on a near-black page while
  its `green-700` button text landed at 1.99:1. Caught on a live browser in the
  dark theme, not in review.

### Schema

`contactUsPage` gained `locationSummary`, `cardLabels`, `form` and `map`.
`form.messageTypeLabels[].value` is constrained to `CONTACT_MESSAGE_TYPES`, the
vocabulary `contactMessages` already validates submissions against — an editor
may relabel and reorder the options but cannot introduce one the submission
endpoint would reject.

**Amended 2026-09-21 (owner request, custom social icons).**
- **The field:** each `socialLinks[]` entry gained an optional `iconId`, a reference to a `mediaAssets` image. The service checks it with `assertUsableImage`, as it checks the hero image, and stores it as `null` when there is none.
- **Where it lives:** the entry type is a contact-page `ContactSocialLink` that extends the shared `SocialLink`. The shared schema, used by clubs, athletes and personnel, is unchanged.
- **On the site:** the contact page draws the uploaded icon instead of the platform's built-in artwork when the icon resolves to a published image. Otherwise the built-in artwork is drawn as before.
- **Uploading one (2026-09-22):** the upload gate held every picture to a 200px shortest edge. That floor is the one for a page image, and its own comment says a smaller picture "is an icon". So a 128px channel icon was refused. The fix is an upload purpose, `purpose=icon`. It lowers only that floor, to 88px: twice the 44px the icon is drawn at, the ADR-0086 D4 rule. The accepted formats (PNG, JPEG, WebP, read from the bytes), the 10 MB ceiling and the 25-megapixel ceiling are the gate's security half, and they stay the same for icons. SVG is still refused: accepting it would widen the security half for every upload. The editor's icon picker uploads with this purpose. Every other picker uploads a page image, as before.
- **Not the footer yet:** the footer still draws its own constant links (see the owner's open decision on one source for the footer).

This is a divergence from the FigJam physical model and needs back-sync.

**Amended 2026-09-22 (owner request, the official address and a live map).** The federation's official address arrived from the head of the media committee: 1 Al Nahda Street, Al Nahda 1, Dubai, at 25.286069, 55.3642228. The map link supplied with it opens a Google place named for the federation, with its pin at those exact coordinates. The Zayed Sports City address the record held was sample data.
- **The map is live.** `map.imageId` is gone from the schema, the DTO, the editor and the site. `map.latitude` and `map.longitude` replace it, numbers named and typed as on `federation` and `clubs`. The page embeds Google Maps at them, without an API key (`output=embed`, `hl` in the page's language, `loading="lazy"`, a titled frame). With either coordinate unset, it draws no map and no empty frame.
- **The place moved under the map.** The pin card sat over the still picture. Over a live map it would cover Google's own marker and take the pointer from the map beneath it, so `pinTitle` and `pinSubtitle` are now a caption below the frame. The red anchor icon went with it, because Google draws the marker. `--color-map-marker` (ADR-0072 D13) is no longer used by this page. The token stays in the package.
- **In the editor:** one group, "Map coordinates", holding a latitude and a longitude. It takes both or neither, since one number places nothing.
- **Directions** use the existing `map.directionsUrl`, set to Google's documented directions form for the coordinates. No code was needed.
- **The note is cleared.** Its text said no official address had been approved yet.
- **The footer's location card** is now a link to this map (`/contact#contact-map-heading`), per the owner's decision on item 1: a link, not a second, smaller map.
- **The footer names the place from this record (owner decision, option B).** Its constant Zayed Sports City / Abu Dhabi strings were deleted: they had already drifted from the map to a different city. The card reads `map.pinTitle` and `map.pinSubtitle`. The contact column's address line joins the same two in the reading language's own comma. The eight-part `address` holds one language only, so it stays the structured-data source. When the record cannot be read, the card keeps its link and shows the link's own words, and no address line is drawn.
- **The English wording is provisional.** The official address came in Arabic only. "1 Al Nahda Street, Al Nahda 1, Dubai, United Arab Emirates" is a translation awaiting the media committee's confirmation (owner, 2026-09-22), and it is not to be treated as final until then.
- **PENDING FIGMA BACK-SYNC:**
  - the live map in place of the still;
  - the caption under the frame;
  - the linked footer card, in its hover and focus states.

This is a divergence from the FigJam physical model and needs back-sync.

`contactMessages` gained an optional `subject`, because the designed form has a
Subject input and the endpoint had nowhere to put it — a citizen's text would
have been accepted and silently dropped. **This is a divergence from the live
FigJam physical model and needs back-sync.**

### Still open

- **`mediaAssets` has no admin screen.** The dashboard reads the library to
  populate the picker and uploads from inside it, but has no screen of its own
  for the library. (`map.imageId`, the second image this item named, was
  removed on 2026-09-22.)
- **PENDING FIGMA BACK-SYNC.** The English treatment decided in C3, the green
  ladder in C2, the heading placement in C1 and the 13px pin subtitle in C4 all
  differ from what the file currently shows.
