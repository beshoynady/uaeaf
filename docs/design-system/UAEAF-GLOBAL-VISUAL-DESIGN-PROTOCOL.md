# UAEAF — Global Visual Design Protocol

**Version:** 1.0
**Status:** ACTIVE / GOVERNANCE
**Scope:** GLOBAL — applies to every future UAEAF page, section, component, visual asset, background, animation specification, and Figma design task.
**Adopted:** 2026-08-04, from Product Owner instruction. Restructured into this 22-section canonical form in the same session, consolidating an earlier draft of this same file plus the color-hierarchy discussion that produced ADR-0050.

> This document is the detailed visual-governance source of truth referenced by root `CLAUDE.md` §22. It supplements — and never overrides — `CLAUDE.md`'s source-of-truth hierarchy (§1), the Design System chapters, and existing ADRs. Its navigational index, mapping each section below to the one existing chapter/ADR already authoritative for that topic, lives at `docs/design-system/UAEAF-VISUAL-GOVERNANCE-INDEX.md`.

---

## 1. Purpose

Establish a persistent source of truth for UAEAF visual design philosophy, consulted automatically before every future design task, so that pages stop reverting to a generic repetitive layout (Hero → Description → Cards → Divider → Cards → CTA, repeated identically on every page). Every page must instead have an intentional visual personality appropriate to its purpose while remaining unmistakably UAEAF.

## 2. Scope

Applies to all UAEAF pages, sections, components, Figma work, visual assets, backgrounds, graphics, motion specifications, and future design iterations — both Arabic/RTL and English/LTR. Does not cover backend/API/data-model decisions (governed by `docs/product/` and the relevant Design System chapters instead).

## 3. Creative Direction

Act as: Creative Director · UX/UI Architect · Design System Guardian · Figma Specialist · Visual Composition Director · Art Direction Assistant · Graphic/Background Direction Assistant · Interaction & Motion Designer · Accessibility Reviewer · Visual QA Auditor.

The design language should read as: Premium · Modern · Athletic · Institutional · Editorial · Confident · Clean · Cinematic when appropriate · Quiet when appropriate · Functional when appropriate.

Page personality must be determined by: page purpose · content type · user intent · information density · importance of the content · emotional role of the page · UAEAF brand identity · existing Design System governance — never by generic template habit.

## 4. Page Personality System

Every page must be classified before design begins. UAEAF pages MUST NOT all share the same visual composition.

| Personality | Applies to | Treatment |
| --- | --- | --- |
| **Cinematic** | Homepage / major storytelling | Imagery may dominate, cinematic composition, controlled overlays, visual depth, subtle motion |
| **Editorial** | News / articles / media | Typography-led and photography-led, editorial hierarchy, magazine-like, asymmetric layouts allowed |
| **Service / Trust** | Contact / forms / services | Neutral dominant, high readability, green primarily for CTA, red only for errors/warnings |
| **Institutional** | About / governance / board / committees | Authoritative, restrained, structured, strong hierarchy |
| **Sport / Performance** | Athletes / clubs / championships | Dynamic, energetic, performance-oriented imagery, directional movement, controlled interaction |

Page personality must influence: hero · background · photography · layout · typography hierarchy · section rhythm · motion density · interaction density · color emphasis · decorative graphics.

Full per-page assignment table (Board, Committees, Clubs, News, Contact, Homepage, etc.): see `03-Design-Tokens.md` §3.34.2 (ADR-0050).

## 5. Color Governance

UAEAF uses a restrained three-color brand identity: **Green `#00843D`**, **Red `#C8102E`**, and a **White/neutral system** used as the dominant visual foundation.

**Global visual ratio guideline:** 70–80% Neutral/White/Grayscale · 15–20% Green · ≤5% Red. This is a visual-governance guideline for the overall page/site impression — not a requirement that every individual component mechanically hit these exact percentages.

- **Green** represents: primary brand identity · primary CTA · active state · links · selected state · positive emphasis · navigation indicators · trust/institutional emphasis.
- **Red** represents: error · warning · critical information · controlled accent · important attention state. Red MUST NOT become a dominant decorative background without a specifically justified art-direction reason.
- **Neutrals** represent: main backgrounds · reading surfaces · content areas · cards · structural separation · institutional calm.

This is formally codified as **ADR-0050** (`03-Design-Tokens.md` §3.34) — that ADR is the binding token-level implementation of this section.

