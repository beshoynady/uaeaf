# Chapter 13 — CMS System (CMS Business Domain)

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                                    | Used By                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Chapter 8 L2 (Form Foundation) · Chapter 8 L7 (Approval Workflow §EC.7) · Chapter 9 (Content Rules) · Chapter 11 (PT-CRUD-001, PT-WIZARD-001) · Chapter 12 (DB-WORKSPACE-001) | Chapter 14 (SEO consumes Metadata from this chapter) · Chapter 20 (Public Website pages consume CMS content) |

## 1. Purpose & Scope

**Covers:** The CMS as a **Business Domain** — content modeling, publishing lifecycle, editorial permissions, scheduling, localization, and integration boundaries with the rest of the platform.

**Does Not Cover:** Any new UI component (Chapter 8 is the sole source of truth) — editor interfaces **MUST** be built exclusively from Chapter 8 L2 (Forms) and Chapter 12 §DB-WORKSPACE-001.

## Definitions

| Term             | Definition                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content Type** | A defined content data model (e.g., news article, static page, athlete profile) with a fixed set of fields                                               |
| **Block**        | A flexible, composable content unit within a rich editor (e.g., text, image, quote)                                                                      |
| **Headless CMS** | An architectural pattern that separates content management (authoring, approval) from the final presentation layer (public website, future applications) |

---

## 2. ADR-0024: CMS as a Headless Business Platform

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Authority**               | Product Decision (establishes the foundation for all decisions in this chapter)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Context**                 | The platform contains multiple business domains (News, Events, Championships, Clubs, Athletes, Static Pages). Without clear boundaries, each domain could implement its own publishing, scheduling, and approval logic, effectively turning the platform into a collection of inconsistent "mini CMS systems."                                                                                                                                                                                                                                                                                                                                             |
| **Decision**                | The CMS **MUST NOT** be treated as a simple news editor — it is the **Single Source of Truth** for all publicly published content. No Module (News/Events/Championships/Clubs/Athletes/Pages/Media) **MUST NOT** publish its content independently — public-facing content **MUST** pass through the CMS whenever public publishing is required. The CMS **MUST** be exclusively responsible for: **Editorial Workflow, Publishing, Scheduling, Versioning, Localization, and SEO**. Operational Business Modules **MUST** remain responsible only for their raw operational data (e.g., athlete data, match results), not for how that data is published. |
| **Alternatives Considered** | Each Module manages its own publishing (separate news editor, separate events editor, etc.) — rejected because it creates an inconsistent editorial experience (Chapter 0 Discovery: the CMS is used daily and extensively; the media team needs one unified experience rather than multiple tools).                                                                                                                                                                                                                                                                                                                                                       |
| **Why This Decision**       | Aligns with the standard Headless CMS architectural pattern and preserves the intent of Chapter 9 ADR-0021 (Content Consistency) at the architectural level, not merely at the wording level.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Risks**                   | Routing every publication through the CMS may slow down simple operational content updates (e.g., an immediate score update that does not require a full editorial review). **Mitigation:** §5 Editorial Workflow **MAY** provide a shortened **Fast-track** path for low-risk operational content, explicitly documented as an exception rather than a violation of the principle.                                                                                                                                                                                                                                                                        |
| **Consequences**            | Every subsequent section in this chapter (§3–§14) **MUST** be built upon this central principle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Hybrid Entity Boundary — Critical Clarification to ADR-0024

Entities such as an Athlete and a Club (Chapter 8 L8) have **two clearly separated dimensions**:

```text
Operational Data (name, club, age category, results)
→ Owned by the operational Business Module; does not pass through the Editorial Workflow

Editorial Content (biography, profile article, selected display images)
→ Fully owned by the CMS; subject to §5 and §6 in their entirety
```

The separation between these two dimensions **MUST** be explicit in the database design (Chapter 21, forthcoming).

The system **MUST NOT** allow a field such as "Athlete Biography" to be edited directly from the operational Athlete Management interface outside the CMS approval lifecycle, even if doing so appears faster for administrative users.

---

## 3. CMS Architecture

