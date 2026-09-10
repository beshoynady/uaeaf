/**
 * What a raised object looks like here, how it answers a pointer, and how a
 * page opens — decided once.
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 *
 * The application had four answers to one question. `ui/Card` drew its edge
 * in `--color-border-default`; the contact hero card drew it in
 * `--color-border-strong`; the form and map panels drew `default` over
 * `--elevation-dropdown`; and the hover response existed twice — as `.lift`
 * (ADR-0065 D5) and as a hand-written 2px translate inside `Card`. Each was
 * defensible where it was written. Together they meant a reader moving
 * between two pages could not learn what a card is on this site.
 *
 * ── The edge is an accessibility rule, not a preference ────────────────────
 *
 * `--color-border-default` (#E0DFDB) measures **1.15:1** against
 * `--color-surface-raised` (#FFFFFF). WCAG 2.1 §1.4.11 requires **3:1** for
 * the visual boundary of a user-interface component, so every form field
 * resting on that token was failing — not looking weak, failing.
 * `--color-border-strong` (#757470) measures **4.68:1** light and **3.48:1**
 * dark, and High Contrast overrides it to #000000 at 2px (Chapter 7 §7.3).
 * `strong` is the edge of an object; `default` and `subtle` are rules between
 * things that are not objects.
 *
 * ── Every value here is a token ────────────────────────────────────────────
 *
 * No literal colour, radius, elevation or duration appears below, and
 * `surface-standard.spec.ts` fails if one does. The elevations are the
 * *semantic* names rather than `--elevation-1..4`: the primitives are
 * theme-invariant, so a card drawn with one would keep a 6%-opacity black
 * shadow on the dark theme (ADR-0052 raises it to 40% for a reason) and would
 * grow a shadow under High Contrast, which carries elevation on solid borders
 * only.
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

/**
 * A panel: the same object at container scale.
 *
 * `--elevation-panel` is its own rung as of ADR-0066. Before that it borrowed
 * `--elevation-dropdown` — the right value under a name that described a
 * different object, which is how a form ends up documented as a menu.
 */
export const PANEL = `rounded-[var(--radius-lg)] ${EDGE} ${GROUND} shadow-[var(--elevation-panel)]`;

/** A recess: the inverse move, for a well cut into a panel rather than an
 *  object standing on it. Depth comes from the surface step and the edge —
 *  there is no inset elevation token, and inventing one here is exactly what
 *  this module exists to prevent. */
export const RECESS = `rounded-[var(--radius-lg)] ${EDGE} bg-[color:var(--color-surface-sunken)]`;

/**
 * Two panels side by side, ending at the same height.
 *
 * A row whose panels stop at different heights reads as one of them being
 * unfinished, and no amount of care inside either fixes the impression. The
 * slack has to go somewhere deliberate, which is `PANEL_FILL`'s job: the map
 * grows, the message box grows. Empty padding at the bottom of the shorter
 * panel would make them equal and say nothing.
 */
export const PANEL_ROW = "flex flex-col items-stretch";

/** On the panel's wrapper: share the row's width once there is a row, and lay
 *  out down the page so a child can be told to absorb what is left over.
 *
 *  `flex-1` is deliberately `xl:` only. On a stacked column it would set
 *  `flex-basis: 0` against a parent with no height to distribute, which
 *  collapses the panel to its minimum instead of letting it size to content. */
export const PANEL_TALL = "flex min-w-0 flex-col xl:flex-1";

/** On the one child inside a panel that should take the slack. Put it on the
 *  element that becomes *more useful* when it is bigger.
 *
 *  Pair it with a `min-h-*`, never a fixed `h-*`: `flex-1` resolves the basis
 *  to zero and a fixed height cannot stop it, so the element collapses to a
 *  sliver — which is exactly what the map frame did. */
export const PANEL_FILL = "flex-1";

/**
 * The response, for a surface that actually does something when clicked.
 *
 * `.lift` (motion.css) rises the card, deepens its elevation through an
 * `opacity` cross-fade so ADR-0009's transform/opacity restriction holds
 * literally, and keys on `:hover`, `:focus-within` and `:focus-visible` alike
 * so the keyboard gets the same answer as the pointer.
 *
 * Do not put this on a surface that is not a control: feedback on a card that
 * does nothing when clicked is a false affordance (Chapter 11 §UX).
 */
export const LIFT = "lift";

/**
 * A card that answers a pointer on three signals at once.
 *
 * Depth alone is the weakest of the three: a shadow is exactly what a
 * low-vision reader is least likely to see, and on the dark theme it is
 * nearly invisible by design. So the edge takes the action colour and the
 * icon lights at the same moment, and the card reads as one interactive
 * object rather than as a rectangle with a moving shadow.
 *
 * Federation Green at the point of interaction is the approved role
 * (ADR-0065); `active:` accompanies `hover:` because hover is mouse-only
 * feedback and this layer is mobile-priority (PR-006).
 */
