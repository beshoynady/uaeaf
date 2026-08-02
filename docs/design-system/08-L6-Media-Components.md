# Chapter 8 — Component Inventory

## Level 6: Media Components (Media Foundation)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** In Progress (L6 of 8) | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after freezing **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                               | Used By                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Chapter 5 (Motion, Performance) · Chapter 6 (Accessibility) · Chapter 7 (Semantic Tokens) · Chapter 8 L1 (Avatar, Skeleton) · Chapter 8 L4 (Error State) | L8 (Sports: Player/Club Images, Tournament Videos) · Chapter 13 (CMS Media Library) · Chapter 9 (Alt Text Writing Rules) |

## Scope

**Covers:** L6 as the **Media Foundation** (loading, aspect ratio, responsive images, fallbacks, lazy loading, error handling, accessibility, cropping policy, Object Fit, security) + 5 media components.
**Does not cover:** File uploading itself (→ Chapter 8 L2 §CMP-FILEUPLOAD-001/CMP-IMAGEUPLOAD-001), or full media library management as a system (→ Chapter 13 CMS).

## Definitions

| Term                 | Definition                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Aspect Ratio**     | The fixed width-to-height ratio of a media element (e.g., 16:9). Its space is reserved before the actual content loads to prevent CLS. |
| **Object Fit**       | How an image/video fills a container whose dimensions differ from its native dimensions (`cover`, `contain`, `fill`).                  |
| **Responsive Image** | An image loaded at a different resolution/size depending on screen size and pixel density through `srcset`/`sizes`.                    |

## Purpose

The **Media Foundation** is the single contract for every image and video across the platform. Performance (Chapter 0 §Design Goals) is affected by media more than almost any other component category, so this chapter protects it through strict rules before defining any individual component.

---

## ADR-0018: Media Loading & Performance Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Authority**               | Engineering Decision (direct implementation of PR-002 Performance First)                                                                                                                                                                                                                                                                                                                                                                   |
| **Context**                 | Player, club, and event images will constitute the majority of page weight across the platform (Chapter 0: a global visual identity relies on professional photography). Without a strict contract, performance (LCP < 2.5s) will degrade rapidly.                                                                                                                                                                                         |
| **Decision**                | All media **MUST** reserve its space (Aspect Ratio) before loading (preventing CLS) · **MUST** use Lazy Loading for every image/video below the fold (`loading="lazy"` or equivalent), except the first above-the-fold Hero element (`priority`/`eager`) · **MUST** use modern compressed formats (WebP/AVIF) with fallback to older formats · **MUST** use `srcset`/`sizes` for every content image (no single size sent to all screens). |
| **Alternatives Considered** | Leave image optimization to each developer's discretion — rejected because it has historically been the primary source of performance degradation in similar projects.                                                                                                                                                                                                                                                                     |
| **Why This Decision**       | Ensures that every new image added to the platform (and there will be many over the years) automatically follows the same performance standards.                                                                                                                                                                                                                                                                                           |
| **Risks**                   | User-uploaded images (Admin Dashboard) may not be optimized at the source. **Mitigation:** §M.9 Media Security requires server-side processing/compression for every upload rather than relying on the quality of the original file.                                                                                                                                                                                                       |
| **Consequences**            | Every component below **MUST** consume this contract rather than reimplementing it individually.                                                                                                                                                                                                                                                                                                                                           |

---

# Media Foundation — Shared Sections

### M.1 Media Loading Contract

Refer to ADR-0018 — Lazy Loading is the default; Eager Loading is only for the first above-the-fold element; modern formats with fallback are required.

### M.2 Aspect Ratio Contract

Every media container **MUST** define a fixed aspect ratio (`DT-ASPECT-*`, Chapter 3) **before** the actual media arrives — using CSS (`aspect-ratio`) rather than waiting for the image to load to determine its dimensions.

Standard ratios:

* `1:1` — Avatar / Square Card
* `4:3` — General Images
* `16:9` — Video / Hero
* `3:4` — Portrait Player Cards

### M.3 Responsive Images Contract

**MUST** use `srcset` with multiple resolutions (1x/2x/3x for pixel density) + `sizes` reflecting the actual layout (Chapter 5 Breakpoints).

**MUST NOT** send a full-size Desktop image to a small Mobile display.

### M.4 Fallback Contract

| Situation                                | Fallback                                                                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image loading failure                    | A generic fallback image (Placeholder) with the same Aspect Ratio — **MUST NOT** show an empty space or the browser's default "broken image" icon. |
| Video loading failure                    | Text message + retry capability (consumes Chapter 8 L4 §FB.19 Retry Contract).                                                                     |
| Player/club image unavailable altogether | Same logic as the Avatar Fallback Chain (Chapter 8 L1: Photo → Initials → Icon).                                                                   |

### M.5 Lazy Loading Contract

All media below the fold **MUST** use `loading="lazy"` (or an equivalent `IntersectionObserver` implementation).

The **only exception** is the first Hero image/video visible immediately when the page loads, which should use `eager`/`priority` loading to improve LCP (Chapter 0).

### M.6 Error Handling

Media loading failure **MUST NOT** break the page layout. The Aspect Ratio defined in §M.2 preserves the reserved space even when loading fails.

This integrates directly with §M.4 Fallback rather than reinventing a separate error state.

### M.7 Accessibility

Direct application of Chapter 6 §6.8:

* **MUST** provide descriptive `alt` text for every content image, in Arabic and English according to the page language.
* Decorative images **MUST** explicitly use `alt=""`.
* Videos **SHOULD** provide captions for any important audio content.
* **MUST NOT** embed important text inside images, as it cannot be reliably read by assistive technologies or enlarged.

### M.8 Cropping Policy

Images uploaded with dimensions that do not match the required Aspect Ratio (§M.2) **MUST** have an explicitly defined cropping policy for each context.

Either:

* Automatic centered cropping (`object-fit: cover` + `object-position: center`), or
* Require manual cropping by the user during upload (Chapter 8 L2 §CMP-IMAGEUPLOAD-001) for identity-sensitive images such as player portraits, where automatic centered cropping may incorrectly crop the face.

### M.9 Object Fit Contract

| Value     | Usage                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `cover`   | Default for most contexts (Avatar, Card, Hero) — fills the container but may crop the edges.                                   |
| `contain` | Sponsor/club logos (§M.8: cropping is not allowed) — the entire image must always remain visible, even if empty space remains. |
| `fill`    | Rarely used, only when image distortion is visually acceptable (decorative backgrounds).                                       |

### M.10 Media Security

| Context                                        | Rule                                                                                                                                                                                                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External links (e.g., YouTube interview Embed) | **MUST** use limited-permission `sandbox`/`allow` settings, and **MUST** verify that the source is from an explicitly trusted/whitelisted domain.                                                                                                                                |
| Uploaded files (Chapter 8 L2)                  | **MUST** always undergo server-side processing/compression rather than relying on the original file as-is. Full security checks (virus scanning, actual MIME verification) are delegated to Chapter 17, matching the decision in Chapter 8 L2 §FileUpload.                       |
| Usage Rights                                   | Sponsor/partner images **MUST** be used according to documented licensing agreements, which are technically outside the scope of this document. However, the descriptive field (Attribution/License) **SHOULD** be part of the media metadata in the Media Library (Chapter 13). |

### M.11 Composition

```text
<Media>
  ├── Container (reserves Aspect Ratio, §M.2)
  ├── Content (actual image/video)
  ├── Loading Overlay (Skeleton, Chapter 8 L1, during §M.1)
  └── Fallback Overlay (§M.4, on failure)
```

---

# CMP-IMAGE-001 — Image

**Purpose:** The fundamental image element consumed throughout the platform (Card, internal Avatar, news content).