The CMS **MUST** be implemented as a separate **Headless layer** consumed by the public website (Chapter 20) through a defined data interface, with no direct coupling to the presentation layer.

This aligns with Chapter 8 L8 ADR-0020, applying the same data-source abstraction principle to editorial content.

## 4. Content Model

| Content Type       | Description                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Page**           | Static page (e.g., About the Federation, Privacy Policy)                                                                                   |
| **Article**        | News article / editorial article (Chapter 0 Discovery: the most frequently used content type on a daily basis)                             |
| **Media Asset**    | Managed image/video asset (consumed through Chapter 8 L6 Media Foundation)                                                                 |
| **Category / Tag** | Content classification mechanism (integrates with Chapter 9 §CR-8.1 Terminology Registry to prevent duplicate or inconsistent terminology) |
| **Block**          | Flexible content unit within a rich editor (Rich Text; Chapter 0 Discovery: WYSIWYG)                                                       |
| **External Media Coverage** | A UAEAF-curated reference to a third-party publication *about* the Federation (newspaper, sports outlet, independent media) — **not** an Article, not authored by UAEAF. See ADR-0042 (§15) for the full model and the ownership/attribution boundary. |

## 5. Editorial Workflow

The CMS directly consumes the **Chapter 8 L7 §EC.7 Approval Workflow Contract** — no workflow redefinition is permitted:

```text
Draft → In Review → Approved | Rejected
```

A **Fast-track** path **MAY** be provided for low-risk operational content (see ADR-0024 §Risks).

Such a path **MUST** be explicitly documented as an exception for each content type permitted to use it. It **MUST NOT** become an implicit general rule.

## 6. Publishing Lifecycle

This is maintained as an independent section rather than a subsection of §5 because Chapter 0 Discovery, Chapter 8 L8, and Chapter 20 rely on it directly:

```text
Draft → In Review → Approved → Scheduled → Published → Archived
```

Every transition between these states **MUST** be recorded through Chapter 8 L7 §EC.4 Audit Logging.

`Published` **MUST** be the only state visible to the public website (Chapter 20).

Any other state **MUST NOT** be exposed outside the administrative interface under any circumstances.

### 6a. Content Preview Contract

Before any transition to `Published`, the editor/approver **MUST** be able to preview the content **exactly as it will appear to the public audience**, rather than viewing raw content only inside the editing form.

The preview **MUST** consume Chapter 8 L4 §CMP-DRAWER-001 or a dedicated preview window that renders the actual Chapter 20 page templates.

Content **MUST NOT** be approved (`Approved`) without at least one visual preview.

### 6b. Draft Autosave Contract

A draft currently being edited **SHOULD** be periodically autosaved (consuming the principle defined in Chapter 8 L2 §F.10 Form Submission Contract in a silent form that does not require an explicit button press).

Unsaved content **MUST NOT** be lost due to connectivity interruption or an unintended browser closure.

### 6c. Archival vs. Deletion — Critical Distinction

`Archived` **MUST NOT** be treated as synonymous with "Deleted."

Archived content **MUST** remain fully preserved and recoverable (consistent with the principle established in Chapter 8 L7 §EC.11), while remaining invisible to the public website.

Permanent deletion **MUST** be an entirely separate operation governed by Chapter 8 L7 §EC.3 Destructive Action and the Confirmation Dialog contract.

Archiving **MUST NOT** automatically result in permanent deletion.

## 7. Content Relationships

CMS content — particularly `Article` — **MUST** generally support explicit relationships with operational entities (Chapter 8 L8).

For example, a news article about an athlete's victory **MUST** support an explicit relationship to that athlete's record (`Athlete Reference`).

The athlete's name **MUST NOT** be stored solely as free-form text without an actual data relationship.

This ensures that the article can automatically appear on the athlete's profile page, providing direct integration that supports Chapter 14 SEO and improves the user experience without requiring duplicate manual work.

## 8. Scheduling & Publishing

Chapter 0 Discovery determined that complex publishing schedules are not currently required, with the initial workflow being limited to draft → approval → publication.

