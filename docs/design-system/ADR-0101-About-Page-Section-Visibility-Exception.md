# ADR-0101: About Page Section Visibility — a bounded exception to ADR-0075's composition lock

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-25, ahead of the screens it governs (ADR-0056 §2 — document-first: the record is written before the change is implemented). |
| **Authority** | Product Owner Decision, 2026-09-25 (ق4). Raised as a blocking conflict by the About page Phase 0 audit — the approved canvas draws a visibility switch per section, and ADR-0075 forbids one — and answered by the Product Owner in the same exchange. |
| **Amends** | **ADR-0075** — for `aboutFederationPage` only, its rule that an editor "orders and hides the items inside a section, never the section" is relaxed on the hiding half, for seven named sections. The ordering half is **not** relaxed, here or anywhere. |
| **Does not amend** | **ADR-0075 for every other page** — the Strategic Plan, Vision & Mission and President's Message screens keep the composition lock whole, and their editors keep no section control of either kind. · **ADR-0075's ordering prohibition** — reinforced, not relaxed (D3). · **Chapter 5 §5.8** `prefers-reduced-motion` · **Chapter 5 §5.9** no-layout-shift · **ADR-0050** colour hierarchy · **WCAG 2.1 AA** as the acceptance floor. |
| **Context** | ADR-0075 locked page composition in code for a reason that held: an editor dragging section rows cannot see what the order carries, and a page whose sections can be emptied publishes bands with headings and nothing under them. The About page's approved canvas nevertheless draws a switch on seven of its ten sections, and the Product Owner confirmed it. The page is the reason: it is the only editorial page in the platform whose sections are genuinely optional to the *story* rather than to the *layout*. A federation with no photographs of its pioneers, or which has not yet agreed the wording of its governance section, should be able to publish the rest rather than hold the whole page — and today's alternative is holding it. Three sections are not optional in that sense and are excluded here: the hero, which is the page's header, and the two whose content is not written at all but read from elsewhere. |
| **Decision** | Five decisions, D1–D5. In summary: (D1) seven named content sections carry an editor-operated visibility switch; (D2) the hero always prints, and the two automatic sections follow their source rather than a switch; (D3) section **order** remains fixed in code, for two reasons neither of which is visible to an editor; (D4) a section left with nothing to show hides itself, and hiding — by any of these routes — means the section is not rendered at all, never merely invisible; (D5) the exception is scoped to `aboutFederationPage` by name and does not generalise. |
| **Alternatives Considered** | **(A) Follow ADR-0075 unchanged: no switches.** Rejected by the Product Owner. It makes the approved canvas unimplementable and forces an all-or-nothing publish on a page whose whole purpose is incremental — the federation is still gathering the photographs and confirming the dates. **(B) Allow hiding *and* reordering, matching the first draft of the brief.** Rejected, and this is the load-bearing rejection: see D3. The order carries the identity guide's colour cadence and the sequence the nine scroll scenes are composed against, and both break silently. **(C) Let an editor empty a section instead of hiding it.** Rejected: it produces exactly the defect ADR-0075 named — a heading with nothing under it — and it hides the editor's intent from the next editor, who cannot tell "switched off" from "not written yet". D4 makes emptiness a cause of hiding rather than a substitute for it. **(D) Hide sections with CSS or a client-side condition.** Rejected on disclosure grounds, not aesthetics: see D4. **(E) Generalise the exception to every editorial page.** Rejected: ADR-0075's reasoning is sound for pages whose sections are structural, and nothing about those pages has changed. |
| **Why This Decision** | ADR-0075 was protecting two different things with one rule. The first is that **an editor should not be able to break a composition they cannot see** — which is about order, and is untouched here. The second is that **a page should never publish an empty band** — which is about content, and which D4 protects better than a prohibition did, because it acts on the actual condition rather than on the control that might cause it. Separating them is what lets the About page have its switches without weakening what the original rule was for. |
| **Risks** | **The exception is read as a precedent.** A later reader sees a governance page with section switches and adds them to another. **Mitigation:** D5 names the collection, and the ADR's title says "bounded"; the other pages' editors state in their own code comments that the absence of section controls is deliberate. **An editor hides six of seven sections and publishes a page that is barely a page.** **Mitigation:** accepted, knowingly. The hero always prints, the two automatic sections print whenever their source has anything, and the reviewer sees the result before it goes live — this is what the approval step is for. A numeric floor was considered and rejected as a rule nobody could justify the number of. **`emptySectionAutoHide` surprises an editor** who hid every item in a section and did not expect the heading to go with them. **Mitigation:** the dashboard says so where it happens, as an information-level notice in the pre-submission panel, naming the section. **The scroll scenes assume sections that are no longer there.** **Mitigation:** each scene's hooks live inside its own section component and observe only its own element, so a missing section removes a scene rather than breaking one; the hero's scroll cue targets the first section still present. This is a build-time contract, verified by the hidden-section scenarios in the page's browser checks. |
| **Consequences** | `aboutFederationPage` gains a stored `hiddenSections` array, constrained to the seven keys in D1 at the schema and again at the DTO. It gains **no** `sectionOrder` field — its absence is the implementation of D3. The dashboard draws ten numbered rows, three of them without a switch. The public response omits hidden sections entirely, so the composition of a given page is not discoverable from its own HTML. Recorded **PENDING FIGMA BACK-SYNC**: the canvas at `docs/design-specs/about/` is the approved source and no Figma frame exists for these states. |

