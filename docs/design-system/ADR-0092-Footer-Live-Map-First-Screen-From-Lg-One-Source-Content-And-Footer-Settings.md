# ADR-0092 — The Footer: a Live Map, the First Screen from `lg`, One Source for Every Fact, and a Footer Screen

| | |
| --- | --- |
| **Status** | **Accepted** — owner request 2026-09-22. D9, D10 and the live-API restart were put to the owner before they were built, and approved. |
| **Supersedes in part** | ADR-0064, its 2026-09-21 and 2026-09-22 amendments, where they describe the footer: the location card that linked to the contact page's map, and the footer's own constant channels. The 2026-09-22 contact-map plan, D8. |
| **Builds on** | ADR-0078 (the first screen) · ADR-0077 D5 / ADR-0085 D7 (a site-wide setting with its own route and screen) · ADR-0061 (footer direction, artwork from `xl`) · ADR-0063 D2 (quick links in two sub-columns) · ADR-0059 §D2 (the black register) |
| **Changes a documented principle** | No. It adds rules. IA §12's full-height pattern is applied to the footer from `lg` only, which the owner instructed; the IA records it. |
| **Plan** | `docs/engineering/plans/2026-09-22-footer-redesign-plan.md` |

---

## Context

The footer's location column was a card linking to the live map on the contact page. That was decided while the address was sample data. The address is now official, and `contactUsPage` holds it with its coordinates. The owner asked for:

1. the live map itself in the footer, with the component the contact page already uses;
2. a professional, responsive, accessible four-column footer: four columns large, two medium, one small;
3. the footer the height of the screen minus the header, from `lg` up only, with its natural height below;
4. a footer screen in the dashboard, under the Homepage group, laid out as the footer is.

Later the same day they added a credit to the studio that designed the site, NOTIME (`https://notimehub.com/`).

What the inspection found:

- **No footer specification exists** in the Design System chapters: there is no `CMP-FOOTER`. The footer is governed by the approved Figma composition and three ADRs.
- **IA §8.3 already records an "Embedded map"** in the footer as built.
- **The footer showed three facts from sources of its own.** The email was a constant in code. The office hours came from the catalogue ("08:00-15:00") while the record said "٨:٠٠ – ١٥:٠٠". The channels were a constant too, while the record held five channels with uploaded icons.
- **`siteSettings` already carried `footerAboutBlurb` and `copyrightText`**, described in the schema as the footer's own. The site did not read either.

## Decisions

**D1 — The approved four columns, in their order.**
- Brand and its channels, Quick Links, Location, Contact.
- Then the legal strip: the copyright line, the legal links, and the studio's credit.
- No new composition was drawn. The approved one already has four logical columns and holds every piece of content the footer had.

**D2 — The grid is unchanged.**
- One column, two from `md`, four from `lg`, with a 48px gap from `xl` (Chapter 5 §5.2).
- It was already built that way, and `site-footer.test.tsx` still guards it.

**D3 — The live map is the contact page's `LocationMap`, unchanged, drawn once its frame is on the screen.**
- **The frame:** the register's border and `radius-lg`, with a `min-h-[220px]` floor. That is the contact page's own frame minimum.
- **When it loads:** `loading="lazy"` alone did not meet the owner's condition, "no request before the footer is on the screen". Measured on the homepage at 1440×900, Chromium requested the map at load with the footer 3741px below the screen.
  - `FooterMapFrame`, a small client component, draws `LocationMap` inside the frame once an `IntersectionObserver` sees the frame. The frame's box is there from the first paint, so nothing shifts.
  - Every browser Next.js supports has the observer. Without JavaScript, the server's `<noscript>` carries the map.
- **The place:** `map.pinTitle` / `map.pinSubtitle` sit under the map, never over it. A card over a live map covers Google's own marker.
- **No coordinates:** no frame is drawn, so there is no empty box.

**D4 — The first screen, from `lg` only.**
- `.footer-first-screen` in `globals.css` holds one `@variant lg` block:
  - `min-height: calc(100vh - var(--header-height))`;
  - then the same with `100svh`, which wins.
- **Units and header height:** the hero's own (ADR-0078).
- **Breakpoint:** `--breakpoint-lg` (1024px), the width the dashboard's sidebar folds at.
- **A minimum, never a height:** the footer grows rather than clipping.
- **Below `lg`:** no rule applies at all.

