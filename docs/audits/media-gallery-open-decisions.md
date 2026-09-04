# Media Gallery — Open Decisions

Deferred from the 2026-09-04 media-gallery hardening pass (`Album`/`MediaAsset`/`MediaFile`/`ContentAssociation`, Domain 5 — Media Center). Each item below was explicitly out of scope for that pass — not implemented, not stubbed — and needs a business or infrastructure decision before it can be built. See branch `feature/media-gallery-hardening` for what *was* implemented.

## 1. Image derivative generation (thumbnail/card/medium/large sizes)

Today, `MediaAsset.file` stores exactly one image (one `url`/`width`/`height`/`size`) per asset. Any page that needs a smaller rendition currently has to serve the full-size original, which is a real performance cost on image-heavy pages (album grids, athlete profile photos).

What it would take: a decision on a processing library/service (e.g. `sharp` run in-process, or an external image pipeline), the exact derivative sizes needed (naming them requires design input — this pass deliberately did not invent a `thumbnail`/`card`/`medium`/`large` set), where the derivatives are stored (same `storageKey` convention, suffixed, or a separate manifest), and whether generation happens synchronously in the upload request (simple, but slows the response) or as a background job (needs a job queue, which doesn't exist in this codebase yet).

## 2. Upload-time security validation (MIME sniffing, malware/virus scanning)

`MediaFile.mimeType` is entirely client-supplied today (`CreateMediaAssetDto` → `MediaFileDto.mimeType`, validated only for non-emptiness) and nothing inspects the actual file bytes. This is a real gap on the platform's upload path — a client can currently claim any `mimeType` for any file content, and `MediaAssetsService.assertUsableImage()`'s `mimeType.startsWith('image/')` check is trivially spoofable. This is being flagged clearly, not silently deferred.

What it would take: a decision on tooling for both concerns — MIME sniffing from actual file bytes (e.g. `file-type` package reading magic numbers) to replace/validate the client-supplied `mimeType`, and a malware/virus scanning step (e.g. ClamAV or a hosted scanning API) in the upload path before a file is persisted. Both need a decision on where the actual file bytes are received/inspected, since this pass's schema work assumes an already-uploaded file (a `url`/`storageKey` pair), not a raw upload handler.

## 3. `photographerId` / photographer entity

No schema in this pass attributes an image/video to a photographer. Nothing today needs it functionally, but it's a plausible future ask (crediting, usage-rights tracking).

What it would take: a decision on whether a photographer maps to an existing `User` record (if photographers are federation staff/contractors with system accounts), an existing `federationPersonnel` record (if they're modeled as personnel regardless of system access), or a new lightweight standalone entity (if external/freelance photographers who never get a `User` account need to be represented). Each has different implications for auth, uniqueness, and lifecycle.

## 4. EXIF/GPS metadata storage and redaction policy

No EXIF or GPS data is read, stored, or stripped anywhere in the upload/storage path today. This is a genuine privacy consideration, not just a missing feature: many phone photos embed GPS coordinates, and if any future workflow (e.g. athlete-submitted photos) allows public-facing uploads to keep their original EXIF data, that could unintentionally expose a location.

What it would take: an explicit internal-vs-public data policy decided *before* any EXIF field is added anywhere — specifically, whether EXIF/GPS data is (a) never read at all, (b) read and stored internally but stripped before any public-facing `url`/response, or (c) read and selectively exposed. Adding an EXIF field without that policy decided first would risk shipping a privacy leak by default.

## 5. `ownerType`/`ownerId` casing divergence between `ContentAssociation` and `documents`

Deferred from the 2026-09-04 `albumsPage`/`videosPage` + individual-album-page follow-on (not the original hardening pass).

Two different collections share the exact same field-name pair, `ownerType`/`ownerId`, for the same conceptual purpose — a polymorphic reference to an owning entity — but use two different, mutually inconsistent casing conventions for the *values*:

- `ContentAssociation.ownerType` (shared by `albums`/`videos`, `common/schemas/content-association.schema.ts`): camelCase, plural, collection-name style — `championships | athletes | clubs | publicEvents`. This matches the platform's general `entityType` casing convention (`workflowInstances`, `revisions`, `publications`, and the `auditLogs.entityType` casing fix from the 2026-09-04 P0/P1 hardening pass).
- `documents.ownerType` (`modules/documents/schemas/document.schema.ts`): PascalCase, singular, display-label style — `Club | Athlete | Coach | Official | Championship | Membership | Sponsorship`.

Both are correct-as-implemented per their own schema's documentation and the live FigJam board (confirmed on the board itself, not just in code) — this is not a bug in either collection individually, and neither was changed as part of this session's work. It is flagged here as a genuine cross-schema consistency gap: a developer working across both collections has to remember which casing convention applies to which field, with no structural guard against mixing them up.

What it would take: a decision on which convention is canonical going forward (the camelCase/collection-name style has more adopters platform-wide, per the collections listed above) and whether `documents.ownerType`'s existing values are worth a breaking migration to match, or whether the divergence is accepted permanently as a documented exception (similar in spirit to ADR-0041's scoped typography exceptions, but for a data-modeling convention rather than a visual one). Not decided here — do not silently normalize either field as a side effect of unrelated work.