**Related Governance:** M.1–M.9 in full, Chapter 8 L1 (Skeleton during loading).

# CMP-GALLERY-001 — Gallery

**Purpose:** A browsable grid of multiple images (e.g., event photo gallery).

**Behavior:** **MUST** load only the first 6–8 images eagerly if they appear above the fold; all remaining images **MUST** use lazy loading (§M.5).

**Related Governance:** Built on CMP-IMAGE-001, Chapter 5 Grid.

# CMP-VIDEO-001 — Video

**Purpose:** Video player for tournament recordings, interviews, etc.

**Behavior:**

* **MUST NOT** autoplay with sound — this violates standard user experience expectations and negatively impacts performance.
* Autoplay with muted audio **MAY** be used only for short decorative Hero backgrounds.

**Related Governance:** M.4 (Loading Failure), M.7 (Captions), Chapter 6 §6.6 (No Flashing).

# CMP-CAROUSEL-001 — Carousel

**Purpose:** A rotating presentation of multiple items (e.g., sequential Hero images or featured event cards).

**Behavior:**

* **MUST** stop automatically when `prefers-reduced-motion` is enabled (Chapter 5 §5.8).
* **MUST** provide clear manual navigation controls; it must not rely solely on touch/swipe gestures.
* **MUST NOT** continuously rotate without a manually available pause/stop control (Chapter 6 §2.2.2 WCAG — automatically moving content requires user control).

**Related Governance:** Chapter 5 §Motion Anti-Patterns, M.5.

# CMP-LIGHTBOX-001 — Lightbox

**Purpose:** Display an enlarged image/video above an overlay layer (e.g., when clicking an image in a Gallery).

**Behavior:** Built on Chapter 8 L4 §CMP-DIALOG-001 (Overlay + Focus Trap + Esc to close).

**MUST** support keyboard navigation between gallery items (Left/Right arrows) while open.

**Related Governance:** Chapter 8 L4 (FB.9 Focus Management), Chapter 6 §6.3.

---