However, Chapter 8 L7 §EC.12 Long-Running Operation Contract provides the technical foundation should scheduling be required in the future.

`Scheduled` in §6 is therefore structurally reserved but **NOT necessarily activated in the initial release**.

## 9. Localization / Multi-language Content

This follows Chapter 0 Discovery and Chapter 9 §CR-1.6 exactly:

The system **MUST NOT** use machine translation.

Every Content Type **MUST** provide separate Arabic and English content fields, with professionally authored and independently maintained content for each language.

A single source version **MUST NOT** be automatically translated into the other language.

## 10. Media Management

The CMS fully consumes Chapter 8 L6 Media Foundation and Chapter 8 L2 §CMP-FILEUPLOAD-001/ImageUpload.

No parallel image-upload or image-processing logic **MUST** be introduced within this chapter.

## 11. Permissions & Editorial Roles

The CMS builds upon the platform-wide roles and permissions system (Chapter 0 Discovery: functional roles within the administration panel — previously open and to be finalized in Chapter 22).

Typical editorial roles include:

* `Editor` — authors content and submits it for review.
* `Reviewer/Approver` — reviews and approves content through Chapter 8 L7 §EC.7.
* `Publisher` — holds final publishing authority; this role **MAY** be combined with the Approver role or separated depending on the Federation's organizational structure.

The system **MUST** enforce Chapter 8 L3 §N.19 Authorization Boundary.

Any editorial element for which the current user does not have permission **MUST NOT** be rendered or exposed in the first place.

## 12. SEO & Metadata

Every `Article` and `Page` **MUST** provide dedicated Metadata fields, including:

* Meta Title
* Meta Description
* Social Sharing Image

These fields **MUST** remain separate from the visible title and content.

The complete technical implementation is defined in Chapter 14 (SEO).

This section documents only the requirement that these fields **MUST** exist within the Content Model (§4).

## 13. Integration Boundaries

The public website (Chapter 20) **MUST** consume CMS content through a defined data interface (API-agnostic, following the same abstraction principle established by Chapter 8 L8 ADR-0020).

There **MUST NOT** be direct coupling between the public website presentation layer and the internal CMS database.

This ensures that the CMS implementation can be replaced or evolved in the future without breaking the public website.

## 14. CMS Registry

A centralized registry of content types, following the same registry principle established in Chapters 11 and 12:

| Content Type ID | Name           | Supported Publishing Lifecycle                                         |
| --------------- | -------------- | ---------------------------------------------------------------------- |
| CT-ARTICLE-001  | Article / News | Full Lifecycle (§6)                                                    |
| CT-PAGE-001     | Static Page    | Full Lifecycle                                                         |
| CT-MEDIA-001    | Media Asset    | Simplified (No full Editorial Workflow; governed by Chapter 8 L6 only) |
| CT-EXTERNALMEDIA-001 | External Media Coverage | Full Lifecycle (§6) — **NEW, ADR-0042 (§15)** |
| CT-BOARDMEMBER-001 | Board of Directors Member | Full Lifecycle (§6) — **NEW, ADR-0046 (Chapter 8 L8)** |
| CT-COMMITTEE-001 | Committee | Full Lifecycle (§6) — **NEW, ADR-0047 (Chapter 8 L8)** |
| CT-GOVDOCUMENT-001 | Governance Document (Regulation/Policy/Guide/Form/Decision) | Full Lifecycle (§6) — **NEW, ADR-0048 (Chapter 8 L8)** |

`CT-PAGE-001` field set amended by **ADR-0044 (§16)** — optional `featured_image` field added.

`CT-BOARDMEMBER-001` fields: `name{ar,en}`, `position{ar,en}`, `photo?`, `bio?{ar,en}`, `term{from,to}`, `order`, `isChairman`, `isActive`. Full definition, rationale, and consuming component (`CMP-BOARDMEMBERCARD-001`) live in Chapter 8 L8 ADR-0046 (kept with the component to avoid duplicating the same content in two chapters) — this row exists so the CMS Registry stays a complete index of every content type.

