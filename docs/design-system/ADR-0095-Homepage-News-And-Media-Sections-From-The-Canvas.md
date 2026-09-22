# ADR-0095 — The Homepage News and Media Sections, Built from the Canvas

| | |
| --- | --- |
| **Status** | **Accepted**. Owner request 2026-09-22 (Part B), with answers: the media row is a placement slot only, the entrance extends `RevealOnce`, six stories, a computed reading time, five placeholders, and the current topic tokens. |
| **Visual reference** | The Design canvas "إعادة تصميم: آخر الأخبار + الاتحاد في الإعلام", artboards `Main.dc.html` (1440×800) and `MediaCoverage.dc.html` (1440×620). Rendered in Chromium from its own source, then measured. |
| **Amends** | `02-Homepage-Specification.md` §11 and §20 (the news split), and `01-Information-Architecture.md` §12, as built. It extends ADR-0066 D1 with one recipe and ADR-0069 D10's one-shot reveal with one opt-in. |
| **Scope** | `apps/web` only. It covers the two sections, the shared parts they are built from, and one CMS value on the local database (`itemLimit` 3 → 6). |

---

## D1 — What each value was taken from

Four sources, and every value comes from exactly one of them:

- **Colour: tokens only**, per the owner's instruction.
  - Text uses `text.primary` and `text.secondary`, and links use `text.link`.
  - The recess is `surface.sunken`; rules between rows are `border.default`; the edges of objects are `border.strong`.
  - The six topic chips keep ADR-0094's tokens by owner decision. The canvas's topic colours differ visually for training, community and youth.
- **Type: the Chapter 4 roles, chosen by semantic role.** The family stays Alexandria. The canvas sets Arabic body text in IBM Plex Sans Arabic, which the site does not load (ADR-0007).
- **Geometry: the canvas's own values.** Widths, heights, gaps and padding are expressed on the spacing scale. The one exception is the lead card's 20px radius, which has no token and takes 16px.
- **Accessibility floors win over the canvas.** Text stays at 13px or more, targets at 44px, object edges at 3:1, and a heading hierarchy that skips no level.

## D2 — Shared parts, built once

| Part | Path | Used by |
| --- | --- | --- |
| `HomeSectionHeader` | `components/pages/home/home-section-header.tsx` | both sections |
| `LeadArticleCard` | `components/pages/news/lead-article-card.tsx` | the news section |
| `ArticleListItem` | `components/pages/news/article-list-item.tsx` | the news section |
| `PressCoverageCard` | `components/pages/home/press-coverage-card.tsx` | the media section |
| `CarouselControls` | `components/ui/carousel-controls.tsx` | the media carousel; ready for the hero and the strip, which are untouched |
| `ChevronIcon` | `components/ui/chevron-icon.tsx` | the section header and the carousel controls |
| `CARD_INTERACTIVE_LG` | `components/ui/surface.ts` | the lead card and the press card |
| `TEXT_TARGET` | `components/ui/interactive.ts` | the header link and the coverage link |
| `revealStep` | `lib/motion/reveal.ts` | the three components above that take part in the reveal |
| `readingMinutes` | `lib/news/reading-time.ts` | the lead card |

Two details of these parts:
- **`CARD_INTERACTIVE_LG`** is `CARD_INTERACTIVE` at `radius.lg`, built from the same parts inside `surface.ts`. That is what ADR-0066 D1 allows: extend the recipe in its own module.
- **`TEXT_TARGET`** gives a link set in a line of text its 44px target through a transparent `::before`, so the line keeps the canvas's height.

## D3 — The media section is a slot

The CMS row narrowed to `FederationInMedia` gives "UAEAF in the Media" its place and its on/off switch.
- It is never a data source. §11b forbids filling this section with the federation's own articles; they stay on `/news#news-in-media`.
- The row's title and sentence are not shown. They describe the old shelf, so the section uses the locked name (§11b) and the canvas's sentence.
- **The cards are the canvas's bracketed placeholders**, five of them, so the track overflows at 1440 as drawn. They appear only outside production (`showsCoveragePlaceholders`). In production the section is absent.