export const CARD_INTERACTIVE = `${LIFT} ${CARD} transition-colors duration-[var(--motion-duration-instant)] ease-[var(--motion-easing-standard)] hover:border-[color:var(--color-brand-primary)] focus-within:border-[color:var(--color-brand-primary)] active:border-[color:var(--color-brand-primary)]`;

/**
 * The icon inside a card: a considered colour at rest, an inversion on hover.
 *
 * `--color-green-500` is #00843D, the same value as `--color-brand-primary`
 * under a name that is not the identity token: `token-contract.spec.ts`
 * keeps the identity out of text utilities, and the codebase already takes
 * this route for the red map marker.
 *
 * At rest the glyph is Federation Green on the recessed step — measured
 * **4.37:1** light and **4.37:1** dark, above the 3:1 floor for a non-text
 * element. On hover the chip fills with that same green and the glyph becomes
 * `--color-text-on-brand`, measured **4.81:1**. One green, two arrangements:
 * the icon does not change hue, it changes which side of the ink the colour
 * is on, which is a bigger visual event than any hue swap and stays inside
 * one approved role.
 *
 * The swap itself lives in `motion.css` beside `.lift`, because it belongs to
 * the card's hover and not to the icon's own state.
 */
export const CARD_ICON =
  "card-icon flex shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-sunken)] text-[color:var(--color-green-500)]";

/**
 * The resting and interactive edges of a form control.
 *
 * Separate from `CARD` because a control's edge changes with its state and a
 * card's does not.
 */
export const FIELD_EDGE =
  "border border-[color:var(--color-border-strong)] hover:border-[color:var(--color-brand-primary)] active:border-[color:var(--color-brand-primary)] focus:border-[color:var(--color-brand-primary)]";

/**
 * The hero, sized to the first screen.
 *
 * `svh`, never bare `vh`: on a phone `vh` measures the viewport with the
 * browser chrome *hidden*, so a `100vh` hero is taller than the screen the
 * reader is actually looking at until they scroll — the content that was
 * supposed to fit is pushed off the bottom by exactly the height of the URL
 * bar. `svh` is the small viewport, chrome shown, which is what "fills the
 * first screen" has to mean.
 *
 * The header is `h-24` — a fixed 96px that never shrinks (`site-header.tsx`
 * says so and explains why), so the hero is the screen minus one spacing
 * token rather than minus a literal.
 *
 * Chapter 5 §5 caps a mobile hero at 90vh "to avoid completely hiding the
 * content below it on initial load". This satisfies it by construction and by
 * measurement: at 390×844 the hero is 748px, and 90vh is 759.6px.
 */
export const HERO_VIEWPORT = "min-h-[calc(100svh-var(--space-24))]";

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

/**
 * The glass treatment, and the discipline it needs.
 *
 * `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §138 lists *excessive*
 * glassmorphism among the things to avoid — the effect is governed, not
 * banned. Two rules follow from that and from physics:
 *
 * 1. **Blur only where there is something to see through.** A translucent
 *    panel over a flat colour returns that same flat colour: the reader gets
 *    no depth and the compositor gets a layer it has to keep. `GLASS_OVER_ART`
 *    is for a surface standing on a photograph, where the effect is real.
 * 2. **The ground under a translucent surface is variable, so contrast has to
 *    be measured over what is actually behind it** — the reason the hero
 *    card's own alpha and the band's overlay are solved together against the
 *    worst admissible photograph rather than against a colour someone assumed.
 *
 * What carries the three-dimensional feel on a flat ground is not blur but
 * the light-catching edge: a hairline of the surface's own light along the
 * top, which is how a physical panel with a bevel reads. That costs no layer.
 */
export const GLASS_EDGE =
  "shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-text-on-brand)_55%,transparent)]";

/** A surface standing on artwork: translucent, blurred, edge-lit. The alpha
 *  and the blur are the values already proven on the contact hero's cards
 *  against a pure-white photograph — reused rather than re-invented. */
export const GLASS_OVER_ART =
  "border-[color-mix(in_srgb,var(--color-text-on-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-text-on-brand)_12%,transparent)] backdrop-blur-[12px]";

/**
 * The same treatment from `md` up, written out rather than derived.
 *
 * Tailwind v4 finds utilities by scanning source *text*, so a class assembled
 * at runtime — `` `md:${utility}` `` — generates no CSS and fails silently:
 * the page renders with no glass at all and nothing reports an error. Any
 * variant of a recipe has to exist as a literal string somewhere the scanner
 * can read it, which is why this is a second constant instead of a helper.
 */
export const GLASS_OVER_ART_MD =
  "md:border-[color-mix(in_srgb,var(--color-text-on-brand)_35%,transparent)] md:bg-[color-mix(in_srgb,var(--color-text-on-brand)_12%,transparent)] md:backdrop-blur-[12px]";
