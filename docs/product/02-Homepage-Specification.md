# UAEAF Digital Platform — Homepage Specification
### Product Specification · Pre-UI Phase — Single Source of Truth for the Homepage

**Document:** UAEAF Product Specification v0.2.0 (Reconciled with Approved Build)
**Status:** §5/§6/§8/§11a/§14a reconciled against the approved Homepage build per explicit Project Owner ruling (this session) — supersedes the v0.1.0 fixed order and section inventory below. Superseded content is struck through in context rather than deleted, so the reconciliation is auditable.
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

**[Reconciled v0.2.0]** The order below **supersedes** the v0.1.0 order per explicit Project Owner ruling (this session), resolving Open Question §25 Q9 (Section reorder authority) — this *is* the required stakeholder sign-off that question asked for. The v0.1.0 order is preserved in a collapsed note underneath for audit-trail purposes only.

Vertical, single-column scroll — **not** a dashboard grid, per ADR-0001. Hierarchy, top to bottom:

```
Global Header (persistent)                — orientation + routing utility
1.  Hero                                  — impression + primary conversion (Design Structure: 5-slide carousel per Chapter 8 L6 §CMP-CAROUSEL-001, ADR-0032/0036 compliance in progress — see §25 Q10)
2.  Federation by the Numbers             — credibility
3.  Clubs Network                         — national coverage
4.  Featured Athletes                     — humanize the sport
5.  Results & Rankings + Upcoming Events  — core sporting fact + forward engagement (single merged section, tab/split layout)
6.  Live Stream & Videos                  — real-time brand/engagement proof (NEW — Chapter 8 L6 §CMP-LIVESTREAM-001, ADR-0036)
7.  News                                  — communication, SEO/AI surface
8.  UAEAF in the Media (الاتحاد في الإعلام) — independent third-party credibility proof, animated horizontal card carousel (LOCKED, NEW — Chapter 13 §15 ADR-0042, `CT-EXTERNALMEDIA-001`, Chapter 8 L6 §CMP-CAROUSEL-001)
9.  Sponsors & Partners                   — commercial obligation
10. Media Centre                          — emotional/brand proof
11. Memberships / International Affiliations — credibility/affiliation proof (NEW — Chapter 8 L8 §CMP-AFFILIATIONS-001, ADR-0037)
12. Newsletter                            — owned-audience retention
13. Global Footer                         — navigation completion + compliance
Floating social rail (persistent, overlay)
```

**[D]** Source: Project Owner ruling (this session), reconciling `01-Information-Architecture.md` §7 against the approved Figma build. Any *further* reorder beyond this reconciled state again requires stakeholder sign-off per the same rule.

**[Reconciled v0.2.3 — LOCKED, Product Owner decision this session]** Position 8 ("UAEAF in the Media") is a new insertion. Placement and presentation are both **locked, not open for reinterpretation**: it sits immediately after News (topical adjacency — both answer "what's being said about the Federation," one authored, one external) and *before* Sponsors/Media Centre/Memberships (the existing P2/P3 credibility cluster), rather than adjacent to Media Centre specifically, to avoid the two "Media"-named sections sitting next to each other and reading as duplicates of one another. Full presentation contract (animated horizontal carousel, motion/accessibility/RTL governance) is in §11b.

<details>
<summary>v0.1.0 order (superseded, kept for audit trail)</summary>

```
1. Hero carousel · 2. Federation by the Numbers · 3. Featured Athletes · 4. Results & Rankings ·
5. Clubs Network · 6. Upcoming Events · 7. News · 8. Media Centre · 9. Sponsors & Partners ·
10. Newsletter · 11. Global Footer
```

</details>

---

## 6. Section Inventory [Reconciled v0.2.0]

One row per section, in the §5 reconciled order. **Header nav item count/structure is now RESOLVED — see §9 note and `01-Information-Architecture.md` §8.1** — not reconciled row-by-row in this table, which covers Homepage sections, not the Header itself.