`CT-COMMITTEE-001` fields: `name{ar,en}`, `description?{ar,en}`, `chair` (reference → `CT-BOARDMEMBER-001`), `order`, `isActive`. Full definition, rationale, and consuming component (`CMP-COMMITTEECARD-001`) live in Chapter 8 L8 ADR-0047.

---

## 15. ADR-0042: External Media Coverage — Content Type & Governance

**Client requirement (verbatim intent):** the Federation needs a way to showcase what external newspapers, sports publications, and independent media organizations publish *about* UAEAF.

| Field | Details |
| --- | --- |
| **Status** | Accepted (content model, ownership, editorial, external-link, localization, and SEO layers only — **IA placement, navigation, and Homepage exposure are explicitly out of scope for this ADR**, see Consequences) |
| **Authority** | Product Decision, in response to a confirmed client requirement |
| **Context** | UAEAF has no existing way to represent content published *about* the Federation by outlets it does not control. The two closest existing concepts — `CT-ARTICLE-001` (Article/News) and Chapter 8 L6's Media Centre (`CMP-GALLERY-001`) — both assume UAEAF-owned/authored content. Neither can represent a third-party publication without either misattributing authorship or duplicating copyrighted text. |
| **Decision** | Add `CT-EXTERNALMEDIA-001` ("External Media Coverage") as a new CMS content type (§4, §14), distinct from `CT-ARTICLE-001` and from the Media Centre's `CMP-GALLERY-001`: <br>**1. Conceptual boundary:** `CT-EXTERNALMEDIA-001` is a **reference record**, not a content-authoring record. UAEAF owns the CMS record (which outlet, which URL, curatorial framing); the external publisher owns the article itself. The full article body **MUST NOT** be copied or reproduced inside the CMS — only a short, UAEAF-authored framing excerpt/summary, plus the outbound link. <br>**2. Fields (conceptual, not a schema):** `title.ar` / `title.en` (UAEAF's own bilingual framing headline for the entry — not a translation of the external headline), `publication_name`, `publication_logo` (Media Asset reference, `CT-MEDIA-001`), `article_url` (external, required, validated), `publication_date`, `excerpt.ar` / `excerpt.en` (UAEAF-authored short summary, not copied text), `source_image` (Media Asset reference, optional — publication's own image if rights allow, else `publication_logo` is used, never a scraped image without rights clearance), `language` (of the *external* article, single value — not bilingual, since UAEAF does not control it), `category`/`topic` (optional, reuses Chapter 9 §CR-8.1 taxonomy), `featured` (boolean), `homepage_visible` (boolean), `status` (reuses §6 Publishing Lifecycle, unchanged), `createdAt`/`updatedAt`. <br>**3. Editorial workflow:** reuses §5/§6 unchanged (`Draft → In Review → Approved → Published/Archived`, Chapter 8 L7 §EC.7) — no new workflow. Before `Approved`, the reviewer **MUST** verify: the `article_url` resolves to the claimed publication (source verification), the publication name/date are accurate, and the framing excerpt does not imply UAEAF authorship or endorsement it does not have. <br>**4. External link governance:** every rendered `article_url` **MUST** follow Chapter 8 L3's existing External Link rule unchanged — clear visual distinction (icon) + `target="_blank"` + `rel="noopener noreferrer"` — this ADR does not create a new link pattern. Link text **MUST** follow Chapter 9 §CR-4.2 (describe the destination, e.g. "Read the full article" / "قراءة المقال الكامل" — never "Click here"). Dead-link handling: a `article_url` that fails validation **MUST** be treated as a content-quality issue caught at the editorial-review stage (§6a Preview Contract already requires a live preview before `Approved`); periodic re-validation of already-published links is a Backlog item (Chapter 24), not solved by this ADR. <br>**5. Component reuse:** `CMP-CARD-001` (Chapter 8 L5) already anatomy-matches this need exactly (Image/Icon + Title + Short Description + Metadata + Optional Action) — **no new component is created.** `publication_logo` reuses Chapter 8 L1 Avatar/Badge conventions already cited as `CMP-CARD-001`'s internal parts, and **MUST** use `object-fit: contain` per Chapter 8 L6 §M.9 (same third-party-mark rule already governing Sponsor and Membership logos — no cropping/recoloring of a publication's mark). <br>**6. Localization:** Chapter 13 §9 applies unmodified — `title`/`excerpt` **MUST** be independently authored in Arabic and English (no machine translation), regardless of what language the external article itself is written in. If the external publisher has no equivalent-language original, the CMS record's own bilingual framing text still exists in both languages (UAEAF is describing the coverage, not translating it) — the outbound link simply goes to whatever language the source actually published in, and this **MUST NOT** be disguised as a native-language article. <br>**7. SEO:** per ADR-0025, dedicated indexable pages are reserved for Chapter 8 L8 entities (Athlete/Club/Official/Coach/Championship/Event) — an external media item is not such an entity, and per Chapter 14 §14 (Duplicate Content Prevention) and the general anti-thin-content principle, **individual external articles MUST NOT get a dedicated UAEAF detail page** that merely re-presents an excerpt and an outbound link. Whether a listing/archive surface for these entries is itself indexable is an implementation-architecture question, not decided here (see Consequences). |
| **Alternatives Considered** | (A) Model it as a variant of `CT-ARTICLE-001` — rejected: would blur authored-by-UAEAF vs. published-about-UAEAF, the exact confusion the client requirement and Chapter 13's Hybrid Entity Boundary principle both warn against. (B) Store it only as unstructured links in a static page (`CT-PAGE-001`) — rejected: loses editorial workflow, structured metadata, and the ability to feature/curate entries, none of which a static page provides. (C) Copy full external article text into the CMS for a "complete" reading experience — rejected outright: copyright risk, editorial-authenticity risk, and directly contradicts the client requirement's intent (showcasing *external* coverage, not republishing it). |
| **Why This Decision** | Gives the Federation a governed way to curate third-party credibility signals without ever implying it authored or owns content it did not write — preserving the same authorship-integrity principle Chapter 13's Hybrid Entity Boundary already established for Athlete/Club editorial content, applied here to an external-authorship case instead of an internal one. |
| **Risks** | A CMS user could still author a framing excerpt that reads as if UAEAF wrote the original article. **Mitigation:** editorial review (§5/§6, point 3 above) is mandatory, not optional, and the rendered UI **MUST** visually distinguish "Featured in the Media" entries from "Official UAEAF News" (Chapter 9 terminology consistency, §CR-1.7 applies — one clear registered term for this concept, not several). |
| **Consequences** | `CT-EXTERNALMEDIA-001` is added to §4 and §14 of this chapter. **This ADR does NOT decide:** (a) the navigation/route/URL for a listing or archive of these entries, (b) whether such a listing is itself indexable, (c) whether this content appears on the Homepage, or (d) the feature's public-facing name in either language. Those are Information Architecture and Homepage decisions, logged as an open item in `01-Information-Architecture.md` §15, not invented here. No Page Template (Chapter 20) is registered until that IA decision is made — registering a `TMP-` id without a resolved route would be exactly the kind of invented decision this framework's governance model exists to prevent. |

