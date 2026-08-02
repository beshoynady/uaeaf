# Chapter 14 — SEO Guidelines

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                   | Used By                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Chapter 8 L8 (Entities: Athlete / Club / Championship / Event / Official / Coach) · Chapter 13 §12 (SEO Metadata in Content Model) · Chapter 5 (Performance) | Chapter 15 (AI Readability builds upon the same structural foundation) · Chapter 20 (Page Templates implements this chapter in practice) |

## Scope

**Covers:** Information architecture, heading hierarchy, Metadata, Structured Data (Schema.org), URL strategy, internal linking, image/video SEO, the relationship between performance and SEO, and Google News requirements.

**Does Not Cover:** AI-specific search engine optimization (→ Chapter 15, intentionally maintained as a separate chapter).

## Definitions

| Term                | Definition                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structured Data** | Data encoded in a standardized format (Schema.org/JSON-LD) that describes page content to search engines with greater precision than ordinary text |
| **Canonical URL**   | The single authoritative URL representing content that may otherwise be accessible through multiple paths                                          |

## Purpose

This chapter translates the objective defined in Chapter 0 §Design Goals #1 (**Global Digital Identity**) and the original Discovery objectives (**Official Brand Authority**, indexing every entity) into technically enforceable implementation rules.

---

## ADR-0025: SEO Architecture Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Authority**               | Product Decision (directly applies the decisions established in Chapter 0 Discovery)                                                                                                                                                                                                                                                                                                                                                                  |
| **Context**                 | Chapter 0 Discovery established clear SEO priorities: official brand authority, indexing every entity, eligibility for Google News, a dedicated page for every championship, and evergreen content. These priorities require a unified technical architecture that applies consistently across all entities rather than a custom solution for each page.                                                                                              |
| **Decision**                | Every indexable entity (Chapter 8 L8: Athlete / Club / Official / Coach / Championship / Event) **MUST** have a dedicated page with a clean, human-readable URL (`/athletes/{slug}` rather than `/page?id=123`) + matching Structured Data (Schema.org) + complete Metadata (Chapter 13 §12). A page **MUST NOT** consist solely of an empty state or a raw data table without descriptive textual content (Chapter 0 Discovery — explicit decision). |
| **Alternatives Considered** | Relying on Popups/Modals to present entity details (as in the legacy system) — explicitly rejected during Discovery because such content is not reliably indexable.                                                                                                                                                                                                                                                                                   |
| **Why This Decision**       | A dedicated, indexable page is a fundamental requirement for achieving **Official Brand Authority** — content that cannot be indexed effectively has little or no discoverability value to search engines regardless of its underlying quality.                                                                                                                                                                                                       |
| **Risks**                   | A large number of pages (thousands of athletes accumulated over the years) may result in Thin Content if quality is not managed. **Mitigation:** §5 Internal Linking and the Minimum Content Threshold ensure that every page provides meaningful value.                                                                                                                                                                                              |
| **Consequences**            | Every entity page template introduced in Chapter 20 **MUST** comply with this chapter in full.                                                                                                                                                                                                                                                                                                                                                        |

---

## 1. Information Architecture

URL paths **MUST** reflect the entity relationship structure defined in Chapter 8 L8 §SP.2 Entity Relationship Model.

For example, `/clubs/{slug}/athletes/{slug}` is preferred where the relationship is structurally meaningful over arbitrary flat URL structures.

This also enables Chapter 11 §PT-NAVIGATION-001 Breadcrumbs to be generated automatically from the same hierarchy.

## 2. Page Templates & Heading Hierarchy

Every page template (Chapter 20) **MUST** contain exactly one `<h1>` that accurately matches the entity name.

Heading levels **MUST** follow a valid hierarchical sequence from `<h2>` through `<h6>` without skipping levels.

This requirement aligns directly with Chapter 8 L1 §CMP-TYPOGRAPHY-001 and Chapter 6 §6.4.

## 3. Metadata Standards

The CMS directly consumes the SEO Metadata defined in Chapter 13 §12:

* Meta Title
* Meta Description
* Social Sharing Image

These fields **MUST** exist for every page without exception, including pages generated from operational data (such as an athlete profile), not only CMS-authored articles.

## 4. Structured Data (Schema.org)

| Entity                 | Appropriate Schema Type                        |
| ---------------------- | ---------------------------------------------- |
| Athlete (Chapter 8 L8) | `Person` + relevant sports-specific properties |
| Club                   | `SportsOrganization`                           |
| Championship / Event   | `SportsEvent`                                  |
| Article (Chapter 13)   | `NewsArticle`                                  |

Every entity page **MUST** contain embedded JSON-LD that accurately matches the data actually presented on the page.

Structured Data **MUST NOT** describe information that is not visibly represented in the corresponding page content, as this would conflict with search engine guidelines and may expose the page to search-engine penalties.

## 5. URL Strategy & Internal Linking

All URLs **MUST** follow the clean URL strategy defined in ADR-0025.

Every page **MUST** define a Canonical URL to prevent duplicate-content issues when the same content is accessible through multiple paths.

The platform **MUST** provide rich internal linking.

For example, an athlete profile **MUST** link to the athlete's:

* Club
* Championships
* Related articles

