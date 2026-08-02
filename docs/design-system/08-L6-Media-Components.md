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