---

## 16. ADR-0044: Static Page Featured Image — Optional Field Addition to CT-PAGE-001

**Trigger (verbatim intent):** while scoping the Figma build of `TMP-STATICPAGE-001`, a concrete content need surfaced that the original `CT-PAGE-001` field set (Title, Body Rich Text, admin/SEO metadata — no dedicated page-level image) could not represent: the President's Message page requires a portrait photo of the Federation President in a fixed, predictable position, not merely an image floated somewhere inside a body paragraph.

| Field | Details |
| --- | --- |
| **Status** | Accepted |
| **Authority** | Product Decision (Project Owner, this session), in response to a confirmed content requirement |
| **Context** | `CT-PAGE-001` (§14) as originally specified has no field for a page-level image. Some static pages under `TMP-STATICPAGE-001` (e.g. President's Message) need a person portrait rendered in a consistent template position; others (Privacy Policy, Terms of Use, Sitemap-adjacent legal pages) have no legitimate need for any image at all. A single shared template/schema for all static pages (per this chapter's own §14 design intent) must accommodate both cases without forking into two content types. |
| **Decision** | Add one new **optional** field to `CT-PAGE-001`: `featured_image` (Media Asset reference → `CT-MEDIA-001`, optional, PUBLIC visibility once Published, not multilingual — an image has no language). When present, `TMP-STATICPAGE-001` renders it in the page's header/intro area (see Chapter 20 template note). When absent, the template collapses cleanly to a text-only header with no reserved gap — presence of this field is a per-record editorial choice, not a per-template mode. This field is distinct from the SEO Open Graph image (§17): the OG image is for social-share previews only and is independently overridable, though it **MAY** default to reusing `featured_image` when no separate OG image is set, to avoid double-uploading the same asset. |
| **Alternatives Considered** | (A) Rely solely on inline images inside the Rich Text body — rejected: inline-body image placement/sizing is uncontrolled per editor and cannot guarantee the consistent portrait position a page like President's Message needs. (B) Require an image field to be filled on every static page — rejected: decorative/unnecessary for policy and legal pages, and contradicts Chapter 27 §39.4's restraint principle (resist adding elements without a real need). (C) Split into two content types ("static page with image" vs. "static page without") — rejected: adds structural complexity and a second workflow to maintain for what is only ever a single optional field, contradicting this chapter's own single-shared-model intent for static pages. |
| **Why This Decision** | A minimal, backward-compatible schema addition: every existing/future `CT-PAGE-001` record with no image continues to render unchanged, while pages that genuinely need one (President's Message, confirmed; potentially About the Federation, at editorial discretion) gain a governed, consistent place to put it — one template, one schema, optional field. |
| **Risks** | Inconsistent editorial usage — an editor adds a decorative image to a page that doesn't need one, or omits one from a page that should have it (e.g. a future President's Message update). **Mitigation:** this is a content-quality judgment call at editorial review (§5/§6, already mandatory before `Published`), not a new workflow or a new review gate. |
| **Consequences** | `docs/product/03-Content-Data-Structuring-Document.md` §8.19 (`ENT-022 Static Page`) field table is amended to add this field. `TMP-STATICPAGE-001` (Chapter 20) **MUST** support both image-present and image-absent render states cleanly — no fixed gap, no broken layout either way. No change to Publication State/Workflow (§5/§6 unchanged). This ADR does **not** decide which specific existing/future static pages should populate this field — that remains an editorial/content decision made per page, not a design-system rule. |

