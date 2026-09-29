# ADR-0123 — A reference path is declared `MongooseSchema.Types.ObjectId`, and a guard fails when one is not

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-29. Closes debt B2. |
| **Authority** | Product Owner decision, 2026-09-28, recorded in `docs/superpowers/plans/2026-09-26-authz-authn.md` ("Batch 3b — the stored-reference type bug"), executed 2026-09-29. |
| **Numbering note** | ADR-0122 was taken by the header session on the same day. This record is therefore ADR-0123. |
| **Amends** | The `@Prop` declaration of every reference path in the API — 146 declarations across 57 schema files. Nothing about what is stored: `_id` remains the document key, and no response changes shape. |
| **Does not amend** | The identifier **spelling** in responses, which is ADR-0121 and a different problem. · The TypeScript property type, which stays `Types.ObjectId` and was always right — only the `type:` option was wrong. |
| **Context** | Measured: **364 of 365** `ObjectId` paths resolved to `Mixed` at runtime. The cause, identified for the first time in this work: `@nestjs/mongoose` 12.0.0's `inspectTypeDefinition` treats bson's `ObjectId` class as a *nested class*, builds it an empty schema `{}`, and the path becomes `Mixed`. Mongoose 9.9.4 on its own yields `ObjectId` correctly, so the fault is the decorator layer, not the ORM. The array form is worse and was missed by the first reading of the defect: `type: [Types.ObjectId]` produced an array with **no caster at all**, and casting a valid hex id through it returned a `String`. With no cast at either end, a `create` that cast by hand stored an `ObjectId` while a `PATCH` passing a raw value stored a **string** — and query filters were not cast either, so MongoDB's type-first comparison made the two invisible to one another. `RoleAssignmentsRepository.detachRole` was the measured casualty: an account whose `roleIds` held a string kept a role that no longer existed, silently. |
| **Decision** | **Every reference path is declared `type: MongooseSchema.Types.ObjectId`** (or `[MongooseSchema.Types.ObjectId]`), which is the one spelling `@nestjs/mongoose` does not collapse. A **guard reads the project's own schemas at runtime and fails when any path carrying a `ref` does not resolve to an `ObjectId`** — including the array case, which it distinguishes by casting rather than by reading `instance`, because a sound and a broken array path are indistinguishable by their caster. An **idempotent conversion script** converts references already stored as strings; it derives its work list from the schemas rather than a hand-written list, defaults to a dry run, refuses to coerce a value that is not a valid id, and **is run by the owner**, not by an implementer. |
| **Alternatives Considered** | **(A) Leave it and compare with `.toString()` everywhere.** Rejected: it is the status quo, it depends on every future author knowing, and it had already failed once in `detachRole`. **(B) Upgrade or patch `@nestjs/mongoose`.** Rejected: no release supporting this project's NestJS 12 fixes it, so it would be a regression rather than an upgrade — the same finding that kept `@nestjs/throttler` out. **(C) Declare the paths as `String` and store hex.** Rejected: it discards `ref`, `populate`, and every index MongoDB builds on an `ObjectId`, to work around a decorator bug. **(D) Convert the stored data and leave the declarations.** Rejected: it fixes today's rows and nothing about tomorrow's write. |
| **Why This Decision** | The root cause is one wrong spelling repeated 146 times (CLAUDE.md §19 — prefer the root-cause fix over patching descendants). The guard is what makes it stay fixed: a `@Prop` written the old way tomorrow is a red test rather than a silently untyped path, which is exactly how the original defect survived. |
| **Risks** | **A write that previously stored a non-castable value silently now throws.** That is the intended behaviour, but it converts a silent corruption into a visible failure, which can surface as a new error on a path nobody was watching. **Mitigation:** the full API suite was run in path-scoped chunks and every failure attributed. **A query that matched a string-stored value by passing a string now stops matching it** — see D1, which is a live consequence and not fully resolved. **The conversion script is never run**, leaving the declarations correct and some rows stale. **Mitigation:** the script defaults to a dry run so its own report is the evidence, and `reset-roles` independently refuses to run while any role link is stored as a string. |
| **Consequences** | 146 declarations changed across 57 schema files. One new guard in the `core` tier. One new script, written and not run, placed in the script order **before** `reset-roles` (E1). `RoleAssignmentsRepository.detachRole` now writes through the driver collection — see D1. |

---

## D1 — Why `detachRole` goes through the driver collection, and what it cost elsewhere

The plan's stated lasting fix for `detachRole` was `$in: [oid, hex]`, "the shape
`media-references.ts` already uses". **This ADR's own change invalidated it**,
and that was measured rather than reasoned: on a real `ObjectId` path Mongoose
casts *every member* of an `$in` before the query leaves, so the two spellings
arrive as one value twice. The filter that looked like it covered both covered
one.

`detachRole` therefore sends its write through the driver collection, where the
two spellings survive as written, and its TSDoc records why — so the next reader
does not "simplify" it back into a model write.

**The same reversal applies to `findMediaAssetReferrers`, and there it is not
yet resolved.** That scan's two-spelling `$in` was what let the `mediaInUse`
refusal — the check standing between a permanent delete and a published page —
see a reference stored either way. On a typed path it now sees one. The hazard
is **latent**: every production write casts before writing, so no string-stored
reference is known to exist. It is recorded here rather than quietly fixed
because the remedy is a decision, not a patch: either that scan moves to the
driver collection as `detachRole` did, or the conversion script runs first and
the inert half is deleted. **Open, owner's decision.**

## D2 — What the guard must assert, and why `instance` is not enough

For a scalar path, `instance === 'ObjectId'` is the whole test.

For an array path it is not. A sound array-of-ObjectId path and a broken one
both report `instance: 'Array'`, and on this version both report
`caster === undefined` — the first-draft assertion written against them passed
on broken input. The discriminating signal is behavioural: cast a valid hex id
through the path and see whether an `ObjectId` or a `String` comes back. The
guard asserts that, and a mutation reverting an **array** declaration is part of
the evidence that it works, precisely because that is the case an `instance`
check would wave through.

## D3 — The 29 paths that declare no `ref`

The conversion script sweeps paths carrying a `ref`, because that is what makes
a path a reference. Twenty-nine id-shaped paths declare none — `entityId` on the
polymorphic collections chief among them, where the target type is a sibling
field rather than a declared model. They are **outside the script's sweep**, and
the script names them on every run so the gap is visible before it is run rather
than discovered after. Whether it should cover them is **open, owner's decision**.
