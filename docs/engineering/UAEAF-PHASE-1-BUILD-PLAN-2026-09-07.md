# UAEAF — Phase 1 Build Plan (Homepage + Static Pages + Admin)

**Status:** DRAFT for owner approval. Nothing in this plan has been implemented.
**Date:** 2026-09-07
**Supersedes:** `UAEAF-FRONTEND-BUILDOUT-PLAN-2026-09-07.md` — that plan's bucket sort was built from a repo-only search and was wrong on 13 of 13 homepage sections. Its architecture section (static placeholder modules) also contradicts the CMS composition engine that already exists in the backend. Treat this document as the replacement.

---

## 0. WHAT CHANGED SINCE THE PREVIOUS PLAN

| Finding | Evidence | Consequence |
|---|---|---|
| Figma read access restored, **editing permanently gone** (subscription lapsed, owner will not renew) | `whoami` → Pro seat; owner statement 2026-09-07 | §1a is now the **permanent** operating mode, not a temporary regime. "Pending Figma Back-Sync" is a dead concept — see §7. |
| Every homepage section **is** designed | AR 1440 `2374:1174` (13/13), EN 1440 `616:98` (12/13), AR mobile 390 `2374:2314` | The previous "no design evidence" conclusion was wrong on all 13. Build from real frames, not derivation. |
| Homepage is **CMS-composable by design** | `cms-page-composition/page-sections` — 13-value `PAGE_SECTION_TYPES` enum matching the spec's sections almost 1:1 | Homepage must render from `pages` + `pageSections`, not hardcoded section calls. |
| 9 of 14 sections have **no backing collection** | See §2 table | Phase 1's centre of gravity is backend, not frontend. |
| Public page reads are **untyped** | `getPublicSnapshot(): Promise<Record<string, unknown> \| null>`; `revisions.snapshotData` is `@Prop({type: Object})` | The approved "generated typed client" yields zero type safety for page content. Blocker — see §1.2. |
| No slug/singleton public read path | `GET /strategic-plans-page/:id/public` needs an ObjectId; schema says "Deliberately NOT singleton-enforced" | A route like `/ar/strategic-plan` cannot resolve its content. Blocker — see §1.1. |
| Section heading/intro copy has **no home in any schema** | Strategic Plan ×5, Policies ×3, President ×1 headings hardcoded in Figma | Systemic gap, not three bugs. Blocks "admin controls all content". See §1.3. |
| Policies & Regulations has **no page collection at all** | `governanceDocuments` covers only the document cards | Needs a new wrapper collection. See §1.4. |
| Editorial workflow already exists | `workflowInstances → publications (Live/Unpublished/Archived) → revisions.snapshotData`; RBAC in `platform-administration` | Admin is **not** CRUD. Screens need draft → submit → approve → publish → revision history. |

