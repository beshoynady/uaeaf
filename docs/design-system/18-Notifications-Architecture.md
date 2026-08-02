# Chapter 18 — Notifications Architecture

**Document:** UAEAF Enterprise Design System Framework v1.0.0
**Chapter Status:** Accepted | **Last Updated:** This Session | **Document Owner:** Project Owner

> **Status: Frozen (Baseline v1.0).** Any change after the freeze **MUST** be introduced exclusively through a new ADR or a documented Backlog item.

## Depends On / Used By

| Depends On                                                                                                                                                                                          | Used By                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Chapter 8 L4 (Toast/Snackbar, §FB.23 Rate Limiting, §FB.24 Cross-Tab Sync) · Chapter 9 (§CR-6.x Notification Content) · Chapter 8 L7 (§EC.12 Long-Running Operation) · Chapter 17 (Consent/Privacy) | Chapter 13 (Content Pending Review Notifications) · Chapter 20 |

## Scope

**Covers:** The architecture of the independent, multi-channel Notification Engine — notification types, triggers, preferences, reliability, and cross-channel consistency.

**Does Not Cover:** The visual design of individual notifications (Chapter 8 L4 is the sole source of truth), or notification copy/content (Chapter 9 §CR-6.x is the sole source of truth).

## Definitions

| Term                    | Definition                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Notification Engine** | A centralized service independent of business logic that receives events and distributes notifications through the appropriate channels. |
| **Channel**             | A mechanism used to deliver a notification (In-App, Email, Push, SMS/WhatsApp).                                                          |
| **Delivery Guarantee**  | The level of assurance that a notification is actually delivered (At-most-once, At-least-once).                                          |

## Purpose

This chapter translates the Discovery decision — **“Independent Multi-Channel Notification Engine”** — into a complete architectural model governing every notification across the platform, from content approval (Chapter 13) to the completion of large-file uploads (Chapter 8 L7).

---

## ADR-0030: Notification Engine Architecture

| Field                       | Details                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                  | Accepted                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Authority**               | Engineering Decision (implements the original Discovery decision)                                                                                                                                                                                                                                                                                                                                                  |
| **Context**                 | Multiple notification sources exist across the platform (Chapter 13 content approval, Chapter 8 L7 import completion, Chapter 8 L5 live result updates). Without a unified engine, each Module would implement its own delivery logic, resulting in fragmentation and making centralized control difficult.                                                                                                        |
| **Decision**                | Every event that triggers a notification **MUST** pass through **one centralized Notification Engine** that is independent of business logic. Any Module **MUST NOT** send notifications directly (Email, SMS, etc.) outside the engine. The engine **MUST** receive an abstract event (type, recipient, contextual data) and determine the appropriate channel(s) based on §3 user preferences and §2 event type. |
| **Alternatives Considered** | Each Module directly invokes Email/SMS services — rejected because it makes centralized enforcement of §5 Rate Limiting and §6 user notification preferences difficult.                                                                                                                                                                                                                                            |
| **Why This Decision**       | A single control point guarantees consistency across §5 (notification grouping, Chapter 8 L4 §FB.23) and §6 (respecting user notification opt-out preferences) across all event sources.                                                                                                                                                                                                                           |
| **Risks**                   | A centralized engine introduces a potential Single Point of Failure if the engine becomes unavailable. **Mitigation:** Failure of the Notification Engine **MUST NOT** prevent the underlying business operation from completing (e.g., successful data import **MUST NOT** depend on successful notification delivery). This follows the same principle as Chapter 8 L4 §FB Widget/Feedback Failure Isolation.    |
| **Consequences**            | Every new feature that requires notifications **MUST** emit an event to the engine rather than implementing notification delivery itself.                                                                                                                                                                                                                                                                          |

---

## 1. Channel Types

The following channel model is derived from Discovery:

| Channel          | Use Case                                                                        | Priority                                         |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| **In-App**       | Toast/Snackbar (Chapter 8 L4), Notification Center                              | Always Primary                                   |
| **Email**        | Digests, formal confirmations                                                   | Secondary                                        |
| **Push**         | Future mobile application                                                       | Future; architecture-ready from day one (PR-008) |
| **SMS/WhatsApp** | Critical events only (Chapter 0 Discovery: not intended for every notification) | Critical Only                                    |

---

## 2. Notification Triggers

Every notification-triggering event **MUST** be classified as one of the following:

* `Critical` — security- or account-critical events, such as session expiration (Chapter 17 §6).
* `Workflow` — workflow actions requiring user attention, such as content awaiting approval (Chapter 13 §5).
* `Informational` — non-critical operational updates, such as completion of a process (Chapter 8 L7 §EC.12).
* `Social/Engagement` — future audience engagement and interaction events.

---

## 3. Notification Preferences

This section consumes the principles established in Chapter 17.

Every user **MUST** be able to control notification preferences by type and channel (enable/disable).

`Critical` notifications (§2) **MUST NOT** be fully disabled, because account and security notifications are not subject to personal notification preferences.

`Informational` and `Social` notifications **MUST** be fully configurable by the user.

---

## 4. Notification Content

Notification content is governed directly by Chapter 9 §CR-6.1/6.2/6.3.

This chapter **MUST NOT** introduce an independent notification-copy system or duplicate the content rules defined in Chapter 9.

---

## 5. Rate Limiting & Grouping

The Notification Engine **MUST** apply the same principles defined in Chapter 8 L4 §FB.23 across **all notification channels**, not In-App notifications only.

For example, an Email notification should summarize **“12 updates”** as a grouped digest rather than sending 12 separate emails within a short period.

Grouping and rate limiting **MUST** be enforced centrally by the Notification Engine.

---

## 6. Cross-Channel Consistency

The same event **MUST NOT** produce contradictory information across different channels.

For example, an In-App Toast **MUST NOT** communicate one message while the Email notification for the same event communicates a conflicting message.

The Notification Engine defined in ADR-0030 **MUST** provide a single source of notification content before distributing it across channels.

---

## 7. Delivery Reliability

Failure of delivery through one channel (for example, a bounced Email) **MUST NOT** prevent delivery through other enabled channels for the same user.

Notification channels **MUST** operate independently at the delivery level, following the same isolation principle defined in Chapter 8 L4 §FB Widget Isolation, applied here to notification channels.

---

## 8. Unsubscribe & Compliance

Every Email/SMS notification, except `Critical` notifications (§2), **MUST** provide a clear and direct mechanism for unsubscribing.

This requirement aligns with general legal requirements concerning unsolicited communications and respects the principles established in Chapter 17 regarding user control over communication data and preferences.

---

## Do & Don't

**Do:**

* Emit an event to the centralized Notification Engine for every new notification requirement (ADR-0030).
* Respect the notification classification defined in §2 when determining whether a notification can be disabled.

**Don't:**

* Do not send Email/SMS directly from any Module outside the Notification Engine.
* Do not make successful completion of a core business operation dependent on successful notification delivery.

## Success Metrics

* **100%** of notifications are issued through the centralized Notification Engine, with no direct notification delivery calls from individual Modules.
* **0** core business operations fail because of notification delivery failure (§Risks Mitigation).
* **100%** of `Critical` notifications cannot be fully disabled (§3).
* **0** content inconsistencies exist between channels for the same event (§6).

## References

**Normative:** Chapter 0 (Discovery) · Chapter 8 L4/L7 · Chapter 9 §CR-6.x · Chapter 17

**Implementation:** Chapter 21 (Full Technical Implementation Details)

## Related Chapters

Chapter 8 L4/L7 · Chapter 9 · Chapter 13 · Chapter 17 · Chapter 21

---

*End of Chapter 18. Next Chapter: Chapter 19 — Calendar & Localization.*