| # | Section | Objective | CMS-editable | Reusable component | Evidence |
|---|---|---|---|---|---|
| — | Global Header | Orient + route; logo, nav, search, language, theme | ● menu | ● | **[B]** — nav structure **RESOLVED**, see §9 / IA §8.1 |
| 1 | Hero | First impression; **target state:** 5-slide carousel, auto-advance, pause on hover/focus/touch, next-event card (Chapter 8 L6 §CMP-CAROUSEL-001) — **current build is a single static slide, a known open gap, see §25 Q10** | ● | ● | **[B]** structurally / **[NV]** carousel behavior not yet built |
| 2 | Federation by the Numbers | Scale/credibility; count-on-view + trend | ◐ | ● | **[B]** |
| 3 | Clubs Network | National coverage; filter by emirate | ◐ | ● | **[B]** |
| 4 | Featured Athletes | Humanize the sport; discipline filter | ◐ selection | ● | **[B]** |
| 5 | Results & Rankings + Upcoming Events | Core sporting fact + forward engagement; merged split-column section, tabbed results / countdown events | ○ data-driven | ● | **[B]** — merged from two v0.1.0 sections into one, confirmed as intentional layout |
| 6 | Live Stream & Videos | Real-time brand/engagement proof; live embed + video shelf | ● (shelf) / platform-driven (live signal) | ● **NEW** — Chapter 8 L6 §CMP-LIVESTREAM-001 (ADR-0036) | **[B]**, now formally governed |
| 7 | News | Communication; category filter, lead + list | ● | ● | **[B]** |
| 8 | UAEAF in the Media (الاتحاد في الإعلام) | Independent third-party credibility proof; animated horizontal carousel of 3–4 latest/featured external press items, pauses on hover/focus, links out to the original publisher | ● | ● (reuses `CMP-CARD-001` inside `CMP-CAROUSEL-001`) **NEW** — Chapter 13 §15 ADR-0042, `CT-EXTERNALMEDIA-001` | **[P]** — LOCKED product decision this session (placement + presentation), not yet built in Figma (Figma phase deferred, see §11b) |
| 9 | Sponsors & Partners | Commercial obligation; VIP featured-partner banner + tiered sponsor-card grid (Strategic / Official ×3 / Supporting), partner-stats trio, partnership-program CTA | ● | ● | **[B]** — reconciled this session: the "merged animated strip" description is retired in favor of the approved built pattern (§15) |
| 10 | Media Centre | Emotional proof; dark mosaic, lightbox, reels | ● | ● | **[B]** — reconciled this session: the Figma build had drifted to a light card grid; corrected to match this spec (§16), rather than the spec being loosened to match the drift |
| 11 | Memberships / International Affiliations | Credibility/affiliation proof; international governing-body logos | ● | ● **NEW** — Chapter 8 L8 §CMP-AFFILIATIONS-001 (ADR-0037) | **[B]**, now formally governed |
| 12 | Newsletter | Retention; inline form + success state | ● | ● | **[B]** |
| 13 | Global Footer | Navigation completion + compliance | ● | ● | **[B]** — Header decision now resolved (§9); Quick Links content **MUST** be updated to match the new 9-item Header 1:1 — **not yet done**, still shows the old 7-item list. "UAEAF in the Media" is now placed under the Header's "الأخبار والمقالات" dropdown (IA §8.1) — Footer's Quick Links update should include it too, for consistency |
| — | Floating social rail | Owned-audience growth; 4 channels + back-to-top | ● | ● | **[B]** |

**Deliberately excluded [D]:** Services/Quick Actions block and E-Services footer column — both removed by explicit prior instruction; see §25 for the unresolved product gap this creates.

**Sponsors note:** Sponsor content/legitimacy is treated as verified and approved as of this session — not an open item, not re-litigated by future audits of this document unless the Project Owner explicitly reopens it.

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
| UAEAF in the Media | "View all coverage" / "عرض كل التغطية الإعلامية" → `/media-coverage` (§11b) | Per-item "Read the full article" / "قراءة المقال الكامل" — external, opens the original publisher, distinct from the section-level archive CTA | Chapter 9 §CR-4.1 (section CTA) + §CR-4.2 (per-item link text describes the destination, never "Click here") |
| Clubs Network | "View all clubs" → `TMP-CLUBLIST-001` | — | — |
| Featured Athletes | "View all athletes" → `TMP-ATHLETELIST-001` | — | — |
| Media Centre | Implicit — lightbox open is the interaction, no navigational CTA required | — | — |
| Newsletter | "Subscribe" (inline form submit) | — | Chapter 9 §CR-4.1 + §CR-3.1 (validation copy) |
| Sponsors | "تفاصيل برنامج الشراكة" (Partnership Program Details) — closing "Partner CTA" block, not per-logo | — | Reconciled this session: the section is not lead-generation-driven overall (§15), but does carry one section-level partnership-program CTA, distinct from individual sponsor logos, which remain non-interactive brand marks |

**MUST NOT [D]:** a red (`color.core.red`) CTA on the Homepage — Chapter 1 ADR-0004 reserves red exclusively for danger/delete/cancel; every Homepage CTA is green (primary) or black/neutral (secondary).

---

## 9. Navigation Behavior

