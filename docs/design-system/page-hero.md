# The page hero

Governed by **ADR-0100 — The Page Hero Follows The Picture**. This file is the working document: how the component behaves, how to change it, and what is still wrong with it. The ADR carries the decisions and the authority; nothing here overrides it.

---

## 1. Why

Phase H (`e2fa8c0`) moved twenty-five public pages onto `@uaeaf/brand-ui`'s `PageHero`. That component draws an ink band and no photograph, and the pages' records still hold their pictures. Three of those pages had approved photographic compositions and lost them:

| Page | Before Phase H | After Phase H |
| --- | --- | --- |
| `/about/president` | Full-bleed night stadium, the title at Display XL, the signatory's name beneath it, the president's portrait standing on the hero's foot, identity lines in two corners | A short dark band. `president-hero.tsx` deleted; the portrait reappeared cropped inside a card beside the message — the same content twice |
| `/about/governance/vision-mission` | `IdentityHero` on the record's photograph (ADR-0070) | A short dark band. `IdentityHero` survived in the tree, referenced by nothing |
| `/about/governance/strategic-plan` | `IdentityHero` with the section eyebrow (ADR-0075) | The same band |

Eleven more listing pages kept a hero that can no longer show a picture at all, so an editor uploading one would see nothing change. Nine of the twelve tests guarding the President's hero were deleted along with the component.

The photographs exist. Verified against the live API on 2026-09-25:

| Route | `heroImageId` |
| --- | --- |
| `/about/president` | present — plus `featuredImage`, the 491×508 portrait |
| `/about/governance/vision-mission` | present |
| `/about/governance/strategic-plan` | present |
| `/news` | present |
| `/contact` | present — this hero was never migrated and never broke |
| athletes · clubs · coaches · disciplines · records · results-rankings · albums · videos · board-members · committees | `null` |

## 2. File map

**The kit** — one component, two compositions:

| File | What it holds |
| --- | --- |
| `packages/brand-ui/content/page-hero.tsx` | The component. `media` present → the photographic composition; absent → ADR-0098 D2's band |
| `packages/brand-ui/content/page-hero.css` | The photographic modifier rules and the whole entrance. Imported **after** `content.css`, which is the override mechanism |
| `packages/brand-ui/content/content.css` | The band's own rules, lines 47–206. Untouched |
| `packages/brand-ui/styles.css` | The import order |

**The application:**

| File | What it holds |
| --- | --- |
| `apps/web/src/components/ui/hero-photo.tsx` | The one place a `MediaAssetPublic` becomes the node the kit's slot takes. `heroPhotoSlot(image, locale)` returns `undefined` for an absent picture, which is what selects the band |
| `apps/web/src/components/ui/visible-trail.ts` | The one place a trail becomes the hero's breadcrumb. A step with no destination of its own is left out, because the kit marks every step without an `href` as the current page and a second one is a false statement to a screen reader |
| `apps/web/src/components/ui/identity-hero.tsx` | `IdentityHero` — the institutional photographic hero, and `SeamLines`, which the homepage's sponsor sections use. 716 lines of measured geometry |
| `apps/web/src/components/pages/president/president-hero.tsx` | `IdentityHero` with the President's record bound to it |
| `apps/web/src/components/ui/page-hero.tsx` | The older photo-capable hero. **No route renders it.** Kept because `surface-standard.spec.ts:122-151` requires it to exist and carry the shared composition constants |
| `apps/web/src/components/pages/contact/contact-hero.tsx` | `/contact`'s own hero. Never migrated, never broken, not touched here |
| `apps/web/src/styles/motion.css` | `.pm-settle`, `.pm-ground`, `.pm-portrait`, `.il-stroke` — `IdentityHero`'s entrance, which came back with the component |

## 3. One traced example — `/about/president`

