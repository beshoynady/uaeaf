# UAEAF — Engineering Operating Model

**Scope:** this document governs *how* engineering work is executed — business-workflow understanding, architecture, TDD, security review, git hygiene, scope control, and communication cadence — for both frontend and backend work on the UAEAF platform. It does **not** define visual/design correctness. For that, the canonical authority remains `CLAUDE.md` §1 (Source of Truth Hierarchy) and the `docs/design-system/` documentation set. See `CLAUDE.md` §29 for how the two relate.

You are working on the UAEAF (UAE Athletics Federation) platform.

When the Superpowers plugin is available in your session (it is installed as a global/user-level plugin, not under this repository's own `.claude/skills/`, so a different machine or account opening this project may not have it), treat it as this project's default software-development methodology for engineering work. If it is not available in your session, follow the same conceptual process described below using your own judgment in place of the named Superpowers skill invocations.

This repository is not a simple CRUD application.

It is a federation platform containing:

* Federation governance
* Users
* Roles
* Permissions
* Organizations
* Athletes
* Officials
* Competitions
* Championships
* Events
* Results
* Qualifications
* Rankings
* Records
* Documents
* Media
* Website content
* CMS
* Approval workflows
* Publishing workflows
* Audit
* Security
* Public website experiences
* Administrative interfaces

Your responsibility is therefore not merely to write code.

You must understand the business process, data model, workflow, authorization boundaries, public website behavior, and operational consequences before implementation.

---

# 1. SUPERPOWERS AS DEFAULT DEVELOPMENT METHODOLOGY (WHEN AVAILABLE)

If the Superpowers plugin is available in your session, use its installed skills and workflows whenever they apply. Do not bypass them simply because a task appears small.

The expected lifecycle is:

```text
Requirement
    ↓
Brainstorming / clarification
    ↓
Business workflow understanding
    ↓
Architecture/design
    ↓
User approval
    ↓
Implementation plan
    ↓
TDD
    ↓
Implementation
    ↓
Code review
    ↓
Security review
    ↓
Verification
    ↓
Integration
    ↓
Final review
```

If Superpowers is available, use its skills for the corresponding steps, e.g.:

* brainstorming
* writing-plans
* using-git-worktrees
* test-driven-development
* subagent-driven-development
* executing-plans
* requesting-code-review
* receiving-code-review
* systematic-debugging
* verification-before-completion
* finishing-a-development-branch

Do not manually reproduce these workflows when the installed skills already provide them. If Superpowers is not available in your session, still follow the lifecycle above and the standards in this document — just without the named skill invocations.

---

# 2. IMPORTANT: DO NOT JUMP DIRECTLY TO CODE

When a feature, requirement, bug, schema, workflow, or idea is described:

DO NOT immediately write code.

First determine whether the task requires:

* clarification
* brainstorming
* architecture design
* database changes
* workflow changes
* authorization changes
* API changes
* frontend/public website changes
* Figma/FigJam changes
* migration
* tests
* security review

For non-trivial work, stop at the appropriate design/plan checkpoint before implementation.

---

# 3. UAEAF BUSINESS CONTEXT COMES BEFORE IMPLEMENTATION

Before implementing a feature, understand:

### Who

Who performs the action?

Examples:

* SUPER_ADMIN
* Federation administrator
* Federation employee
* Committee member
* Competition administrator
* Technical official
* Club administrator
* Athlete
* Public visitor

### What

What business operation is being performed?

### When

At what stage of the workflow can it happen?

### Why

What federation/business rule requires it?

### Result

What state should the entity enter afterward?

### Visibility

Who can see the result?

* internal users
* authorized federation users
* clubs
* athletes
* public website

### Approval

Does the action require:

* review
* approval
* publication
* rejection
* correction

Never implement a feature as generic CRUD if the actual business process is a workflow.

---

# 4. BUSINESS WORKFLOW FIRST

For workflow-driven features, explicitly model:

```text
Draft
 ↓
Submitted
 ↓
Under Review
 ↓
Approved
 ↓
Published
```

or the actual states required by the business.

Determine:

* valid states
* allowed transitions
* actor allowed to perform each transition
* required permissions
* validation rules
* side effects
* audit events
* public visibility
* rollback/correction behavior

Never allow arbitrary status changes simply because a DTO contains a `status` field.

---

# 5. DATABASE ARCHITECTURE

For every feature that affects persistent data:

First understand the existing domain model.

Then determine:

* entities
* ownership
* relationships
* references
* embedded data
* lifecycle
* indexes
* unique constraints
* soft deletion requirements
* audit requirements
* versioning requirements
* publication state

Avoid creating duplicate representations of the same business concept.

Avoid storing derived data unless there is a measurable reason.

Avoid over-normalization and over-denormalization.

Use the simplest model that correctly represents the federation's real business rules.

---

# 6. SCHEMA DESIGN STANDARD

Every schema must be reviewed at field level.

For each field determine:

* type
* required/optional
* default
* enum
* validation
* index
* unique constraint
* mutability
* sensitivity
* ownership
* lifecycle
* relation
* audit implications

Security-sensitive fields must have explicit handling.

Never expose secrets simply because Mongoose can serialize them.

---

# 7. AUTHORIZATION STANDARD

Authorization must not be treated as an afterthought.

Every protected operation must answer:

```text
WHO
CAN
DO WHAT
TO WHICH RESOURCE
UNDER WHICH CONDITIONS
AT WHICH WORKFLOW STATE
```

Use:

* authentication
* permissions
* role boundaries
* contextual authorization
* ownership checks
* workflow state checks

Use default-deny authorization.

Never rely only on frontend visibility.

The backend is the final authority.

---

# 8. PRIVILEGE ESCALATION RULE

A user must never be able to:

* grant themselves higher privileges
* create a role stronger than their authority
* assign a stronger role than they are authorized to grant
* modify their own authorization boundary indirectly
* bypass approval through direct API calls
* modify protected/system roles without authorization

Any feature touching:

* roles
* permissions
* users
* security
* approval
* publication

must receive an explicit security review.

---

# 9. PUBLIC WEBSITE VS ADMIN CMS

Always distinguish between:

### Internal system

Federation employees and authorized users.

### Public website

Visitors, athletes, clubs, media, and public users.

Do not assume that data stored in the backend should automatically be public.

Every content feature must define:

```text
Internal state
        ↓
Approval
        ↓
Publication
        ↓
Public visibility
```

The public website should consume the correct published representation rather than bypassing business workflow.

---

# 10. OFFICIAL RESULTS AND SPORTS DATA

Results, rankings, records, qualifications, and competition data are domain-sensitive.

Never treat them as ordinary CRUD.

For any sports-data feature determine:

* source of truth
* competition
* event
* athlete
* performance
* unit
* wind/legal conditions where applicable
* round/heat/final
* qualification
* validation
* official status
* approval
* publication
* correction
* audit trail

Do not allow an ordinary content editor permission to silently alter official competition data.

---

# 11. DOCUMENTS AND MEDIA

Documents, albums, images, videos, and website content may have different lifecycles.

Determine:

* ownership
* association
* publication state
* moderation
* replacement
* archival
* deletion policy
* public visibility
* audit requirements

Do not introduce duplicate media/document models when an existing reusable abstraction already exists.

---

# 12. VERSIONING

When a feature requires historical versions, determine whether the correct model is:

* revision
* immutable record
* audit event
* workflow snapshot
* current-state document

Do not automatically duplicate an entire collection for every edit.

Storage cost and query complexity must be considered.

---

# 13. FIGMA / FIGJAM SYNCHRONIZATION (ENGINEERING SIDE)

This section governs **when** a code/architecture task should touch Figma or FigJam. It is a companion to `CLAUDE.md` §18 Figma Safety, which governs **how** to safely edit once inside a Figma file — that procedure (inspect → identify source of truth → smallest safe change → verify → screenshot → report) still applies in full whenever this section triggers a Figma edit.

When the feature affects the agreed product/data architecture:

First inspect the existing Figma/FigJam architecture if the relevant integration is available.

Do not independently redesign the data model in code if the project architecture requires synchronization with Figma/FigJam.

The process should be:

```text
Business requirement
      ↓
Architecture
      ↓
Approval
      ↓
Code implementation
      ↓
Figma/FigJam synchronization
```

Never modify Figma/FigJam automatically unless the task explicitly requires it or the approved project workflow says it must be synchronized.

---

# 14. TESTING

Use TDD for implementation work.

The expected pattern is:

```text
RED
 ↓
minimal implementation
 ↓
GREEN
 ↓
REFACTOR
```

Tests must cover:

* happy path
* validation
* authorization
* forbidden operations
* workflow transitions
* edge cases
* concurrency where relevant
* security abuse cases
* regression scenarios

Do not claim a feature is complete because TypeScript compiles.

---

# 15. SECURITY

Security-sensitive changes require explicit verification.

For authentication/authorization/security features test:

* unauthorized access
* privilege escalation
* token misuse
* session revocation
* role manipulation
* permission manipulation
* data leakage
* rate limiting
* account state changes
* audit behavior

Never log secrets.

Never expose:

* passwords
* password hashes
* refresh tokens
* reset tokens
* MFA secrets
* OAuth secrets

---

# 16. GIT SAFETY

Git history is part of the project's integrity.

Before starting work:

```text
git status
git branch --show-current
git log -5 --oneline
```

Verify the working tree.

If Superpowers is available in your session, use its git-worktree workflow for non-trivial work.

Do not:

* force push
* reset branches
* rewrite history
* delete commits
* amend unrelated commits
* modify unrelated files

unless explicitly instructed.

Do not bypass the pre-push hook with `--no-verify` except in a documented emergency. `docs/engineering/quality-gates.md` defines what counts as one, and what the hook and CI each check.

NOTE — this section's original "if an unexpected commit appears, STOP and
report" instruction described an auto-commit investigation that the
project owner has since explicitly closed (root cause found and fixed).
Commits appearing outside your own tool calls should now be assumed to
be the owner's own manual git actions by default, not treated as an
incident requiring a stop-and-report, unless the owner asks you to look
into it again. The rest of this section's git-safety hygiene (no
force-push/reset/rewrite/amend-unrelated without explicit instruction)
still stands.

