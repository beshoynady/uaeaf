# ADR-0081 — The Next-Event Bar and Its Data Source

**Status:**

| Part | Status |
| --- | --- |
| D1 The bar's design and behaviour | built; content, states and height amended by D4 |
| D2 The data source | **Proposed** — needs a new entity and public route; not implemented |
| D3 Pin or hide from the dashboard | **Superseded by D4** — the bar's own `isVisible` switch |
| D4 The manual bar (owner, 2026-09-17) | **Accepted and built** — API, site and dashboard |

**Date:** 2026-09-16, amended 2026-09-17
**Authority:** the owner's prompt «تصحيح اتجاه الهيرو…» §٥-د and §٧ («أي حقل أو مسار لشريط الحدث» for approval, not implemented).

---

## Found

- The API has **no championships or events entity**. `api/src/modules/athletics` holds `age-categories` and `disciplines` only.
- The only event data is hand-entered in the HERO section's free-form `configuration.nextEvent`: `title{ar,en}`, `venue{ar,en}`, `date`.
- There is no event page to link to.

## D1 — The bar (built)

`hero-event-bar.tsx`, `hero-countdown.tsx`, `lib/pages/next-event.ts`:

- **Look:** a translucent layer (`--color-surface-overlay` at 40%) over the foot of the picture, inside the hero's height, with a 2px `--color-brand-primary` line on top. It is not a separate block.
- **Content:**
  - the kind («البطولة القادمة» / "Next championship");
  - the name;
  - the date as each language writes it (Western digits in Arabic);
  - the venue;
  - a countdown in days, hours and minutes.
- **States:** upcoming shows the countdown; on its day it shows «جارية الآن» / "Happening now"; once past or incomplete, no bar is drawn and the hero takes the room.
- **Countdown:**
  - drawn by the server;
  - recomputed in the browser on each minute boundary;
  - `tabular-nums`, `role="timer"`, `aria-live="off"`, one accessible name;
  - counted in `Asia/Dubai` from Dubai midnight on the first day;
  - tested (9 tests).
- **Without JavaScript:** the date and the first countdown are there.
- **Phone:** two lines, the name on the first; the date and the countdown on the second.
- **Height:** fixed per breakpoint (`--space-20` / `--space-16`), so the text keeps its height clear.
- **No «التفاصيل» link.** There is no event page, and a link to nothing is worse than none.
- **Measured** (3 themes × 3 widths × AR/EN; 4.5:1 floor):

  | Text | p05 |
  | --- | --- |
  | Name | 13.70–18.88 |
  | Kind | 13.62–18.63 |
  | Date | 5.95–9.84 |
  | Countdown | 12.24–13.20 |

## D2 — The data source (proposed)

1. **An `events` entity**, domain `athletics`, workflow-governed like other public content:
   - `kind: championship | event`;
   - `title{ar,en}`, `venue{ar,en}`;
   - `startDate`, `endDate` (Dubai calendar days), `slug`;
   - `status` (the publication workflow).
2. **A public route** `GET /events/public/next?now=`: the nearest published event whose `endDate` has not passed, ordered by `startDate`. It returns `null` when there is none.
3. **An event page** `/[locale]/events/[slug]` for «التفاصيل».

## D3 — Pin or hide (proposed)

Homepage settings, `pageSections.configuration.nextEventOverride`:

- `mode: auto | pinned | hidden`;
- `eventId` when pinned;
- the bar reads the override first.

Until D2 exists this is not built.

## D4 — The manual bar (owner decision 2026-09-17)

The bar is typed by an editor in the hero's settings, and only there. D2 stays Proposed; nothing links the bar to an entity.

- **Fields** (`pageSections.configuration.nextEvent` of the HERO section, checked by `assertHeroSettings`):
  - `isVisible`;
  - `label{ar,en}`, `name{ar,en}`, `venue{ar,en}`, each with a limit measured at 390px (52, 52 and 35 characters, `HERO_TEXT_LIMITS`) and a counter in the dashboard;
  - `startsAt`, `endsAt`: instants, typed as a date and time in `Asia/Dubai`;
  - all required while `isVisible` (`incompleteNextEvent`), and `endsAt` not before `startsAt` (`nextEventEndsBeforeStart`).
- **No link, no «التفاصيل» button, not clickable.** A `detailsUrl` was built earlier on 2026-09-17 and removed by this decision.
- **States** (`eventBarState` in `@uaeaf/content/hero`, ADR-0083):
  - before `startsAt`: a countdown to that instant;
  - from `startsAt` to `endsAt`: «جارية الآن» / "Happening now";
  - from `endsAt` on, or with anything missing: no bar.

  This replaces D1's count from Dubai midnight.
- **Order:** the date and time with the venue, then the name, then the countdown. The label is shown from `md`.
- **Height:** `--hero-event-height`, `--space-24` on a phone and `--space-16` from `md` (replacing D1's `--space-20`); the text layer reserves it.
- **Files:**
  - site: `hero-event-bar.tsx`, `hero-countdown.tsx`, `lib/pages/homepage.ts` (`readNextEvent`); `lib/pages/next-event.ts` is gone;
  - dashboard: `hero-settings-editor.tsx` (`EventBarEditor`), with a preview of the three states.

## PENDING FIGMA BACK-SYNC

The bar at 1440 and 390, both languages, in its three states.