### Owner decisions recorded 2026-09-07
1. **Governance:** keep `CLAUDE.md` as-is, unchanged. (See §7 for the one consequential exception that still needs a ruling.)
2. **Admin:** vertical slices — each page ships with the admin screen that manages it.
3. **Scope:** Homepage + Strategic Plan + Policies & Regulations (+ President's Message).
4. **Design/schema conflicts:** case-by-case, reported per conflict, owner rules.
5. **Build order:** backend first — build the missing collections.
6. **Media Centre:** the **AR desktop** version (Photo Albums, `2374:2127`) is canonical; EN and mobile are the drift.
7. **Tablet/mobile:** designed **in code**, not Figma.

### The one conflict in those decisions, and its resolution
Decision 5 (build the 9 missing collections) collides with the owner's earlier instruction to defer Tournaments/Events/Results to a later phase — that cluster (`competitions`, `events`, `results`, `rankings`) is the largest of the nine.

**Resolution, using the system's own designed behaviour:** the homepage ships with the Results & Rankings + Upcoming Events section **disabled** via `pageSections.enabled = false`. That field, plus `visibleFrom`/`visibleUntil`, exists precisely for sections that are not yet live. No placeholder data, no throwaway code, no deviation — the section is switched on in the later phase when its collections exist.

**Net Phase 1 backend scope: 7 new collection groups + 1 missing DTO** (not 9).

---

## 1. FOUNDATION WORK — must precede all section building

### 1.1 Public read paths need slug/singleton resolution `BLOCKER`
Add, per public page entity, a resolution path that does not require an ObjectId. Two candidates:
- **(a)** `GET /:entity/public/current` for true singletons (president message, strategic plan) — resolves the single Live publication.
- **(b)** `GET /:entity/public/by-slug/:slug` where multiple instances legitimately coexist.

`strategicPlansPage` is explicitly *not* singleton-enforced (successive plan periods may coexist), so it needs (b) or an explicit "current plan" rule. **Owner ruling needed:** is there exactly one live Strategic Plan page at a time?

### 1.2 Type the public snapshot responses `BLOCKER`
`snapshotData` is an untyped blob. Options:
- **(a) Typed snapshot DTOs per entity** — `getPublicSnapshot()` returns a declared DTO; Swagger documents it; the generated client is genuinely typed. Costs one DTO per page entity.
- **(b) Leave untyped and validate at the frontend boundary** (e.g. Zod) — cheaper, but re-introduces a second source of truth, which is exactly what the openapi/Husky work was built to prevent.

**Recommendation: (a).** It is the only option consistent with the already-approved typed-client decision.

### 1.3 Section heading/intro copy needs a home `BLOCKER`
Every static page has per-section headings and intro paragraphs with nowhere to live. Options:
- **(a) Add explicit fields per page schema** (`pillarsHeading`, `objectivesHeading`, …) — simple, but multiplies fields and repeats the pattern on every future page.
- **(b) One reusable `sectionCopy` sub-document** on the page schemas: `{ sectionKey, heading, intro, displayOrder }[]` — one pattern, reused everywhere, admin-editable, no new field per section.
- **(c) Route static page sections through `pageSections`** like the homepage — most unified, but `pageSections`' 13-type enum is homepage-shaped and would need widening.

**Recommendation: (b)** for Phase 1 — it solves the systemic gap once without destabilising the `pageSections` enum, and stays compatible with (c) later.

### 1.4 New collection: `policiesPage` wrapper
Hero, intro, category headings, governance links, CTA. Mirrors the shape of its sibling page wrappers.

### 1.5 Repo hygiene
- Delete `my-project/` — a stray spec-kit scaffold duplicating `.specify/`, unrelated to UAEAF.
- `packages/ui`, `packages/content` are empty. Keep as declared workspaces or remove — **owner ruling needed** (they are referenced in `package.json` workspaces).
- `apps/dashboard` is empty; it becomes the admin app in §3.

### 1.6 Correct stale documentation
- `02-Homepage-Specification.md`: "UAEAF in the Media — not yet built in Figma" is **false** (built in all three frames).
- Blanket "RESPONSIVE DESIGN NOT VERIFIABLE" is **half false** — a full AR 390 homepage exists.
- ADR-0043's open question "does the global sponsor strip appear on the Homepage?" is **answered: yes** (`2374:1284`, real sponsor names).
- Record the mobile breakpoint as **390px**, not 375px.

---

## 2. BACKEND SCOPE — what exists vs what Phase 1 builds

| Homepage section | Collection | Status |
|---|---|---|
| Header / Footer | `navigationMenus`, `navigationItems`, `siteSettings` | ✅ exists |
| Hero | `heroSlides` | ✅ exists |
| Photo Albums (Media Centre) | `albums`, `mediaAssets` | ✅ exists |
| Featured Athletes | `athletes`, `athleteProfiles` | ✅ exists (needs a `featured` selection mechanism — `pageSections.items[]` MANUAL mode may already cover it) |
| Live Stream & Videos | `videos` ✅ / `liveChannel` ❌ | partial |
| Clubs Network | `clubs` ✅ collection, ❌ **no public DTO** | needs DTO only |
| Federation by the Numbers | statistics/aggregates | ❌ **build** |
| Sponsors & Partners + sponsor ticker | `sponsors`, `partnerships` | ❌ **build** |
| News | `newsArticles` | ❌ **build** |
| UAEAF in the Media | `externalMediaCoverage` | ❌ **build** |
| Memberships / Affiliations | `affiliations` | ❌ **build** |
| Newsletter | subscriber capture | ❌ **build** |
| Results & Rankings + Upcoming Events | `competitions`, `events`, `results`, `rankings` | ⏸ **deferred** — section ships `enabled=false` |

---

## 3. EXECUTION MODEL — vertical slices, backend-first within each

Reconciles all three owner decisions (backend-first · vertical slices · visible progress): each section is delivered as a complete slice, and slices ship one at a time.

**One slice = ** schema (+ indexes) → public + admin DTOs → repository/service → controller → tests → `openapi.json` regen → **admin screen** → **frontend section** → real-browser verification at 1440 / 768 / 390 in AR + EN.

### Slice order — front-loads what needs no new backend
| # | Slice | New backend? |
|---|---|---|
| 0 | **Homepage shell** — `pages` + `pageSections` public read, section registry, admin section-ordering screen | none (exists) |
| 1 | Hero | none |
| 2 | Photo Albums (Media Centre) | none |
| 3 | Featured Athletes | none |
| 4 | Clubs Network | DTO only |
| 5 | Federation by the Numbers | new |
| 6 | Sponsors & Partners + ticker | new |
| 7 | News | new |
| 8 | UAEAF in the Media | new |
| 9 | Memberships | new |
| 10 | Newsletter | new |
| 11 | Live Stream & Videos | `liveChannel` new |
| — | Results & Events | **deferred**, `enabled=false` |

Slices 0–4 prove the entire pattern end-to-end (CMS composition, admin, workflow, responsive, RTL) with **zero new collections**, before any new backend is written. If the pattern is wrong, that is discovered at slice 1, not slice 11.

### Then the static pages
| # | Slice | New backend? |
|---|---|---|
| 12 | President's Message | fix `goals[]` type → `IconedContentBlock`; add pull-quote; resolve hero-line ambiguity |
| 13 | Strategic Plan | add `sectionCopy`; period-string handling; objective tags; execution-flow section |
| 14 | Policies & Regulations | **new `policiesPage` collection** |

---

## 4. ADMIN PANEL ARCHITECTURE

`apps/dashboard` is empty. It is a Next.js app in the existing workspace, consuming the same generated OpenAPI client as `apps/web`.

Not CRUD — it must expose the real editorial lifecycle:
```
draft (entity.publicationState)
  → submit  (workflowInstances)
  → approve (workflow steps / policies)
  → publish (publications: Live, one per entity)
  → unpublish (reversible) / archive (permanent)
  → revision history (revisions.versionNumber)
```
Plus, for the homepage: reorder sections (`displayOrder`), toggle (`enabled`), schedule (`visibleFrom`/`visibleUntil`), set visibility, choose MANUAL items or AUTOMATIC filters, and edit section titles/subtitles/CTAs.

Auth/RBAC already exists (`platform-administration/{auth,roles,permissions,users,auth-sessions}`); screens gate on the same `RequirePermission` model the API enforces.

**Design source:** none — no Figma exists for the admin, and none will. It is built in code from the existing design tokens. Per `CLAUDE.md` §16 it uses canonical tokens only; per §2 no arbitrary values. It is an internal tool, so it follows the token system without needing the Homepage's "Cinematic" art direction.

---

## 5. RESPONSIVE STRATEGY

Anchors that actually exist (designer-authored):

| Page | 1440 | 768 | 390 / 375 |
|---|---|---|---|
| Homepage | ✅ AR + EN | ❌ none | ✅ AR **390** only |
| Strategic Plan | ✅ AR + EN | ✅ AR + EN | ✅ AR + EN (375) |
| Policies & Regulations | ✅ AR + EN | ✅ AR + EN | ✅ AR + EN (375) |
| President's Message | ✅ AR + EN | unconfirmed | unconfirmed |

**Homepage tablet (768) is derived in code** per §1a — but this is a far stronger position than the footer case: it is interpolation between two real designed anchors (1440 and 390), not invention from nothing. Every derived decision cites `05-Grid-Layout-Motion.md` §5.2 (md = 8 columns, 24px gutter, 32px margin) and is recorded in the spec file.

**EN mobile needs no separate design.** Direction symmetry is proven twice in this codebase (Part 9.1 header measurements, Part 11 footer grid): identical DOM, `dir` alone drives mirroring. EN mobile is the AR 390 layout under `dir="ltr"`.

**The static pages are the reference system.** They are the only place a complete designer-authored 1440/768/375 system exists — their breakpoint behaviour is the precedent every later page follows.

---

## 6. THE "DESIGN SYSTEM CONSTRAINS CREATIVITY" QUESTION

The owner raised this, then chose to keep governance unchanged. That is the right call, because the premise does not hold up:

| Source | Text |
|---|---|
| `03-Design-Tokens.md:639` | "Homepage \| **Cinematic (highest register)** \| Full range available \| Photography/motion-led, **the site's single boldest moment**" |
| `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md:34` | "Cinematic \| Homepage / major storytelling \| imagery may dominate, cinematic composition, controlled overlays, **visual depth, subtle motion**" |
| same, `:112` | "Cinematic: **layered reveal · image movement · depth · controlled parallax-like effects**" |
| `05-Grid-Layout-Motion.md` §5.6–5.7 | Full motion token set (100/150/220/320/480ms), 4 easing curves incl. `SPRING` for "celebratory moments (medal, record)", stagger choreography 40–80ms |

The governance does not restrict the homepage — it **mandates** that the homepage be the site's boldest, most motion-led moment. None of that vocabulary has been exercised yet because the only things built so far are the header and footer, which the same system classifies as quiet institutional chrome, and they were built during the Figma blackout when derivation-by-citation replaced design.

**Practical consequence for this plan:** the Hero slice (slice 1) is where the motion system is used for the first time, at the Cinematic register, using existing `DT-MOTION-*` tokens. The owner already storyboarded this in Figma (`Hero Entrance — State 0/1/2`). Motion is a build requirement of slice 1, not an optional embellishment.

---

## 7. THE ONE GOVERNANCE ITEM THAT STILL NEEDS A RULING

`CLAUDE.md` §1a.3 requires derived work to be labelled `PENDING FIGMA BACK-SYNC`, "for review once Figma access returns." **Access will not return** — editing is permanently gone.

So that label now points at an event that will never happen, and the concept is dead as written. Since `CLAUDE.md` edits require explicit owner approval (and the owner elected to keep governance unchanged), this is raised, not applied. Proposed minimal amendment:

> §1a.3 (amended) — Label the resulting work `CODE-SIDE DESIGN DECISION` in the report, listing every visual state that was decided in code rather than in Figma, with its citation. Where Figma remains readable, capture the source frames into `docs/design-specs/` first; where it does not, the code and its spec file are the source of truth. (The former `PENDING FIGMA BACK-SYNC` label is retired: Figma editing ended 2026-09-07 and no back-sync will occur.)

**Owner ruling needed:** apply this amendment, or keep §1a as written and accept that the label is now vestigial?

---

## 8. OPEN ITEMS REQUIRING OWNER DECISIONS

Carried forward from the design/schema conflict report (owner chose case-by-case):

| # | Item | Options |
|---|---|---|
| 1 | Strategic Plan: is exactly one live at a time? | singleton `/public/current` vs slug-based |
| 2 | President's Message hero line `1219:2307` | `heroSubtitle` or `signatoryTitle` |
| 3 | "آخر تحديث" on document cards | `Document.effectiveDate` or `BaseSchema.updatedAt` |
| 4 | President portrait | resolve via `federationAppointmentId → FederationPersonnel.photoId`, or add a dedicated field |
| 5 | Empty CTA frames (`758:243`, `765:312`, `2757:2511`, `2764:3574`) | placeholders or intentionally content-free |
| 6 | AR/EN structural divergence on Strategic Plan (5 vs 4 objectives; EN-only tags; AR-only timeline icons) | unify or accept as intentional |
| 7 | Enum vs label: design says "Guidelines", enum says `Guide` | rename enum or fix design copy |
| 8 | `packages/ui`, `packages/content` empty workspaces | keep or remove |
| 9 | §1a.3 amendment (§7 above) | apply or keep |

Added 2026-09-07 while building the auth/roles/permissions slice — both surfaced by
running the real system end to end, neither visible from the code alone:

| # | Item | Options |
|---|---|---|
| 10 | **Access-token size.** ~~The JWT embeds the flattened permission set (BE-PLAN-010 §4.4). A Super Admin holding all 164 permissions produces an **11,384-byte** token, against a 4,096-byte per-cookie limit and a ~8 KB `Cookie` header limit.~~ **RESOLVED 2026-09-07 — owner decision.** The access token now carries `roleIds` only (~300 bytes for any user, one cookie, no chunking); `JwtStrategy` resolves the permission set from the database on every request via `RolesService.resolvePermissions` (two indexed reads, no cache). This supersedes BE-PLAN-010 §4.4 and closes its 15-minute staleness window as a side effect — a role edit now takes effect on the next request. Rationale recorded by the owner: least data in transit, immediate consistency, single source of truth. See `access-control.integration.spec.ts` for the acceptance tests. | Closed. Follow-ups: the dashboard's cookie-chunking module is now dormant and is a candidate for deletion; a permission-resolution cache remains deliberately unbuilt, to be revisited only if the platform outgrows 30–50 accounts. |
| 11 | **No `prefers-color-scheme` in the token CSS.** `dark.css` is scoped purely to `[data-theme="dark"]` (verified 2026-09-07), so `users.preferredTheme = null` cannot mean "follow the OS" — it renders light. `apps/web` papers over this with an inline bootstrap script that reads `matchMedia`; the dashboard instead defaults to light explicitly, so the toggle never describes a state the user is not in. | (a) add a `@media (prefers-color-scheme: dark)` layer to the generated CSS so `null` genuinely follows the OS in both apps; (b) keep the split and document that `null` means light in the dashboard |
| 12 | **Password recovery has a complete UI and no API.** `/{locale}/forgot-password` and `/{locale}/reset-password` ship in the dashboard (2026-09-08) together with their BFF routes, but `POST /auth/forgot-password` and `POST /auth/reset-password` do not exist — `auth.controller.ts` declares only `login`, `refresh`, `logout`, `logout-all`, and the `passwordResetToken` / `passwordResetExpiresAt` columns on `users` are written by nothing. Every request therefore returns 502 and the screens say the service is unavailable, deliberately, rather than confirming a mail that was never sent. The exact contract the UI expects is documented in `apps/dashboard/src/lib/auth/password-reset.ts`: forgot-password must answer **202 for every address**, registered or not (a 404 for an unknown address turns the form into a directory of who holds a federation account), and reset-password must consume the token single-use and revoke every session for that user. | (a) build the two endpoints to the documented contract; (b) route recovery through a manual admin process and remove the two screens |
| 13 | **No `Retry-After` on a lockout or a 429.** The lockout is a plain 401 distinguished only by its message text, so the dashboard cannot know how long the wait is. It states the policy ("up to fifteen minutes") and runs no clock; a countdown built from `LOCKOUT_DURATION_MINUTES` would be wrong on every retry, since the lock started at the fifth failure and not at the moment of the message. The client half is already built and tested (`lib/auth/lockout.ts`) — the countdown appears the day the header does, with no further frontend change. | (a) send `Retry-After` from the lockout 401 and the throttler's 429; (b) accept the static message permanently |
| 14 | **SSO providers exist in the schema and nowhere else.** `AUTH_PROVIDERS` lists `Local`, `Google` and `Microsoft`, but no OAuth endpoint exists. The login screen's provider buttons are built and gated behind `UAEAF_SSO_PROVIDERS`, which ships empty, so nothing renders. | (a) build `GET /auth/sso/:provider` and set the variable; (b) drop `Google`/`Microsoft` from `AUTH_PROVIDERS` so the schema stops promising what the platform does not do |
| 15 | **The Role/Accent token layer was never emitted.** `color.accent.information` / `.classification` / `.featured` are declared in `tokens/brand/brand.json` and registered Active by ADR-0051 (`DT-COLOR-015`), but `scripts/build.mjs` flattened only `color.brand.*` into `base.css` — so the layer existed in JSON and in nothing a stylesheet could reference, leaving consumers to hardcode the hex or reach past the layer into `--color-steel-blue-500` (forbidden by Chapter 7 §7.7). Fixed 2026-09-08 by emitting `color.accent.*` alongside `color.brand.*`; purely additive, no existing variable changed name or value. Not used by the auth screens — the tokens' own comments restrict them to content statistics, tags and editorial content, and `accent.featured` says "never CTAs, forms". | Closed. Owner review requested: the fix touches a generated design-system artefact. |
| 16 | **`color.semantic.warning` (Light) contradicts its own contrast rule.** §3.33.3 (TDR-004) records the decision literally as: *"`color/semantic/warning` now aliases `color/warning/700` (Light, High Contrast — AA-safe for text) / `color/warning/500` (Dark)"*, because the `.500` step is documented there as "fills/large-text/icon use only … fails 4.5:1 normal text". `tokens/semantic/colors.light.json:31` points Light at `{color.warning.500}` — measured **2.45:1** on the light surface, unusable for text at any size these screens use. ADR-0051's supersession register (§3.35.1) does not list TDR-004's alias clause among what it supersedes, so the two documents disagree and neither can be assumed to win. Same shape, smaller margin, for `info` (4.31:1) and `success` (4.37:1) at 13px. The auth screens are built so the outcome does not matter — semantic hues carry bars, borders and tints only, never text — but any component that needs coloured warning *text* is blocked until this is settled. | (a) repoint Light `semantic.warning` to `{color.warning.700}` per TDR-004 and re-verify info/success the same way; (b) add a separate `color.semantic.*-text` slot at the AA-safe step and keep `.500` for fills; (c) rule that ADR-0051 superseded TDR-004 and record that semantic hues are non-text-only |
| 17 | **`color-scheme: light dark` handed native controls to the OS.** `apps/dashboard/.../globals.css` declared it on `html`, so checkboxes, selects and scrollbars followed the operating system while every other surface followed the theme cookie. On a machine set to dark, an administrator using the dashboard in light mode saw Chrome's dark checkbox — a filled dark square — on a white page. Found 2026-09-08 while looking at the permission matrix, where it was not cosmetic: an **ungranted** permission rendered as a solid box and read as granted. Fixed by binding `color-scheme` to the `data-theme` attribute the layout already stamps. `apps/web` has its own stylesheet and its own `matchMedia` bootstrap and was not touched. | Closed. Worth checking whether `apps/web` has the same mismatch before its first theme-aware screen ships. |
| 18 | **The dashboard shell capped content at 1100px, against Chapter 5.** §Maximum Container is explicit: *"1440px for the Public Experience … **Fluid (100%) for the Dashboard with a fixed Sidebar (Operational Experience)** — uses the full available space for dense data presentation (PR-006)."* The `(app)` layout applied the public rule to the operational surface. The cost was visible on the roles screen: a 63-row, 8-column permission matrix scrolled sideways inside a container with several hundred unused pixels beside it. Fixed 2026-09-08 by removing the cap. | Closed. |
| 19 | **`POST /roles`, `PATCH /roles/:id/name` and `POST /users` return 500 for a missing `name`.** The DTOs carry only `@ValidateNested()` on `name`, and class-validator returns early on an undefined nested value — so the ValidationPipe accepts the body and Mongoose's `required: true` throws instead. With no exception filter registered anywhere in the API, that reaches the caller as a bare 500. The dashboard's route handlers now reject a missing or blank name with a 400 before forwarding, which makes client-side validation load-bearing rather than a courtesy. | **RESOLVED 2026-09-08.** `@IsDefined()` added beside `@ValidateNested()` on all three `name` properties, and a global exception filter registered in `main.ts` (`ApiExceptionFilter`, renamed from `DatabaseExceptionFilter` when item 25 gave it the error-code responsibility) — the API had none, which is why anything that was not already an `HttpException` became a bare 500. The filter passes every deliberate `HttpException` through untouched, maps a duplicate key to 409, a Mongoose `ValidationError` and a `CastError` to 400, and logs anything else in full while returning only "Internal server error." — an unexpected failure's message can carry a connection string. Covered by `required-localized-name.spec.ts` (11) and `api-exception.filter.spec.ts` (16). |
| 20 | **A duplicate email on `POST /users` is a 500, not a 409.** `UsersService.create` has no try/catch, and `isDuplicateKeyError`/`duplicateKeyField` — used by seven other services — are never used anywhere in `platform-administration`. MongoDB's `E11000` escapes unwrapped. The dashboard reads a 500 on a write as a conflict, which is the closest honest reading but is a guess about the cause. | **RESOLVED 2026-09-08.** `UsersService.create` now catches the duplicate key and throws `ConflictException` naming the field, with the global filter as the net behind it. Only the duplicate shape is translated — anything else is rethrown untouched, so a database outage is never reported as a naming clash. The dashboard's write classifier stopped inferring a conflict from any 500 at the same time; a 500 now means something genuinely broke. |
| 21 | **Four routes answer 200 with an empty body instead of 404.** `PATCH /roles/:id/name`, `PATCH /roles/:id/permissions`, `DELETE /roles/:id` and `PATCH /users/:id/roles` all return `null` when the id does not resolve, because `updateById` uses `findByIdAndUpdate` with no existence check. A caller that trusted the status would report a change that never happened; the dashboard treats an empty body as not-found. Related and worse: `assertNotSystemRole` reads through `findById`, which filters `archivedAt: null` — so an **archived** role is not recognised as a system role and **can be renamed**, and an archived role can be re-archived. | **RESOLVED 2026-09-08.** `assertNotSystemRole` is replaced by `assertEditable`, which reads through the new `RolesRepository.findByIdIncludingArchived` — so an archived role is seen as archived and refused with 404 instead of falling through the guard and being renamed. `rename`, `updatePermissions` and `remove` all now return the document or throw `NotFoundException`; `GET /roles/:id` and `GET /users/:id` 404 rather than answering 200 with an empty body. Covered by `roles.service.lifecycle.spec.ts`. |
| 22 | **`PATCH /users/:id/roles` does not check that the role ids exist.** `assignRoles` is a bare `updateById`; `@IsMongoId` validates only the format. A well-formed id for a role that never existed, or was archived, is stored silently and grants nothing. Compounding it, `DELETE /roles/:id` does not clear the id from the users holding that role — nothing in the codebase writes `users.roleIds` on deletion — so dangling references are normal, not exceptional. The dashboard only ever offers live roles and renders an unresolvable id as an archived-role chip rather than dropping it. | **RESOLVED 2026-09-08.** `RolesService.assertAssignable` validates every role id against the live collection and throws `BadRequestException` naming the ones that resolve to nothing; `UsersService.assignRoles` calls it before writing. `RolesService.remove` now archives first and then detaches the role from every account holding it, via the new `RoleAssignmentsRepository` — detaching first would strip the role from everyone and then leave it live if the archive failed. That repository binds the `User` model directly rather than importing `UsersModule`, which keeps the module graph one-directional (`UsersModule` -> `RolesModule`) with no `forwardRef`. |
| 23 | **Audit logs are write-only, and record no before-state.** `AuditLogInterceptor` writes a row for every successful write, but `previousValue` is never set — only `newValue` (the response body) — so there is no diff, and `api/src/modules/workflow/audit-logs/` has no controller, so nothing can read them over HTTP. The guiding design's "last activity" panel and its "access denials this week" indicator were both cut for this reason rather than filled with plausible-looking data. | **RESOLVED 2026-09-08.** `AuditLogInterceptor` now reads the record before the handler runs and stores it as `previousValue`, through the raw collection named by the route segment — generic over every module, no model registry. **Both** snapshots pass through the new `redactAuditSnapshot` first: the pre-image comes straight from storage and a stored user document carries `authMethods[].passwordHash`, so without it the trail would have become the richest credential target in the platform. A failed pre-read is swallowed — the row is still worth writing, and refusing the user's request over a snapshot would be a worse trade. `GET /audit-logs` added behind a new `auditLogs:Read` pair, filterable by entityType/entityId/actorId/action and paged (limit capped at 100). The repository gains reads only; it still exposes no update, no soft delete and no hard delete. |
| 24 | **No endpoint changes `users.accountStatus`.** Suspending, deactivating or reactivating an account is possible only by editing the database directly. A suspended account is refused at login and at refresh, but an access token already issued keeps working for its remaining life. The users screen shows the status and says plainly where it is changed, rather than offering a control that could not work. | **RESOLVED 2026-09-08.** `PATCH /users/:id/status` added behind `users:Update`. Moving away from `Active` revokes every live session via `AuthSessionsService.revokeAllForUser` — login and refresh already rejected a non-active account, but an access token issued a minute earlier kept working for the rest of its fifteen minutes, and a suspension that waits for that is not a suspension. Restoring to `Active` revokes nothing. Self-exclusion mirrors the existing self-assignment rule: `users:Update` is a general "edit a user" permission and locking yourself out, or quietly restoring your own suspended account, is not what it is for. The users screen gained the control and lost the note that said status could only be changed in the database. |
| 25 | **The dashboard told four different 403s apart by matching English message fragments.** `classifyWriteFailure` ran `text.includes("assign roles to yourself")` and two sibling checks against the API's prose, so the remedy shown to an administrator depended on wording that nothing tested and anyone could reword. It had already failed: the refusal on `PATCH /users/:id/status` (item 24, same day) is worded unlike the self role-assignment one, matched nothing, and reported as a missing permission — which no grant would have fixed. | **RESOLVED 2026-09-08 — ADR-0058.** Every error response now carries a `code` from a closed vocabulary (`api/src/common/errors/api-error-code.ts`), stamped centrally by `ApiExceptionFilter` and defaulted from the status, so the guarantee covers all ninety-odd throw sites rather than the four that opt in by name. The BFF translates through an explicit table, so a code added upstream degrades to the status default instead of reaching a screen with no copy for it. Found while fixing it: `test/e2e/support/test-app.ts` mirrored main.ts's prefix, versioning and validation pipe but **not** its exception filter, so every e2e spec was exercising an application whose error responses differed from the deployed one — now aligned, with `auth-rbac` asserting the default code end-to-end. The same pattern in the login path went with it: the lockout 401 now carries `accountLocked`, so the countdown on the sign-in screen no longer depends on the word "locked" appearing in the message. Covered by `api-error-code.spec.ts` (11), `api-exception.filter.spec.ts` (16), `refusal-codes.spec.ts` (4), `admin-write.spec.ts`, `upstream.spec.ts`, `login.spec.ts`, and the `auth-rbac` / `privilege-escalation` / `login-lockout` e2e specs. Still open: `password-reset.ts` matches message text against endpoints that do not exist yet (item 12). |
| 26 | **A 401 during an administration write reported as “could not reach the server”.** `classifyWriteFailure` had no 401 branch, so an access token rejected mid-edit fell through to the 502 default — sending the administrator to check their connection for a problem fixed by signing in again, and never telling them the edit had not been saved. | **RESOLVED 2026-09-08.** 401 maps to a `sessionExpired` code on every write surface, worded to say three things: the session ended, the change was not saved, sign in again. A new `WriteErrors` namespace holds one shared set of failure messages for every surface built from now on, and `write-error-copy.spec.ts` asserts that every `WriteErrorCode` has copy in both languages on every surface — a missing key renders as the key itself on the screen of the person who just lost their work, and nothing fails until that moment. That test immediately found `save_selfAssignment` missing on the roles screen. |
| 27 | **`POST /users` could not create a usable account.** It took a name, an email and a password and nothing else, so every new account started with no roles and could sign in to an empty dashboard until someone remembered a second request — and `personId` had no writer anywhere in the platform, so the column could never be set at all. | **RESOLVED 2026-09-08 — owner-approved backend change.** `CreateUserDto` gained optional `roleIds` and `personId`; `UsersService.create` validates both **before** writing (`assertAssignable` for the roles, `FederationPersonnelsService.findById` for the person) so a half-provisioned account is never created. `FederationPersonnelsModule` is imported one-directionally — nothing under federation-governance imports users back. The dashboard gained a create-account form: bilingual name, email, initial password, role checkboxes, and a personnel picker that is absent with a reason when `federationPersonnel:Read` is not held rather than shown empty. |
| 28 | **A role's description could be set once and never corrected.** `description` was added to the schema on 2026-09-07 precisely because a name like “News Approver” does not tell whoever is handing out access what the role permits — but only `POST /roles` accepted it, so a description written with a mistake in it could be fixed only by deleting the role and rebuilding it. There was also no UI at all for creating, renaming or archiving a role. | **RESOLVED 2026-09-08 — owner-approved backend change.** `RenameRoleDto` gained an optional `description`; omitting it leaves the stored one untouched and sending `null` clears it, and the two stay distinguishable. The route keeps its `/name` path — renaming it would break every existing caller for a naming improvement. The roles screen gained the whole record lifecycle: create (with no permissions, granted afterwards from the matrix), edit name and description, and archive behind a confirmation that states how many people lose access. All three are absent on a system role rather than disabled, because the API refuses them outright. |
| 29 | **The singleton content pages had no editor at all.** Twelve `*-page` collections are `GET` + `PUT` upserts upstream — hero title, standfirst, optional image, plus two extra prose fields on committees and a full contact block on contact-us — and nothing in the dashboard wrote any of them, so every one of them rendered an empty header on the public site. | **RESOLVED 2026-09-08.** One screen at `/[locale]/pages`: a list of the twelve beside a generated editor, with the list saying which are still empty (the question the screen is actually opened with). The form is generated from `static-pages.ts` rather than hand-written twelve times — ten of the pages are literally the same three fields, and twelve copies would be twelve places for a field name to be misspelled in a way nothing catches until an editor's text silently fails to save. The route handler looks the URL segment up in that same registry, which is its security boundary: `/api/admin/pages/news` can only ever reach `PUT /news-page`. `readPageBody` drops undeclared fields (`forbidNonWhitelisted` upstream rejects the whole request over one stray key) and omits unset ones rather than sending null. `PUT` was added to the BFF's allowed methods; it had only ever needed POST/PATCH/DELETE. Covered by `static-pages.spec.ts` (16), `page-editor.spec.ts` (9) and an extended `upstream.spec.ts`. |
| 30 | **The four workflow-governed governance pages cannot be edited at all.** `presidentMessagePage`, `aboutFederationPage`, `visionMissionPage` and `strategicPlansPage` expose Create, Read and Delete and **no update of any kind** — no `PUT`, no `PATCH`, and no `update` method on their services. `POST /revisions` snapshots content but writes nothing back to the entity row. Correcting a typo in the president's message therefore means deleting the record and rebuilding it, and `assertHardDeletable` blocks even that once any revision exists. | **OPEN — owner decision required.** These are deliberately excluded from the site-pages screen (see the header comment in `static-pages.ts`): an editor for them would be a form with nowhere to submit. Options: (a) add an update endpoint per page, mirroring the create DTO, leaving `publicationState` transitions to the workflow module; (b) route edits through `POST /revisions` and add a service path that applies an approved revision back onto the entity row; (c) accept delete-and-recreate as the intended lifecycle and say so in the docs. |
| 31 | **`previousValue` is never captured for a singleton `PUT`.** `AuditLogInterceptor.snapshotBefore` needs `request.params.id`, and a singleton route has none — so the twelve `*-page` upserts write an audit row with a `newValue` and no before-state. Confirmed live on 2026-09-08 (`coachesPage` Update row, `previousValue` absent). | **OPEN.** The before-state for these is unambiguous — there is exactly one row in the collection — so the interceptor could read it without an id. That is a change to shared interceptor behaviour affecting every module, so it is not being made without owner approval. Not a regression: these rows never had a before-state. |
| 32 | **A role could be granted delete on a resource it could not read.** `PermissionsGuard` compares exactly one `(resourceType, action)` pair and derives nothing, so `athletes:Delete` without `athletes:Read` produced an account that could destroy a record it could never list — the delete is issued from the screen the read populates, so the grant was incoherent rather than narrower. | **RESOLVED 2026-09-08 — owner decision.** `missingImpliedReads` (`common/constants/permission-implications.ts`) derives the rule from the catalogue itself, and `RolesService.assertCoherent` refuses an incomplete set on both `POST /roles` and `PATCH /roles/:id/permissions` with a 400 carrying `code: "impliedReadMissing"` and the exact pairs that would fix it. **Scope is deliberately narrow:** thirteen of the sixty-four resources carry a write action and no `Read` permission at all — the twelve singleton pages, whose read is public and therefore unguarded, and `notifications`, which is write-only — so the rule is silent there. Minting a read to imply would fail `permission-catalogue.spec.ts`, and guarding the pages' reads would break the public site. Verified live: `athletes:Delete` alone refused with `missing: ["athletes:Read"]` and no role written; `newsPage:Update` alone accepted. One pre-existing spec was corrected rather than the rule — it granted `roles:Update` with no `roles:Read`, which is precisely the case now outlawed. Covered by `permission-implications.spec.ts` (9) and five new `roles.service.spec.ts` cases. |
| 33 | **There was no way to get data out of the platform, and no permission that could have guarded one.** `PERMISSION_ACTIONS` had eight values, two of which (`HardDelete`, `EditProtectedData`) guard no route at all, and none of which expressed bulk extraction — while the approved IA (§4.8) defines an Export Centre screen and the client requirements register (#11) asks for periodic reporting. | **RESOLVED 2026-09-08 — owner decision.** `Export` added to `PERMISSION_ACTIONS` as an action, not a flat permission, because "download" applied to everything is not a grant anyone can reason about. Five real routes now carry it: `GET /athletes|clubs|users|contact-messages|audit-logs /export`, each returning RFC 4180 CSV as UTF-8 **with a byte order mark** — without it Excel on Windows decodes Arabic as the system codepage and every name arrives as mojibake. `toCsv` also defuses formula injection (`= + - @`), which matters because these files carry user-supplied names. Column lists are allow-lists, never dumps: `users` omits `authMethods` (which holds `passwordHash`) and `passwordResetToken`; `auditLogs` omits `previousValue`/`newValue`, which are arbitrary entity snapshots the display path redacts. `auditLogs` is capped at 10,000 newest rows and accepts the listing's own filters — the trail is append-only and unbounded. Verified live against a real server: all five return `text/csv; charset=utf-8`, byte-level BOM confirmed `EF BB BF`, Arabic intact, no credential in the users file. **Follow-up, not done:** reference columns (`nationalityId`, `emirateId`, `disciplineIds`) are omitted rather than dumped as ObjectIds; resolving them to names needs a join and is its own slice. Covered by `csv.util.spec.ts` (10), `exports.spec.ts` (7) and `athletes.service.export.spec.ts` (3). |
| 34 | **The API dev server and the integration test suite share one database.** `MONGODB_URI` in `api/.env` is `mongodb://127.0.0.1:27017/` with no database name, so Mongoose falls back to `test` — Mongo's own scratch database — for both the running app and every integration spec. With the server up, three suites fail (`AthletesPageService`, `MediaAssetsRepository`, `NotificationsRepository`); with it stopped, 70/70 and 448/448 pass. There is also an empty `uaeaf` database sitting beside it, which is what `.env.example` actually recommends. | **OPEN.** Not a code defect and deliberately not fixed: naming the database in `.env` would point the app at the empty `uaeaf` database and the dashboard would show nothing, so the move needs a data migration. Owner decision: (a) migrate `test` → `uaeaf` and name it in `.env`; (b) give the test suite its own database name; (c) document "stop the server before running the suite" and leave it. |
| 35 | **Roles and permissions were two screens.** The approved IA (`01-Information-Architecture.md` §4.8) defines exactly one, "Roles & Permissions", under Users & Access; the build had split it into `/roles` (the matrix) and `/permissions` (a read-only flat table). Editing a role's name also swapped the whole detail panel out, hiding that role's permissions at the moment the reader was deciding what to call it. And the matrix drew all nine action columns unconditionally, two of which (`HardDelete`, `EditProtectedData`) guard no route — 128 em-dash cells beside 165 real checkboxes. | **RESOLVED 2026-09-08 — owner-approved.** `/permissions` deleted (route, nav item, and its message namespace); its content lives on the roles screen as a **catalogue lens**, which also answers what the flat table could not: how many roles hold each permission, and which permissions no role holds at all. `visibleActions()` draws only columns the catalogue fills, so `Export` appears and the two dead columns do not. The name/description form now replaces the identity block only — the matrix stays on screen. Ticking a write action ticks the resource's read **visibly** (`toggleWithImpliedRead`), with a notice and a count in the save bar, because the API refuses the incoherent set outright (item 32) and a save that fails on a rule the screen never showed is worse than no rule. Three asymmetries are deliberate: unticking implies nothing, a resource with no guarded read is left alone, and an ungrantable read is not auto-ticked (it would fail the save with `ungrantablePermission`, naming a permission nobody chose). Verified on a real browser against the production build: `hydrated: true`, console clean on a fresh load, `spill: []` in ar/en x light/dark, ticking `athletes`-style Delete produced two checked boxes (`Read` + `Delete`) with the notice and "1 automatic" in the save bar, the edit form and matrix visible together, and the lens returning 170 rows with holder counts. Two design defects found by looking at the screenshot rather than the tests: two same-tone info boxes stacked above the matrix (the transient one moved down against the table) and the lens sitting inside the filter row, reading as a third filter (promoted to its own labelled row). Covered by `permission-matrix.spec.ts` (39), `permission-catalogue-lens.spec.tsx` (7), `navigation.spec.ts` and `write-error-copy.spec.ts`. |

## 9. DESIGN DEFECTS TO RECORD (Figma can no longer be fixed)

These must be corrected **in code**, and the spec files must note the divergence from the frames:
1. Policies desktop heroes `762:208` (AR) / `2757:2345` (EN) are empty frames; mobile has full hero content. Build from the mobile content.
2. EN Strategic Plan document card `2764:3821` contains untranslated Arabic strings.
3. EN Strategic Plan uses a different header master (80px, 6 nav items) than the approved AR master (95.4px, 9 nav items). The AR master is canonical.
4. EN homepage frame lacks the sponsor marquee bar that AR has.
5. Media Centre: AR desktop (Photo Albums) is canonical per owner ruling; EN + mobile frames are drift and are built to the AR version.

---

## 10. FIRST CONCRETE STEP

Not the whole plan. The first session should deliver **Phase 0 + slice 0 + slice 1**:
1. Finish the Figma harvest into `docs/design-specs/` (in progress — time-critical while read access lasts).
2. Resolve blockers §1.1, §1.2, §1.3 (owner rulings + implementation).
3. Slice 0 — homepage shell: `pages`/`pageSections` public read, section registry, admin ordering screen.
4. Slice 1 — Hero, end to end, with the Cinematic motion treatment.
5. Verification at 1440 / 768 / 390 × AR/EN per the established measurement discipline.

If the pattern proves out on Hero, slices 2–4 follow quickly (no new backend). The first new collection is not written until the pattern is validated.