> **Two corrections, 2026-09-24 (ADR-0098 A23).**
>
> **1. The numeric ratio above was superseded sixteen days ago and this file was never updated.** ADR-0051 (`03-Design-Tokens.md` §3.35.1) replaced the 70–80 / 15–20 / ≤5 target with a qualitative hierarchy — *neutral is the dominant foundation, brand is subordinate but significant, semantic is conditional only, and no percentage is treated as a budget* — and ADR-0059 D1 retired it again at region scale in favour of the guide's own logic: **colour marks what a region is.** Read the ratio above as historical context, not as a live rule. What is live: §3.34.2 (per-page colour personality), §3.34.3 (the binding qualitative rule), ADR-0060 D1 (register per page), and ADR-0065 D2 (role per element).
>
> **2. Red as a full-bleed ground is no longer exceptional, within limits.** *"Red MUST NOT become a dominant decorative background without a specifically justified art-direction reason"* stands as written — and ADR-0059 D2 supplies the justification once, structurally, on the guide's own evidence (§6.1 shows the logo on white, red, green and black grounds as four official options). The limits are: the red register is assigned per page by ADR-0060 D1, not chosen per section; at most one full red section per three to four sections on a page; and a red section may never abut a green one without `color.section.adjacent-separator` (they measure 1.15:1 from each other).
>
> **3. A third category of colour now exists.** Beside role colour (ADR-0065 R1) and categorical colour (D3), **identity colour** (ADR-0098 D1 R3) is colour that encodes nothing and states only that the surface belongs to this federation. It is admissible only as a bounded edge, rule, ring or full surface; never where an encoding colour is expected; and never as a single green or red mark standing alone.

## 6. Visual Composition Philosophy

Consistency MUST come from: typography · color · spacing · grid · components · tokens · interaction principles · photography direction · brand behavior — **not** from forcing every page into the same layout template.

Before using a standard card grid, ask: *"Is a card grid genuinely the best representation of this content?"*

Alternative patterns to consider when justified: editorial blocks · split compositions · feature panels · timelines · asymmetric layouts · statistics compositions · large typography · image-led sections · full-bleed photography · layered sections · floating panels · horizontal rails · marquees · visual indexes · quotes · interactive filters · sticky content · data visualizations.

Use these only when they serve the content. Avoid decoration without purpose.

## 7. Photography & Image Direction

Imagery is part of the composition, not content filling. Photography may: extend beyond containers · be cropped intentionally · overlap sections · sit behind typography · use controlled gradients · create depth · reserve negative space · direct visual movement · interact with layout boundaries.

Intentional image cropping (including cropping part of an athlete out of frame) is allowed when it improves composition. Never crop logos or institutional marks arbitrarily.

Detailed photography direction (lens/light/crop/grade per content type) exists in `27-Brand-Visual-Language.md` §4–19 — that chapter remains **Draft/unapproved**; treat it as calibration reference, not a binding rule, until formally accepted.

## 8. RTL / LTR Rules

**Production:** same route; direction switches via `dir="rtl"` (Arabic) or `dir="ltr"` (English) at the root. The user stays on the same route when changing language.

**Figma:** use separate twin frames — e.g. `Homepage — AR / RTL` and `Homepage — EN / LTR` — placed together in the same Figma page/section for comparison. Do NOT place both languages inside one Figma frame.

RTL/LTR adaptation must consider: text alignment · navigation order · logo placement · utilities · icons · dropdown direction · submenu direction · carousel direction · content order · image composition · hero text position · visual reading direction.

## 9. Logo Protection & Mirroring Rules

Directional photography may be horizontally mirrored when necessary to preserve visual storytelling continuity (visual movement → text, in either reading direction).

**NEVER mirror:** UAEAF logo · UAE identity marks · club logos · sponsor logos · federation marks · organization logos · any identity-sensitive artwork. The photograph may mirror. Logos MUST NOT, ever, without exception.

## 10. Figma as Visual Source of Truth

Figma is the visual source of truth for the actual design. Documentation is the governance source of truth. Code is the implementation source of truth. Never assume one automatically overrides the others.

Before changing a design: (1) inspect current Figma state, (2) inspect the relevant Design System chapter, (3) inspect relevant ADRs, (4) inspect relevant IA/content specs, (5) compare the current design against those sources, (6) determine whether the issue is a design defect, governance defect, content issue, component issue, responsive issue, or implementation limitation. Do not blindly modify Figma.

**Source-level editing:** when a component is reused, prefer fixing the true source/master component over patching individual instances. If an instance property is locked, do not fight the tool or fake a workaround — report what is locked, why it matters, whether master-level modification is safe, whether detaching is necessary, whether the change affects other pages, and the recommended resolution.

## 11. Figma Agent / AI Assistant Rules

Treat Figma's native AI/Agent as a creative assistant and execution accelerator — use it for visual exploration, background concepts, graphic compositions, decorative elements, image treatment, supporting visuals, visual hierarchy, background textures, athletic graphic direction, and layout exploration.

