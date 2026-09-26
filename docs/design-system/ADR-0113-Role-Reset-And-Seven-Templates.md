# ADR-0113 — Existing roles are cleared once, and seven editable templates replace them

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-26. |
| **Authority** | Product Owner brief, 2026-09-26 (decisions E1, E2). |
| **Amends** | Nothing in code. Two run-once scripts, plus a marker in the users directory. |
| **Does not amend** | The Super Admin role, which both scripts leave untouched. · `seedSuperAdminRole`'s behaviour. · `RolesService.remove`'s archive-then-detach order. |
| **Context** | The platform seeds exactly one role — Super Admin — so every other role in the database was built by hand against a 215-pair matrix, and after ADR-0103 the matrix has roughly 412 pairs. Roles built under the old vocabulary are stated in verbs that are changing: `Delete` becomes `Archive`, `Approve` stops being one platform-wide grant, and 30 resources gain `Update`. A role assembled before those changes describes authority that no longer means what it said. Meanwhile an administrator facing the new matrix with no starting point will either grant too much or spend an afternoon per role. |
| **Decision** | **Reset (E1):** one script archives every role except `isSystemRole` ones and reports what it did — which roles, and which accounts are now role-less. Accounts are **kept**, not deleted, and the users directory marks them "بدون دور / No role". Open workflow steps assigned to people who can no longer act are routed to the admin, per ADR-0106. **Templates (E2):** a second script seeds **seven ordinary roles** — `isSystemRole: false`, so an administrator may edit, copy or delete them: Content Manager, Editor (`own` only, no publishing), Reviewer & Approver, Sports Data Officer (with `ViewSensitive` on athletes), Governance Officer (no `PermanentDelete`), Staff Administrator (`users:Create` + `AssignRoles`, no `ManageRoles`), Executive Viewer (`ViewReports` everywhere, no writes). **`PermanentDelete` appears in no template.** Re-running never overwrites an administrator's edit. |
| **Alternatives Considered** | **(A) Migrate existing roles to the new vocabulary instead of clearing them.** Rejected, and it was the first instinct: the mapping is not one-to-one. A role holding the old global `workflowInstances:Approve` would have to become nine per-type grants, which is a decision about what that role is for — not a rename. Automating it would silently widen authority. **(B) Keep existing roles and add the templates beside them.** Rejected: two generations of roles on one screen, one of them describing verbs that no longer exist, and no way for an administrator to tell which is which. **(C) Seed the templates as `isSystemRole: true` so they cannot be broken.** Rejected: the brief requires them editable, and rightly — a template is a starting point, and a federation's actual roles will not match seven guesses. **(D) Delete the role-less accounts too.** Rejected: an account is a person, and the person still works there. **(E) Include `PermanentDelete` in the Governance Officer template.** Rejected explicitly by the brief, and it is the right default: an irreversible capability should be granted deliberately, never inherited from a starting point. |
| **Why This Decision** | A vocabulary change this wide makes the old roles unreadable rather than merely outdated, and a migration that guesses at intent is worse than a clean slate with good starting points. Seeding them as ordinary roles is what keeps the templates honest — they are suggestions the federation will reshape, and the scripts are written so reshaping them survives the next deploy. |
| **Risks** | **The reset runs in production and everybody loses access at once.** **Mitigation:** the agent never runs it; the owner does, with the report in front of them; and the Super Admin role is untouched so there is always a way back in. **Accounts sit role-less and nobody notices.** **Mitigation:** the directory marker, and the reset's own report names every affected account. **A template is mistaken for policy** and granted unchanged to someone it does not fit. **Mitigation:** each template's absences are documented in the spec's matrix, not just its grants — what a role cannot do is the part worth reading. **Template 6 is seeded before ADR-0104 lands and becomes a Super Admin factory.** **Mitigation:** the plan places the seeding in a later batch than the fix, deliberately and with the dependency stated. |
| **Consequences** | Two idempotent scripts, `reset-roles` and `seed-role-templates`, run in that order by the owner. The users directory gains a "no role" marker. The seven templates' full capability matrix is recorded in the spec. |

---

## D1 — Why the order matters and cannot be reversed

Clearing first leaves every non-Super-Admin account with nothing, which is a safe
state but an unusable platform. Seeding first leaves the seven templates sitting
beside the old roles they replace, and the administrator cannot tell which grants
are stale.

So: clear, read the report, seed, assign. The clear script's report is the input to
the assignment work, which is why it enumerates accounts rather than just counting
them.

## D2 — Template 6 is the one to read twice

Staff Administrator holds `users:Create` and `AssignRoles` and **not**
`ManageRoles` — it hands out existing roles and cannot invent one.

Before ADR-0104 that combination is equivalent to Super Admin, by the review's P0.
After it, an actor may assign only roles whose capabilities they already hold
themselves, which is what makes this template describe what its name says. The
dependency is not incidental: this template is the P0's blast radius, and seeding
it is gated on the fix.
