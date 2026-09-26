# ADR-0109 — Sessions expire by class, and the numbers live in one settings row with enforced bounds

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-26. |
| **Authority** | Product Owner brief, 2026-09-26 (decisions B4, B5). Inherits **Chapter 17 §6** (cross-tab synchronization, via Chapter 8 L4 §FB.24). |
| **Amends** | `siteSettings.sessionTimeoutMinutes` and `siteSettings.maxLoginAttempts` are migrated into the new `securitySettings` singleton and then **removed from the schema**. `config/auth.config.ts` keeps only the bounds. |
| **Confirmed 2026-09-26 (owner, Q3)** | Option 1, with one sharpening: the two `siteSettings` fields are **removed**, not left deprecated in place. A field marked deprecated is still a field the next reader can write to and the next query can read — which is a third copy that merely looks retired. The migration copies, a test asserts the fields are gone, and `securitySettings` is the only home. **Cross-tab (Q0.4):** expiry **and sign-out** reach every open tab via `BroadcastChannel`, falling back to the `storage` event where the channel is unavailable. |
| **Does not amend** | Immediate session revocation on suspension, which already works. · The access/refresh token shapes. · `siteSettings`' other fields or its public projection. |
| **Context** | The same two numbers already live in two places, and the schema comment says so: `auth.config.ts:10-11` holds `LOCKOUT_THRESHOLD = 5` and `LOCKOUT_DURATION_MINUTES = 15` as deliberate hard constants, while `site-settings.schema.ts:128-135` holds nullable `sessionTimeoutMinutes` and `maxLoginAttempts` marked `[RESTRICTED]`, whose own comment reads *"See the flagged overlap with `config/auth.config.ts` above."* The brief asks for a security-settings screen holding the same numbers, which built literally would make three homes for one value. Separately, sessions have one lifetime for everyone regardless of what the account can do, and Chapter 17 §6 requires expiry to synchronise across tabs — which nothing does. |
| **Decision** | **Three account classes with different session limits:** ordinary 2 h idle / 7 d absolute; sensitive 1 h / 1 d; Super Admin 30 min / 1 d. Sliding renewal while active, with a warning two minutes before expiry, a session list with revoke for both the user and an administrator, and immediate revocation on password change, role change or suspension. **Expiry, warning and sign-out synchronise across tabs** via `BroadcastChannel` with a `localStorage` fallback, per Chapter 17 §6. **One settings home:** a `securitySettings` singleton, writable only with `ManageSecuritySettings`, becomes the sole source; the two `siteSettings` fields are migrated then deprecated; `auth.config.ts` retains the floors and ceilings, which are **not** settable. Values outside the bounds are **refused, not clamped**. Three things are immutable and absent from the screen: 2FA for Super Admin, 2FA platform-wide, and the two-Super-Admin rule. |
| **Alternatives Considered** | **(A) Extend `siteSettings` rather than add a singleton.** Cheaper, and rejected: `siteSettings` is public-site configuration with a public projection and an editor audience, and mixing session security into it puts two very different blast radii behind one screen. **(B) Add the singleton and leave `siteSettings`' fields in place.** Rejected: three homes, and the next reader cannot tell which wins. **(C) Keep everything in `auth.config.ts` as constants.** Rejected: the brief requires an administrator-facing screen, and a redeploy is not a setting. **(D) Clamp out-of-range values instead of refusing them.** Rejected: a clamped value reads back as accepted, so an administrator who typed 90 days believes they have 90 days. **(E) One session lifetime for all accounts.** Rejected: it either inconveniences ordinary editors or leaves privileged sessions open for a week, and there is no single number that is right for both. **(F) Store the account class on the user.** Rejected for the same reason as ADR-0108 D1: it goes stale the moment a role changes. |
| **Why This Decision** | The duplication was already recorded as a known problem by whoever wrote the schema comment; this resolves it in the direction that leaves one writer and one reader. Bounds in code and values in data is the split that lets an administrator tune the platform without being able to disable its protections — the screen can make a session shorter or longer within a range the organisation has already agreed, and cannot make it infinite. |
| **Risks** | **The migration runs twice and overwrites a deliberate change.** **Mitigation:** the script is idempotent and copies only into an unset field, the `$setOnInsert` precedent from the permission seed. **An administrator sets the idle timeout to 15 minutes and the federation revolts.** **Mitigation:** "restore defaults" is on the screen, and every change is audited with the old value so it can be read back. **"Apply to open sessions" logs everyone out mid-edit.** **Mitigation:** it is opt-in per change rather than automatic, and the draft preservation in the spec's §10.2 (brief D2) means an interrupted form is not lost work. **The cache serves a stale setting after a write.** **Mitigation:** the write invalidates the cache in the same call, and a test asserts the next read reflects the new value. |
| **Consequences** | New `securitySettings` collection (singleton) and its routes, behind `ManageSecuritySettings` plus step-up. `authSessions` gains `idleExpiresAt` and `absoluteExpiresAt`. `auth.config.ts` becomes a bounds table. A migration script copies the two `siteSettings` values. The dashboard gains the settings screen, a session list, an expiry warning and cross-tab synchronisation. Changes email the other Super Admins — which, with no mail service in the repository, means the notice is logged until a provider is chosen. |

---

## D1 — Why refuse rather than clamp

A clamped setting is a silent disagreement between what the administrator asked
for and what the platform did. They typed thirty days, the screen said saved, and
the value is one day.

Refusing with the permitted range named is longer to read and impossible to
misunderstand. It is the same principle as the coherence refusal on roles, which
returns the exact pairs that would fix the grant rather than quietly adding them.

## D2 — The Super Admin ceilings are separate from the general maxima

The table carries a third column because a setting sane for an editor is not sane
for an account that can do everything: an 8-hour idle timeout is reasonable
generally and too long for a Super Admin, whose ceiling is one hour, and whose
trusted-device period is fixed at zero and is not a setting at all.