---

# 17. SCOPE CONTROL

Do not opportunistically refactor unrelated parts of the system.

If you discover an unrelated problem:

record it as:

```text
FOLLOW-UP
```

with:

* severity
* location
* reason
* recommended action

Continue only with the approved task.

---

# 18. OPEN DECISIONS

If the architecture depends on a business decision:

do not invent one silently.

Mark:

```text
OPEN DECISION
```

and provide:

* question
* recommended option
* alternative
* impact

However, do not ask questions that can be answered from:

* existing code
* existing architecture documents
* Figma/FigJam
* established UAEAF business rules
* previous approved decisions

---

# 19. IMPLEMENTATION STANDARD

After design approval:

1. Create implementation plan.
2. Break work into small tasks.
3. Identify exact files.
4. Identify tests.
5. Execute using the appropriate workflow (Superpowers skill if available, otherwise the equivalent manual process).
6. Review each task.
7. Run verification.
8. Perform final security review.
9. Perform final regression review.
10. Report exactly what changed.

---

# 20. DEFINITION OF DONE

A feature is NOT done when the code compiles.

A feature is done only when:

* business behavior is correct
* architecture is consistent
* database model is correct
* authorization is correct
* workflow is correct
* tests pass
* security scenarios pass
* no unintended regression exists
* documentation is updated where necessary
* migrations are handled
* Figma/FigJam is synchronized where required
* verification has been performed
* git state is known

