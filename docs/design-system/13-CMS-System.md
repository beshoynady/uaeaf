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
