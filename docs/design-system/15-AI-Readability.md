# Chapter 15 — AI Readability

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                       | Used By                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chapter 14 (SEO — shared structural foundation) · Chapter 8 L8 (Entities) · Chapter 13 (Content) | Chapter 16 (AI Platform Strategy — AI capabilities *inside* the platform, whereas this chapter addresses the platform's *external* readability by AI systems) · Chapter 20 |

## Scope

**Covers:** How platform pages are structured and authored so they can be accurately understood by AI-powered search engines and assistants (including ChatGPT Search, Gemini, Perplexity, Copilot, and similar systems) when retrieving information about the Federation.

**Does Not Cover:** AI capabilities implemented within the platform itself (writing assistants, chatbots, etc. → Chapter 16), or traditional SEO (→ Chapter 14). This chapter builds upon Chapter 14 rather than duplicating it.

## Definitions

| Term                     | Definition                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI Extraction**        | The process by which an AI system extracts a specific fact or answer from a web page to present it directly to a user                             |
| **Answer-First Content** | A content-authoring approach that places the core answer or fact at the beginning of a paragraph rather than after lengthy contextual information |

## Purpose

Traditional search engines (Chapter 14) primarily rank pages, whereas AI assistants **extract direct facts** to formulate answers.

This chapter ensures that information about UAEAF — such as an athlete's name, a championship result, or the Federation's founding date — can be extracted **accurately**, without ambiguity, inference, or avoidable errors.

---

## ADR-0026: AI Readability Strategy

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Authority**               | Product Decision (Chapter 0 Discovery: an explicitly stated priority — "The platform must be understandable to AI Search systems")                                                                                                                                                                                                                                                                                                                         |
| **Context**                 | AI assistants are becoming an increasingly important source of public information about the Federation (e.g., "Who won the 2025 championship?"). An inaccurate or missing answer can damage the credibility and authority of the Federation's official digital presence.                                                                                                                                                                                   |
| **Decision**                | Every entity page (Chapter 8 L8) **MUST** present **one clear, unambiguous, extractable fact** within the first 2–3 sentences of its content (**Answer-First**; no lengthy introduction before the core fact). The platform **MUST** rely on Semantic HTML and Structured Data (Chapter 14 §4) as primary sources of truth. Visible text and Structured Data **MUST** always match exactly, with no contradictions that could confuse an extraction model. |
| **Alternatives Considered** | Relying exclusively on traditional SEO (Chapter 14) under the assumption that it is sufficient for AI systems as well — rejected because AI extraction patterns differ materially from conventional search ranking; AI systems seek direct answers rather than simply ranking multiple results.                                                                                                                                                            |
| **Why This Decision**       | Ensures that UAEAF can serve as a reliable source of Emirati athletics facts in AI-generated answers rather than being treated as a secondary, ambiguous, or unavailable source.                                                                                                                                                                                                                                                                           |
| **Risks**                   | AI models may still hallucinate information despite source-side quality controls — this is ultimately outside the website's complete control. **Mitigation:** §4 Fact Consistency minimizes the likelihood of source-induced extraction errors to the greatest practical extent.                                                                                                                                                                           |
| **Consequences**            | Every entity page template (Chapter 20) **MUST** be reviewed against this chapter in addition to Chapter 14.                                                                                                                                                                                                                                                                                                                                               |

---

## 1. Answer-First Content Structure

The opening paragraph of every entity page **MUST** directly answer the most obvious question about that entity.

For example:

> "Ahmed is an Emirati athlete who won the gold medal at the 2025 [Championship Name]."

The page **MUST NOT** begin with lengthy general context (e.g., "The Federation was founded in...") before presenting the core fact users are likely seeking.

## 2. Semantic HTML Priority

Chapter 6 §6.4 **MUST** be applied with heightened strictness in this context.

AI systems rely heavily on semantic structure to understand the context and meaning of information.

Appropriate semantic elements such as `<article>`, `<time>`, and `<address>` **MUST** be used where applicable.

Generic `<div>` elements **MUST NOT** be used where a semantically appropriate HTML element exists.

## 3. Structured Data as the Primary Truth Source

The platform directly consumes the Schema.org requirements defined in Chapter 14 §4.

Every number, date, name, and factual value represented in JSON-LD **MUST** exactly match the corresponding value presented in visible page content.

The requirement established by Chapter 14 ADR-0025 §Consequences is therefore strengthened here: any discrepancy between Structured Data and visible content **MUST** be treated as a content integrity defect because it may cause AI systems to extract the incorrect value.

## 4. Fact Consistency Across Pages

The same fact — such as an athlete's date of birth or the Federation's founding date — **MUST** use the exact same value wherever it appears across the platform.

Contradictory values across pages **MUST NOT** exist.

A publishing inconsistency between two pages can cause AI systems to encounter conflicting first-party sources from the same domain, increasing the likelihood of an incorrect extraction or answer.

## 5. Citation-Friendly Formatting

Important facts, such as records and results, **SHOULD** be expressed as self-contained sentences that remain understandable when quoted independently from their surrounding context.

For example:

> "Ahmed set a national record in the 100-meter sprint with a time of 10.21 seconds in 2025."

The platform **SHOULD** avoid fragmenting a single important fact across multiple interdependent sentences when doing so makes the fact difficult to extract or quote independently.

## 6. FAQ & Direct Answer Blocks

General informational pages — such as Federation information and regulations — **SHOULD** provide direct question-and-answer sections where appropriate.

Where applicable, these sections **MAY** use `FAQPage` Structured Data, extending the Schema.org strategy established in Chapter 14 §4.

This structure directly supports common AI-style queries such as:

> "What are the requirements for...?"

## 7. AI Crawler Access Policy

The public website **MUST** allow recognized AI crawlers to access public content where such access is intended.

Examples include:

* `GPTBot`
* `Google-Extended`
* `PerplexityBot`
* Other recognized AI crawlers as they become relevant

The `robots.txt` policy **MUST NOT** arbitrarily block AI crawlers from public content that is intentionally intended to be discoverable.

Blocking such access without an explicit business or legal reason would conflict with the objective established in Chapter 0 §Design Goals.

## 8. Avoiding AI-Confusing Patterns

The platform **MUST NOT** present conflicting values for the same metric without explicitly explaining the reason for the difference.

For example, the platform **MUST NOT** report:

* "500 athletes" in one location, and
* "120 athletes" elsewhere,

without clarifying that one figure represents "registered athletes" while the other represents "currently active athletes."

Ambiguous terminology and unexplained numerical differences **MUST** be treated as potential information-integrity issues because ambiguity in the source can directly lead to incorrect AI extraction.

---

## Do & Don't

### Do

* Start every entity page with the core fact immediately (§1).
* Verify that visible content matches Structured Data before publishing (§3).

### Don't

* Do not allow conflicting values for the same fact across different pages (§4).
* Do not arbitrarily block AI crawlers from content intentionally intended to be public (§7).

## Success Metrics

* **100%** of entity pages begin with a clear, core fact within the opening paragraph.
* **0** discrepancies between visible content and Structured Data for the same page.
* **0** conflicting values for the same fact across different platform pages.
* **100%** of recognized AI crawlers are permitted to access intended public content through `robots.txt`.

## References

**Normative:** Chapter 0 (Discovery) · Chapter 14

**Informative:** OpenAI / Google / Perplexity Crawler Documentation (Technical references subject to change and therefore reviewed periodically outside the scope of the freeze)

## Related Chapters

Chapter 14 (Shared Foundation) · Chapter 8 L8 · Chapter 13 · Chapter 16 (AI inside the platform — fundamentally different from this chapter) · Chapter 20

---

*End of Chapter 15. Next: Chapter 16 — AI Platform Strategy.*
