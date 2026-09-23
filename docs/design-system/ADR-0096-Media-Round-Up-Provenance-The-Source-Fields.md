# ADR-0096 — Media Round-Up Provenance: the `sourceOutlet` and `sourceUrl` Fields

| | |
| --- | --- |
| **Status** | **Accepted**. Owner request 2026-09-22: a `FederationInMedia` article must name the outlet that published it first, and link to it. |
| **Builds on** | ADR-0094 (the same "required at creation, nullable for the rows that predate the field" shape). Homepage Specification §11b (`CT-EXTERNALMEDIA-001`), which this ADR does **not** touch. |
| **Scope** | The `articles` schema and its DTOs, the newsroom editor and list, the attribution on the public card and article page, and Chapter 9 CR-5.7. |

---

## Context

`category: FederationInMedia` means the federation is reporting that **somebody else**
published something. That is the whole difference between such an article and one
the newsroom wrote itself — and until now nothing in the record said who that
somebody else was. Published, the two were indistinguishable: a round-up of a
Gulf News report rendered exactly like the federation's own reporting, under the
federation's own byline, with no way for a reader to tell the difference or to
reach the original.

That is a provenance problem, not a styling one. The outlet and its address are
what make a round-up a round-up, so they belong in the record, and they belong
there at the moment a round-up is created.

### What this is NOT

The sidebar widget "الاتحاد في الإعلام" on `/news`, and the homepage section of
the same name, are **`CT-EXTERNALMEDIA-001`** — a separate content type for
coverage links, with no module, no public read, and bracketed placeholders shown
outside production only (`lib/pages/media-coverage.ts`). It is untouched by this
ADR and must stay untouched: it is a different thing that shares a name.

`FederationInMedia` **articles** are real rows in `articles`, written by the
newsroom, and they are what this ADR is about.

---

## D1 — The fields

- **`sourceOutlet`** (string) and **`sourceUrl`** (string) on `articles`.
- **Not `sourcePublication`.** "Publication" in this schema already means the
  workflow's own — `publicationState`, the `publications` collection,
  `PublicationsService`. One word for two unrelated things inside one class is
  how the wrong one gets read. `outlet` is the journalistic term and collides
  with nothing (owner decision 2026-09-22, chosen from four candidates).
- **Nullable, no default**, the shape `topic` has: the rows written before the
  fields existed carry no attribution, and a default would invent one.
- **Written on every article, not only the round-ups.** A category can change, so
  a `General` article already carrying both keys needs only a value change when
  it is converted.

## D2 — When they are required

Required **exactly where the distinction exists**, and nowhere else:

- **On creation of a `FederationInMedia` article.** `CreateArticleDto` refuses
  the create with a 400 naming both fields.
- **On an edit that converts an article into one.** `UpdateArticleDto` applies
  the same rule when the patch carries `category: 'FederationInMedia'` — that
  patch is the moment the distinction starts to apply.
- **Never on a `General` article**, which is not asked about them at all.
- **Never on an existing round-up that predates the fields.** An editor fixing a
  typo in such an article is not held hostage to a source they may not have. The
  dashboard marks it instead (D4).

Both are validated whenever a value is actually sent, so a broken address typed
onto an existing article is still refused. `null` clears them, for an article
that stops being a round-up.

`VALIDATES_SOURCE` in `create-article.dto.ts` is the single predicate both DTOs
use, so the create rule and the edit rule cannot drift apart.

## D3 — The address is parsed, not pattern-matched

`@IsUrl({ protocols: ['http', 'https'], require_protocol: true })`, and the
dashboard uses `new URL()` with the same protocol check.

This value is printed as a link on the public site. `javascript:` in an `href`
is a script that runs on click, so restricting the protocol is a security
boundary, not a formatting preference — the same reasoning as `safeHref` in
`lib/social-channels.ts`.

The outlet name is trimmed before it is judged: `@IsNotEmpty()` rejects `''` and
nothing else, so `"   "` would otherwise satisfy a required field with no outlet
in it.

## D4 — What a reader and an editor see

- **The public card** (`news-card.tsx`) carries one muted line, "عبر {outlet}" /
  "via {outlet}". Not a second badge: the round-ups now sit in the same grid as
  the federation's own stories, and a card announcing itself with a second chip
  would read as a different kind of card. The line is not a link, because the
  whole card is already one link to the federation's own page for the story.
- **The article page** (`article-screen.tsx`) carries a source block under the
  byline: the outlet, and an external link to the original with
  `target="_blank"`, `rel="noopener noreferrer"` and the external icon, whose
  accessible name says it opens in a new window (Chapter 8 L3).
- **Both are drawn only when BOTH fields are present** (`hasSource`). An outlet
  with no address is a claim a reader cannot check; an address with no outlet is
  a bare link. A round-up written before the fields existed therefore shows no
  attribution rather than half of one.
- **The dashboard** shows the two fields only when `category` is
  `FederationInMedia`, and marks a round-up with no outlet in the article list
  with a dashed "مصدر ناقص / Source missing" chip — the same treatment, and the
  same meaning, as ADR-0094's "بلا موضوع": a gap for the newsroom to fill, not
  an error.

## D5 — The public DTO carries them for one category only

`toPublicDto` sends `sourceOutlet` and `sourceUrl` as `null` on any article whose
category is not `FederationInMedia`, even if the row holds values. An article
converted back to `General` keeps its stored attribution — an editor may convert
it again — but cannot surface an attribution that is no longer true.

## D6 — Backfill

`npm run backfill:article-source` shows a dry run first; add `-- --apply` to
write. It sets both keys to `null` on documents missing either, and nothing else.

- On the local database (2026-09-22) it wrote **12**, leaving **0** missing a key
  and **3** `FederationInMedia` round-ups awaiting an outlet from the newsroom.
- Those 3 are editorial work, not a code task: nothing on the row says who
  published them first, and inferring it from the headline would be exactly the
  kind of claim a script must never make.
- No reader depends on the write, because `{ sourceOutlet: null }` already
  matches a missing key. It exists so every stored article states its
  attribution explicitly.

---

## Consequences

- A newsroom that files a round-up must have the original to hand. That is the
  intent: a round-up without its source is not a round-up.
- Three articles on the local database are published and marked incomplete. They
  stay published — withdrawing them over a field added after they were written
  would be the wrong trade.
- Chapter 9 gains **CR-5.7**, beside CR-5.6's topics.

## Verification

- `create-article.dto.spec.ts` — 9 cases: required on create, refused blank,
  refused non-http, absent for `General`, required on conversion, correctable on
  an existing round-up, clearable.
- `articles-publishing.e2e-spec.ts` — 5 cases over HTTP: 400 naming both fields,
  400 for `javascript:`, a published round-up whose trimmed outlet reaches the
  public DTO, a `General` article carrying neither, and a legacy round-up that
  stays editable and publishable.
- `article-editor.spec.ts` (dashboard) — 11 cases mirroring the API rule.
- `backfill-article-source.spec.ts` — 3 cases: dry run writes nothing, the write
  is scoped to the missing key, a second run writes nothing.
