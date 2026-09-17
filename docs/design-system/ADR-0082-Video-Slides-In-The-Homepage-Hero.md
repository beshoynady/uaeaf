# ADR-0082 — Video Slides in the Homepage Hero

**Status:** **Proposed** — for after 2026-10-02. Nothing is built. The owner's prompt of 2026-09-16 lists «ADR فيديو الشرائح» for approval only.
**Date:** 2026-09-16

---

## Context

- `heroSlides` has carried a `VIDEO` branch (`mediaType`, `videoId`) since the board model. The hero filters it out: the owner deferred video entirely.
- `videos` stores an external embed URL, not a file.
- An embedded player above the fold would cost the Largest Contentful Paint the hero is built to protect.
- CMP-VIDEO-001 permits one kind of hero video only: silent, looping, background.

## Proposal

1. **A file, not an embed.** A `heroVideo` asset kind in the media centre:
   - an MP4 (H.264) and a WebM (VP9/AV1) rendition, each ≤ 6 MB at 1920 wide;
   - a portrait rendition for phones;
   - a required **poster frame** from the same shot.
2. **The poster is the slide's picture and its LCP.** The `<video>` element loads after first paint, `preload="none"`, then `muted`, `playsinline`, `loop`. It never loads for reduced motion or `Save-Data`, and never on a connection the browser reports as slow; there the poster stays.
3. **Art direction** as `hero-image-prompts.md`: the calm third, the flag-colour powder, and no text. `ltrImageMode` applies to the poster and the video alike, `separate` needing both renditions.
4. **Controls:** the hero's stop button pauses the video too (WCAG 2.2.2). The progress line runs on the slide's dwell, not the clip's length.
5. **Tests:** LCP ×10 with and without video, CLS 0, no network request for video under reduced motion.

## Decision (owner, 2026-09-17): stays Proposed

Not approved and not rejected. It is reopened only when both hold:

1. The art-directed image set of `docs/content/hero-image-prompts.md` exists and has proved itself on the live hero. Today not one picture made to that direction exists (ADR-0080 D2, critical defect), and video would multiply that production problem.
2. The owner has decided whether AI-generated video is admissible under rule 2 (`page-building-guide.md` §٨), which this proposal does not answer.

The `VIDEO` branch stays in the schema and stays unrendered.