---

## D1 — Seven content sections carry a visibility switch

An editor may switch these off, one at a time, and publish the page without them:

`facts` · `story` · `timeline` · `achievements` · `pioneers` · `governance` · `cta`

The list is closed. It is written once, as `HIDEABLE_SECTION_KEYS`, and both the stored schema and the request DTO validate against that one constant — so a section cannot become hideable by a client sending its name.

## D2 — Three sections have no switch, for two different reasons

**`hero` always prints.** A page with no header is not a page: it would open on the facts row with no title, no breadcrumb and nothing naming what the reader is looking at. There is no state in which hiding it is the right answer, so the control does not exist rather than existing and being discouraged.

**`leadership` and `ecosystem` follow their source.** Neither is written on this page. The leadership panel names whoever the board module lists as serving in the current cycle, and the ecosystem tiles are counted from the club, athlete and official records. So the question "should this section appear" already has an answer, and it is not an editorial preference — it is whether the source has anything to say. The leadership section prints when at least one person is serving; the ecosystem section prints when at least one number could be counted. A switch beside them would be a control that either lies or does nothing.

Their **editorial** text — the quote, the four priorities, the two headings — is ordinary content and is edited normally. Automatic describes the data, not the words.

## D3 — Section order stays fixed in code

There is no `sectionOrder`, and adding one is out of scope for any future change that does not amend this decision. Two reasons, and an editor reordering rows can see neither:

1. **The colour cadence.** The page alternates paper, ink and the two identity colours in a sequence the guide's register logic produces (ADR-0050). Moving one section puts two dark registers against each other, or strands the single red band beside the green one. The defect is in the seam, not in either section, so it is invisible while editing and obvious once published.
2. **The scroll sequence.** The nine scenes are composed as a sequence — a pinned horizontal run is placed where the reader has just finished a long vertical one, and the timeline's drawn line is placed where its length has room to matter. Reordering keeps every scene working in isolation and ruins the pacing between them.

Both are properties of the whole, and neither is checkable from the row being dragged. Hiding a section shortens that sequence, which the composition survives; reordering rewrites it, which it does not.

## D4 — Hiding means not rendering, and emptiness hides too

**`emptySectionAutoHide`.** A section whose items have all been hidden, or withheld, prints nothing — the section goes with them. This is the rule ADR-0075 was protecting, kept: a heading with an empty band under it is worse than no section, because it tells a reader something is there.

It applies wherever the filtering empties a section: every item hidden by an editor, every milestone withheld for an unconfirmed date, or a story with no paragraphs left.

**Hiding is server-side, in all three forms.** A hidden section, a hidden item and a withheld milestone are absent from the API response. They are not rendered and then hidden, and they are not sent and skipped by the client.

The reason is disclosure, not tidiness. A section hidden in CSS is in the markup; a section skipped in React is still in the server-rendered HTML. Either way the federation's unfinished wording — a governance statement still being agreed, a date still being checked — is one "view source" away from anybody who looks. The page cannot leak what it never received.

## D5 — The exception is named, and does not generalise

This decision applies to `aboutFederationPage` and to nothing else. ADR-0075 stands whole for `strategicPlansPage`, `visionMissionPage`, `presidentMessagePage` and any editorial page added later: their editors offer no section visibility control and no section ordering control, and the absence is deliberate in both cases.

A future page that wants section switches needs its own decision, made against its own composition. It does not inherit this one by resemblance.