1. `app/[locale]/about/president/page.tsx` reads the newest Live publication through `fetchPublic`. No Live record → the designed 404, and the page stays out of the index.
2. It renders `<PresidentHero record={record} locale={locale} />` and passes **no breadcrumb**. ADR-0072 D7: the `/about` pages emit their trail to `BreadcrumbJsonLd` and draw none. The ink hero drew one unconditionally, which reversed D7 in practice.
3. `PresidentHero` hands `IdentityHero` four things from the record: `ground={record.heroImage}`, `portrait={record.featuredImage}`, `title={record.heroTitle[locale]}`, `lead={record.signatoryName[locale]}`.
4. `IdentityHero` sees a `ground`, so `data-composition="c"`: the photograph fills `100svh − var(--header-height)`, under `HERO_SCRIM`'s measured 64 → 74% wash. With no `ground` it would be `"b"`, the green register.
5. `.pm-ground` settles the picture from `scale(1.04)` over `--motion-duration-ambient`. `transform` only — the picture is the Largest Contentful Paint and an element at `opacity: 0` is not counted as painted.
6. `.pm-settle` brings the eyebrow, title, lead and subtitle in along the 45° ascent, one `--motion-ascent-stagger` apart. `.il-stroke` slides each identity stroke in from outside the frame. `.pm-portrait` rises the portrait out of the hero's bottom edge.
7. `PresidentMessage` follows on the neutral band: body, pull-quote, signature, and `SeamLines` below the seam with the hero. The portrait is **not** here — it is in the hero, where the record's `featuredImage` belongs.

Measured, 1440×900: the title's glyphs start 369px from the left in Arabic and 64px in English — the text mirrors. The portrait stands 829px from the left in **both** languages, and identity group A stays on the left half in both. That is the approved behaviour, not a bug — see §6.

## 4. Decisions

| # | Decision | Where it comes from |
| --- | --- | --- |
| D1 | The composition follows the record. No `variant`, no `hasImage`, no `height` enum | ADR-0100 D1, restoring ADR-0067 D2 |
| D2 | A page draws the trail it passes. `/about` passes none; listing pages pass theirs | ADR-0072 D7; IA §8.5 |
| D3 | The three institutional pages keep `IdentityHero`; listing pages use the kit's hero. Two components, knowingly, with a discharge plan | ADR-0100 D2 |
| D4 | The entrance animates `transform` and `opacity` only. `filter: brightness()` became an opacity plane; `clip-path` became a clip box with an inner translate | ADR-0009; ADR-0100 D3 |
| D5 | The two durations the scale has no value for are component-local CSS variables. The scale stays at eight values | ADR-0099 D3's reasoning; ADR-0100 D3 |
| D6 | The mask is scoped to the photographic composition. On the band the heading is the largest paint | ADR-0100 D3 |
| D7 | The mesh stays in the markup and is not painted over a photograph | ADR-0098 §8.4; `surface-adjacency-contract.spec.ts:93-112` |
| D8 | The eleven picture-less pages are unchanged. A conditional rule needs no exception list | ADR-0100 D1; Product Owner, 2026-09-25 |

## 5. How to edit

**To give a page its photograph back:** upload one in the dashboard. Nothing in the code changes — that is D1.

**To add the hero to a new page:** take `heroImage` from `loadStaticPage(key, locale)` and pass `media={heroPhotoSlot(heroImage, locale)}`. Pass `breadcrumb` only if the page should draw one.

**To change the entrance's timing:** `--hero-enter` and `--hero-enter-ground` at the top of `page-hero.css`. The stagger is `--motion-ascent-stagger` and comes from the token; do not restate it. Keep the last element's start inside §5.7's 600ms total-stagger ceiling — at five steps it is 300ms today.

**To change what moves:** only `transform`, `opacity`, `translate`, `scale`, `rotate`. `page-hero-photo-contract.spec.ts` fails on anything else, and that is ADR-0009 rather than this file's preference.

**To change the scrim:** you are changing a measurement, not a colour. Both stops are solved against a pure white photograph, and the guard holds them to `COVER_SCRIM_MIN` and to AA. Re-measure before you re-type.

**To add a line to the entrance:** give it `brand-page-hero__line` and a `--hero-order` in the stylesheet beside its own class. If it should be masked rather than rise, it needs a `__reveal` ancestor — the mask is scoped to lines that have a clip box, because `translateY(105%)` with nothing clipping it is an element sliding up over its neighbour rather than a reveal.

**Do not:** delete `apps/web/src/components/ui/page-hero.tsx` (a guard requires it), drop `mesh` from the kit's `<Surface kind="ink">` (a guard requires it), add an `<h1>` to an application-side hero wrapper without adding the file to `seo-contract.spec.ts:142-171`, or leave a `__line` element `display: inline` — a transform does not apply to a non-replaced inline box, and the animation will attach and move nothing.

## 6. Where it breaks

