# Dashboard form components

`FormSection` · `StickyFormActions` · `CharCounter` · `LanguageTabs` ·
`useUnsavedGuard` · `focusFirstError` · `missingFieldIds`

Written for engineers working on any dashboard editor screen.

---

## 1. Why these exist

Five editor screens in the dashboard build the same long bilingual form, and
each had grown its own copy of the same parts. The measured state before this
batch:

- The collapsible section wrapper lived at
  `components/admin/president-message/section.tsx` and had **four** consumers,
  three of which were not the president's message.
- The sticky action bar's class string was written out **three** times
  verbatim, with two further variants drifting elsewhere.
- The SEO character counter existed **twice**, near-identical, differing only
  in which message namespace it read.
- The unsaved-work guard existed **once**, inside `EditorShell` — so the
  article **create** screen, which cannot use that shell, had none at all.
  Closing the tab mid-article lost every word silently.

A part copied five times is five chances for one screen to drift. These are
the shared versions.

## 2. File map

| Part | File |
| --- | --- |
| `FormSection` | `src/components/ui/form-section.tsx` |
| `StickyFormActions` | `src/components/ui/sticky-form-actions.tsx` |
| `CharCounter` | `src/components/ui/char-counter.tsx` |
| `LanguageTabs` | `src/components/ui/language-tabs.tsx` |
| `useUnsavedGuard` | `src/lib/admin/use-unsaved-guard.ts` |
| `focusFirstError` | `src/lib/admin/focus-first-error.ts` |
| `missingFieldIds` / `missingFieldCount` | `src/lib/admin/article-required.ts` |
| Per-language slots | `src/components/admin/bilingual-field.tsx` (`footerAr` / `footerEn`) |

## 3. One traced example — pressing save with fields missing

1. `ArticleEditor` computes `errors = validateArticle(draft, taken, …)`.
2. `missingFieldIds(errors)` turns that object into input ids **in screen
   order** — `article-title-ar`, `article-topic`, `article-slug`, … — because
   object key order is the validator's, not the form's.
3. The bar shows `createRemaining` with that list's length. The count and the
   jump target come from one list, so they cannot disagree.
4. On press, `create()` sees a non-empty list, marks every group touched (the
   author has now asked to be judged), and calls `focusFirstError(ids[0])`.
5. `focusFirstError` opens the field's `<details>` **first** — a field in a
   closed drawer can take focus while invisible — then focuses, then scrolls.
   Focus comes before the scroll because `scrollIntoView` and `matchMedia` are
   absent in some environments, and putting them first meant the focus never
   happened.

## 4. Decisions worth knowing

- **The save button is never disabled.** A disabled button states that
  something is wrong, refuses to say what, and cannot be focused at all.
- **`LanguageTabs` hides, never unmounts.** A rich-text editor holds its
  document, history and selection; unmounting on tab change throws all three
  away and empties the undo stack when an author checks the other language.
- **Long text is tabbed; short fields stay side by side.** A headline fits
  beside its translation, an article body does not.
- **`useUnsavedGuard` is a hook, not `EditorShell`.** The shell saves a record
  that already has an id, shows its history and reports its editorial state —
  none of which exists before the first save. Only the guard is shared.
- **`CharCounter` takes the finished sentence.** Its two callers read from
  different message namespaces; a component that picked one would belong to
  that screen.

## 5. How to use them

```tsx
<FormSection number={1} title={t("sectionStory")} complete={…} completeLabel={t("sectionComplete")}>
  <BilingualField
    id="seo-title"
    …
    footerAr={<CharCounter lang="ar" over={n > limit} text={t("seoCounter", { count: n, limit })} />}
    footerEn={…}
  />
</FormSection>

<StickyFormActions status={missing.length ? t("createRemaining", { count: missing.length }) : t("createReady")}>
  <Button onClick={save}>{t("createAction")}</Button>
</StickyFormActions>
```

`complete` is optional — omit it and the badge stays the plain number, which is
what the other three editors still do.

## 6. Where it breaks

- **`missingFieldIds` is article-specific.** `FIELD_ORDER` lists the article
  form's ids. A field that moves in the form must move there too, or "first
  error" stops meaning "first on screen". Another editor needs its own list.
- **`focusFirstError` needs `id` on the input itself**, not on a wrapper.
- **`LanguageTabs` keeps its own active tab in state.** There is no way to
  drive it from outside yet; a caller needing that has to lift it.
- **`footerAr`/`footerEn` are not `hint`/`error`.** Those remain single shared
  strings below both columns, because they describe the pair. If a per-language
  hint is ever needed, it needs new props — it is not a bug that they are
  full-width.

## 7. Guarding tests

| Test | Pins |
| --- | --- |
| `src/lib/admin/article-required.spec.ts` | screen order, per-half counting, both slug failures |
| `src/components/admin/news/article-editor.spec.tsx` | the press answers with the first field, the topic gate, the category resting on `General` |
| `src/lib/admin/article-editor.spec.ts` | the conditional source-field rule, mirrored from the API |

## 8. Not built

- **Drag and drop on `MediaPicker`.** It has preview, remove, upload and a
  size floor; drop handling is a real addition to a component seven screens
  share, and was left out of this batch deliberately.
- **Autosave.** Deferred by the owner to its own task.
- **In-app navigation guard.** `beforeunload` covers the closed tab, the
  reload and the typed address. The App Router gives no cancellable navigation
  event, and the workarounds intercept every link on the page.
- **Unifying `seo-section.tsx` with `seo-fields.tsx`.** They differ in props
  contract and namespace; only the counter defect was fixed in both.

## 9. Terms

- **Group** — a `touched` key (`title`, `author`, `topic`, `source`, `slug`).
  Messages are held back until a group is touched or the save is pressed.
- **Complete**, on a section — everything that part *requires* is filled.
  Section 2 has no required field, so it asks whether both languages are
  written instead.
- **Guidance, not a limit** — the SEO counters. Nothing truncates on save.