> **[RESOLVED — Product Owner ruling, resolves Master Spec §52 OPEN-004]** The Header architecture is now closed. Nine top-level items, four carrying a dropdown (two using a single-column flyout/submenu pattern, two flat two-item lists — see `01-Information-Architecture.md` §8.1 for the full structure and per-item content). The Header/Footer label mismatch is resolved as part of the same ruling: Footer Quick Links must be updated to the new 9-item structure (see below), not the old 7-item one.

Fully inherited from `01-Information-Architecture.md` §8.1 (now resolved), restated here as it applies to the Homepage specifically **[B]**:

- **Main nav:** 9 top-level items — الرئيسية، عن الاتحاد▾، الأندية، الأعضاء▾، البطولات، الفاعليات، الأخبار والمقالات▾، المركز الإعلامي▾، تواصل معنا. Four carry dropdowns (see `01-Information-Architecture.md` §8.1 for exact per-item content and interaction pattern). Active item shows a brand-colored underline indicator.
- **Below 1024px:** the bar collapses into a drawer carrying the identical tree — **MUST NOT** diverge in content from the desktop nav (single source, per §8.1).
- **Persistent utilities beside nav (not nav items):** Search overlay, Language (AR↔EN), Appearance (light/dark/high-contrast).
- **Footer nav:** mirrors the 9 main-nav items as "Quick Links" — single source, two surfaces; plus Federation Location, Contact, Newsletter, Affiliations strip, Legal strip (Accessibility, Sitemap, language switch, copyright). **The Footer's current Quick Links list (7 items, still referencing the old structure) needs updating to match** — not yet done as of this ruling.
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

## 11a. Live Stream Strategy [NEW — Reconciled v0.2.0]

**Governing component [D]:** `CMP-LIVESTREAM-001`, Chapter 8 L6, added by ADR-0036.

