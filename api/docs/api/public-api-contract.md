# UAEAF Public API Contract

Every route below is decorated `@Public()` in the current codebase (verified
by reading each controller directly, not inferred from naming — a couple of
routes with "public" in their URL, like `GET /documents/:id/public` and
`GET /publications/:entityType/:entityId/public`, are actually RBAC-gated and
are correctly **excluded** from this list). No request needs an
`Authorization` header for anything listed here; every other route in the
API requires a valid JWT.

Every example response below was captured from a real, running instance of
this API against seeded test data (2026-09-05) — none are hand-typed. The
full machine-readable OpenAPI document (path/method/DTO shapes for the whole
API, not just the public surface) lives at [`api/openapi.json`](../../api/openapi.json),
exported from the same running instance.

This document covers the public surface as it exists **today**. It is a
snapshot, not a live contract — re-export `api/openapi.json` and re-run the
capture before relying on exact field lists for a production integration.

## Contents

- [People & Organizations](#people--organizations)
- [Media Center](#media-center)
- [CMS & Page Composition](#cms--page-composition)
- [Federation & Governance](#federation--governance)
- [Public Communication](#public-communication)
- [Platform Administration](#platform-administration)
- [System](#system)
- [Domains with no public routes](#domains-with-no-public-routes)
- [Notes for frontend integration](#notes-for-frontend-integration)

---

## People & Organizations

### `GET /athletes/public`

Paginated list of athletes in public-safe form. **New this session**: no
pagination convention existed anywhere in this codebase before — `page`
(default `1`) and `limit` (default `50`, max `200`) are introduced here and
apply only to this route and `GET /officials/public`.

Structurally excludes `dateOfBirth` (`[SENSITIVE-MINOR]`, ADR-0028 / Federal
Law 26/2025) — a Guest athlete has no individual public page (no `slug`
exists on `Athlete` since 2026-09-03; see `GET /athlete-profiles/public/:slug`
below).

Query params: `page` (integer ≥ 1), `limit` (integer 1–200).

```json
{
  "items": [
    {
      "id": "6a9b3f4e0d8390d2968c575f",
      "name": { "en": "Jane Runner", "ar": "جين العداءة" },
      "nationalityId": "6a9b3f4e0d8390d2968c575e",
      "disciplineIds": [],
      "gender": "Female",
      "residencyType": "Local",
      "federationName": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### `GET /athlete-profiles/public/:slug`

The individual public athlete page: resolves `athleteProfiles.slug` →
`athleteId` → `athletes`, and returns both in public-safe form in one call.
Structurally excludes `restricted` (Emirates ID/passport, address, phone,
email). Returns `{}` for an unknown slug (a `null` service return is
serialized this way — see [Notes](#notes-for-frontend-integration)).

```json
{
  "profile": {
    "id": "6a9b3f4f0d8390d2968c5760",
    "athleteId": "6a9b3f4e0d8390d2968c575f",
    "slug": "jane-runner",
    "clubId": null,
    "registrationNumber": "ATH-REG-1",
    "status": "Active",
    "photoId": null,
    "bio": { "en": "National 400m champion.", "ar": "بطلة وطنية في 400 متر." },
    "socialLinks": []
  },
  "athlete": {
    "id": "6a9b3f4e0d8390d2968c575f",
    "name": { "en": "Jane Runner", "ar": "جين العداءة" },
    "nationalityId": "6a9b3f4e0d8390d2968c575e",
    "disciplineIds": [],
    "gender": "Female",
    "residencyType": "Local",
    "federationName": null
  }
}
```

### `GET /officials/public`

Paginated list of officials, mirroring `GET /athletes/public` exactly (same
`page`/`limit` query params, same envelope shape). `Official` carries no
field equivalent to `dateOfBirth`'s sensitivity, so nothing is excluded
beyond the standard "never return the raw document" DTO discipline.

```json
{
  "items": [
    {
      "id": "6a9b3f4f0d8390d2968c5762",
      "fullName": { "en": "Ahmed Referee", "ar": "أحمد الحكم" },
      "roleType": "Referee",
      "licenseLevel": "Level1",
      "disciplineIds": [],
      "nationalityId": "6a9b3f4f0d8390d2968c5761",
      "residencyType": "Local",
      "federationName": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### `GET /official-profiles/public/:slug`

Mirrors `GET /athlete-profiles/public/:slug`. `officialProfiles` has no
`restricted` PII object at all (a real content asymmetry vs. `athleteProfiles`,
confirmed on the schema, not an omission).

```json
{
  "profile": {
    "id": "6a9b3f4f0d8390d2968c5763",
    "officialId": "6a9b3f4f0d8390d2968c5762",
    "slug": "ahmed-referee",
    "clubId": null,
    "registrationNumber": "OFF-REG-1",
    "photoId": null,
    "bio": null,
    "gender": "Male",
    "status": "Active"
  },
  "official": {
    "id": "6a9b3f4f0d8390d2968c5762",
    "fullName": { "en": "Ahmed Referee", "ar": "أحمد الحكم" },
    "roleType": "Referee",
    "licenseLevel": "Level1",
    "disciplineIds": [],
    "nationalityId": "6a9b3f4f0d8390d2968c5761",
    "residencyType": "Local",
    "federationName": null
  }
}
```

---

## Media Center

### `GET /albums/public/:slug`

The individual public album page. Only a `Published` album resolves; Draft/
Archived or an unknown slug returns `{}`. Excludes `associations` (internal
grouping metadata) and audit-trail fields.

```json
{
  "album": {
    "id": "6a9b3f4f0d8390d2968c5765",
    "title": { "en": "National Championship 2026", "ar": "البطولة الوطنية 2026" },
    "slug": "national-championship-2026",
    "description": { "en": "Highlights from the meet.", "ar": "أبرز لحظات البطولة." },
    "contentCategoryId": "6a9b3f4f0d8390d2968c5764",
    "coverImageId": null,
    "publishedAt": "2026-09-04T21:59:43.464Z",
    "tags": ["championship", "2026"],
    "assetCount": 0
  },
  "mediaAssets": [],
  "relatedAlbums": []
}
```

`coverImageId` is a plain id, not a resolved URL — there is no public
`GET /media-assets/:id`, a pre-existing site-wide gap, out of scope for this
session.

### `GET /albums-page`

Singleton page-furniture wrapper (hero title/subtitle/image for the Albums
landing page). `{}` before it is ever configured via the admin
`PUT /albums-page`.

```json
{}
```

### `GET /videos-page`

Same singleton pattern as `/albums-page`, for the Videos landing page.

```json
{}
```

---

## CMS & Page Composition

### `GET /pages/public/:slug`

Public routing lookup for a routable CMS page. Only `status: "Published"`
resolves. Returns the raw `pages` document (not yet passed through a
dedicated public DTO — a pre-existing gap noted for the record, not
introduced or fixed this session; nothing sensitive lives on this
collection today).

```json
{
  "_id": "6a9b3f4f0d8390d2968c5766",
  "createdBy": null,
  "updatedBy": null,
  "archivedAt": null,
  "archivedBy": null,
  "slug": "home",
  "title": { "en": "Home", "ar": "الرئيسية" },
  "status": "Published",
  "seo": null,
  "__v": 0
}
```

### `GET /page-sections/public/by-page/:pageId`

The enabled, `visibility: "Everyone"` sections of one page, inside their
visibility window, in `displayOrder`. Same pre-existing no-DTO note as
`/pages/public/:slug` above.

```json
[
  {
    "_id": "6a9b3f4f0d8390d2968c5767",
    "createdBy": null,
    "updatedBy": null,
    "archivedAt": null,
    "archivedBy": null,
    "pageId": "6a9b3f4f0d8390d2968c5766",
    "sectionType": "HERO",
    "sectionTitle": null,
    "sectionSubtitle": null,
    "itemLimit": null,
    "ctaText": null,
    "ctaUrl": null,
    "visibleFrom": null,
    "visibleUntil": null,
    "displayOrder": 1,
    "enabled": true,
    "visibility": "Everyone",
    "selectionMode": "MANUAL",
    "items": [],
    "filters": null,
    "configuration": null,
    "__v": 0
  }
]
```

### `GET /hero-slides/public/by-section/:pageSectionId` — new this session

Closes the one missing link in the `pages → pageSections → heroSlides`
public composition chain (`pages` and `pageSections` already had `@Public()`
routes; a HERO section's actual slide content did not). Active, in-window
slides of one HERO section, in `displayOrder`. Unlike the two routes above,
this one **does** go through a dedicated `HeroSlidePublicResponseDto` —
excludes `active`/`scheduledFrom`/`scheduledTo` (the visibility gate, not
display data) and `pageSectionId`.

```json
[
  {
    "id": "6a9b3f4f0d8390d2968c5769",
    "mediaType": "IMAGE",
    "imageAssetId": "6a9b3f4f0d8390d2968c5768",
    "videoId": null,
    "title": { "en": "Champions", "ar": "الأبطال" },
    "subtitle": { "en": "Season 2026", "ar": "موسم 2026" },
    "ctaText": { "en": "See more", "ar": "شاهد المزيد" },
    "ctaUrl": "/results",
    "displayOrder": 1
  }
]
```

### `GET /navigation-menus/public/by-key/:key` — new this session

Resolves a stable, frontend-known `key` (e.g. `"main-nav"`, `"footer-quick-links"`)
to the menu's `id` — the missing link a frontend needed to reach the
pre-existing `GET /navigation-items/public/by-menu/:menuId` route below,
since a frontend has no legitimate way to already know an internal
`navigationMenus` ObjectId. Returns `{}` for an unknown key.

```json
{ "id": "6a9b3f4f0d8390d2968c576a", "key": "main-nav", "location": "Header" }
```

### `GET /navigation-items/public/by-menu/:menuId`

Pre-existing route (not touched this session beyond being the destination of
the new by-key lookup above). Every active item of one menu, no
`publicationState` gate. Same pre-existing no-DTO note as `/pages/public/:slug`.

```json
[
  {
    "_id": "6a9b3f4f0d8390d2968c576b",
    "createdBy": null,
    "updatedBy": null,
    "archivedAt": null,
    "archivedBy": null,
    "menuId": "6a9b3f4f0d8390d2968c576a",
    "label": { "en": "Athletes", "ar": "الرياضيون" },
    "url": "/athletes",
    "parentItemId": null,
    "displayOrder": 1,
    "isActive": true,
    "__v": 0
  }
]
```

### `GET /site-settings/public`

The `[RESTRICTED]`-free projection of the single `siteSettings` row —
structurally omits `isMaintenanceMode`, `googleAnalyticsId`, `metaPixelId`,
`sessionTimeoutMinutes`, `maxLoginAttempts`, `systemEmailSender`. `{}` before
first configured.

```json
{}
```

Shape once configured (`SiteSettingsPublicResponseDto`): `defaultSeo`,
`footerAboutBlurb`, `copyrightText`, `logoId`, `logoDarkId`, `faviconId`,
`privacyPolicyPageId`, `termsOfUsePageId`, `accessibilityStatementPageId`,
`cookieConsentEnabled`, `cookieConsentText`, `maintenanceMessage`.

### The 7 singleton "*Page" hero wrappers

`GET /athletes-page`, `GET /clubs-page`, `GET /coaches-page`,
`GET /disciplines-page`, `GET /news-page`, `GET /records-page`,
`GET /results-rankings-page` — all identical pattern: singleton row, no
`:id`, GET is public, PUT (admin-only) upserts it. `{}` before first
configured (all seven returned `{}` in this capture, since none has been
set up on this fresh instance):

```json
{}
```

Shape once configured (`HeroPageDto`-based): `heroImageId` (ref →
`mediaAssets`, nullable), `heroTitle` (`{en, ar}`), `heroSubtitle` (`{en, ar}`).

---

## Federation & Governance

### The 7 workflow-governed `:id/public` snapshot routes

`GET /committees/:id/public`, `GET /organizational-structure/:id/public`,
`GET /governance-documents/:id/public`, `GET /about-federation-page/:id/public`,
`GET /vision-mission-page/:id/public`, `GET /strategic-plans-page/:id/public`,
`GET /president-message-page/:id/public` all share one mechanism: the
**sole** public read path for a workflow-governed entity is
`publications → revisions.snapshotData` — never the entity's own collection
row directly ("Approved ≠ Published"). Each returns `{}` when there is no
current `Live` publication for that id, regardless of what the row itself
contains.

Worked example — `committees`, seeded with a real `Live` publication +
revision so the populated shape is genuine, not guessed:

```json
{
  "id": "6a9b3f4f0d8390d2968c576e",
  "name": { "en": "Technical Committee", "ar": "اللجنة الفنية" },
  "description": {
    "en": "Oversees technical regulations and officiating standards.",
    "ar": "تشرف على اللوائح الفنية ومعايير التحكيم."
  },
  "committeeType": "Technical",
  "committeeGroup": "Leadership",
  "displayOrder": 1
}
```

The exact field set in `snapshotData` is whatever the entity's own approved
revision recorded at publish time — it is not schema-enforced beyond "an
object." The other 6 routes returned `{}` in this capture because nothing
has been published for them yet on this fresh instance; their populated
shape mirrors their own entity's editable fields, the same way `committees`'
does above.

### `GET /federation-personnel/public`

Not workflow-governed — served directly. Active personnel only, structurally
excludes `internalContact` (`[RESTRICTED]`: personal email, ID number).

```json
[
  {
    "id": "6a9b3f4f0d8390d2968c576d",
    "fullName": { "en": "Dr. Sara Al Naqbi", "ar": "د. سارة النقبي" },
    "photoId": null,
    "shortBio": { "en": "Secretary General.", "ar": "الأمينة العامة." },
    "biography": null,
    "nationalityId": "6a9b3f4f0d8390d2968c576c",
    "publicContact": { "email": "info@uaeaf.ae", "phone": "+9714xxxxxxx" },
    "status": "Active",
    "socialLinks": []
  }
]
```

### The 3 singleton wrappers: `board-members-page`, `committees-page`, `contact-us-page`

Same singleton `GET`/`PUT` pattern as the CMS-domain `*Page` wrappers above.
All three returned `{}` in this capture (not yet configured):

```json
{}
```

---

## Public Communication

### `POST /contact-messages`

The platform's **only unauthenticated write route** — the citizen-facing
contact form. Every operational field (`status`, `assignedToId`,
`workflowInstanceId`, all reply fields) is server-controlled and rejected if
sent by the caller (`forbidNonWhitelisted: true`). Rate-limited to 5
requests/60s per IP (`@RateLimit(5, 60)`). Every free-text field has a
`@MaxLength()` cap (`senderName` 200, `senderEmail` 254, `senderPhone` 30,
`messageBody` 5000).

Request:

```json
{
  "messageType": "Complaint",
  "senderName": "Citizen Tester",
  "senderEmail": "citizen@example.com",
  "messageBody": "The track surface at the stadium needs maintenance."
}
```

Response (`201`) — note this route returns the raw document (not yet passed
through a dedicated response DTO, a pre-existing gap flagged for the record,
not introduced this session; the data echoed back is the caller's own
submission, so no cross-user PII is exposed by it):

```json
{
  "createdBy": null,
  "updatedBy": null,
  "archivedAt": null,
  "archivedBy": null,
  "messageType": "Complaint",
  "senderName": "Citizen Tester",
  "senderEmail": "citizen@example.com",
  "senderPhone": null,
  "messageBody": "The track surface at the stadium needs maintenance.",
  "status": "New",
  "hardDeleteEligibleAt": null,
  "assignedToId": null,
  "assignedToType": null,
  "workflowInstanceId": null,
  "replyBody": null,
  "repliedAt": null,
  "repliedBy": null,
  "replyChannel": null,
  "_id": "6a9b3f510d8390d2968c5779",
  "__v": 0
}
```

A submission over any `@MaxLength()` cap is rejected with `400` before it
reaches the database.

---

## Platform Administration

### `POST /auth/login`

Rate-limited to 10 requests/60s per IP (`@RateLimit(10, 60)`), independently
of the account-level lockout (`LOCKOUT_THRESHOLD`) — the rate limit protects
the endpoint from distributed credential-stuffing traffic across many
accounts; the lockout protects one account from repeated guessing.

Request:

```json
{ "email": "demo@uaeaf.ae", "password": "correct horse battery staple" }
```

Response (`200`) — tokens truncated below; the real response is a complete
JWT in both fields:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2Y...(truncated)",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2Y...(truncated)"
}
```

Both fail with `401` on bad credentials, `429` once the rate limit is
exceeded.

### `POST /auth/refresh`

Not independently captured this session (no rate limit applied, unlike
`login`). Request body: `{ "refreshToken": "<token>" }`. Returns the same
`{ accessToken, refreshToken }` shape as login.

---

## System

### `GET /health`

Root-level health check for uptime monitoring.

```json
{ "status": "ok" }
```

---

## Domains with no public routes

`athletics` (age-categories, disciplines) and `documents` have **no**
`@Public()` routes today. `documents/:id/public` and
`publications/:entityType/:entityId/public` look public by URL but are both
RBAC-gated (`@RequirePermission`) — do not build a frontend integration
assuming otherwise; this was specifically double-checked against source, not
inferred from the route name.

## Noticed, not fixed, out of scope for this session

- `pages`, `page-sections`, and `navigation-items`'s public routes return
  the raw Mongoose document rather than a dedicated response DTO. Nothing
  sensitive lives on any of the three collections today, so this is not a
  live data-exposure issue, but it is a structural inconsistency with the
  "always go through a `*PublicResponse` DTO" discipline used everywhere
  else in this document. Pre-existing; not introduced or fixed this session.
- `POST /contact-messages`'s `201` response is likewise the raw document.
  Same reasoning: not a live leak (it's an echo of the caller's own
  submission), but structurally inconsistent.
- `clubs`, `coaches`, and `disciplines` (the entity collections, not their
  `*-page` hero wrappers) have **no** public routes or `toPublicResponse()`
  methods at all — zero existing infrastructure, unlike Athlete/Official
  which only needed wiring. Building these from scratch was judged out of
  this session's scope (closing an existing gap, not designing three new
  public collections) and is flagged here rather than built silently.

## Notes for frontend integration

- **A `null` service return serializes as `{}`, not `null` or `404`.**
  Every "not found" / "not yet published" / "not yet configured" case in
  this document is a real `200` with an empty object body — check for an
  empty object, not a `404` status, when handling "nothing here yet."
- **Pagination** (`page`/`limit` query params, `{items, total, page, limit}`
  envelope) exists only on `GET /athletes/public` and `GET /officials/public`
  as of this session — it is a new convention with no other precedent in
  this API yet.
- The full OpenAPI document at [`api/openapi.json`](../../api/openapi.json)
  covers path/method/tag information for the entire API (156 routes as of
  this export), not just the public surface documented here — cross-check
  it for anything not covered above. Note that most routes in this API,
  public or not, are not decorated with explicit `@nestjs/swagger` response
  schemas (no `nest-cli.json` Swagger plugin is configured project-wide), so
  the OpenAPI document mainly gives you paths/methods/tags, not response
  body schemas — this document's captured examples are the source of truth
  for response shape.