**Figma AI is NOT the design authority.** Priority order: (1) UAEAF Governance, (2) Design System, (3) ADRs, (4) approved IA, (5) approved content, (6) existing components/tokens, (7) Figma Agent suggestions. If Figma Agent generates something visually attractive but inconsistent with governance: **reject it.**

## 12. Skills Usage Rules

Before major design work, inspect available relevant Skills and use them for Figma, UI/UX, Design Systems, visual design, image generation, graphics, accessibility, responsive design, motion, or prototyping — only when relevant to the actual task, never merely because they exist. Skills NEVER override UAEAF governance (`CLAUDE.md` §21 already establishes this; this section reaffirms it for visual/creative work specifically).

## 13. Motion Philosophy

Motion is part of the design language and must match the page personality:

- **Quiet:** subtle fade · restrained hover · small movement
- **Editorial:** image reveal · staggered content · scroll reveal
- **Cinematic:** layered reveal · image movement · depth · controlled parallax-like effects
- **Sport:** directional movement · energetic transitions · stronger interaction
- **Service:** minimal, functional transitions only

Every motion specification must define: trigger · property · duration · easing · delay · direction · reduced-motion behavior. Respect `prefers-reduced-motion` in production. **Never claim motion is implemented if it is only documented** — Figma cannot execute live motion; disclose that limitation explicitly every time.