- **Purpose/objective:** real-time brand and engagement proof — see Chapter 8 L6 §CMP-LIVESTREAM-001 for the full purpose/objective/state/CMS/accessibility contract; this section does not repeat it, per this document's own citation convention.
- **Placement [B]:** position 6 in the §5 reconciled order, between Results & Rankings/Upcoming Events and News.
- **Priority [D]:** P2 baseline, temporarily functional-P1 only while a broadcast is actually live (§7 ladder, Chapter 8 L6 rule).
- **Visibility [D]:** section **MUST** hide entirely if zero videos are published; primary slot **MUST NOT** show a false "Live" state when offline (Chapter 8 L6, non-negotiable per Design Goal #1 credibility).
- **CMS gap flagged for Chapter 13 backlog:** live-channel reference field, consistent with the External Media Channel Reference gap already noted in `01-Information-Architecture.md` §0.5.

## 14a. Memberships / International Affiliations Strategy [NEW — Reconciled v0.2.0]

**Governing component [D]:** `CMP-AFFILIATIONS-001`, Chapter 8 L8, added by ADR-0037.

- **Purpose/objective:** credibility/affiliation proof, structurally distinct from Sponsors (commercial) — see Chapter 8 L8 §CMP-AFFILIATIONS-001 for the full contract.
- **Placement [B]:** position 11 in the §5 reconciled order (renumbered this session by the insertion of "UAEAF in the Media" at position 8 — the Memberships section itself did not move relative to its neighbors), between Media Centre and Newsletter.
- **Priority [D]:** P2 (§7 ladder), same tier as Federation by the Numbers/Featured Athletes/Media Centre.
- **CMS gap flagged for Chapter 13 backlog:** `CT-AFFILIATION-001` content type does not yet formally exist (Chapter 8 L8 ADR-0037 §CMS Relationship) — same category of gap as the existing "Homepage Section Instance" and "Sponsor entity" items already tracked in §21/§25.
- **Explicit boundary [D]:** **MUST NOT** be visually or structurally merged with Sponsors & Partners — the two answer different credibility questions (see Chapter 8 L8 ADR-0037 Decision rationale).

## 11b. UAEAF in the Media Strategy [LOCKED — Product Owner decision, this session]

**Governing content type [D]:** `CT-EXTERNALMEDIA-001`, Chapter 13 §15 ADR-0042. **Locked product/UX naming (Product Owner decision):** English **"UAEAF in the Media"**, Arabic **"الاتحاد في الإعلام"**. "External Media Coverage" is the governance/technical description only and **MUST NOT** appear as user-facing copy.

- **Purpose/objective:** independent third-party credibility proof — evidence that outlets UAEAF does not control choose to cover it. Structurally and conceptually distinct from both neighbors it sits between: it is not UAEAF-authored (unlike News, `CT-ARTICLE-001`) and it is not a UAEAF-owned media asset (unlike Media Centre, `CMP-GALLERY-001`). See ADR-0042 for the full ownership/attribution boundary — not repeated here.
- **Placement [LOCKED — Product Owner decision, not open for reinterpretation]:** position 8 in the §5 reconciled order, **immediately after News and before Sponsors & Partners**, as a standalone Homepage content block — not inside News, not inside Media Centre, not in the Footer, not a sidebar, not an inline module inside individual News articles (see the explicit boundary below). Rationale: the user journey is "official UAEAF reporting → what external media is saying about UAEAF," and the two sections are kept non-adjacent to Media Centre specifically to avoid the two "Media"-named sections reading as duplicates of each other.
- **Priority [D]:** P2 (§7 ladder) — same tier as Media Centre/Memberships/Featured Athletes: credibility/engagement proof, not task-critical, must not visually compete with P0/P1 content (PR-001).
- **Presentation [LOCKED — Product Owner decision]:** an animated horizontal card carousel, not a static grid. Reuses **`CMP-CAROUSEL-001`** (Chapter 8 L6) unchanged — no new motion component or pattern is created. The built Homepage already has a precedent for this exact interaction shape: the Clubs Network section's horizontally-arranged card row with edge fades (Figma layer `Club Marquee`, node `151:25`) — this section follows the same institutional, non-decorative feel, not an advertising-banner marquee. Full motion contract below.
- **Homepage content (preview only, not the archive) [D]:** 3–4 items maximum, latest-first unless a `featured` flag promotes an item ahead of strict recency (mirrors the existing Featured Athletes editorial-selection pattern, §13). Each card shows: publication identity (logo + name), UAEAF-authored title/framing (not the source's own headline verbatim), publication date, optional short UAEAF-authored excerpt, article image only when rights-cleared (falls back to the publication logo otherwise, never a scraped image without clearance — ADR-0042), and a "Read the full article" / "قراءة المقال الكامل" external CTA. **Every card MUST visibly communicate that the source is external** (the external-link icon required below, plus the publication identity itself) — a card **MUST NOT** be styleable in a way that could read as UAEAF-authored content.
- **Component [D]:** `CMP-CARD-001` (Chapter 8 L5) for card anatomy (Image/Icon + Title + Short Description + Metadata + Optional Action, per ADR-0042's component-reuse finding) composed inside `CMP-CAROUSEL-001` (Chapter 8 L6) for the horizontal motion behavior. **No new component is introduced for either the card or the motion.** Publication logos use `object-fit: contain` per Chapter 8 L6 §M.9, same rule already governing Sponsor and Membership logos.
- **Motion governance [D — reuses `CMP-CAROUSEL-001` and Chapter 5 §5.8 unchanged, no new rule]:** continuous horizontal movement **MUST** pause on hover, on keyboard focus, and on touch (`CMP-CAROUSEL-001`'s existing contract) · **MUST** provide manual navigation controls, not rely on drag/swipe alone (`CMP-CAROUSEL-001`) · **MUST NOT** continuously rotate without an available pause/stop control (`CMP-CAROUSEL-001`, WCAG 2.2.2) · **MUST** fully honor `prefers-reduced-motion` (Chapter 5 §5.8's global `@media (prefers-reduced-motion: reduce)` contract — animation/transition duration collapses to near-zero) — with motion disabled, the cards **MUST** remain available as a static, horizontally-scrollable list, never hidden or inaccessible · speed and easing **MUST** read as controlled/editorial, consistent with `CMP-CAROUSEL-001`'s existing anti-pattern list (Chapter 5 §Motion Anti-Patterns) rather than a fast advertising-style marquee.
- **Accessibility / keyboard / RTL [D — Chapter 8 Global Governance §G.12, applies without local exception]:** full keyboard navigation, an accessible name on every card and control, a visible focus indicator at all times, and full RTL support are **already mandatory for every interactive component** per §G.12 — not a new rule for this section. Concretely: reading order and keyboard tab order **MUST** follow the active direction (right-to-left in Arabic, left-to-right in English) per Chapter 6 §6.3 Tab Order — the carousel **MUST NOT** be visually mirrored without the interaction/keyboard order being validated to match; a card **MUST NOT** become unreachable by keyboard merely because it is mid-motion.
- **External-link behavior [D]:** every per-item CTA **MUST** follow Chapter 8 L3's existing External Link rule unchanged — visual distinction (icon) + `target="_blank"` + `rel="noopener noreferrer"` — and every link's accessible text **MUST** describe the destination per Chapter 9 §CR-4.2 (never "Click here"). This is the first Homepage section (besides Live Stream's "Watch on YouTube") where the *majority* of interactions leave the site — the external-link icon **MUST** be present on every card, not just the section-level CTA.
- **Section-level CTA:** "View all coverage" / "عرض كل التغطية الإعلامية" → `/media-coverage` (§8). Binds to the **`color/brand/primary`** semantic token — the same token already used by the Clubs and (corrected) News "View All" links — **never** a raw primitive color. This is the section's one primary CTA (PR-001); per-card "Read the full article" links are content-level, not competing section CTAs — same pattern already established for News (§8).
- **Relationship to News [LOCKED]:** News is UAEAF's own reporting; this section is what others report. They remain **separate content types** (`CT-ARTICLE-001` vs. `CT-EXTERNALMEDIA-001`) and **MUST** remain visually distinct sections (separate headers, separate section chrome) — never merged or nested — even though they are placed adjacently by design, per the same boundary logic ADR-0037 already established between Sponsors and Memberships.
- **Relationship to Media Centre [LOCKED]:** Media Centre is UAEAF-owned photography/video (`CMP-GALLERY-001`); this section links to text coverage UAEAF does not own. The two **MUST NOT** be merged. Deliberately not placed adjacently (see Placement above).
- **Boundary — Article Detail pages [explicit, this session]:** this decision covers the Homepage section only. A corresponding module inside individual News/Article Detail pages is **explicitly out of scope** and **MUST NOT** be added automatically as an extension of this decision — it would require its own separate product approval.
- **Archive destination [D]:** dedicated route `/media-coverage`, a genuine curated collection page (not a duplicate of any individual external article) — full behavior, indexability, and bilingual routing documented in `01-Information-Architecture.md` §15.1a. No individual UAEAF detail page is created per external article (ADR-0042, §9/§18 below).
- **Navigation [explicitly deferred, unchanged]:** **no Header item and no Footer Quick Link are added for this section.** Both remain coupled to the still-open Header architecture decision (§9 of this document) — this was not reopened or decided by this session's Homepage-placement/presentation ruling. The Homepage section's own "View all coverage" CTA is, for now, the only approved entry point into `/media-coverage`.
- **Localization [D]:** Chapter 13 §9 applies unmodified — the UAEAF-authored title/excerpt fields **MUST** exist independently authored in Arabic and English regardless of the external article's own language (ADR-0042 §6). The outbound link itself is never translated or proxied; it goes to whatever language the source actually published in.
- **Image rights [D]:** an article image is used only when usage rights are confirmed; otherwise the publication's logo is shown instead. Fabricating or scraping an image without rights clearance is explicitly prohibited (ADR-0042).
- **CMS visibility [D]:** Homepage query concept — `status = Published AND homepage_visible = true`, ordered latest-first with `featured` able to override strict recency, capped at 3–4 items (engineering contract only, no implementation performed here). Only `Published` entries are ever exposed — drafts/unapproved content **MUST NOT** reach the Homepage or archive, per Chapter 13 §6 unchanged.
- **Design System gap check [this session]:** the Design System was checked for an existing governed "moving card" pattern before writing any of the above — `CMP-CAROUSEL-001` (Chapter 8 L6) and Chapter 5 §5.7–§5.8 (Motion Choreography / Reduced Motion) already fully cover it. **No Design System gap exists; no new ADR is required beyond ADR-0042.**
- **Responsive intent [NV]:** not verified against a mobile/tablet frame in this pass (none exists yet for this section, consistent with the platform-wide gap already noted for every other Homepage section). Treat as **RESPONSIVE DESIGN NOT VERIFIABLE** until a mobile/tablet frame is produced.

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

**[Reconciled v0.2.1 — this session, Project Owner ruling]** The section below replaces the retired "one merged animated strip" description with the approved built pattern. This is a **documentation correction, not a design change** — the current Figma implementation is the approved source of truth (§0 evidence convention **[B]**); nothing in Figma was modified to produce this reconciliation.

> **[Amended v0.2.2 — Project Owner ruling, resolving a client-requested conflict]** The Homepage Sponsors Grid described in this entire section is **retained unchanged** — nothing below is reversed or reopened. A **separate, new, sitewide persistent component**, `CMP-GLOBALSPONSORSTRIP-001` (compact, continuously moving, logo + concise sponsor text, across public website pages), has been approved as a secondary, non-replacing addition — governed by **Chapter 8 L8 ADR-0043**, not by this section. Several implementation questions (exact placement, whether it also appears on this Homepage alongside the Grid, the exact sponsor-text field) remain **DESIGN DECISION REQUIRED** per ADR-0043 and are not resolved here. See `docs/product/05-Client-Requirements-Register-2026-08.md` item 7 for the originating conflict.

- **Section structure [B]:** three parts, top to bottom —
  1. **Partner Stats** — a 3-metric trio (sponsored championships per year, years of longest partnership, count of official sponsors/partners), same visual language as "Federation by the Numbers" (§2 of this doc).
  2. **Featured VIP partner banner** (Figma layer: `strategic-sponsor-card`) — one elevated, visually distinct card for the top-tier strategic sponsor, carrying a "VIP Strategic Partner" badge, sponsor name/tagline, and the federation's own reciprocal "Official Strategic Sponsor" line.
  3. **Sponsor Card grid** (Figma layer group: `Sponsor Strip` → `Sponsor Cards`) — five individually tier-labeled cards (`Tier Badge` sublayer), not a continuous strip: **الشريك الاستراتيجي** (Strategic Partner), **راعٍ رسمي** (Official Partner) ×3, **شريك مساند** (Supporting Partner). Each card shows logo, organization name, and one-line category (e.g., "جهة حكومية", "خدمات مالية").
  4. **Partner CTA block** — closing section-level CTA, "تفاصيل برنامج الشراكة" (Partnership Program Details), with supporting copy on what the partnership program offers. This is new relative to the prior spec text — see §8 CTA Strategy (updated this session).
- **Tier hierarchy [B]:** tiers are visually and semantically distinguished (VIP feature treatment for Strategic, per-card badges for all others) — this is an intentional departure from the earlier "tier-blind, merged" model. Sponsor equality-across-tiers is **not** a requirement of the approved design.
- **Motion [B]:** static grid; no continuous auto-advancing motion in this section. The earlier "pauses on hover/focus" language described an animated-strip pattern that is not what was built — standard static hover/focus affordances apply (consistent with the general Homepage interaction baseline), not a dedicated pause-control contract.
- **Entity model [D]:** Sponsor/Partner references Tier, Organization name/category, Homepage placement, Contract period. **Citation correction:** the prior text cited "Chapter 10 §10.1" for this — verified against the current Chapter 10 (`10-Sports-Specific-Scenarios.md`), and §10.1 is actually "Discipline Groups & Result Format Mapping," unrelated to sponsors. No Design System chapter currently defines a formal Sponsor entity; per `01-Information-Architecture.md` §5.4/§21, this remains **[A]** — an inferred, not formally specified, content type. Flagged for the Design System owner, not resolved here.
- **Business purpose [D]:** revenue/contractual obligation (`01-Information-Architecture.md` §7 row 9).
- **CTA governance [D]:** the section-level Partnership CTA (§8) does not conflict with PR-001's one-primary-CTA-per-section rule — it is the section's single primary action; individual sponsor logos remain non-interactive brand marks, not CTAs.
- **Logo governance [D]:** sponsor logos **MUST** follow the same `object-fit: contain` / no-cropping-or-recoloring-of-third-party-marks rule already documented for Memberships (Chapter 8 L8 §M.9) — the same third-party-trademark risk applies identically here.
- **Accessibility [D]:** inherits the Homepage's general accessibility baseline (§17 of this doc) — each sponsor/partner logo **MUST** carry descriptive `alt` text (organization name), matching the equivalent rule already governing Chapter 8 L8 Memberships logos.
- **Responsive behavior [NV]:** only the desktop (≥1024px) composition was inspected this session (5-card grid + featured banner). Tablet/mobile stacking was not verified in this pass — do not assume a specific breakpoint behavior; treat as **RESPONSIVE DESIGN NOT VERIFIABLE** for this section until a mobile/tablet frame is inspected.
- **CMS/content relationship [I]:** consistent with Chapter 13 §5.2's CMS-vs-registry boundary applied by analogy — the CMS layer would own logo asset, tier label, display order, and category line; contractual terms (tier assignment, contract period) are a business/commercial decision, not a design-system concern, and this document does not invent one.
- **Known build gap [D]:** IA doc §15.2 records sponsor logos as currently placeholders — real assets pending (`sponsors-logo-prompts.md`), tracked as a pre-launch requirement, not a spec question.

---

## 16. Media Strategy

- **Section [B]:** Media Centre — full-screen dark mosaic, lightbox, external channel embeds (reels), 4-column auto-rows ≥1024px.
- **Reconciled this session [B]:** a prior audit found the built Figma section had drifted to a light-background standard card grid, contradicting this spec. Per Project Owner ruling, the **spec was kept as the source of truth** and the Figma build was corrected to match it, not the reverse (contrast with §15 Sponsors, where the opposite ruling applied). Rebuilt on the existing `Media Gallery Section` frame (renamed `Media Centre`) without changing its page position or outer footprint, so no other Homepage section shifted:
  - Background rebound from `color/surface/base` to `color/gray/950` (existing dark primitive, same value the Homepage's other local dark treatments — the Hero next-event bar, the Live Stream player — already rely on) — full-bleed, not a page-wide theme switch.
  - The 4 existing photo cards (real production photography, unchanged) recolored: card surface → `color/gray/900`, caption/title → `color/text/inverse` (Semantic/Light — the same token already proven on the Hero's dark bar), "View Photos" per-card link → `color/green/300` (Chapter 7 §7.9.2 ADR-0039's documented dark-surface-safe variant of brand-primary, not the light-mode `green/500`).
  - Contrast verified by computed WCAG relative luminance, not visual estimate: `text/inverse` and `green/300` both exceed 14:1 against the new background (floor 4.5:1 for body text); the reel/video shelf's play-control fill (`green/500`, left as-is — a functional icon, not text) measures ~3.9:1 (floor 3:1 per WCAG 1.4.11 non-text contrast).
  - The lightbox entry point is the existing per-card "عرض الصور" (View Photos) text link, kept rather than replaced with an icon-only affordance — a labeled link is the safer accessible pattern (avoids the "icon-only button without a label" anti-pattern) and satisfies `CMP-LIGHTBOX-001`'s trigger requirement (Chapter 8 L6) without inventing a new interaction.
  - The reel/video-shelf row (existing highlight-reel play button + caption) was restyled for the dark surface in place; its footprint was not changed.
  - **Not addressed by this Figma pass (implementation/code-level, not static-design concerns):** the runtime lightbox dialog itself (focus trap, Esc-to-close, Left/Right keyboard nav per `CMP-LIGHTBOX-001`), `prefers-reduced-motion` handling, and lazy-loading below the fold. These are already fully specified by Chapter 8 L6 §M.1–M.11 / CMP-GALLERY-001 / CMP-LIGHTBOX-001 and are front-end implementation work, not something a static Figma frame can demonstrate or that this session fabricated.
  - **Not verified in this pass:** tablet/mobile stacking behavior for the 4-column grid — only the desktop (≥1024px) frame was touched. Treat as **RESPONSIVE DESIGN NOT VERIFIABLE** until a mobile/tablet frame exists.
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
- **UAEAF in the Media / `/media-coverage` [D — resolved this session]:** the archive at `/media-coverage` is **recommended indexable**. Reasoning: per ADR-0025, dedicated indexable pages are reserved for Chapter 8 L8 entities, and an external coverage item is not one — but the *archive itself* is a genuine UAEAF-owned curated collection (UAEAF-authored framing per item, source attribution, publication metadata), not a thin reproduction of any single external article, satisfying Chapter 14 §11's Minimum Content Threshold test (meaningful text + image + functional link per entry) by direct analogy to how `TMP-NEWSLIST-001` is indexable despite listing individual articles. **No individual UAEAF detail page is created per external article** (ADR-0042) — there is nothing thin to index at the item level, and no canonical URL on the UAEAF site ever claims ownership of, or points to itself as canonical for, the external publisher's own article. hreflang applies to the archive page itself (AR/EN) per the standard rule above, not to the external articles it links to.

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
| Live Channel Reference | — | Live Stream section primary embed (§11a) | **[NV]** — Chapter 8 L6 ADR-0036 backlog item, not yet a formal Chapter 13 content type |
| Affiliation | `CT-AFFILIATION-001` (proposed) | Memberships section (§14a) | **[NV]** — Chapter 8 L8 ADR-0037 backlog item, not yet a formal Chapter 13 content type |
| External Media Coverage | `CT-EXTERNALMEDIA-001` | UAEAF in the Media section (§11b) | **[D]** defined — Chapter 13 §15 ADR-0042, resolved and formally governed this session |

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
| Latest/featured external media coverage, capped at 3–4 | External Media Coverage (`CT-EXTERNALMEDIA-001`) | Query concept: `status = Published AND homepage_visible = true`, ordered latest-first, `featured` may override recency — **[D]** §11b, ADR-0042. Archive (`/media-coverage`) uses the broader `status = Published` query, paginated per existing frontend listing conventions |

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
| Hero imagery at correct source resolution | Content/asset production | Pending (`hero-images-brief.md`), flagged **at risk** against §19 LCP budget. **Verified this session via direct Figma node inspection, per-slide:** Slide 1 of 5 (active) uses real photography but is layer-named "legacy composite, needs re-shoot w/o baked text" — usable but not final. Slides 2–5 are each explicitly named "Media: PLACEHOLDER (no approved photography yet)" and are hidden. This is a photography production gap, not a component/structure defect — the `CMP-CAROUSEL-001` architecture itself (5 real slide frames, working pagination, next-event card) is already correctly built and was **not modified**. | Launch readiness |
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
| 9 | **Section reorder authority** — if a future business need requires reordering the 12 sections, is that a Homepage Section Instance CMS change (once #2 is resolved) or does it require a new build? | §5 | Product owner — **partially resolved:** this session's reorder ruling (§5) demonstrates the Project Owner is the deciding authority per Chapter 22 §2; the CMS-vs-build mechanism question remains open |
| 10 | **Hero carousel implementation gap — corrected finding.** §5/§6 require a 5-slide carousel (Chapter 8 L6 §CMP-CAROUSEL-001). Direct Figma node inspection this session (superseding the earlier "single static image" description, which was based on a screenshot's pagination-dot count rather than the slide nodes themselves) confirms the **carousel architecture is already correctly built**: 5 real slide frames exist with working pagination/arrows/next-event card. The actual gap is narrower than previously stated — it is a **content/photography production gap**, not a structural one: Slide 1 has real (pre-final) photography, Slides 2–5 are explicit, hidden placeholders awaiting approved photography (`hero-images-brief.md`, §23). No Figma change was made or is needed for the architecture itself. | §5, §6, §23 | Content/asset production only — commission and approve photography for Slides 2–5 and a clean re-shoot for Slide 1; no design/Figma work required |
| 11 | ~~**Header architecture** — 7-item/2-dropdown (documented) vs. 9-item/4-dropdown (built)~~ — **RESOLVED, Product Owner ruling**: 9-item header, 4 dropdowns (2 flyout, 2 flat), full content in `01-Information-Architecture.md` §8.1. Footer Quick Links still needs updating to match (tracked as a new, separate to-do, not an open decision). | §9 | Closed |
| 12 | **`CT-AFFILIATION-001` and Live Channel Reference content types** — both newly identified in §11a/§14a, not yet formalized in Chapter 13. | §21 | Product owner + Chapter 13 owner |

**Explicit reminder per governance:** none of the above may be resolved by inventing an answer in Figma. Each requires a product ruling, and where it touches a frozen Design System chapter (e.g., #3, #4, #12 potentially touching Chapter 13), the resolution path is an ADR under Chapter 22, per `01-Information-Architecture.md`'s own governance note (§0.3).

---

## References

**Normative:** Chapter 0-1 (Introduction & Brand Identity, incl. ADR-0038 Federation Red Extended Roles), Chapter 2 (Design Principles, PR-001→PR-010), Chapter 3 (Design Tokens, incl. §3.33 ADR-0039 Color Expansion), Chapter 5 (Grid/Layout/Motion), Chapter 6 (Accessibility), Chapter 7 (Semantic Tokens, incl. §7.9), Chapter 8 (L1/L5/L6/L8 + Governance, incl. ADR-0036 Live Stream, ADR-0037 Memberships, G.13 Entity Colors), Chapter 9 (Content Design), Chapter 11 (UX Patterns), Chapter 13 (CMS System), Chapter 14 (SEO Guidelines), Chapter 17 (Data Privacy & Identity), Chapter 19 (Calendar & Localization), Chapter 20 (Page Templates, `TMP-HOME-001`), Chapter 21 (Technical Architecture), Chapter 22 (Governance)

**Product:** `01-Information-Architecture.md` (`/docs/product`) — §0-§15, primary source for all **[B]** facts in this document

## Related Chapters

Chapter 20 → `TMP-HOME-001` is the binding template identifier for everything in this document. Chapter 22 → owns any change to a frozen chapter surfaced by §25's open questions. `01-Information-Architecture.md` §7/§8 → this document's direct backbone for §5, §6, §9.

---

*End of document — v0.2.0, Reconciled with Approved Build. This is a product specification; §5/§6/§8/§9/§11a/§14a/§21/§25 were updated this session by explicit Project Owner ruling, with corresponding Design System ADRs (Chapter 1 ADR-0038, Chapter 3/7 ADR-0039, Chapter 8 ADR-0036/ADR-0037, Chapter 8 Global Governance G.13) added to keep the Design System and this document in sync, per Chapter 22's change process. Remaining open items (Hero carousel implementation, Header architecture, new CMS content types) are logged in §25 and still require resolution before those specific gaps can be closed.*
