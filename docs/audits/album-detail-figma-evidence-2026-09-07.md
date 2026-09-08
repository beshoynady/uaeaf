# Album Detail — Figma Evidence (recovered from chat history, 2026-09-07)

Node confirmed: page-album-detail-ar (1431:2507) in file hpO727vjwl18g3s3LTICAY.

Two lightbox variants exist on this page:
- Main-Lightbox-Content (node 2271:1696) — the LIVE, visible, current design.
- Main-Lightbox-Content-OLD (node 1431:2707) — hidden="true", a superseded exploration. Do NOT use.

Fields confirmed present in the LIVE design (verified field-by-field against backend):
- Album/event title → Album.title → VERIFIED
- Championship/tournament name → needed AlbumPublicResponseDto.championshipName (added 2026-09-07)
- Photographer name → needed MediaFile.photographer (added 2026-09-07)
- Shoot/capture date → needed MediaFile.captureDate (added 2026-09-07)
- Album photo count → Album.assetCount → VERIFIED
- Current photo index → client-side view state, not stored
- Per-photo caption → MediaAsset.caption → VERIFIED
- "صورة رقم N" chip → computed from array position, not stored

Fields that appeared ONLY in the OLD hidden node (do not treat as current requirements):
- Location/venue, Photo ID/reference number, a separate "Competition" field.