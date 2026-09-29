# ADR-0126 — A byline is content, not authorship: credit fields are separate from `createdBy` and take no part in permissions

| Field | Details |
| --- | --- |
| **Status** | Accepted in principle. Recorded 2026-09-29. **The schema is not decided.** The measurement returned the same day (D1); the proposal awaits approval and one question stays open (D2). Batch 4. |
| **Authority** | Product Owner decision 3, 2026-09-29. |
| **Numbering note** | ADR-0122 was taken by the header session the same day. This record is ADR-0126, following ADR-0123/0124/0125 of the same batch. |
| **Amends** | Nothing yet. It fixes the **category** so the fields are not built into the wrong one. |
| **Does not amend** | ADR-0124's authorship fields, which are a different thing with a different purpose. · The `own` scope. |
| **Context** | A news article has a person who wrote it and a person who photographed it. Those are facts about the content, printed on the public page. They are not the same as `createdBy`, which records which account performed a write — the person who wrote an article may have no account at all, and the person who pasted it into the system is not its author in any sense a reader would recognise. Conflating the two is an easy mistake with two bad ends: a byline that silently confers permissions, or a permission check that a content editor can change by editing a text field. |
| **Decision** | **Content credit is content.** Four credits are named: a news article has a **mandatory author**; an article's image has a **photographer**; an album has a **photographer**; a video has an **owner**, optional. A photograph's photographer belongs on the **media asset** (`photographer`), not on the thing that embeds it, because the same photograph appears in more than one place and its photographer does not change. These fields **appear on the public site**, and they take **no part** in the author check of ADR-0124 and **no part** in the `own` scope. No permission decision reads them, ever. |
| **Alternatives Considered** | **(A) Reuse `createdBy` as the byline.** Rejected: it makes a permission field editable as content, and it cannot express an author who has no account. **(B) Put the photographer on each article and album.** Rejected: the same photograph is embedded in several records and its photographer is a fact about the photograph — duplicating it is how the copies disagree. **(C) Leave credit to free-text inside the body.** Rejected: it cannot be listed, filtered, or shown consistently, and a federation publishing under its own name needs attribution it can query. |
| **Why This Decision** | The two categories answer different questions for different readers. `createdBy` answers "who does the system hold responsible for this write", read by an auditor. A byline answers "who made this", read by a visitor. Writing that boundary down before the fields exist is cheaper than discovering later that a permission depends on a text box. |
| **Risks** | **The distinction erodes** — a future task uses the byline to decide something. **Mitigation:** this record states the prohibition, and the Batch 4 task that builds the fields carries a negative test that no permission path reads them. **A mandatory article author blocks existing rows.** **Mitigation:** the measurement below establishes what exists before anything is made required; a backfill decision belongs with ADR-0124's, not after the fact. |
| **Consequences** | Schema additions to `articles`, `albums`, `videos` and `mediaAssets`, **shape not yet decided**. Public response DTOs gain the fields. A negative test that no permission or scope check reads any of them. |

---

## D1 — What the measurement found

Taken 2026-09-29 across `articles`, `albums`, `videos` and `mediaAssets`. Nine
credit-shaped fields exist; **two are genuine content credits**, and two of the
four the owner named are **absent**.

| The owner's credit | Status today |
|---|---|
| Article author, mandatory | **Present but different** — `articles.authorDisplayName` exists and is not mandatory |
| Article-image photographer | **Present, on the right object** — `mediaAssets.file.photographer`, which is where this record says it belongs |
| Album photographer | **Absent** |
| Video owner, optional | **Absent** |

The other seven were inspected and ruled out deliberately rather than missed
(`sourceOutlet`, `sourceUrl`, `caption` and their kin are provenance or display
text, not attribution of authorship).

**Two things about `photographer` the proposal has to answer.** It is
**single-language**, while every other person-name field in this codebase is
bilingual — so a photographer's name cannot be written in Arabic and English as
every other name can. And it **cannot be edited after upload**: a misspelt credit
is permanent. Neither is acceptable for a field that appears on the public site,
and both are corrections rather than additions.

## D2 — The open question

**Is a news article's author free text, or a link to a record in
people-organizations?**

Free text accepts a contributor the federation has no record of, and costs
nothing. A link makes "everything by this person" answerable and keeps the
spelling consistent, and it forbids crediting anyone not already in the
database. A third shape — a link when there is a record, free text otherwise —
is the one that matches how bylines actually behave and the one most likely to
be regretted, because two sources of the same name disagree the moment one is
edited.

**Deferred to the owner, once the measurement shows what precedent the codebase
already sets.** Not to be chosen by an implementer.