- **The portrait does not swap sides between languages, and neither do the identity-line groups.** The portrait sits 829px from the physical left in Arabic and English alike. This is deliberate and documented in `identity-hero.tsx`: the ascent vector is brand geometry rather than reading direction (ADR-0059 §D7.1), group B does not mirror, and the portrait's inset is the room group B needs. **It differs from what the restoration brief expected**, and it is recorded here for the Product Owner rather than changed. What does mirror: the text's edge, and the kit hero's streak placement.
- **Two photographic heroes exist.** ADR-0100 D2 names which is which and carries the discharge plan and its cost. A future author extending the wrong one is the live risk.
- **`packages/brand-ui`'s stylesheets are outside every guard's reach.** `motion-contract.spec.ts` walks `apps/web/src` and `packages/design-tokens/css`; `token-contract.spec.ts` walks `apps/web/src`; `source-files.ts` adds `packages/brand-ui` but only its `.tsx`. So no keyframe whitelist, duration-token rule or hex rule sees any of the kit's four stylesheets. This is not hypothetical: `accent/accent.css:236` animates a custom property `motion-contract.spec.ts:120` would reject. `page-hero-photo-contract.spec.ts` covers the one stylesheet added here; the general gap is open.
- **Largest Contentful Paint is not measurable on this machine's dev server.** Three sessions, the API and two Next processes share it; repeated loads of one page ranged 1768–4684ms, and a same-page comparison with the entrance suppressed came out *faster* with it than without, which is noise rather than a result. What is structural rather than measured: the picture never animates `opacity`, so it is a paint candidate in its first frame, and the guard fails if that changes. CLS **is** reliable — measured at 390×844 across the four restored pages in both languages: 0 with no shift entries on six, and 0.0001 and 0.0004 with one entry each on the other two, against a 0.1 budget.
- **The first implementation of the entrance moved nothing, and the suite was green.** The line was an inline `<span>`; a transform does not apply to a non-replaced inline box, so the browser attached `brand-hero-unmask`, reported it as running, and left the heading at the identity matrix. The keyframes were valid, the guard wrapper was correct, the animation existed. Two independent reviews found it by reading the code and a browser probe confirmed it. `page-hero-photo-contract.spec.ts` now asserts the display, proven by mutation — which is the only reason the next version of this cannot ship the same way.
- **`/about/governance/policies` keeps the band and has no picture to show.** Its title and body come from the `Policies` messages and `loadGovernanceDocuments()`, not from a hero record. Giving it a photograph means giving it a record first.
- **`/media/videos` has no hero photograph, deliberately for now.** It takes its heading and sentence from the `VideoSystem` messages rather than from its record, and the route's own comment states the invariant that blocked the wiring: the broadcast "joins the one media read the page already makes rather than adding a second". `loadStaticPage` runs its record fetch, its translations and its media lookup in series, so reading the record for the picture alone added two round trips and a second `/media` request. It was wired, measured, and reverted. Its `heroImageId` is null, so nothing is visibly missing. **Owner decision required** if that page should carry a photograph: the cheap route is to fold `heroImageId` into the existing `loadThumbnails` call rather than to call `loadStaticPage`.

## 7. Guarding tests