# ADR-0036: Live Stream Component & Homepage Section Governance

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Authority**               | Product Decision (Project Owner, Chapter 22 §2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Context**                 | The Homepage was built with a "Live Stream & Videos" section that did not trace to any documented component, which a prior read-only audit flagged as violating Chapter 20 ADR-0032's Pure Assembly rule (no Homepage section may exist without a source-chapter component). The Project Owner has confirmed this section is an intentional product decision, not an unauthorized addition, and this ADR resolves the gap the correct way: by adding the missing component to its source chapter, per ADR-0032's own instruction ("MUST be raised as an ADR" against the source chapter, not solved locally in Chapter 20). |
| **Decision**                | Add `CMP-LIVESTREAM-001` to Chapter 8 L6, built on the existing `CMP-VIDEO-001` contract (§M.1–M.11) plus a real-time state machine and CMS relationship defined below. The Homepage's "Live Stream & Videos" section is retroactively authorized as a documented Homepage section, formalized in `docs/product/02-Homepage-Specification.md` §11a.                                                                                                                                                                                                        |
| **Alternatives Considered** | Treat it as a one-off Homepage-only pattern documented solely in the product spec, without a Chapter 8 component — rejected: breaks ADR-0013 (component layering) and ADR-0032 (pure assembly), and blocks reuse if a future Competition Detail or Athlete Detail page also needs a live embed.                                                                                                                                                                                                                                                            |
| **Why This Decision**       | Keeps the "every Homepage section traces to a component" invariant intact while accommodating the Project Owner's product decision, rather than forcing a choice between the two.                                                                                                                                                                                                                                                                                                                                                                           |
| **Risks**                   | Live video introduces state complexity (live/offline/loading/error) not present in the static `CMP-VIDEO-001`. **Mitigation:** the full state contract is defined below rather than left to implementation discretion.                                                                                                                                                                                                                                                                                                                                     |
| **Consequences**            | `TMP-HOME-001` (Chapter 20) now explicitly lists Chapter 8 L6 §CMP-LIVESTREAM-001 in its consumes list.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## CMP-LIVESTREAM-001 — Live Stream

| Section | Details |
| --- | --- |
| **Purpose** | Surface the federation's real-time broadcast (competition live coverage, press moments) on the Homepage and, where reused, on Competition Detail pages, with a supporting on-demand video shelf. |
| **Business Objective** | Design Goal #1 (modern international identity) and Design Goal #3 (engagement/reach) — a live signal is the strongest "this is happening now" credibility cue the Homepage can carry. |
| **User Objective** | Immediately recognize whether a broadcast is live right now, watch it inline or on the external platform, and browse recent related video without leaving the Homepage. |
| **Anatomy** | `LiveStream` (primary embed + `Live`/`Offline` state header, title, description, CTA row) + `VideoShelf` (§CMP-GALLERY-001 pattern applied to `CMP-VIDEO-001` items, 4-up desktop) |
| **Content Source** | External live-broadcast platform (e.g., YouTube Live) via embed, per §M.10 Media Security (sandboxed, whitelisted domain only) — the platform is the source of live signal truth, not the CMS. |
| **Content Ownership** | Video shelf items are CMS-owned (`CT-MEDIA-001`, Chapter 13) — Media Team publishes/curates which recent videos appear. The live embed URL/schedule is CMS-editable metadata (channel ID, scheduled title) but the live/offline signal itself is read from the platform, never hand-set in the CMS (prevents a stale "Live" badge from outliving the actual broadcast). |
| **Section Priority** | **P2** (`02-Homepage-Specification.md` §7 ladder) — brand/engagement proof, positioned after core-utility content (Results/Events), consistent with existing P2 sections (Media Centre, Featured Athletes). Elevates to functional **P1** for the duration of an actual live broadcast only (temporary, state-driven, not a permanent reclassification). |
| **Homepage Placement** | Between Results & Events and News, matching the as-built position — see `02-Homepage-Specification.md` §5 (revised). |
| **Desktop Behavior** | Two-column: primary live/video player (larger) + video shelf grid (4-up), as built. |
| **Tablet Behavior** | Two-column collapses to stacked: primary player full-width, shelf becomes 2-up. *(Not yet verified against an actual Figma tablet frame — flagged in §Known Constraints below.)* |
| **Mobile Behavior** | Single column, primary player full-width 16:9 (§M.2), shelf becomes a horizontally-scrollable row or 1-up stack (implementation choice, either satisfies PR-006 mobile-first as long as no horizontal page scroll is introduced). |
| **Live State** | Red `color.semantic.live` badge + "Live"/"مباشر" label (Chapter 1 ADR-0038) on the primary player; player auto-loads the live embed; title/description reflect the current broadcast. |
| **Offline / No-Live-Content State** | **MUST NOT** show a dead/black player or a "Live" badge with nothing live. When no broadcast is active, the primary slot **MUST** either (a) collapse to show only the Video Shelf (section becomes "مكتبة الفيديو" / Video Library only, no live-labeled element), or (b) show the most recent past broadcast clearly labeled "Recorded"/"مسجّل", never "Live". This is a **MUST**, not a design nicety — a false Live badge is a trust/credibility defect (Chapter 0 Design Goal #1). |
| **Loading State** | Skeleton matching the 16:9 aspect ratio (§M.2) while the embed/platform status resolves — consumes Chapter 8 L1 Skeleton, per §M.11 Composition. |
| **Error State** | If the platform embed fails to load: text message + retry, consuming Chapter 8 L4 §FB.19 Retry Contract (§M.4 Fallback Contract) — **MUST NOT** silently render a broken embed frame. |
| **CTA Behavior** | "Watch on [Platform]" (external link, opens the platform directly) + native share action — mirrors the as-built pattern. No in-page purchase/registration CTA (Homepage is non-transactional, `02-Homepage-Specification.md` §1 Non-goal). |
| **Accessibility** | Inherits §M.7 (captions for audio content — live broadcasts **SHOULD** provide live captions where the source platform supports them) · §M.10 (sandboxed embed) · Chapter 6 §6.6 (no flashing) · full keyboard reachability for player controls and shelf items (Chapter 8 Global Governance §G.12). |
| **Content Governance** | Follows Chapter 13 §CT-MEDIA-001 editorial lifecycle for shelf items (Author → Review → Publish, PR-010) — live broadcast content itself is exempt from pre-publish review (it is inherently real-time), but the *decision to embed a given channel* is a CMS configuration change subject to normal review. |
| **CMS Relationship** | CMS provides: live-channel reference (§0.5 of `01-Information-Architecture.md`, External Media Channel Reference field), video shelf item selection/order. CMS does **not** provide: the live/offline boolean itself (read from platform). |
| **Thumbnail / Poster-Image Behavior** | Shelf items **MUST** use a poster image reserving the 16:9 aspect ratio before video load (§M.2), consistent with `CMP-VIDEO-001`. |
| **Video / Stream Behavior** | Inherits `CMP-VIDEO-001`: **MUST NOT** autoplay with sound; muted autoplay permitted only for short decorative loops, not for the primary live/shelf content itself. |
| **Relationship with News/Media/Results** | Live Stream is the *real-time* layer; News is the *narrative* layer (published after the fact); Media Centre (§CMP-GALLERY-001) is the *archival* layer; Results & Events is the *factual* layer. A live competition **SHOULD** cross-link to its Results & Events row once results begin publishing, per the single-canonical-source rule (`02-Homepage-Specification.md` §22) — Live Stream never re-states a result itself. |
| **Visibility Rule** | The section itself is **always visible** (Video Shelf guarantees non-empty content as long as at least one published video exists); only the *primary live slot* toggles between Live/Offline-collapsed per the state rules above. If zero videos exist in the CMS at all (new-platform edge case), the section **MUST** be hidden entirely rather than rendering an empty shelf. |
| **Related Governance** | Chapter 8 Global Governance (G.1–G.12) · §M.1–M.11 (this chapter) · Chapter 1 ADR-0038 (Live badge color) |

---

# Known Constraints (L6 Addendum)

Tablet-breakpoint behavior for `CMP-LIVESTREAM-001` is specified above as an intended rule but has not been verified against an actual Figma tablet frame (none currently exists for the Homepage — see the prior design-audit's Responsive findings). This **MUST** be verified once a tablet frame is produced, per Chapter 24 (Known Constraints) conventions.

---

# Do & Don't (L6 General)

**Do:**

* Reserve the Aspect Ratio before any media loading.
* Always use `object-fit: contain` for sponsor logos.

**Don't:**

* Do not autoplay videos with sound.
* Do not send a full-size Desktop image to a small Mobile display.

## Success Metrics

* 0 images/videos causing measurable CLS (Aspect Ratio is always reserved).
* 100% of below-the-fold images use Lazy Loading, except the first Hero element.
* 0 videos autoplay with sound.
* 100% of content images contain descriptive `alt` text in both site languages.

## References

**Normative:** Chapter 2 (PR-002) · Chapter 5 (Performance) · Chapter 6 (§6.8) · Chapter 8 Global Governance

**Implementation:** Next.js Image Component (framework-neutral implementation reference for automatic optimization) · WCAG 2.2

## Related Chapters

Chapter 8 L1 (Avatar/Skeleton) · Chapter 8 L2 (§FileUpload/ImageUpload) · Chapter 8 L4 (§Dialog, §Retry) · Chapter 13 (Media Library) · Chapter 17 (Upload Security)

---

*End of L6 Media (Media Foundation M.1–M.11 + 5 components). Next: L7 Enterprise Components.*
