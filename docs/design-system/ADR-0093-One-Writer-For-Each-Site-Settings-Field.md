# ADR-0093 — One Writer for Each Site-Settings Field

| | |
| --- | --- |
| **Status** | **Accepted** — owner request 2026-09-22 |
| **Amends** | ADR-0092 D11 and its last consequence (the general route no longer carries the footer's fields) · ADR-0077 D5 / ADR-0085 D7 (the strip's settings, same rule) |
| **Scope** | `api/` only: `PUT /site-settings`. No change to the footer or strip routes, their screens, the schema, or any stored value. |

---

## Context

`siteSettings` is one document with several writers. Two parts of it have a screen of their own, and each screen writes through a route of its own:

- **The footer's words**, through `PUT /site-settings/footer`: `footerAboutBlurb`, `copyrightText` and `footerHeadings` (ADR-0092).
- **The sponsor strip**, through `PUT /site-settings/sponsor-strip`: `sponsorStrip` (ADR-0077 D5).

The general `PUT /site-settings`, inherited from the old contract, still took `footerAboutBlurb` and `copyrightText`, and wrote them as `null` whenever a caller left them out. `footerHeadings` and `sponsorStrip` were already off its DTO. A caller sending them was refused, but only with the validation pipe's "property … should not exist", which does not say where the field went.

The owner's principle: a field with a screen of its own is written by that screen's route and by nothing else. It is not enough to protect it from being cleared by mistake.

## Who writes each field

Read from the code: the schema, both route handlers, every dashboard route, the seeds and the tests.

| Field | Writer | Screen |
| --- | --- | --- |
| `footerAboutBlurb`, `copyrightText`, `footerHeadings` | `PUT /site-settings/footer` only | Dashboard → Homepage → Footer |
| `sponsorStrip` | `PUT /site-settings/sponsor-strip` only | Dashboard → Homepage → Sponsor strip |
| `defaultSeo`, `logoId`, `logoDarkId`, `faviconId`, `privacyPolicyPageId`, `termsOfUsePageId`, `accessibilityStatementPageId`, `cookieConsentEnabled`, `cookieConsentText`, `isMaintenanceMode`, `maintenanceMessage`, `googleAnalyticsId`, `metaPixelId`, `sessionTimeoutMinutes`, `maxLoginAttempts`, `systemEmailSender` | `PUT /site-settings` | None. No dashboard screen writes any of them |

- No field's owner was unclear.
- `sessionTimeoutMinutes` and `maxLoginAttempts` keep their existing flag in the schema: nothing reads them yet, because authentication still uses the constants in `auth.config.ts`. Which of the two is authoritative is still an open question. It is a separate question from who writes them.

## Decisions

**D1 — The general DTO carries only the general fields.**
- `footerAboutBlurb` and `copyrightText` are removed from `UpsertSiteSettingsDto`, and so from the generated OpenAPI contract.
- `upsert()` no longer names them, so the general save can neither set nor reset them, even if a caller reached the service another way.

**D2 — A request carrying an owned field is refused by name, whole.**

`RefuseFieldsWrittenElsewhereInterceptor`, on `PUT /site-settings` only, reads the body against `FIELDS_WRITTEN_ELSEWHERE`, the one map from each owned field to its route. It answers:

```json
{ "statusCode": 400, "code": "writtenElsewhere", "fields": ["copyrightText"], "routes": ["PUT /site-settings/footer"],
  "message": "copyrightText is written through PUT /site-settings/footer, not PUT /site-settings. Nothing was saved." }
```

- **`null` counts:** clearing a field is writing it.
- **Nothing in the request is saved:** a partial save would apply the rest and hide the part that was wrong.
- **An interceptor, not a pipe:** the global `ValidationPipe` runs before any pipe bound to the route. It would refuse the same fields first, as the generic `badRequest`. Interceptors run after the guards, so an unauthenticated caller still gets only `401`.

**D3 — `writtenElsewhere` joins the API's error vocabulary.**
- It gets its own code because the fix is neither a field correction nor a retry: the same request belongs on another route.
- No dashboard screen calls the general route, so the dashboard's vocabulary is unchanged.

## Verification

**Unit tests:**
- The general DTO refuses each owned field and accepts every general one.
- The interceptor refuses by name, counts `null`, names each route once, and passes anything else through.
- `upsert()` writes none of the owned fields.
- The interceptor sits on the general route alone.
- Each route the refusal names is one the controller serves, read from its routing metadata.
- **Suite:** API 1281 / 1281. `tsc --noEmit` covers `src` and `test`, and oxlint is clean.

**e2e (`governance-cms-public`, the real global pipe and filter):**
- The footer is written through its own route.
- The general route refuses `copyrightText` with `writtenElsewhere`.
- The public copyright is unchanged, and the maintenance flag sent in the refused request was not applied.
- **With the interceptor removed**, the same test fails with `badRequest`. That shows the refusal runs ahead of the pipe.

**Live** (local API rebuilt, local database):
- The footer's copyright was changed from its dashboard screen.
- Three requests were then sent to the general route, all refused with `writtenElsewhere`, naming their fields and routes:
  - `copyrightText` together with `maintenanceMessage`;
  - `footerHeadings: null`;
  - `footerAboutBlurb` with `sponsorStrip`.
- After them, the footer, the maintenance message and the strip were unchanged.
- A general save of every general field as stored answered `200` and left the footer and the strip as they were.
- The footer was then put back through its own route.

## Consequences

- An old caller that sent the footer's fields to `PUT /site-settings` now gets `400 writtenElsewhere` instead of a save. None was found: no dashboard route, seed or script calls it. The only caller was the e2e test, which now uses the footer route.
- A new part of `siteSettings` that gets a screen of its own is added to `FIELDS_WRITTEN_ELSEWHERE`, removed from `UpsertSiteSettingsDto`, and given its route. The ownership tests then cover it with no change of their own.
