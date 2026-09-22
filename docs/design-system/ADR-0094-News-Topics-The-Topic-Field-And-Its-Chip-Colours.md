# ADR-0094 — News Topics: the `topic` Field and Its Chip Colours

| | |
| --- | --- |
| **Status** | **Accepted**. Owner request 2026-09-22: six fixed topics with their colours, plus the answer "a new field `topic`". |
| **Amends** | ADR-0065 D3 (categorical encoding), for this one vocabulary only. See D3 below. |
| **Scope** | The `articles` schema and its DTOs, the newsroom editor and list, the topic chip on the public site, `color.topic.*` in the token package, and Chapter 9 CR-5.6. The homepage media section is not part of it. |

---

## Context

A news article already had two classifications, and neither answered "what is this story about":

- **`category`** is the shelf: `General` or `FederationInMedia`. It decides which homepage section an article appears in, so it stays a closed list with exactly one value per article.
- **`tags`** are free words the newsroom makes up, several per article. Following one opens `/news?tag=…` (this already works).

The design canvas for the homepage "Latest news" section gives every story a coloured chip. It uses six topics, and the owner fixed them and their colours. Stretching `category` to cover them would have mixed the shelf up with the subject. Closing the tag list would have stopped the newsroom from inventing new words. So the owner chose a third field.

---

## D1 — The field

- **`topic`** on `articles` is an enum of six English ids: `nationalTeam`, `training`, `youth`, `international`, `community`, `records`. The Arabic and English names live in each app's message catalogues.
- **It can be empty, and it has no default.** An article nobody has classified has no topic, and a default would claim a classification nobody made.
- **Required on a new article only.** `CreateArticleDto` refuses a create without one. On an edit (`UpdateArticleDto`), a topic can be changed but not cleared: `ValidateIf` rather than `IsOptional`, because `IsOptional` lets `null` through. Articles written before the field existed can still be saved and published without one.
- **The public view reads the topic from the row**, not from the snapshot, like `category` and `tags`. The topic is a filing decision the newsroom can correct without republishing the text.
- **Backfill:** `npm run backfill:article-topic` shows a dry run first; add `-- --apply` to write. It sets `topic: null` on documents that have no `topic` key, and nothing else.
  - On the local database (2026-09-22) it wrote 12, and left 12 unclassified and 0 classified.
  - No reader depends on it, because `{ topic: null }` already matches a missing key. It exists so every stored article states its topic explicitly.
  - Like every development script, it refuses any database that is not on this machine.

## D2 — The colours (`color.topic.*`)

Each topic has three tokens: `surface`, `ink` and `edge`.

- Light and dark draw no edge: the edge takes the chip's own ground.
- High contrast draws the edge in black.
- Every value points at an existing ramp step. No primitive colour was added or changed.

| Topic | Arabic | Light (ink / ground) | Dark (ink / ground) | High contrast |
| --- | --- | --- | --- | --- |
| `nationalTeam` | المنتخب الوطني | `text.on-brand` on `brand.primary`: **4.81** | the same: **4.81** | white on black: 21.00 |
| `training` | التدريب | steel-blue 600 / 50: **8.12** | 200 / 800: **6.40** | black on white, black edge: 21.00 |
| `youth` | ألعاب القوى للناشئين | teal 600 / 50: **7.50** | 200 / 800: **7.21** | 21.00 |
| `international` | دولي | red 600 / 50: **6.95** | 200 / 800: **5.84** | 21.00 |
| `community` | مجتمع | desert-sand 600 / 50: **7.01** | **300** / 800: **6.12** | 21.00 |
| `records` | الأرقام القياسية | gold **700** / 50: **4.94** | 200 / 800: **6.41** | 21.00 |
| none | عام | `text.secondary` on `surface.sunken`: 8.22 | 11.03 | 21.00 |

The table departs from the obvious pattern in three places:

- **Records uses gold 700, not 600.** Gold 600 measures **3.22** on gold 50. The canvas's own records colours (`#8A6D0A` on `#FBF3DC`) measure **4.44**, which also fails.
- **Community uses desert-sand 300 in dark.**
  - At 200 it sits ΔE **8.1** from records for a dichromat (the worst case across normal vision, deuteranopia and protanopia).
  - At 300 the gap is **19.0**.
- **Dark follows the item palette's dark rule (ADR-0072 D1: 800 ground, 200 ink).** It does not follow ADR-0065 D3c's "300 on the page": red 300 measures **4.19** on the dark card and fails.

`pairings.json` records every pair, and `token-lists-contract.spec.ts` measures it in all three themes.

**Known limit:** in light, the international and community inks sit ΔE **4.0** apart for a protanope. Red and brown converge under that simulation, and the ramps offer no step that fixes it. The label always names the topic in words (WCAG 1.4.1), so colour is never the only carrier.

## D3 — The relation to ADR-0065 D3

The owner's explicit instruction ranks above an ADR (CLAUDE.md §1), so the owner's mapping applies. It departs from D3 in three recorded ways:

1. **Colour by meaning, not by enum position** (D3b). Four of the six coincide with the D3a families anyway: steel blue, teal, desert sand and gold.
2. **The identity colours are used for two topics.** International uses the red ramp (not the error ramp), and National Team uses solid Federation Green. D3a excludes both from categories.
3. **Six values.** The D3a scale is **not** extended: there is no `category.6`, and `colour-role-contract.spec.ts` still pins five steps. Topics are a separate role group, `color.topic.*`.

This exception is non-transferable. Any other closed vocabulary still follows D3 in full.

## D4 — The chip

`TopicBadge` (`apps/web/src/components/pages/news/topic-badge.tsx`) replaces `CategoryBadge`, which has been deleted.

- **Where it appears:** one form everywhere. It is the full pill from the canvas, 12px bold, on the news card, the lead story and the article header.
- **Data:** it is bound to `topic`, never to `tags` or `category`.
- **Unclassified articles** show the neutral chip "عام" / "General", not a seventh colour.
- **PENDING FIGMA BACK-SYNC:** the article header and the news-page hero previously drew the category as a solid green block with a 4px radius (Figma `1739:2343`). Both now draw the topic pill.

## D5 — The newsroom

- **Editor:** a "Topic" select beside the category.
  - It is required on the create screen, and the create button waits for it.
  - It shows an empty choice only while the stored topic is empty.
  - An unclassified article carries a hint saying it has no topic yet and can still be saved and published.
- **List:** a "Topic" column. An unclassified article shows a dashed, secondary "No topic" marker, so an editor can see what still needs classifying.

---

## Consequences

- **Tokens:** `DT-COLOR-028 · color.topic.{national-team,training,youth,international,community,records}.{surface,ink,edge} · Status: Active · v1.0 · Owner: Design System · References: [ADR-0094 D2] · Measured: lowest 4.81 (light, National Team).`
- **Not built:**
  - Suggesting a topic for the existing articles, and any seventh topic. The owner decides both.
  - The cover placeholder's colour, which is still derived from `category`.
- **On Atlas:** the backfill script refuses a remote database. The equivalent there is `db.articles.updateMany({ topic: { $exists: false } }, { $set: { topic: null } })`. It is optional, for the reason given in D1.
