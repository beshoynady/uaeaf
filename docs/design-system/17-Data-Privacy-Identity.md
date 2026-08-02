# Chapter 17 — Data Privacy & Identity Architecture

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                                                                  | Used By                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Chapter 0 (Discovery — PDPL, Child Digital Safety Law, UAE PASS) · Chapter 8 L2 (§CMP-SIGNATUREPAD-001 for parental consent) · Chapter 8 L7 (§EC.4 Audit Logging) · Chapter 8 L8 (§SP.10) · Chapter 16 (§8) | Chapter 21 (Technical Architecture implements this chapter) · Chapter 22 (Governance) |

## Scope

**Covers:** Data classification, consent management — particularly for minors — data retention and deletion, data subject rights, digital identity architecture, and authentication-provider abstraction.

**Does Not Cover:** Detailed technical implementation, including encryption algorithms and database architecture (→ Chapter 21).

## Definitions

| Term                        | Definition                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Data Subject**            | The individual to whom personal data relates (e.g., athlete, coach, employee)                           |
| **Identity Provider (IdP)** | The service or system responsible for verifying a user's identity during authentication                 |
| **Documented Consent**      | Formally recorded consent with a clearly documented date and source; implicit consent is not sufficient |

## Purpose

This chapter translates the legal decisions established during Discovery — including the **PDPL** and the **Child Digital Safety Law** — into mandatory technical architecture governing every platform component that handles personal data.

---

## ADR-0028: Data Privacy Architecture

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Authority**               | International / National Standard (Federal Decree-Law No. 45/2021 — PDPL + Federal Decree-Law No. 26/2025 — Child Digital Safety)                                                                                                                                                                                                                                                                                                                                                      |
| **Context**                 | The platform stores real data for tens of thousands of athletes, including minors. Some age categories may fall below the legally relevant threshold. The Child Digital Safety Law, effective from January 2026, explicitly restricts the processing/publication of data relating to children below the applicable age threshold without documented and withdrawable parental consent.                                                                                                 |
| **Decision**                | All personal data **MUST** be classified at the point of entry (§1) according to its sensitivity. Data belonging to any user classified as a minor below the applicable legal threshold **MUST NOT** be publicly disclosed (Chapter 8 L8 §SP.10) without formally documented parental consent (§2), which **MUST** be withdrawable at any time. Every processing activity involving personal data **MUST** be auditable through an audit record consuming Chapter 8 L7 §EC.4 directly. |
| **Alternatives Considered** | Treating all athlete data under the same privacy classification without age-based distinction — rejected because this would conflict with the legal requirements applicable to minors below the relevant threshold.                                                                                                                                                                                                                                                                    |
| **Why This Decision**       | Legal compliance is non-negotiable. Enforcing privacy requirements architecturally provides stronger protection than relying solely on manual operational discipline.                                                                                                                                                                                                                                                                                                                  |
| **Risks**                   | Determining whether an individual is below the applicable legal threshold requires an accurate date of birth, which may not always be available during initial registration. **Mitigation:** Date of birth **MUST** be a mandatory field (Chapter 8 L2) for every new athlete record from day one, without exception.                                                                                                                                                                  |
| **Consequences**            | Every athlete registration/edit interface (Chapter 11 §PT-CRUD-001) **MUST** automatically evaluate and enforce the applicable classification when the record is saved.                                                                                                                                                                                                                                                                                                                |

## ADR-0029: Identity Provider Abstraction

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Authority**               | Engineering Decision (implements the original Discovery decision)                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Context**                 | Discovery established that the platform must not depend exclusively on UAE PASS. The initial release will use an internal authentication system with traditional registration, while remaining ready to support additional identity providers in the future.                                                                                                                                                                                                                                                |
| **Decision**                | The authentication architecture **MUST** use an **Identity Provider Abstraction** layer. Application business logic **MUST NOT** depend directly on the implementation details of any single identity provider. Initial release: Internal IdP + email/password authentication (Chapter 8 L2 §CMP-PASSWORDFIELD-001). Adding UAE PASS or any other provider in the future **MUST NOT** require restructuring business logic; it should require only adding a new Provider behind the same abstraction layer. |
| **Alternatives Considered** | Building the authentication architecture directly around UAE PASS from day one — rejected (Discovery: exclusive dependence is not required and the decision remains intentionally open).                                                                                                                                                                                                                                                                                                                    |
| **Why This Decision**       | Preserves architectural flexibility without delaying the initial launch while waiting for UAE PASS integration.                                                                                                                                                                                                                                                                                                                                                                                             |
| **Risks**                   | An additional abstraction layer may introduce unnecessary complexity into an otherwise simple initial implementation. **Mitigation:** The abstraction remains at the contract/interface level rather than requiring multiple fully implemented providers from day one.                                                                                                                                                                                                                                      |
| **Consequences**            | Chapter 21 will document the detailed technical implementation of this abstraction layer.                                                                                                                                                                                                                                                                                                                                                                                                                   |