---

# 21. COMMUNICATION STYLE

This section governs how a **new engineering feature** is presented before implementation. It is a companion to `CLAUDE.md` §26 Final Report Format, which governs the report at the **end** of an audit/remediation — the two apply at different points in the lifecycle and both stay in force.

Do not overwhelm with implementation details before they are needed.

For a new feature, first present:

### 1. What was understood

### 2. Business workflow

### 3. Proposed architecture

### 4. Important decisions

### 5. Risks

### 6. Implementation plan

Then wait for approval when the change is architectural or significant.

For small, low-risk changes, use judgment and proceed through the appropriate workflow (Superpowers skill if available).

---

# 22. NEVER OPTIMIZE FOR CODE VOLUME

Prefer:

* simple
* explicit
* maintainable
* secure
* testable
* domain-correct

over:

* abstractions for their own sake
* excessive generic services
* unnecessary repositories
* unnecessary design patterns
* unnecessary infrastructure
* unnecessary collections
* unnecessary fields

Apply YAGNI and DRY.

---

# 23. FINAL PRINCIPLE

This is not merely about generating code for UAEAF.

This is helping build a long-lived federation information system.

Therefore:

```text
Understand the domain.
Understand the workflow.
Design before coding.
Validate the design.
Write tests.
Implement minimally.
Review aggressively.
Verify with evidence.
Never silently weaken security.
Never silently change business rules.
Never silently modify unrelated parts.
```

Superpowers, when available in your session, is the default engineering methodology; when it is not, the lifecycle and standards above still govern the work directly.

The UAEAF architecture and approved business rules are the source of truth for what the system must become. For what is visually/structurally correct, canonical authority remains `CLAUDE.md` §1 and the design-system documentation set.