Chapter 13 §7 Content Relationships directly enables these links to be generated automatically.

## 6. Image / Video SEO

The platform directly consumes Chapter 8 L6 Media Foundation §M.7 (Alt Text).

A dedicated image/video sitemap **SHOULD** be provided where supported by the technical architecture (Chapter 21).

## 7. Performance & SEO Relationship

Core Web Vitals (Chapter 0 §Design Goals, Chapter 5) **MUST** be treated as a direct SEO consideration, not merely as a user-experience concern.

Page performance is therefore considered part of the platform's search visibility strategy, alongside content quality and technical SEO.

## 8. Google News & Discover Eligibility

Eligible CMS news content (Chapter 13 §CT-ARTICLE-001) **MUST** include:

* Accurate publication and modification timestamps
* `NewsArticle` Structured Data (§4)
* A high-quality image managed through Chapter 8 L6

These requirements establish the technical foundation for eligibility in Google News and related discovery surfaces, consistent with the priority established in Chapter 0 Discovery.

## 9. Evergreen Content Strategy

Evergreen content — such as Federation history, regulations, and records — **SHOULD** be maintained as dedicated `Page` entities (Chapter 13 §CT-PAGE-001) rather than being buried within a single "About the Federation" page.

This structure supports long-term authority, discoverability, and information architecture consistency, as established in Chapter 0 Discovery.

## 10. hreflang & Bilingual SEO

Every bilingual page (Arabic / English; Chapter 0 Discovery: no machine translation) **MUST** implement reciprocal `hreflang` annotations connecting the two language versions.

This ensures that search engines correctly understand the language relationship between equivalent pages and reduces the risk of treating the versions as duplicate or competing content.

## 11. Minimum Content Threshold

### Closing the Thin Content Risk Identified in ADR-0025

To prevent **Thin Content** as the number of entity pages grows (including thousands of athletes accumulated over the years), every entity page **MUST** meet a minimum threshold of meaningful descriptive content before it is published and/or indexed.

A page **MUST NOT** rely solely on empty fields, placeholders, or `"—"` values.

At an absolute minimum, an entity page **SHOULD** contain:

* A meaningful textual biography or description (Chapter 13 Hybrid Entity Boundary)
* At least one image
* At least one functional internal link (§5)

An entity page that does not meet this threshold **MAY** exist internally within the platform but **SHOULD** remain temporarily `noindex` until the required content is complete.

## 12. Redirect & URL Change Policy

When an entity URL changes — including a slug change, club merger, or athlete account removal — the system **MUST** issue a permanent **301 Redirect** from the previous URL to the new canonical destination.

An indexed legacy URL **MUST NOT** silently resolve to a 404 page when a valid successor exists.

This preserves accumulated SEO equity and prevents broken experiences for users arriving from search results.

This policy integrates with Chapter 8 L7 §EC.13 (Conflict Resolution) when two entities are merged and previously maintained independent URLs.

## 13. XML Sitemap Contract

The platform **MUST** maintain separate sitemaps by entity/content type rather than relying on a single massive sitemap for the entire website.

Examples include:

```text id="8wq3mr"
sitemap-athletes.xml
sitemap-news.xml
sitemap-clubs.xml
...
```

Sitemaps **MUST** be updated automatically when new content is published (Chapter 13 §6 `Published`).

Content in any state other than `Published` (Chapter 13 §6) **MUST NOT** appear in any Sitemap.

## 14. Duplicate Content Prevention

### Extending the Canonical Requirement in §5

Multiple representations of the same underlying data — such as filtered result pages or paginated views — **MUST** use a Canonical URL pointing to the primary, unfiltered version where appropriate.

The system **MUST NOT** allow every filter combination to be independently indexed as a separate page.

Otherwise, thousands of near-duplicate URLs may be generated, weakening rather than strengthening the site's overall authority.

---

## Do & Don't

### Do

* Validate that correct Structured Data exists before publishing any new page template.
* Link every entity to its related entities through internal linking (§5).

### Don't

* Do not publish an empty entity page or a page consisting solely of a raw data table without descriptive content (ADR-0025).
* Do not omit `hreflang` when introducing a new language version.

## Success Metrics

* **100%** of entity pages (Chapter 8 L8) contain matching Structured Data.
* **0** empty pages or raw data-table pages without descriptive content.
* **100%** of CMS news articles eligible for Google News contain `NewsArticle` Schema.
* **100%** of bilingual pages implement correct reciprocal `hreflang`.
* **0** indexed entity pages fall below the minimum content threshold (§11).
* **0** indexed legacy URLs resolve to 404 when a valid 301 Redirect is required (§12).
* **0** non-`Published` pages appear in any Sitemap (§13).
* **0** index bloat caused by filter combinations (§14).

## References

**Normative:** Chapter 0 (Discovery) · Chapter 8 L8 · Chapter 13 §12

**Implementation:** Schema.org · Google Search Central Documentation

**Informative:** Google News Publisher Guidelines

## Related Chapters

Chapter 8 L8 · Chapter 13 · Chapter 15 (AI Readability) · Chapter 20 (Final Implementation)

---

*End of Chapter 14. Next: Chapter 15 — AI Readability.*