| Test | What it holds |
| --- | --- |
| `apps/web/src/lib/design-system/page-hero-photo-contract.spec.ts` | 14 assertions on `page-hero.css`: the keyframe whitelist, the `no-preference` guard, the off switch, the mask's scope (composition **and** clip box), **every line's `display`**, the ground's opacity, the rise's non-zero floor, both scrim stops against a white photograph, against `COVER_SCRIM_MIN`, and against `HERO_SCRIM`'s own stops so the two washes cannot drift. **Proven by mutation twice** — first a forbidden keyframe property, a 40% scrim stop and an unscoped mask (five of twelve red); then the two assertions that guard the defects this change actually shipped, an inline line and a mask outside its clip box (two red, each by its own assertion) |
| `apps/web/src/components/pages/president/president-page.spec.tsx` | The nine hero tests Phase H deleted, restored: compositions B and C, the title before the portrait in reading order, the identity lines out of the accessibility tree, the title taking the whole row without a portrait, the portrait capped at five of twelve columns, the portrait's `aspect-ratio` before the picture arrives, group A beside the Arabic title below `lg`, and `.pm-ground` on the ground plane only |
| `apps/web/src/components/ui/identity-hero.spec.tsx` | `IdentityHero` and `SeamLines` |
| `apps/web/src/lib/design-system/` (24 files, 382 tests) | Every existing guard, green, with no exception added. `surface-adjacency-contract` (the mesh), `surface-paint-contract`, `locale-aware-link-contract`, `identity-palette-contract` (no literal colour in the kit's `.tsx`), `seo-contract` (the `<h1>` allowlist), `cover-scrim`, `motion-contract` |

Live checks run on 2026-09-25 against `localhost:3001`, both languages, at 1440×900 and 390×844.

- **Composition:** all four restored pages render the photograph at first-screen height (804/900 desktop, 748/844 mobile); `/clubs` keeps the band at 250/288 with no picture, which is the control. The President's portrait is inside the hero. No `<nav>` in any `/about` hero.
- **The entrance, read frame by frame** with the animation clock slowed 50× through CDP, because every animation fills `backwards` and a finished one is no longer in `getAnimations()` — a probe that waits for the page to settle sees `transform: none` and cannot tell "arrived" from "never moved", which is exactly how the inline-box defect hid. Photographic: heading `translateY(26.9px → 7.7px → 0)`, subtitle `53.7px → 21.7px → 0`, picture `scale(1.032 → 1.010 → 1.0008)` at opacity 1 throughout, exposure plane `0.36 → 0.11 → 0.01`, streaks `scaleY(0 → 0.71 → 1)`, breadcrumb rising on the 45° ascent and never masked. Band: breadcrumb, heading and subtitle each rising one step behind the last, opacity from 0.01.
- **Reduced motion** (`reducedMotion: "reduce"`, three pages × two languages): **0 running animations**, heading transform `none`, opacity `1.00`, and `h1 overflow: visible` — the clip box is inside the `no-preference` block, so under `reduce` it is not even a clip box.
- **CLS** at 390×844 across the four restored pages in both languages: 0 with no shift entries on six, 0.0001 and 0.0004 with one entry each on the other two. LCP was the `<img>` in all eight.
- **Contrast**, composited in sRGB channel space over a pure white photograph — the lightest ground that can exist: heading **6.71:1** at the weakest scrim stop and **10:1** at the stronger; subtitle at 85% opacity **5.40:1** and **7.77:1**.
- **The mirror:** the heading's glyphs start 369px from the left in Arabic and 64px in English; the kit hero's streak placement flips with the reading direction. See §6 for what does not mirror.

## 8. Not built

- The unification of the two photographic heroes. ADR-0100 D2 has the plan and the cost.
- Extending the existing guards to all of `packages/brand-ui`'s stylesheets. It fails today on `accent/accent.css`, which this change does not touch. The gap is now recorded as a comment at the top of `motion-contract.spec.ts`'s scan roots, where someone opening that walker will find it.
- Pointing `surface-standard.spec.ts`'s hero list at the heroes that actually render, and deleting `ui/page-hero.tsx`. That list is the only reason the dead file survives. ADR-0100 D2 carries it as step 5 of the discharge plan — cheap, and independent of unification.
- `eyebrow`, `actions`, `lead` and `portrait` slots on the kit's hero. Nothing renders them: the compositions that need them use `IdentityHero`. Adding a prop for a caller that does not exist is how a component grows a surface nobody maintains.
- Per-line mask reveal. CSS cannot address a wrapped line, and the brief ruled out JavaScript. The mask is per block.
- Any Figma frame for the photographic variant of the kit's hero. **PENDING FIGMA BACK-SYNC** — the variant's states have no frame, and Figma is not touched until access is confirmed restored.

## 9. Terms

| Term | Meaning here |
| --- | --- |
| **The band** | ADR-0098 D2's ink hero: a short dark strip with a breadcrumb, a title and an optional sentence |
| **The photographic composition** | The same component with `media` present: the picture on the first screen under the measured scrim, no mesh, no track lines |
| **Composition B / C** | `IdentityHero`'s two states — B is the green register with no picture, C is the picture under the scrim. Written to `data-composition` |
| **The scrim** | The wash that turns an unknown photograph into a ground text can stand on. 64 → 74% of `--color-surface-overlay`, solved against a pure white picture |
| **The exposure plane** | A black layer clearing from `opacity: 0.45` to 0 over the entrance. Composites to exactly `brightness(0.55) → 1` of the picture, without animating `filter` |
| **Identity lines / streaks** | The four diagonal strokes at the ascent angle. `IdentityHero` draws two measured groups in brand colours; the kit draws `BrandStreaks`, monochrome from the surface. Placement follows reading direction; **the angle never does** |
| **A step** | `--motion-ascent-stagger`, 60ms. §5.7 allows 40–80ms and caps the total at 600ms |
| **The off switch** | `UAEAF_MOTION_OFF=hero` → `<html data-motion-off="hero">`. Removes the entrance with no build |
