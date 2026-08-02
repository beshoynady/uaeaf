# UAEAF Digital Platform — Homepage Specification
### Product Specification · Pre-UI Phase — Single Source of Truth for the Homepage

**Document:** UAEAF Product Specification v0.1.0 (Draft for Review)
**Status:** Draft — awaiting product approval before any Figma/UI work begins
**Source of Truth:** UAEAF Enterprise Design System Framework v1.0.0 (`/docs/design-system`) + `01-Information-Architecture.md` (`/docs/product`)
**Scope:** Homepage only — purpose, goals, users, hierarchy, content, strategy per domain, accessibility, SEO, performance, responsive, CMS/API requirements, dependencies, metrics, open questions
**Out of Scope (deliberately):** UI design, layout, components, color, spacing, typography, wireframes, Figma work — this begins only after this document is approved

> **Normative language** (inherited from Chapter 2 of the Design System): MUST · MUST NOT · SHOULD · SHOULD NOT · MAY.
>
> **Evidence convention** (inherited from `01-Information-Architecture.md`):
> - **[D]** = Documented — traceable to a chapter in `/docs/design-system` or a settled section of `01-Information-Architecture.md`
> - **[B]** = Built — settled by the existing built homepage evidence recorded in `01-Information-Architecture.md` §7/§8
> - **[I]** = Inferred — direct logical consequence of a **[D]**/**[B]** fact
> - **[A]** = Assumption — not documented anywhere; requires stakeholder validation before implementation
> - **[NV]** = Needs Validation — depends on a source that is unavailable or unresolved

---

## 0. Reconciliation Note (read this first)

`01-Information-Architecture.md` was written when only 9 of the 27 Design System chapters existed in this project (its own §0.1/§0.2). As of this document, **all 27 chapters are present** in `/docs/design-system`, including several that IA doc had marked **[NV]** and directly relevant to the Homepage: Chapter 6 (Accessibility), Chapter 9 (Content Design), Chapter 11 (UX Patterns), Chapter 13 (CMS System), Chapter 14 (SEO), Chapter 19 (Calendar/Localization), Chapter 20 (Page Templates), Chapter 21 (Technical Architecture).

This document uses those chapters directly where they resolve a prior **[NV]** and calls out each resolution. It does **not** re-litigate `01-Information-Architecture.md` — that document's §7 "Homepage Breakdown — as built **[B]**" remains the authoritative record of what is already shipped, and is the backbone of §5–§6 below. Where this document extends beyond what is built, sections are marked **[P]** (proposed) or **[A]** (assumption), matching the IA doc's convention.

**Governing template identifier [D]:** the Homepage is `TMP-HOME-001` (Chapter 20 §20.1), which composes: Chapter 8 L1 (Foundation), L5 (Data Display), L6 (Media), L8 (Sports Domain) components; Chapter 5 (Hero/Motion); Chapter 9 (Content). Any component proposed for the Homepage that does not trace to one of these chapters is out of scope for this document per Chapter 20's Pure Assembly rule (ADR-0032) — it must be raised as an ADR against the source chapter, not decided here.

---

## 1. Purpose of the Homepage

The Homepage is the federation's digital front door **[D]** (`01-Information-Architecture.md` §7, row "Global Header": *"Orient and route — every domain reachable in one action"*). It has two simultaneous jobs, inherited directly from **ADR-0001 (Dual Experience Architecture)**:

1. **Impress** — convey, in the first viewport, that this is a modern, professional, internationally credible national sports federation. **[D]** Chapter 0 Design Goal #1.
2. **Route** — get every visitor (public, athlete, media, international body) to the correct domain (competitions, results, athletes, clubs, news, media) in the fewest possible steps, without carrying dashboard-style density into this layer. **[D]** ADR-0001.

The Homepage is **not** a content repository — it is a preview surface. Every section on it previews a domain that has its own dedicated screens (§4 of the IA doc); the Homepage's job is orientation and conversion into those screens, not exhaustive listing.

**Non-goal:** the Homepage is not a transactional surface. No service, registration, or account action is initiated on the Homepage itself — see §8 (CTA Strategy) and §25 (Open Questions, Services gap).

---

## 2. Business Goals

Directly inherited from Chapter 0 Design Goals — every Homepage decision **MUST** trace to at least one of these **[D]**:

| # | Goal | Homepage's role |
|---|---|---|
| 1 | Global digital identity — a visitor from outside the UAE perceives a modern national sports institution | Hero carousel, motion, three-theme support, bilingual RTL/LTR parity carry the entire first impression |
| 2 | Full digital transformation — federation operations unified in one platform | Homepage routes into every operational domain (competitions, registry previews); it must not create dead ends (see §25 Services gap) |
| 3 | Spread the sport, increase engagement, grow reach (including AI/search discoverability) | Featured Athletes, News, Media Centre sections; SEO/AI-readability requirements (§18) |

**Secondary business goal (commercial):** honour sponsor contractual placement — **[D]** the Sponsors & Partners section exists specifically to fulfill this obligation (`01-Information-Architecture.md` §7, row 9).

---

## 3. Primary User Types

Homepage-relevant subset of the 13 platform user types (`01-Information-Architecture.md` §2.2) — every type below is Public-layer or the anonymous entry point to Public-layer:

| User type | What they come to the Homepage for | Evidence |
|---|---|---|
| **Visitor** (anonymous, domestic or international) | Orientation: "what is this federation, what's happening now" | **[D]** §2.2 row 1 |
| **Registered User / Athlete / Coach** | Fast route to their competitions, results, or profile domain | **[D]** §2.2 rows 2-4 |
| **Media / Press** | Latest news, media assets, upcoming events for coverage planning | **[D]** §2.2 row 7 |
| **Club Manager** | Club network visibility, entry point to club domain | **[D]** §2.2 row 6 |
| **International bodies (World Athletics, AAA, NOC)** | Credibility signal, affiliation proof | **[I]** from Chapter 0 Design Goal #1 + footer affiliations strip **[B]** |

**Explicitly out of scope for the Homepage [D]:** Content Editor, Media Team, Competition Officer, Registrar, Administrator, Super Admin — all Operational-layer users, who land in CMS/Dashboard, never the public Homepage (ADR-0001 layer separation).

---

## 4. User Journeys

Each journey below is validated against the **as-built** section inventory (§6). No journey requires a section that doesn't exist.

| Journey | Path through the Homepage |
|---|---|
| **International visitor, first visit** | Hero (impression) → Federation by the Numbers (credibility) → Featured Athletes (humanize) → scroll to Media Centre (visual proof) |
| **Domestic fan checking results** | Header nav *Events* dropdown (direct) **or** Hero next-event card **or** Results & Rankings section (in-page preview) → "View all" into `TMP-RESULTS-001` |
| **Media/press planning coverage** | Upcoming Events (countdown + `.ics` export) → News section (latest angle) → Media Centre (assets) |
| **Athlete checking own status** | Header account menu (login) → routed to Operational self-service, **not** through Homepage content sections — **[I]** per ADR-0001, self-service is not a Homepage concern |
| **Club representative** | Clubs Network section (filter by emirate) → "View all" into `TMP-CLUBLIST-001` |
| **Prospective sponsor / partner** | Sponsors & Partners strip → (no dedicated sponsor landing page exists yet — **[NV]**, see §25) |
| **Returning engaged user** | Header search (overlay) direct to any entity, bypassing sections entirely | **[D]** §10 |

---

## 5. Homepage Information Hierarchy

Vertical, single-column scroll — **not** a dashboard grid, per ADR-0001. Order is fixed today **[B]** (flagged as a gap in §21). Hierarchy, top to bottom:

```
Global Header (persistent)                — orientation + routing utility
Scroll progress lane (persistent, under header)
1.  Hero carousel                         — impression + primary conversion
2.  Federation by the Numbers             — credibility
3.  Featured Athletes                     — humanize the sport
4.  Results & Rankings                    — core sporting fact (utility)
5.  Clubs Network                         — national coverage
6.  Upcoming Events                       — forward engagement + conversion
7.  News                                  — communication, SEO/AI surface
8.  Media Centre                          — emotional/brand proof
9.  Sponsors & Partners                   — commercial obligation
10. Newsletter                            — owned-audience retention
11. Global Footer                         — navigation completion + compliance
Floating social rail (persistent, overlay)
```

**[D]** Source: `01-Information-Architecture.md` §7 (built, fixed order). This document does not propose reordering — any reorder is a product decision requiring stakeholder sign-off and is logged as Open Question §25.

---

## 6. Section Inventory

One row per section. This is the authoritative Homepage section list for this document — it **MUST** match `01-Information-Architecture.md` §7 exactly; any divergence must be reconciled there first.

| # | Section | Objective | CMS-editable | Reusable component | Evidence |
|---|---|---|---|---|---|
| — | Global Header | Orient + route; logo, 7 nav items, search, language, theme | ● menu | ● | **[B]** |
| 1 | Hero carousel | First impression; 5 slides, auto-advance, pause on hover/focus/touch, next-event card | ● | ● | **[B]** |
| 2 | Federation by the Numbers | Scale/credibility; count-on-view + trend | ◐ | ● | **[B]** |
| 3 | Featured Athletes | Humanize the sport; discipline filter | ◐ selection | ● | **[B]** |
| 4 | Results & Rankings | Core sporting fact, tabbed | ○ data-driven | ● | **[B]** |
| 5 | Clubs Network | National coverage; filter by emirate | ◐ | ● | **[B]** |
| 6 | Upcoming Events | Forward engagement; countdown, `.ics` export, show-more | ○ data-driven | ● | **[B]** |
| 7 | News | Communication; category filter, lead + list | ● | ● | **[B]** |
| 8 | Media Centre | Emotional proof; dark mosaic, lightbox, reels | ● | ● | **[B]** |
| 9 | Sponsors & Partners | Commercial obligation; one merged animated strip | ● | ● | **[B]** |
| 10 | Newsletter | Retention; inline form + success state | ● | ● | **[B]** |
| 11 | Global Footer | Navigation completion + compliance | ● | ● | **[B]** |
| — | Floating social rail | Owned-audience growth; 4 channels + back-to-top | ● | ● | **[B]** |

**Deliberately excluded [D]:** Services/Quick Actions block and E-Services footer column — both removed by explicit prior instruction; see §25 for the unresolved product gap this creates.

---

## 7. Content Priority

Priority within the viewport and within each section, derived from **[D]** PR-001 (Clarity Over Decoration: one primary message per screen) and the built section order itself (higher = seen first = higher priority):

| Priority | Content | Rationale |
|---|---|---|
| **P0 — above the fold** | Hero headline/media + primary CTA + next-event card | First-impression goal (§1); **[D]** PR-002 LCP<2.5s budget applies specifically to this content (§19) |
| **P0** | Global header search + nav | Routing is a Homepage core job (§1) |
| **P1** | Results & Rankings, Upcoming Events | Highest-utility "why did you come here today" content — **[D]** PR-010 requires these carry `verification_status`/source attribution |
| **P1** | News (lead article) | Freshness signal + SEO/AI surface (§11, §18) |
| **P2** | Federation by the Numbers, Featured Athletes, Clubs Network | Credibility/engagement, not task-critical |
| **P2** | Media Centre | Brand proof, intentionally placed after utility content |
| **P3** | Sponsors & Partners, Newsletter | Obligation/retention, not user-task-driven — **MUST NOT** compete visually with P0/P1 per PR-001 |

**Content freshness rule [I]:** any section presenting a "live" or "latest" fact (results, rankings, upcoming events, news) **MUST** carry the same `verification_status`/timestamp discipline required by **[D]** PR-010 and Chapter 9 §CR-1.9/§CR-5.5 (timestamp language) — a stale "latest" is worse than PR-001's plain-content anti-pattern.

---

## 8. CTA Strategy

**Governing rule [D]:** PR-001 anti-pattern explicitly forbids more than one primary CTA per section; `01-Information-Architecture.md` §7 confirms this was **observed** in the build (hero carries one primary + one secondary).

| Section | Primary CTA | Secondary CTA | CTA copy governance |
|---|---|---|---|
| Hero | Route to Calendar (`TMP-EVENTLIST-001`) | Route to About | Chapter 9 §CR-4.1 (CTA/Button Text Rules) |
| Results & Rankings | "View all results/rankings" → `TMP-RESULTS-001` | Tab switch (Results ↔ Rankings) is not a CTA, it's in-section navigation | — |
| Upcoming Events | "View full calendar" → `TMP-EVENTLIST-001` | Per-row `.ics` export (utility action, not a conversion CTA) | — |
| News | "View all news" → `TMP-NEWSLIST-001` | Individual article links (content-level, not section CTA) | — |
| Clubs Network | "View all clubs" → `TMP-CLUBLIST-001` | — | — |
| Featured Athletes | "View all athletes" → `TMP-ATHLETELIST-001` | — | — |
| Media Centre | Implicit — lightbox open is the interaction, no navigational CTA required | — | — |
| Newsletter | "Subscribe" (inline form submit) | — | Chapter 9 §CR-4.1 + §CR-3.1 (validation copy) |
| Sponsors | None — logos link out or to nothing per current build; **not** a lead-generation surface | — | — |

**MUST NOT [D]:** a red (`color.core.red`) CTA on the Homepage — Chapter 1 ADR-0004 reserves red exclusively for danger/delete/cancel; every Homepage CTA is green (primary) or black/neutral (secondary).

---

## 9. Navigation Behavior

Fully inherited from `01-Information-Architecture.md` §8, restated here as it applies to the Homepage specifically **[B]**:

- **Main nav:** 7 top-level items (Home, About the Federation▾, Clubs, Athletes, Events▾, News, Media Centre). Two carry dropdowns with a one-line description per child. Active item shows a brand-colored underline indicator.
- **Below 1024px:** the bar collapses into a drawer carrying the identical tree — **MUST NOT** diverge in content from the desktop nav (single source, per §8.1).
- **Persistent utilities beside nav (not nav items):** Search overlay, Language (AR↔EN), Appearance (light/dark/high-contrast).
- **Footer nav:** mirrors the 7 main-nav items as "Quick Links" — single source, two surfaces; plus Federation Location, Contact, Newsletter, Affiliations strip, Legal strip (Accessibility, Sitemap, language switch, copyright).
- **Scroll behavior:** a scroll-progress lane sits under the header for reading orientation — **[D]** PR-005 (motion explains state), not decorative.
- **Section anchors:** none of the 11 sections currently expose deep-link anchors from the main nav — the nav routes to dedicated screens (§4 of IA doc), not to Homepage section positions. **[A]** — confirm this is intended before Figma; an alternative is nav items scrolling to their Homepage preview section on Home itself. Logged as Open Question §25.

---

## 10. Search Behavior

**Governing pattern [D]:** PT-SEARCH-001 (Chapter 11) — `Idle → Typing (debounced) → Loading → Results | Empty`.

- **Entry point:** header search icon opens an overlay (not a dedicated results page navigation on keystroke) — **[B]**.
- **Scope on the Homepage/public layer [D]** (§8.7 of IA doc): published news, pages, athletes, clubs, coaches, competitions, results, records, documents, galleries. **Excludes:** drafts, unverified results, personal data, internal records.
- **Empty state copy:** **MUST** follow Chapter 9 §CR-2.5 pattern — *"no results for {query}"*, not a generic error.
- **Pagination [D]:** PR-008 — search results **MUST** paginate; no unbounded result dump.
- **Unverified content [D]:** PR-010 — unverified results **MUST NOT** surface in public search results, including from the Homepage search overlay.
- **Suggested queries:** present in the built overlay **[B]** — exact source of suggestions (trending vs. curated) is **[A]**, logged in §25.

---

## 11. News Strategy

- **Content type [D]:** `CT-ARTICLE-001` (Chapter 13), Full Editorial Lifecycle (Author → Review → Publish per PR-010/Chapter 22 author≠publisher rule).
- **Homepage presentation [B]:** lead article + list, category filter, responsive to 1.35fr/1fr split ≥1024px.
- **Freshness:** every article **MUST** carry accurate publish/modified timestamps — required both for §7 content-freshness rule and for SEO eligibility (§18, `NewsArticle` schema requires it).
- **Editorial boundary [D]:** Chapter 13 §5.2 rule — news may **reference** results/athletes/competitions but **MUST NOT** restate their factual values independently (anti-duplication, ADR-0013 applied to content). A news card mentioning a result links to the canonical result, it does not re-type the mark.
- **AI-assisted content [D]:** PR-007 — any AI-assisted field in a news object **MUST** pass human review before publish; never auto-published.

---

## 12. Competitions Strategy

Presented on the Homepage via two sections: **Results & Rankings** and **Upcoming Events**. Competitions themselves are not authored objects — they are registry entities (§5.2 of IA doc).

- **Data source discipline [D]:** PR-010 — every result/ranking/record shown **MUST** carry `verification_status` and a documented source; unverified figures **MUST NOT** render publicly, including in Homepage previews.
- **Governing chain [D]:** `Competition → Entries → Startlist → Results → Verification → Rankings → Records` (§9 of IA doc) — the Homepage consumes only the *published, verified* end of this chain; it never surfaces intermediate (unverified) states.
- **Upcoming Events section [B]:** compact rows, live countdown, `.ics` calendar export per row, "show more" after 3 rows. `.ics` export confirms the competition entity **MUST** carry a precise start datetime (§0.5 of IA doc).
- **Filters shown at this level:** none on the Homepage preview itself (filters live on `TMP-EVENTLIST-001`/`TMP-RESULTS-001`); the Homepage previews are unfiltered "most recent/soonest N" lists, tab-switchable between Results and Rankings.
- **Calendar/localization dependency [D]:** Chapter 19 — dates stored Gregorian internally, displayed per active calendar layer; the countdown/`.ics` logic **MUST** respect the timezone model in Chapter 19 §2, not a hardcoded offset.

---

## 13. Athletes Strategy

- **Section [B]:** Featured Athletes — full-bleed deck, discipline filter, editorial selection (`◐ selection` — CMS controls *which* athletes are featured, not their factual data).
- **Entity boundary [D]:** Chapter 13 §5.2 — CMS owns only the editorial layer (narrative bio, portrait, feature flag) for an athlete; registry data (identity, licence, results, PBs, records) is never CMS-authored, only referenced.
- **Minors' data [NV]:** Chapter 17 §SP.10 governs sensitivity for athlete profiles involving minors (athletics has a large youth base). The Homepage's Featured Athletes selection **MUST NOT** expose any minor-athlete data beyond what Chapter 17 permits publicly — this needs explicit reconciliation before any athlete is featured; logged in §25.
- **Destination:** "View all athletes" routes to `TMP-ATHLETELIST-001` → `TMP-ATHLETEDETAIL-001`, both governed by Chapter 8-L8 (Sports Domain Components) and Chapter 10 (result scenarios).

---

## 14. Clubs Strategy

- **Section [B]:** Clubs Network — filter by emirate, 2-up responsive ≥1024px.
- **Entity boundary [D]:** same Chapter 13 §5.2 rule — CMS owns description/logo/imagery only; affiliation status, roster, and official name are registry-owned.
- **Structural decision [B, settled]:** Clubs is a top-level nav item, not nested under a "People & Organisations" parent (`01-Information-Architecture.md` §3.1) — the Homepage's Clubs Network section reinforces this by giving Clubs its own dedicated preview section, not a shared one with Athletes.
- **Destination:** "View all clubs" routes to `TMP-CLUBLIST-001` → `TMP-CLUBDETAIL-001`.

---

## 15. Sponsors Strategy

- **Section [B]:** one merged animated strip across all sponsor tiers (not separate per-tier regions), pauses on hover/focus.
- **Entity model [D]:** Chapter 10 §10.1 — Sponsor references Tier, Competitions, Homepage placement, Contract period **[A]** (contract period is flagged as an assumption in the IA doc itself, not yet documented).
- **Business purpose [D]:** revenue/contractual obligation (`01-Information-Architecture.md` §7 row 9), explicitly not a lead-generation or engagement surface — no CTA strategy applies here beyond the logos themselves (§8).
- **Known build gap [D]:** IA doc §15.2 records sponsor logos as currently placeholders — real assets pending (`sponsors-logo-prompts.md`), tracked as a pre-launch requirement, not a spec question.

---

## 16. Media Strategy

- **Section [B]:** Media Centre — full-screen dark mosaic, lightbox, external channel embeds (reels), 4-column auto-rows ≥1024px.
- **Entity boundary [I]:** Media (gallery/video) is CMS-owned per Chapter 13 §5.3 (Image Asset, Gallery/Album, Video Asset) — no registry-boundary conflict as with athletes/clubs, since media has no separate factual "source of truth" outside the asset itself.
- **Performance implication [D]:** Chapter 8 L6 mandates lazy loading for all media assets; this section, being image/video-dense and below the fold, is the primary lazy-load candidate on the page — directly supports the LCP budget in §19.
- **External embeds:** confirms Media entity needs an external-channel reference field (§0.5 of IA doc) — a CMS/data requirement, tracked in §21/§22.

---

## 17. Accessibility Requirements

**Governing standard [D]:** Chapter 6 — WCAG 2.2 AA (not AAA — explicit product decision, Chapter 6 §Alternatives Considered) + UAE TDRA National Digital Accessibility Policy + Federal Law No. 29/2006 (People of Determination).

Applied to the Homepage specifically:

| Requirement | Rule | Source |
|---|---|---|
| Text contrast | ≥4.5:1 normal text (WCAG 1.4.3) | **[D]** Chapter 6 §6.2 |
| Non-text contrast | ≥3:1 for input borders/functional icons (WCAG 1.4.11) | **[D]** Chapter 6 §6.2 |
| Keyboard | 100% of interactive elements (hero controls, search, filters, lightbox, newsletter form) operable by keyboard; Tab order follows visual order, RTL-aware (right→left) | **[D]** Chapter 6 §6.3 |
| Motion | No flashing >3×/second (WCAG 2.3.1) — applies to hero auto-advance and any count-on-view animation, absolute constraint | **[D]** Chapter 6 §6 |
| Reduced motion | `prefers-reduced-motion` **MUST** be respected across hero, count-on-view, sponsor strip, scroll-progress lane | **[D]** Chapter 5 §5.8 + Chapter 6 |
| Zoom/Reflow | Usable at 200% zoom without loss of function; no horizontal scroll at 320px | **[D]** Chapter 6 §6 (WCAG 1.4.4/1.4.10) |
| Touch targets | ≥44px on all small-screen interactive elements | **[D]** PR-006 KPI |
| Screen reader | All Homepage sections tested with NVDA (Windows) / VoiceOver (macOS/iOS) before release | **[D]** Chapter 6 §6 pipeline |
| RTL parity | Full RTL support, Arabic RTL screenshot test per component (G.12) | **[D]** Chapter 8 governance |
| Auto-motion control | Hero carousel and sponsor strip **MUST** provide a pause mechanism (already built **[B]**: pause on hover/focus/touch) | **[D]** PR-005 KPI |

**P0 status confirmed [D]:** Accessibility is explicitly non-negotiable — PR-003 "is never defeated" (§4.5 of IA doc); the Homepage inherits this without exception.

---

## 18. SEO Requirements

**Governing decision [D]:** ADR-0025 (Chapter 14) — every archivable entity **MUST** have a clean readable path and matching Structured Data; **MUST NOT** ship an empty/data-only page without descriptive text.

Applied to the Homepage:

- **Structured Data:** Homepage **MUST** carry `Organization`/`SportsOrganization` Schema.org JSON-LD (federation identity, logo, social profiles) — the canonical anchor entity for every other entity's schema graph. **[I]** from Chapter 14 §4, no explicit Homepage row exists, so this is an inference requiring confirmation (§25).
- **Canonical URL:** the Homepage **MUST** declare a canonical URL, preventing duplicate-content issues from AR/EN or trailing-slash variants — **[D]** Chapter 14 §general rule.
- **News eligibility:** the News section's linked articles **MUST** meet Google News technical requirements (precise timestamp, `NewsArticle` schema, high-quality image) for the Homepage's News preview to be a credible discovery surface — **[D]** Chapter 14 §"أخبار CMS".
- **Internal linking:** every entity preview card (athlete, club, event, article) on the Homepage **MUST** link to its canonical detail page — **[D]** Chapter 14 "MUST رابط داخلي غني."
- **hreflang:** AR/EN versions of the Homepage **MUST** carry reciprocal `hreflang` tags — **[D]** Chapter 14 Don't list.
- **Minimum content threshold:** the Homepage, being section-rich (not a bare data table), inherently satisfies Chapter 14 §11's anti-pattern check — no action needed beyond keeping real descriptive copy in every section, not code-only content.

---

## 19. Performance Requirements

**Governing principle [D]:** PR-002 (Performance First) — every Homepage decision **MUST** be evaluated against Core Web Vitals before acceptance; when PR-002 conflicts with any other principle, **PR-002 wins** (Chapter 2 §Conflicts With/Resolution).

| Metric | Budget | Source |
|---|---|---|
| LCP (Largest Contentful Paint) | <2.5s | **[D]** PR-002 KPI / Chapter 21 |
| INP (Interaction to Next Paint) | <200ms | **[D]** PR-002 KPI |
| CLS (Cumulative Layout Shift) | <0.1 | **[D]** PR-002 KPI / Chapter 21 |
| Animation frame rate | >55fps | **[D]** PR-002 KPI |
| Lighthouse Performance score | ≥90 | **[D]** PR-002 KPI |
| JS bundle size per page | <200KB compressed (directional target) | **[D]** Chapter 21 |

**Homepage-specific consequences:**
- Hero media is the LCP element — **MUST** be pre-optimized (WebP/AVIF, correctly sized, no 20MB hero video without a poster image — explicit PR-002 anti-pattern).
- Below-the-fold sections (Media Centre, Sponsors, Newsletter, Footer) **MUST** lazy-load — direct application of the PR-002 decision tree ("does it affect LCP? can it be deferred? → defer it").
- Fonts (Alexandria, IBM Plex Sans/Mono) **MUST** load with `font-display: swap` — already implemented at the token/build level (see `apps/web` integration), reused as-is on the Homepage, not re-decided here.
- **Known open risk [D]:** `01-Information-Architecture.md` §15.2 records current hero imagery as heavy PNGs (~2MB) — flagged **at risk** against this exact LCP budget; this document treats that as a pre-launch blocker, not a new finding.

---

## 20. Responsive Behavior

**Governing principle [D]:** PR-006 — public site is **mobile-first**, explicit anti-pattern is designing the public hero at 1440px first.

**Breakpoints as built [B]** (`01-Information-Architecture.md` §12):

| Breakpoint | Homepage behavior |
|---|---|
| <640px | Single column; drawer nav; event rows hide seconds column and category chip |
| 640–1023px | Two-column footer and partner grid |
| ≥1024px | Single-row header with full nav; 4-up stats; 4-column media mosaic and footer; side-by-side news (1.35fr/1fr) |
| ≥1620px | Floating social rail promotes from bottom capsule to side rail (gutter exists outside the 1440px container) |

**Section height rule [B]:** every Homepage section is at least `calc(100svh - header)` and grows with content — nothing is clipped, nothing force-scrolls inside a section. This is a **public-layer-only** pattern; ADR-0001 forbids it in the dashboard.

**Cross-cutting [D]:** ≥44px touch targets on small screens · no horizontal scroll at 320px · full RTL parity at every breakpoint · `prefers-reduced-motion` respected at every breakpoint.

---

## 21. Required CMS Content

Content types the Homepage consumes, per Chapter 13 and `01-Information-Architecture.md` §5:

| Content type | Chapter 13 ID | Homepage usage | Status |
|---|---|---|---|
| News Article | `CT-ARTICLE-001` | News section lead + list | **[D]** defined |
| Static Page | `CT-PAGE-001` | Not directly on Homepage, but linked from footer/nav | **[D]** defined |
| Media Asset (Image/Video) | `CT-MEDIA-001` | Hero slides, Media Centre mosaic, athlete/club imagery | **[D]** defined |
| Homepage Section Instance | — | Would make section presence/order CMS-controlled | **[NV]** — proposed in IA doc §5.4/§15.2, **not yet a real content type**; today the section list/order is hard-coded (§15.2 gap #2). Required before CMS handover for this Homepage. |
| Sponsor / Partner | — | Sponsors & Partners strip (tier, logo, order) | **[A]** — entity referenced in IA doc §10.1 as inferred, not formally specified |
| Athlete feature flag | — | Controls which athletes appear in Featured Athletes | **[I]** — implied by CMS-editorial-layer rule (§13 of this doc), not a separately named content type yet |
| Hero Slide | — | 5 hero carousel slides (image/video, headline, CTA target) | **[A]** — no dedicated content type documented; likely a variant of Homepage Section Instance |
| Newsletter subscriber capture | — | Newsletter section form target | **[NV]** — not a CMS content type; this is a data-capture integration, see §22 |

**Editorial workflow [D]:** every editable Homepage content object goes through Author → Review → Publish (author ≠ publisher, PR-010 + Chapter 22) — **no exception for Homepage content**, including hero slides and featured selections.

---

## 22. Required APIs

Domain data the Homepage reads (never authors) — registry/computed data per the Chapter 13 §5.2 boundary:

| Data need | Domain | Notes |
|---|---|---|
| Latest N verified results + rankings (tabbed) | Competitions | **MUST** filter to `verification_status = verified` only — **[D]** PR-010 |
| Upcoming N competitions with start datetime | Competitions/Calendar | Feeds live countdown + `.ics` export — **[D]** §0.5 of IA doc |
| Featured athletes (editorial-flagged subset) with public profile summary | Athletes | Editorial flag from CMS, factual data from registry (§13 boundary) |
| Clubs list filterable by emirate | Clubs | Registry-owned; CMS supplies only description/imagery overlay |
| Federation aggregate statistics (counts, trend) | Registry/Competitions (computed) | "Federation by the Numbers" section — **[NV]** exact metric definitions not documented, see §25 |
| Search index query | Cross-domain (§10 of this doc) | Must respect public search scope exclusions (§8.7 IA doc) |
| Sponsor list with tier + display order | Sponsors | **[A]** entity, see §15/§21 |

**Architectural mandate [D]:** all of the above are served from **one canonical source per fact** (Shared Services, `01-Information-Architecture.md` §1.2) — the Homepage **MUST NOT** re-fetch or recompute a value (e.g., a result) independently from how `TMP-RESULTS-001` computes it. Same number, same source, everywhere.

---

## 23. Dependencies

| Dependency | Type | Status | Blocks |
|---|---|---|---|
| Chapter 17 (Data Privacy & Identity Architecture) | Design System chapter | Now available — **MUST** be read before Featured Athletes (esp. minors §SP.10) goes live | §13 |
| Chapter 19 (Calendar & Localization) | Design System chapter | Now available | §12 (countdown/timezone correctness) |
| Chapter 12 (Dashboard Patterns) | Design System chapter | Not applicable — Homepage is Public layer only | — |
| Homepage Section Instance content type | Product/CMS decision | **Not yet formalized** — hard-coded today | §21, CMS handover |
| Sponsor entity full specification (tier, contract period) | Product/CMS decision | **[A]**, unconfirmed | §15, §21 |
| `01-Information-Architecture.md` §15.1 Services resolution | Product decision | **Open** — see §25 | §8 CTA strategy (indirectly — no service CTA exists on Homepage today, consistent with current Services-absent state) |
| Real sponsor logo assets | Content/asset production | Pending (`sponsors-logo-prompts.md`) | Launch readiness, not this spec |
| Hero imagery at correct source resolution | Content/asset production | Pending (`hero-images-brief.md`), flagged **at risk** against §19 LCP budget | Launch readiness |
| `apps/web` design-tokens integration | Engineering | **Already complete** — tokens, theming, fonts wired per prior work in this project | None — ready to consume |
| Figma Design System (12 sections) | Design | **Already complete** — see prior conversation summary; provides the token/component library this Homepage will be composed from | None — ready to consume |

---

## 24. Success Metrics

Directly inherited, applied to the Homepage:

| Metric | Target | Source |
|---|---|---|
| Lighthouse Performance | ≥90 | **[D]** PR-002 |
| LCP | <2.5s | **[D]** PR-002 |
| CLS | <0.1 | **[D]** PR-002 |
| WCAG 2.2 AA conformance | 100% of Homepage sections | **[D]** Chapter 6 |
| Keyboard coverage | 100% of interactive elements | **[D]** Chapter 6 §6 |
| Zero unintended horizontal scroll at 320px | 0 occurrences | **[D]** PR-006 |
| Every published number carries a documented source | 100% (results, rankings, stats sections) | **[D]** PR-010 |
| Zero "Beta"/"Coming Soon" visible on Homepage | 0 occurrences | **[D]** PR-010 |
| AR/EN parity | 100% of Homepage content has both locales before publish | **[D]** PR-004 + Chapter 9 §CR-1.6 |
| One primary CTA per section | 100% compliance | **[D]** PR-001 |
| Google News eligibility for linked articles | 100% of qualifying articles carry `NewsArticle` schema | **[D]** Chapter 14 |

---

## 25. Open Questions

Carried forward from `01-Information-Architecture.md` where Homepage-relevant, plus new questions surfaced while writing this document. **None of these block reading further Design System chapters; all of them block Figma/UI work starting on the affected section.**

| # | Question | Why it matters | Owner needed |
|---|---|---|---|
| 1 | **Services gap (inherited, §15.1 of IA doc):** no route into any transactional service exists anywhere on the public site, including the Homepage. Does the Homepage need a service entry point, or is it deliberately excluded (IA doc recommends option (c): authenticated "My Athletics" area only, not the Homepage)? | Directly affects Design Goal #2 (full digital transformation) and whether §8 CTA Strategy needs a new entry | Product owner |
| 2 | **Homepage Section Instance content type** does not formally exist yet — section presence/order is hard-coded. Should this document's §21 CMS requirements be scoped into Chapter 13/CMS backlog now, before Figma, or handled post-launch? | Determines whether Homepage Figma work designs a fixed page or a composable one | Product owner + Engineering |
| 3 | **Sponsor entity** (tier, contract period, display order) is an assumption, not a documented content type. Confirm or formalize before designing the Sponsors & Partners section states (e.g., what happens with 3 sponsors vs. 30). | §15, §21 | Product owner |
| 4 | **"Federation by the Numbers" metric definitions** — which counts (athletes registered? clubs affiliated? competitions held? years active?) are undocumented. | §22 API requirement cannot be finalized without this | Product owner |
| 5 | **Minors' data on Featured Athletes** — Chapter 17 §SP.10 governs this, but this document has not cross-validated every field the built Featured Athletes card would need against it. | Legal/compliance risk if unresolved before Figma | Product owner + Chapter 17 owner |
| 6 | **Nav-to-section anchoring** — does clicking "Events" in the header ever scroll to the Homepage's own Results & Rankings/Upcoming Events sections, or does it always route to the dedicated screen? Current build behavior is ambiguous from documentation alone. | §9 Navigation Behavior | Product owner |
| 7 | **Search suggested-queries source** — trending, curated, or both? | §10 Search Behavior | Product owner |
| 8 | **Homepage Organization/SportsOrganization Schema.org** — inferred as required (§18) but has no explicit row in Chapter 14; confirm before SEO implementation. | §18 | Product owner + Chapter 14 owner |
| 9 | **Section reorder authority** — if a future business need requires reordering the 11 sections, is that a Homepage Section Instance CMS change (once #2 is resolved) or does it require a new build? | §5 | Product owner |

**Explicit reminder per governance:** none of the above may be resolved by inventing an answer in Figma. Each requires a product ruling, and where it touches a frozen Design System chapter (e.g., #3, #4 potentially touching Chapter 13), the resolution path is an ADR under Chapter 22, per `01-Information-Architecture.md`'s own governance note (§0.3).

---

## References

**Normative:** Chapter 0-1 (Introduction & Brand Identity), Chapter 2 (Design Principles, PR-001→PR-010), Chapter 5 (Grid/Layout/Motion), Chapter 6 (Accessibility), Chapter 8 (L1/L5/L6/L8 + Governance), Chapter 9 (Content Design), Chapter 11 (UX Patterns), Chapter 13 (CMS System), Chapter 14 (SEO Guidelines), Chapter 17 (Data Privacy & Identity), Chapter 19 (Calendar & Localization), Chapter 20 (Page Templates, `TMP-HOME-001`), Chapter 21 (Technical Architecture), Chapter 22 (Governance)

**Product:** `01-Information-Architecture.md` (`/docs/product`) — §0-§15, primary source for all **[B]** facts in this document

## Related Chapters

Chapter 20 → `TMP-HOME-001` is the binding template identifier for everything in this document. Chapter 22 → owns any change to a frozen chapter surfaced by §25's open questions. `01-Information-Architecture.md` §7/§8 → this document's direct backbone for §5, §6, §9.

---

*End of document — v0.1.0 Draft. This is a product specification only. It does not amend the Design System or the Information Architecture document; every conflict or gap it surfaces is logged in §25 and must be resolved by product ruling or ADR before UI/Figma work on the Homepage begins.*