**D5 — Where the slack goes.**
- **The footer:** a flex column. From `lg` the grid takes `flex-1` and its columns stretch to the row.
- **The map frame alone grows** (`lg:flex-1`). It is the one thing more useful for being bigger. This is the `PANEL_FILL` principle in `surface.ts`: slack goes to an element, never to padding.
- **Every other column** keeps its content at the top, so the four columns start on one line. The brand column opens with the logo above the name; the other three open with their heading.
- **`lg:` only**, because a `flex-1` basis against a footer with no height would collapse it (`PANEL_TALL`).

**D6 — One source for every fact.**

| What | Source | When it cannot be read |
| --- | --- | --- |
| Place, coordinates, directions, email, office hours, channels and their icons | `contactUsPage` | Left out, never remembered (the 2026-09-22 option-B rule) |
| Description, copyright line, the three column headings | `siteSettings` (`footerAboutBlurb`, `copyrightText`, `footerHeadings`) | The catalogue's built-in text |
| Federation name, quick links (the header's destinations), legal links, Help Center, studio credit | Code | — |

- `Footer.hours` and the email constant are deleted.

**D7 — The contact column no longer repeats the address.**
- It sits under the map in the next column, in the same words.
- No phones were added: the footer never had them, and their numbers are still unsettled (post-delivery backlog §4).

**D8 — The channels.**
- **Resolution:** shared with the contact page through `lib/social-channels.ts`, with no change on that page. That covers the safe `https:`/`http:` links, the platform key, the uploaded icon and the built-in artwork.
- **Size:** 44px, the touch-target gate. The old 32px was already recorded as a finding.
- **Label:** the list is named with the contact page's "Follow us".

**D9 — "View the location on the map" became "Open Directions" (owner approval).**
- The map is visible now, so a link to the same map on another page repeats it.
- Routing is what the embed does not do well.
- **Label:** the contact page's own words (`Contact.map.openDirections`).
- **Target:** `map.directionsUrl`, in a new tab, drawn only when set.

**D10 — The studio's credit (owner approval of the name "NOTIME").**
- **Place:** last in the legal strip, in reading order and in tab order.
- **Weight:** `text-caption` in the register's muted ink, no louder than the legal links.
- **Wording:**
  - AR "تصميم: NOTIME" / EN "Designed by NOTIME".
  - The name is a code constant with `lang="en"`: a brand name is not translated.
  - The site presents itself as "No Time Hub". The owner chose "NOTIME".
- **Link:** `rel="noopener"` without `noreferrer`, so the studio sees the visit.
- **Not editable:** it is an attribution, not federation content.

**D11 — Storage: `siteSettings`, the sponsor strip's pattern.**
- **New:** `footerHeadings { quickLinks, location, contact }`, each bilingual or `null`.
- **Written through `PUT /site-settings/footer`** (`siteSettings:Update`), with the two existing fields. It writes those three and nothing else.
- **The general `PUT /site-settings`** does not name `footerHeadings`, so it never resets them. *Amended by ADR-0093:* it no longer carries `footerAboutBlurb` or `copyrightText` either, and refuses all three by name (`writtenElsewhere`).
- **No new resource type**, and no catalogue change.

**D12 — The footer screen: `/homepage/footer`, last in the Homepage group.**
- **Layout:** four panels in the footer's order, then the bottom strip.
- **Edited here:** the description, the headings and the copyright.
- **Shown read-only in its column**, with the way to where it is edited: the channels, the place, the coordinates, the directions, the email and the hours. A second screen writing `contactUsPage` would undo the first's saves, because that record's save replaces it whole.
- **Grid:** two columns from `xl`. Four across would leave each bilingual field a quarter of the screen.

## Verification

**Suites.**
- **API:** 1267 / 1267 (129 files, `--runInBand`).
- **Web:** 682 / 682 (55 files).
- **Dashboard:** 1362 / 1362 (106 files).
- **Checks:** `tsc --noEmit` clean in all three, and eslint / oxlint clean on every touched file.

**On a live browser** (`e2e/footer.spec.ts`, 17 / 17, against the dev server and the rebuilt API), at 390 / 768 / 1024 / 1440 × ar / en × light / dark:

| Width | Computed `min-height` | Footer height | Grid tracks | Map frame | Column tops |
| --- | --- | --- | --- | --- | --- |
| 390 × 844 | `auto` (no rule) | 1456 ar / 1437 en | 1 | 358 × 220 | stacked |
| 768 × 1024 | `auto` (no rule) | 972 | 2 | 340 × 220 | two rows |
| 1024 × 768 | `672px` = 768 − 96 | 672 | 4 | 214 × 338 ar / 372 en | one line |
| 1440 × 900 | `804px` = 900 − 96 | 804 | 4 | 292 × 504 | one line |

- **In all 16:**
  - the header measured 96px, the `--header-height` the rule subtracts;
  - no horizontal scroll;
  - no text wider than its box;
  - no column content outside the footer.
- **The map's place and link** sit 83px under the frame at every `lg` width.

**The map's request.** On the homepage at 1440×900:
- **At load:** zero requests to `google.com/maps`, with the footer at 4641px.
- **When scrolled:** the first request came at a scroll of 4000px, with the frame 743px from the top of a 900px screen, so on it.

**The screen.** Checked live against the rebuilt API, as `admin@uaeaf.ae` on the local database:
- saving a location heading showed it on `GET /site-settings/public` at once, and in the footer after the 60-second public cache;
- the heading was then saved empty again, back to `null`;
- a copyright written in English only was refused before any request, and listed in the summary.

**Accessibility, live.**
- **Accessibility tree:** one `contentinfo`; four `h2` column headings; the quick links and the legal links each in a named `navigation`; the channels a named list; the map a titled frame; the email a `mailto:` link; the studio's name a link, last.
- **Keyboard:** the Tab order runs from the directions link through the contact links and the legal links to the studio's credit, then leaves the footer. `:focus-visible` matches on each.
- **Focus ring:** the site's ring, white against the black register in both themes.
- **Contrast:** every text colour is a pair of the black register (ADR-0059 §D2), measured by the design-token contract tests.

**Visual check:** footer screenshots at the 16 combinations plus 1280, and the dashboard screen in Arabic, all in the scratchpad.

## DESIGN DECISION REQUIRED — the swooshes against the office hours at 1280–1439, in English

ADR-0061 D3 draws the brand swooshes from `xl`, on the ground that at 1280 "every stroke clears every glyph". That no longer holds in English:

| Width | What the eye sees |
| --- | --- |
| 1280 | The green stroke runs through "15:00" at the end of the office-hours line |
| 1366 | It touches the last "0" |
| 1440 | It clears the line, by a few pixels |

- Arabic clears at 1280.
- **The cause:** the hours now come from the record ("Sunday – Thursday, 08:00 – 15:00"), which is longer than the catalogue's "Sun–Thu, 08:00–15:00". The official address line that preceded it sat in the same place. Whether it already collided was not measured.
- **Why it cannot be settled here:** the rule's premise is broken, and no documented value moves the strokes.

| Option | What it does | Cost | Status |
| --- | --- | --- | --- |
| A | Shorten the English office-hours text in the contact page's record | Content; reversible; the English wording is provisional anyway | **Recommended** for now |
| B | Draw the swooshes from `2xl` (1536) only | Takes them off the approved 1440 frame | Not recommended |
| C | Draw a Figma frame for the swooshes between 1280 and 1439 | Design work | The lasting answer |

## PENDING FIGMA BACK-SYNC

No frame exists yet for:

- the live map in the location column, its frame, and the place under it;
- the footer's first-screen height from `lg`, and the map filling it;
- the 44px channel buttons, and an uploaded icon on a card;
- the contact column without the address line;
- the "Open Directions" link;
- the studio's credit in the legal strip.

The FigJam physical model needs `siteSettings.footerHeadings`.

## Consequences

- A Google frame now loads on every page where the reader scrolls the map on screen. Before, it loaded on one page. Third-party cookies come with it, and the Cookie Notice is still P0 open (IA §15.2).
- `FooterMapFrame` is one small client component on every page: an observer and one state.
- Tabbing through the footer now passes through the map's own controls, which the site cannot change.
- On `/contact` the map appears twice: the page's own, then the footer's.
- ~~The general `PUT /site-settings` still writes `footerAboutBlurb` and `copyrightText`.~~ Closed by ADR-0093: the footer's three fields have one writer, `PUT /site-settings/footer`, and the general route refuses them.
