# Season boundaries are fixed in code

**Raised:** 2026-09-26, with the photo-albums build.
**Status:** accepted for now, recorded so it is not discovered later.

A season runs September to September, and that month is a constant —
`SEASON_START_MONTH` in `api/src/modules/media-center/videos/season.ts`. Every
season is exactly one year long and they are contiguous, so every date belongs
to exactly one season. The albums gallery and the video library both read that
one helper; there is no second copy.

**What would need to change.** If the federation ever needs a season whose
dates differ — a shortened year, a calendar that does not start in September,
or two seasons of different lengths — the boundary stops being a constant and
becomes configuration or, eventually, a `seasons` collection with real dates.

**When to revisit.** The first time a real season does not start on 1
September. Not before: a configurable boundary with one possible value is a
setting nobody can use, and the decision to have no season entity is recorded
in `docs/features/photo-albums.md` §4.

**Where it would land.** `season.ts` only. Both readers already go through it,
so the change has one site and two test suites — videos and albums — that must
be run together.