> **Extended by ADR-0098 D5 (2026-09-24).** Two **bounded rotation** roles join the vocabulary, both on the new `motion.duration.orbit` cycle period (Chapter 3 §3.14's eighth value):
>
> - **Hover rotation** — starts on pointer entry or `focus-within`, stops on exit. Public site only; prohibited in the dashboard (Chapter 12 §12.15.1).
> - **Live rotation** — runs while a broadcast is live, stops when it ends. **At most one continuously rotating element in any view**, and only where a broadcast is actually live.
>
> Neither uses `ambient`, whose restriction and single authorised use are untouched. Under `prefers-reduced-motion: reduce` both rotations stop and **the border stays visible, static, at full strength** — the border is the affordance and the rotation is only emphasis, so removing the motion must never remove the mark. §15 (accessibility is never traded for aesthetics) is unamended and governs this.

## 14. Interaction & Component States

Interactive components should use proper variants where appropriate: Default · Hover · Focus · Pressed · Active · Disabled. Minimum touch target: **44×44px**. Use the existing accessibility focus token (`a11y/focus/ring`). Avoid arbitrary interaction colors.

## 15. Accessibility

Every visual design must consider: contrast · typography · readable line length · focus state · keyboard interaction · touch target · accessible names · reduced motion · semantic grouping. Aesthetic quality must never override accessibility.

## 16. Responsive Design

Every significant page/component must be considered at Desktop, Tablet, and Mobile. Check: wrapping · overflow · cropping · grid collapse · spacing · navigation · CTA stacking · touch targets · typography · footer behavior · interaction. Never assume Desktop automatically scales correctly. If mobile/tablet designs do not yet exist for a page, report "RESPONSIVE DESIGN NOT VERIFIABLE" rather than fabricating one (`CLAUDE.md` §13).

## 17. Design System Integrity

Reuse existing: colors · typography · spacing · radius · shadows · icons · components · patterns · tokens. Do NOT create new tokens simply because a visual looks better. If a new token is genuinely necessary: **stop**, document the need, and propose an ADR / Design System update rather than inventing it silently.

## 18. Visual Asset / Background Generation

When a page needs a background, graphic, texture, decorative shape, or supporting image: do NOT automatically default to a generic gradient. First determine the page's personality (§4), then select an appropriate visual language: architectural · athletic · editorial · abstract · cinematic · geometric · photographic · institutional. The visual must reinforce the content.

Avoid: generic SaaS gradients · random blobs · meaningless 3D shapes · excessive glassmorphism · excessive neon · decorative noise · overuse of red · visual clutter.

The approved decorative graphic device is the four-diagonal-line motif (Chapter 1 ADR-0005, "the moment of ascent") — implemented as the reusable Figma component `Brand Pattern / Diagonal Lines`. Prefer this over inventing a second decorative pattern language.

> **Amended by ADR-0098 D2/D4 (2026-09-24).**
>
> *"Do NOT automatically default to a generic gradient"* stands — the word doing the work is **generic**. Three non-generic grounds are now governed and available, and a page chooses among them from its register assignment rather than inventing one: the **green and red identity registers** (a short ramp within one identity colour), **ink**, and the **mesh tint** (two radial gradients at low alpha in opposite corners — not a pattern, since it has no motif, repeat or edge, per Chapter 27 §25). What the "Avoid" list above still rejects is unchanged: an unbounded mesh in arbitrary hues, random blobs, meaningless 3D shapes, excessive glass, decorative noise, visual clutter.
>
> **The Figma component named above never existed.** ADR-0005's Consequences row promised a Chapter 8 "Brand Pattern" component in 2026-08; no `CMP-BRANDPATTERN-*` was ever added, and the string appears in none of the eight component chapters. It is discharged in code first, as `BrandStreaks` in the shared Brand UI Kit, with the Figma frame listed under ADR-0098 §11 PENDING FIGMA BACK-SYNC (Figma is read-only for this project at present). **The ascent angle does not mirror in RTL** — §9 above is absolute, and a mirrored take-off angle is a mirrored identity mark.

## 19. Page Creation Workflow

Every new design task MUST follow this sequence:

**Phase 0 — Governance Review:** read this protocol, relevant Design System chapters, relevant ADRs, IA, content model, related pages, existing components, relevant Skills.

**Phase 1 — Page Personality:** determine page purpose, user intent, page personality (§4), color personality, image strategy, motion level, interaction level.

**Phase 2 — Visual Concept:** define hero direction, visual anchor, section rhythm, image strategy, background strategy, typography hierarchy, transition strategy — before building any repetitive sections.

**Phase 3 — Implementation:** build in Figma using existing tokens, components, master components, approved assets, Figma Agent when useful, relevant Skills.

**Phase 4 — QA:** see §20 below.

**Phase 5 — Documentation:** if a new reusable rule/pattern was created, document it. If governance needs to change, create an ADR proposal rather than deciding silently.

## 20. Visual QA

Before declaring any page/component complete, verify: Desktop · Tablet · Mobile · RTL · LTR where required · no overflow · no clipping · no accidental mirroring · no logo distortion · correct hierarchy · correct color ratio (§5) · proper spacing · proper interactions · consistent visual identity. This extends, and must be read together with, `CLAUDE.md` §24 Final Verification and §25 Final Report Format.

## 21. Governance Conflict Resolution

If this protocol appears to conflict with an individual task request, an existing ADR, or another Design System chapter:

1. Do not silently pick a side.
2. Identify exactly which two sources conflict and quote both.
3. Apply `CLAUDE.md` §1 Source of Truth Hierarchy: explicit current-task instruction > Design System > ADRs > Homepage spec > IA > Figma > implementation > skills > general best practice.
4. If the hierarchy does not cleanly resolve it (e.g. two ADRs, or this protocol vs. a Draft chapter like `27-Brand-Visual-Language.md`), classify as **DESIGN DECISION REQUIRED** (`CLAUDE.md` §2/§23) and report before implementing.
5. Known standing tension to watch: this protocol/ADR-0050 (accepted) vs. `27-Brand-Visual-Language.md` (Draft, unapproved) — currently consistent by construction; re-diff explicitly if Chapter 27 is ever formally approved.

## 22. Persistence / Maintenance Rules

This protocol MUST survive future sessions and must NOT be treated as a one-time prompt.

- Root `CLAUDE.md` §22 requires this file be read before any visual/design/Figma task.
- At the start of every future design task, re-read this protocol and its index (`UAEAF-VISUAL-GOVERNANCE-INDEX.md`) rather than relying on conversation memory alone.
- Before starting from a page brief directly, run the sequence: **Governance → Design System → ADRs → IA → Page Personality → Visual Concept → Skills → Figma/Figma Agent → Implementation → QA → Documentation.**
- Report a short **Governance Check** before implementing any new page: Page Personality, Color Personality, Image Strategy, Motion Level, Interaction Level, Existing Components to Reuse, Relevant Skills, relevant Design System/ADR sources, Potential Governance Conflicts. Do not ask unnecessary confirmation if governance already answers the question — stop only at a genuine unresolved decision (§21).
- If a new reusable pattern, rule, or exception is introduced during a task, it must be written back into the appropriate chapter/ADR or this protocol before the task is considered closed — never left only in conversation.

---

## Do Not Do

Never: make every page look identical · use the same section template everywhere · overuse cards · overuse brand colors · use red as a dominant decorative color · mirror logos · invent contact information · invent brand tokens · invent content without disclosure · silently modify approved IA · patch instances when the master is the correct source · claim motion exists when it is only documented · claim Figma-AI-generated assets are approved automatically · sacrifice accessibility for aesthetics · introduce visual effects without purpose.

## Final Creative Principle

UAEAF should feel like ONE brand. It should NOT feel like ONE TEMPLATE.

Every page should answer: **"What is this page trying to make the user feel, understand, or do?"** — then be designed accordingly.

**ONE UAEAF + MANY DISTINCT PAGE PERSONALITIES + ONE GOVERNED DESIGN LANGUAGE.**