## D4 — The news section

- **Layout:** the newest story as the lead, and the next five in a list.
- **Columns:** two equal columns from `lg`, as drawn. This replaces the as-built 1.35fr/1fr in the Homepage Specification.
- **Count:** six stories. The local CMS row was changed from 3 to 6, and the loader's default is 6.
- **Reading time:** counted from the body's words at 200 words a minute, rounded up, never less than one minute.

## D5 — The entrance, and the one reduced-motion exception

`RevealOnce` is extended; no new hook is added.

**Normal motion.** Each section enters once, in reading order:
- the title, then its sentence and link;
- then the lead story;
- then the list stories one at a time;
- in the media section, each card drifts in along the reading direction through the new `drift` part, followed by the controls.

It uses the existing tokens: `ascent-stagger`, `duration-base` and `duration-slow`.

**Reduced motion.** The rest of the site keeps its default: every block at rest. A block marked `data-reveal-reduced="fade"` fades in instead: opacity only, with no transform and no stagger.
- Only these two sections carry the mark.
- Every duration token is 0ms under that query, so the fade restates the base duration's value (220ms) inside the reduced-motion block. That is the owner's duration exception, and nothing else.

**A defect this fixed.** Under React's StrictMode (development), the effect runs twice. The second run skipped blocks the first had already marked `waiting`, and those were then observed by nothing. Pages that already used the reveal were left 16px off in development; with the fade, the blocks were left invisible. A block still `waiting` is now observed again.

## D6 — Where the build departs from the canvas, and why

**Governed departures.** Each follows a rule, so none needs a decision:

| Canvas | Built | Reason |
| --- | --- | --- |
| h2 at 36px/800 (news) and 32px/800 (media) | `text-h2` for both, 32px/700 | Chapter 4 role; the two artboards disagree with each other |
| Arabic body in IBM Plex Sans Arabic | Alexandria | ADR-0007; the site loads no other Arabic family |
| Lead card radius 20px | 16px | there is no 20px token |
| Hairline card edge `#E5E9E2`, no shadow at rest | `border.strong` and `elevation.card` | ADR-0066 D1 and `surface-standard.spec.ts` |
| 12px and 12.5px captions | 13px | the floor (Chapter 4 §4.15b names only two exceptions) |
| 40px carousel buttons; dots drawn as spans | 44px buttons; the dots are a picture of the position, and the position is also said in words | touch targets; WCAG 1.4.1 |
| List headlines as `h4` | `h3` | an `h4` would file five stories under the first |
| Gradients on the logo panel and the thumbnails | a flat recess; the article's real cover or its placeholder | ADR-0065 R2; real data |
| Edge fade at the start side, over the first card | at the end side the track continues toward | a defect in the canvas's RTL |
| Active dot at the far left in RTL | the first page is active at the start side | a defect in the canvas's RTL |

**Open for the owner.** Listed in the report as options:
- `TopicBadge` renders at 14px/600, where the canvas draws 12px/700. The `BADGE` rule (a 13px floor for chips) and `TopicBadge`'s own comment (Overline at 12px) disagree.
- The CMS headings: "أحدث الأخبار" and its sentence, where the canvas says "آخر الأخبار".
- The media row's stored words, which describe the old shelf.
- The copy of the section link and the per-card link, where the specification's wording differs from the canvas's.

## Consequences

- **PENDING FIGMA BACK-SYNC:**
  - both sections;
  - the layout below `lg`, where the canvas has no frame. The news stacks; the lead picture keeps the grid card's 16:10; the coverage cards narrow to 85% of the track.
- **Responsive design (§13):** verified at 1440, 1024, 768 and 375 in a browser, with no horizontal overflow. The layouts below 1440 are derived from the as-built breakpoints, not from a design.