---

## 1. Data Classification

| Classification        | Examples                                                                         | Rule                                                              |
| --------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Public**            | Athlete name, championship result, club name                                     | Publicly publishable (Chapter 14)                                 |
| **Restricted**        | Contact information, health-related details                                      | Administration panel only; access controlled (Chapter 8 L3 §N.19) |
| **Sensitive / Minor** | Personal data and images relating to minors below the applicable legal threshold | Fully governed by ADR-0028                                        |

## 2. Consent Management — Minors

Parental consent **MUST** be formally documented, including the date and method by which consent was obtained.

Chapter 8 L2 §CMP-SIGNATUREPAD-001 is one available mechanism for capturing such consent.

Consent **MUST** be withdrawable at any time, following the same principle established in Chapter 6 §6.9 for access preferences, applied here to legally required consent.

Withdrawal of consent **MUST** take effect immediately.

For example, the platform **MUST** immediately hide the actual image and transition to an Initials Avatar (Chapter 8 L8 §SP.10), rather than delaying enforcement until a later processing cycle.

## 3. Data Retention & Deletion

Every data category **MUST** have an explicitly defined retention period.

"Indefinite retention" **MUST NOT** be used as the default without periodic review.

Account or record deletion **MUST** follow the same distinction established in Chapter 13 §6c:

> **Archival ≠ Deletion**

Internal archival for legitimate legal or audit purposes **MAY** be permitted where appropriate.

However, public visibility **MUST** cease immediately upon a verified and valid deletion request where deletion rights apply.

## 4. Data Subject Rights — PDPL

The platform **MUST** provide a mechanism for each applicable fundamental right under the PDPL, including:

* Access to personal data
* Correction of personal data
* Deletion of personal data
* Restriction of processing
* Withdrawal of consent

Requests **MUST** be handled within a reasonable, documented timeframe.

The exact operational deadlines and procedures **MUST** be defined by the Federation's legal/privacy policy and remain outside the scope of this technical chapter.

## 5. Identity Provider Abstraction

### Practical Application of ADR-0029

```text id="c1k8dp"
Application Business Logic
        ↓
Identity Abstraction Layer
(Fixed Contract: login / logout / currentUser / session)
        ↓
Pluggable Provider Implementations
Internal IdP (Initial Release)
        |
        ├── UAE PASS (Future)
        |
        └── Other Provider (Future)
```

The application business layer **MUST** interact with the abstraction contract rather than directly with a specific provider implementation.

## 6. Session Management

The platform directly consumes the principles defined in Chapter 8 L4 §FB.24 Cross-Tab Synchronization.

Session expiration **MUST** be synchronized across all open browser tabs belonging to the same user session.

## 7. Audit & Compliance Logging

Every access to or modification of data classified as `Restricted` or `Sensitive/Minor` (§1) **MUST** generate an audit record through Chapter 8 L7 §EC.4.

The audit record **MUST** identify, at minimum:

* **Who** accessed the data
* **When** the access occurred
* **Which specific data or record** was accessed or modified

A vague or generic access log **MUST NOT** be considered sufficient for compliance purposes.

## 8. Third-Party Data Sharing Boundary

Any sharing of personal data with a third party — such as a potential external timing provider (Chapter 8 L8 ADR-0020), government authority, or World Athletics — **MUST** be limited to the minimum data necessary for the specific purpose (**Data Minimization**).

`Sensitive/Minor` data **MUST NOT** be shared without applying the same consent and privacy controls defined in §2.

## 9. Data Residency

Personal data relating to users in the UAE **MUST** be stored in accordance with applicable UAE data-residency requirements where such requirements apply under the PDPL and related regulations.

The exact technical implementation, including hosting/server location, **MUST** be determined in Chapter 21 in coordination with the actual legal requirements applicable to the platform.

---

## Do & Don't

### Do

* Classify every newly introduced data category at the design stage (§1), rather than after launch.
* Verify the athlete's age before allowing publication of their actual image (ADR-0028).

### Don't

* Do not publish a minor's image or personal data without formally documented, withdrawable consent.
* Do not couple application business logic directly to a single identity provider (ADR-0029).

## Success Metrics

* **100%** of athlete data is classified (§1) at the point of entry.
* **0** instances of minor data or images being published without documented consent.
* **100%** of access to Restricted/Sensitive data is recorded in the Audit Log.
* **0** instances of business logic directly depending on the implementation details of a specific identity provider.

## References

**Normative:** Federal Decree-Law No. 45/2021 (PDPL) · Federal Decree-Law No. 26/2025 (Child Digital Safety) · Chapter 0 (Discovery)

**Implementation:** Chapter 21 (Technical Details)

**Informative:** UAE Data Office Guidelines

## Related Chapters

Chapter 8 L2/L7/L8 · Chapter 13 · Chapter 16 · Chapter 21 · Chapter 22

---

*End of Chapter 17. Next: Chapter 18 — Notifications Architecture.*
