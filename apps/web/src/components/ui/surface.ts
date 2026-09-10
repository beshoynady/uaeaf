/**
 * What a raised object looks like here — decided once.
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 *
 * The application had four answers to one question. `ui/Card` drew its edge
 * in `--color-border-default`; the contact hero card drew it in
 * `--color-border-strong`; the form and map panels drew `default` over
 * `--elevation-dropdown`; and the hover response existed twice — as `.lift`
 * (ADR-0065 D5) and as a hand-written 2px translate inside `Card`. Each was
 * defensible where it was written. Together they meant a reader moving
 * between two pages could not learn what a card is on this site, which is the
 * definition of an inconsistent system.
 *
 * ── The edge is an accessibility rule, not a preference ────────────────────
 *
 * `--color-border-default` (#E0DFDB) measures **1.15:1** against
 * `--color-surface-raised` (#FFFFFF). WCAG 2.1 §1.4.11 Non-text Contrast
 * requires **3:1** for the visual boundary of a user-interface component, so
 * every form field resting on that token was failing — not looking weak,
 * failing. `--color-border-strong` (#757470) measures **4.68:1** on the light
 * theme and **3.48:1** on the dark one, and High Contrast overrides it to
 * #000000 at 2px (Chapter 7 §7.3). The token system already carried the
 * answer: `strong` is the edge of an object, `default` and `subtle` are rules
 * between things that are not objects.
 *
 * ── Every value here is a token ────────────────────────────────────────────
 *
 * No literal colour, radius, elevation or duration appears below, and
 * `surface-standard.spec.ts` fails if one does. The elevations are the
 * *semantic* names rather than `--elevation-1..4`: the primitives are
 * theme-invariant, so a card drawn with one would keep a 6%-opacity black
 * shadow on the dark theme (ADR-0052 raises it to 40% for a reason) and would
 * grow a shadow under High Contrast, which carries elevation with solid
 * borders only.
 *
 * ── One rung is missing, and it is declared rather than invented ───────────
 *
 * DESIGN SYSTEM GAP — the theme-aware ladder has two rungs where the layout
 * has three. `card` (elevation.1), `card-hover` (elevation.2), `dropdown`
 * (elevation.2) and `modal` (elevation.4) are the only elevations that adapt
 * per theme, and none of them names a large container sitting *in* the flow.
 * `PANEL` therefore borrows `--elevation-dropdown` — the right value under
 * the wrong name — and says so here instead of forking a fifth variant. The
 * proposed remedy is in the slice report; it needs no new primitive and does
 * not touch Chapter 3 §3.14's five-level cap.
 */

/** The edge of a raised object. WCAG 2.1 §1.4.11, measured above. */
const EDGE = "border border-[color:var(--color-border-strong)]";

/** The ground a raised object stands on. */
const GROUND = "bg-[color:var(--color-surface-raised)]";

/**
 * A card: a raised object in the content flow, at the resting rung.
 *
 * Depth is three things at once — a lighter ground than the section, a
 * readable edge, and an elevation — which is what makes it read as an object
 * rather than as a shadow someone remembered to add.
 */
export const CARD = `rounded-[var(--radius-md)] ${EDGE} ${GROUND} shadow-[var(--elevation-card)]`;

/** A panel: the same object at container scale. See the gap note above for
 *  why its elevation carries the dropdown's name. */
export const PANEL = `rounded-[var(--radius-lg)] ${EDGE} ${GROUND} shadow-[var(--elevation-dropdown)]`;

/** A recess: the inverse move, for a well cut into a panel rather than an
 *  object standing on it. Depth comes from the surface step and the edge —
 *  there is no inset elevation token, and inventing one here is exactly what
 *  this module exists to prevent. */
export const RECESS = `rounded-[var(--radius-lg)] ${EDGE} bg-[color:var(--color-surface-sunken)]`;

/**
 * The response, for a surface that actually does something when clicked.
 *
 * `.lift` (motion.css, ADR-0065 D5) rises a quarter of the ascent offset
 * along the motif's own 45° vector, cross-fades `--elevation-card` to
 * `--elevation-card-hover` through an `opacity` transition so ADR-0009's
 * transform/opacity restriction holds literally, keys on `:hover`,
 * `:focus-within` and `:focus-visible` alike so the keyboard gets the same
 * response as the pointer, and settles back to rest under `:active`.
 *
 * Do not add this to a surface that is not a control: feedback on a card that
 * does nothing when clicked is a false affordance (Chapter 11 §UX).
 */
export const LIFT = "lift";

/**
 * The resting and interactive edges of a form control.
 *
 * Separate from `CARD` because a control's edge changes with its state and a
 * card's does not. Federation Green at the point of interaction is the
 * approved role (ADR-0065); `active:` accompanies every `hover:` because
 * hover is mouse-only feedback and this layer is mobile-priority (PR-006).
 */
export const FIELD_EDGE =
  "border border-[color:var(--color-border-strong)] hover:border-[color:var(--color-brand-primary)] active:border-[color:var(--color-brand-primary)] focus:border-[color:var(--color-brand-primary)]";

/**
 * The hero composition, shared by every page that opens with one.
 *
 * The title block holds the reading edge and the motif answers it from the
 * far side, both anchored to the same baseline. This is not a style
 * preference: artwork behind text changes the measured ratio of every
 * character it passes under, and Chapter 6 puts WCAG AA above composition, so
 * the motif needs a column of its own. Two columns cannot overlap at any
 * width, which is why the published register ratio holds at every breakpoint
 * without being re-measured per viewport.
 *
 * A centred stack was the contact page's own arrangement and made it the only
 * one of twelve that did not look like the others.
 */
export const HERO_COMPOSITION = "grid items-end gap-8 md:grid-cols-[1fr_auto]";

/** The title column. `text-start` is load-bearing — it is what stops a
 *  centred block being reintroduced by a parent's `text-center`. */
export const HERO_TEXT = "min-w-0 text-start";

/** Chapter 4 §4.9: a line of running text stops being scannable past roughly
 *  60–70 characters, in either script. */
export const HERO_MEASURE = "max-w-[62ch]";

/** The motif at compositional scale, on the baseline the title sits on. */
export const HERO_MOTIF = "h-20 w-full self-end md:h-32 md:w-32";