---

## Do & Don't

### Do

* Route every new publication decision through ADR-0024: **"Does this content need to pass through the CMS?"**
* Consume Chapter 8 L7 §EC.7 for every approval state rather than creating a new workflow.

### Don't

* Do not create an independent publishing system for any Module (News, Events, etc.) outside the CMS.
* Do not expose any state other than `Published` to the public website, regardless of the reason.

## Success Metrics

* **100%** of publicly published content passes through the Editorial Workflow (§5) or an explicitly documented Fast-track path.
* **0** instances of content in a non-`Published` state being visible to the public website.
* **100%** of Content Types contain separate SEO Metadata fields (§12).
* **0** direct coupling between the public website and the internal CMS database (§13).
* **0** content approvals (`Approved`) without a prior visual preview (§6a).
* **0** content loss caused by connectivity interruptions without Autosave protection (§6b).
* **0** archived content being automatically treated or deleted as permanent Deletion (§6c).
* **100%** of news articles associated with an athlete or club contain an explicit Content Relationship rather than relying solely on free-form text (§7).

## References

**Normative:** Chapter 0 (Discovery) · Chapter 8 L2/L6/L7 · Chapter 9

**Informative:** Headless CMS Architecture Patterns (General Conceptual Reference)

## Related Chapters

Chapter 8 (All Dependencies) · Chapter 9 · Chapter 11/12 (Composition) · Chapter 14 (SEO) · Chapter 20 (Final Consumption) · Chapter 22 (Complete Roles & Permissions Model)

---

*End of Chapter 13. Next: Chapter 14 — SEO & AI Search Guidelines.*
