"use client";

import { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/auth/text-field";
import { BilingualField } from "@/components/admin/bilingual-field";
import { EditorShell } from "@/components/admin/editorial-editor/editor-shell";
import { SeoFields } from "@/components/admin/editorial-editor/seo-fields";
import { FormSection } from "@/components/ui/form-section";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { BUTTON_GHOST, FOCUS_RING } from "@/components/ui/interactive";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { missingFieldIds } from "@/lib/admin/article-required";
import { focusFirstError } from "@/lib/admin/focus-first-error";
import { LazyBilingualRichText } from "@/components/admin/rich-text/lazy-rich-text";
import { TagsField } from "./tags-field";
import { MediaPicker, type MediaAssetOption } from "@/components/admin/pages/media-picker";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_TOPICS,
  categoryMessageKey,
  suggestSlug,
  topicMessageKey,
} from "@/lib/admin/articles";
import {
  changedFrom,
  emptyArticleDraft,
  emptyBodyLanguages,
  hasArticleErrors,
  sourceIsMissing,
  toCreateBody,
  toDraft,
  toPatchBody,
  validateArticle,
  type ArticleDraft,
  type ArticleEditorResponse,
} from "@/lib/admin/article-editor";
import type { EditorialState } from "@/lib/admin/editorial-state";
import type { AppLocale } from "@/i18n/routing";
import type { JSONContent } from "@tiptap/core";

/** The registry key this record is addressed by, upstream and in the BFF. */
const ENTITY_TYPE = "articles";

/**
 * One article, written and edited on the same screen.
 *
 * ── Why one component for both ─────────────────────────────────────────────
 *
 * A new article and an existing one are the same eight fields in the same
 * order, and two components would be two places for the headline rules, the
 * address rules and the body allowlist to drift apart. What genuinely differs
 * is only what surrounds the form: an existing article has a review, a version
 * history and a publication state, and a new one has none of those because it
 * does not exist yet. So the fields are written once and the frame is chosen.
 *
 * ── Why the actions are not built here ─────────────────────────────────────
 *
 * Save, submit for review and publish are all offered on this screen, and none
 * of them is implemented in this file. `EditorShell` owns the save, the leave
 * guard and the version panel; `EditorialStatusPanel` inside it owns submit,
 * publish and the review decisions, and it draws exactly the actions the
 * server said this reader may take. Re-deriving which button to show would be
 * a second opinion about a decision that depends on the publishing policy,
 * four permissions, whether a review is running and whether this reader holds
 * its current step — four chances to offer a control the API then refuses.
 *
 * ── Why the address is checked here as well as upstream ────────────────────
 *
 * The API's partial-unique index is the real guard and stays the authority.
 * `takenSlugs` makes the ordinary collision a correction at the field rather
 * than a rejected save after the whole form was filled in.
 */
export const ArticleEditor = ({
  record,
  takenSlugs,
  images,
  canEdit,
  canReadMedia,
  locale,
  editorial,
  fieldLabels,
}: {
  /** Null on the create screen: there is no record yet. */
  record: ArticleEditorResponse | null;
  /** Addresses other articles already hold. Never this article's own. */
  takenSlugs: readonly string[];
  images: readonly MediaAssetOption[];
  canEdit: boolean;
  canReadMedia: boolean;
  locale: AppLocale;
  /** Null when the API refused that read, which costs the panels and not the
   *  form. Always null while creating. */
  editorial?: EditorialState | null;
  fieldLabels?: Readonly<Record<string, string>>;
}) => {
  const t = useTranslations("Newsroom");
  const e = useTranslations("EditorialEditor");
  const errorsCopy = useTranslations("WriteErrors");
  const router = useRouter();

  // Built once per record: the baseline every keystroke is compared against.
  const original = useMemo(() => (record ? toDraft(record) : emptyArticleDraft()), [record]);
  const [draft, setDraft] = useState<ArticleDraft>(original);
  const [library, setLibrary] = useState<readonly MediaAssetOption[]>(images);
  // Whether the author has written the address themselves. An existing
  // article's address is always theirs — it may already be linked from
  // elsewhere — so it is never re-suggested. Tracked as "was it edited"
  // rather than read as "is it empty": emptiness stops being true after the
  // first keystroke of the suggestion itself, which would leave the address
  // frozen at one letter.
  const [slugTouched, setSlugTouched] = useState(record !== null);
  /**
   * Which groups the author has written in.
   *
   * A blank create form is not a form full of mistakes. Announcing "the
   * headline is required" before anyone has typed anything is two alerts a
   * screen reader reads out on arrival, and it spends the colour that should
   * mean "you did something wrong" on the ordinary state of a new article. The
   * disabled create button already says the form is not ready.
   *
   * An article that already exists is different: every field in it was written
   * by somebody, so one that is invalid now is a real problem and is reported
   * on sight.
   */
  const [touched, setTouched] = useState<Record<string, boolean>>(() =>
    record === null ? {} : ({ title: true, author: true } as Record<string, boolean>),
  );
  const touch = (group: string) => setTouched((current) => ({ ...current, [group]: true }));
  const [creating, setCreating] = useState(false);
  const [createFailure, setCreateFailure] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // A set, and rebuilt only when the list changes: this is read on every
  // keystroke in the address field.
  const taken = useMemo(() => new Set(takenSlugs), [takenSlugs]);

  const dirty = changedFrom(original, draft).length > 0;
  // The create screen had no guard at all: closing the tab midway through a
  // new article lost every word, silently. The edit screen's guard lives in
  // `EditorShell`, which a record-less screen cannot use, so the guard itself
  // is what both share.
  useUnsavedGuard(dirty);
  // `categoryWas` is what tells an edit that CONVERTS an article into a
  // round-up apart from one that merely edits an existing round-up — the same
  // line the API draws, so the form asks for exactly what the save will.
  const errors = validateArticle(draft, taken, { creating: record === null, categoryWas: original.category });
  // A notice, never a block. The API accepts an empty body, and refusing a
  // save over one would mean an author could not keep the headline until the
  // text was finished. What it must not do is go unmentioned until a reviewer
  // opens a blank page.
  const unwritten = emptyBodyLanguages(draft);
  const onUploaded = (image: MediaAssetOption) => setLibrary((current) => [image, ...current]);

  /**
   * Leaving the form by the cancel button.
   *
   * The back link guards itself, because it stays a real link and cancels its
   * own default instead; this is the button's half of the same rule.
   * `beforeunload` does not fire on an in-app navigation, so without either
   * guard both exits walked away from an unsaved article in silence —
   * reintroducing beside `useUnsavedGuard` exactly the loss it was added to
   * prevent.
   *
   * `dirty` is read HERE, inside the handler, at the moment the press happens
   * — never captured when the screen rendered. Between a render and a press
   * the author can type, and a guard that consulted the older value would
   * report "nothing to lose" about a state that no longer exists
   * (CLAUDE.md §31).
   */
  const leave = () => {
    if (dirty) {
      setLeaving(true);
      return;
    }
    router.push("/news");
  };

  /**
   * Pressing save with fields outstanding.
   *
   * Marks every group touched, so the messages that were held back on a blank
   * form appear all at once — the author has now asked for the form to be
   * judged — and sends them to the first one. The button is never disabled,
   * so this is the answer to the press rather than a press that cannot happen.
   */
  const showWhatIsMissing = (ids: readonly string[]) => {
    setTouched({ title: true, author: true, topic: true, source: true, slug: true });
    focusFirstError(ids[0]);
  };

  const create = async () => {
    const missing = missingFieldIds(errors);
    if (missing.length > 0) {
      showWhatIsMissing(missing);
      return;
    }

    setCreating(true);
    setCreateFailure(null);

    try {
      const response = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toCreateBody(draft)),
      });

      if (!response.ok) {
        // `slugTaken` is the expected one: `takenSlugs` was read when the page
        // loaded, and another author can claim an address between then and
        // this click. The server decides it at the moment of the write, which
        // is the only moment the answer is true (CLAUDE.md §31).
        const answer = (await response.json().catch(() => null)) as { code?: string } | null;
        setCreateFailure(answer?.code ?? "serviceUnavailable");
        return;
      }

      const created = (await response.json()) as { _id: string };
      // Straight into the editor for the article that now exists, so the
      // author continues in the screen that has the review and the history
      // rather than being returned to a list to find their own work.
      router.replace(`/news/${created._id}`);
    } catch {
      setCreateFailure("serviceUnavailable");
    } finally {
      setCreating(false);
    }
  };

  /**
   * How the article is found: its address, and what a search result shows.
   *
   * Its own renderer since ADR-0102 §D1, because the edit screen draws it in the
   * SEO tab while the create screen still draws it inline — there is no record
   * yet on that screen, so there is no shell and no tabs either. One renderer,
   * two callers, so the create and edit screens cannot drift apart.
   */
  const seoFields = ({ disabled, clearFailure }: { disabled: boolean; clearFailure: () => void }) => {
    const change = (patch: Partial<ArticleDraft>) => {
      clearFailure();
      setDraft((current) => ({ ...current, ...patch }));
    };

    /** Held back until the address has been seen: "invalid" over a field an
     *  author has not looked at is a complaint about a suggestion this screen
     *  made itself. */
    const slugSeen = slugTouched || draft.slug !== "";
    const slugMessage = !slugSeen
      ? null
      : errors.slug === "taken"
        ? t("errorSlugTaken")
        : errors.slug === "invalid"
          ? t("errorSlugInvalid")
          : null;

    return (
      <FormSection
        number={3}
        title={t("sectionSeo")}
        completeLabel={t("sectionComplete")}
        complete={!errors.slug}
      >
        {/* The address belongs with the search fields, not with the story:
            it is what a search result and a shared link are addressed by,
            and it is generated from the English headline rather than typed.
            Section 1 is what the story IS; this is how it is found. */}
        <TextField
          id="article-slug"
          label={t("fieldSlug")}
          // The address is Latin-only in both languages, so the field reads
          // left to right whichever way the page does.
          dir="ltr"
          value={draft.slug}
          disabled={disabled}
          required
          onChange={(event) => {
            setSlugTouched(true);
            change({ slug: event.target.value });
          }}
          hint={t("hintSlug")}
          error={slugMessage}
        />

        <SeoFields
          seo={draft.seo}
          onChange={(seo) => change({ seo })}
          disabled={disabled}
          images={library}
          canReadMedia={canReadMedia}
          locale={locale}
          onUploaded={onUploaded}
        />
      </FormSection>
    );
  };

  const fields = ({ disabled, clearFailure }: { disabled: boolean; clearFailure: () => void }) => {
    const change = (patch: Partial<ArticleDraft>) => {
      clearFailure();
      setDraft((current) => ({ ...current, ...patch }));
    };

    /**
     * The address follows the English headline until somebody writes one.
     *
     * From English only: transliterating Arabic produces an address no reader
     * recognises and no editor can check, so an Arabic-only headline leaves
     * the field empty rather than filling it with something meaningless.
     *
     * Gated on `slugTouched` rather than on the field being empty. Emptiness
     * stops being true after the first keystroke of the suggestion itself, so
     * reading it left the address frozen at one letter.
     */
    const changeTitle = (next: { ar: string; en: string }) =>
      change({
        title: next,
        ...(slugTouched ? {} : { slug: suggestSlug(next.en) }),
      });

    return (
      <>
        {/* Complete = nothing in this part is holding the save back. The body
            is never required (the API accepts an empty one), so part 2 asks
            instead whether both languages have been written — the thing a
            reviewer would otherwise be the first to notice was missing. */}
        <FormSection
          number={1}
          title={t("sectionStory")}
          completeLabel={t("sectionComplete")}
          complete={
            !errors.titleAr &&
            !errors.titleEn &&
            !errors.authorAr &&
            !errors.authorEn &&
            !errors.topic &&
            !errors.sourceOutlet &&
            !errors.sourceUrl
          }
        >
          <BilingualField
            id="article-title"
            labelAr={e("labelAr", { label: t("fieldTitle") })}
            labelEn={e("labelEn", { label: t("fieldTitle") })}
            valueAr={draft.title.ar}
            valueEn={draft.title.en}
            onChangeAr={(ar) => {
              touch("title");
              changeTitle({ ...draft.title, ar });
            }}
            onChangeEn={(en) => {
              touch("title");
              changeTitle({ ...draft.title, en });
            }}
            disabled={disabled}
            required
            error={touched.title && (errors.titleAr || errors.titleEn) ? t("errorTitle") : undefined}
          />

          <BilingualField
            id="article-author"
            labelAr={e("labelAr", { label: t("fieldAuthor") })}
            labelEn={e("labelEn", { label: t("fieldAuthor") })}
            valueAr={draft.authorDisplayName.ar}
            valueEn={draft.authorDisplayName.en}
            onChangeAr={(ar) => {
              touch("author");
              change({ authorDisplayName: { ...draft.authorDisplayName, ar } });
            }}
            onChangeEn={(en) => {
              touch("author");
              change({ authorDisplayName: { ...draft.authorDisplayName, en } });
            }}
            disabled={disabled}
            required
            hint={t("hintAuthor")}
            error={touched.author && (errors.authorAr || errors.authorEn) ? t("errorAuthor") : undefined}
          />

          <SelectField
            id="article-category"
            label={t("fieldCategory")}
            value={draft.category}
            disabled={disabled}
            onChange={(event) => change({ category: event.target.value })}
            options={ARTICLE_CATEGORIES.map((category) => ({
              value: category,
              label: t(categoryMessageKey(category)),
            }))}
            hint={t("hintCategory")}
          />

          {/* The empty choice only while the stored topic is empty: a new
              article, or one written before the field existed. Once an
              article has a topic it can be changed and never cleared, which
              is also all the API accepts. */}
          <SelectField
            id="article-topic"
            label={t("fieldTopic")}
            value={draft.topic}
            disabled={disabled}
            required={record === null}
            placeholder={original.topic === ""}
            onChange={(event) => {
              touch("topic");
              change({ topic: event.target.value });
            }}
            options={ARTICLE_TOPICS.map((topic) => ({ value: topic, label: t(topicMessageKey(topic)) }))}
            hint={record !== null && original.topic === "" ? t("hintTopicMissing") : t("hintTopic")}
            error={touched.topic && errors.topic ? t("errorTopic") : undefined}
          />

          {/*
            * Where a round-up came from — shown only for the shelf it belongs
            * to, so an ordinary article is never asked about an outlet that
            * did not publish it (owner decision 2026-09-22).
            *
            * Required on a new round-up and on an edit that converts one; an
            * article written before these fields existed opens with the
            * "source missing" hint and saves without them, exactly as the API
            * accepts it. Blocking that save would strand an editor fixing a
            * typo behind a source they may not have.
            */}
          {draft.category === "FederationInMedia" ? (
            <>
              <TextField
                id="article-source-outlet"
                label={t("fieldSourceOutlet")}
                value={draft.sourceOutlet}
                disabled={disabled}
                required={record === null}
                onChange={(event) => {
                  touch("source");
                  change({ sourceOutlet: event.target.value });
                }}
                hint={sourceIsMissing(original) ? t("hintSourceMissing") : t("hintSourceOutlet")}
                error={touched.source && errors.sourceOutlet ? t("errorSourceOutlet") : undefined}
              />

              <TextField
                id="article-source-url"
                label={t("fieldSourceUrl")}
                // An address is Latin-only in both languages, so the field
                // reads left to right whichever way the page does.
                dir="ltr"
                value={draft.sourceUrl}
                disabled={disabled}
                required={record === null}
                onChange={(event) => {
                  touch("source");
                  change({ sourceUrl: event.target.value });
                }}
                hint={t("hintSourceUrl")}
                error={
                  touched.source && errors.sourceUrl
                    ? t(errors.sourceUrl === "invalid" ? "errorSourceUrlInvalid" : "errorSourceUrlMissing")
                    : undefined
                }
              />
            </>
          ) : null}

          <TagsField
            id="article-tags"
            tags={draft.tags}
            onChange={(tags) => change({ tags })}
            disabled={disabled}
          />


          {/* The largest this picture is ever drawn is the news listing's
              cover story: 840px wide at a 7:4 frame, so 480px on its shorter
              side. Twice that is the floor a source must clear to stay sharp
              on a 2x screen (ADR-0086 D4). The picker warns below it and
              never refuses — a federation holding only a small file still has
              to be able to publish. */}
          <MediaPicker
            label={t("fieldCover")}
            value={draft.coverMediaId}
            images={library}
            canRead={canReadMedia}
            disabled={disabled}
            locale={locale}
            minSourcePx={960}
            onChange={(coverMediaId) => change({ coverMediaId })}
            onUploaded={onUploaded}
          />
        </FormSection>

        <FormSection
          number={2}
          title={t("sectionBody")}
          completeLabel={t("sectionComplete")}
          complete={unwritten.length === 0}
        >
          <LazyBilingualRichText
            id="article-body"
            labelAr={e("labelAr", { label: t("fieldBody") })}
            labelEn={e("labelEn", { label: t("fieldBody") })}
            valueAr={(draft.body.ar ?? null) as JSONContent | null}
            valueEn={(draft.body.en ?? null) as JSONContent | null}
            onChangeAr={(ar) => change({ body: { ...draft.body, ar } })}
            onChangeEn={(en) => change({ body: { ...draft.body, en } })}
            disabled={disabled}
          />

          {unwritten.length > 0 ? (
            <p className="text-caption text-[color:var(--color-text-secondary)]">
              {unwritten.length === 2 ? t("bodyEmptyBoth") : t(`bodyEmpty_${unwritten[0]}`)}
            </p>
          ) : null}
        </FormSection>

      </>
    );
  };


  if (record === null) {
    // No shell: there is no record to review, no version to restore and no
    // state to report. Drawing those panels empty would promise controls that
    // appear only after the first save.
    const missing = missingFieldIds(errors);

    return (
      <div className="flex min-w-0 flex-col gap-4">
        {/* Out of the form without losing the way back. The create screen had
            neither a cancel nor a way to the list, so the only exits were the
            browser's back button and the sidebar.

            A real `<Link>`, and it must stay one: this is navigation, so it
            belongs to the reader's own vocabulary — announced as a link,
            openable in a new tab, middle-clickable, and carrying a real
            `href` in the status bar. Turning it into a button to gain a
            confirmation would buy the prompt by taking all of that away.

            The guard rides on top instead. `beforeunload` never fires on an
            in-app navigation, so an unguarded link here walked away from an
            unsaved article in silence — the very loss `useUnsavedGuard`
            exists to prevent, reintroduced beside it. With work in progress
            the press is cancelled and the dialog opens; the navigation then
            happens on confirm, through the same address.

            `dirty` is read inside the handler, at the moment of the press,
            never captured when the screen rendered (CLAUDE.md §31). */}
        <Link
          href="/news"
          onClick={(event) => {
            if (dirty) {
              event.preventDefault();
              setLeaving(true);
            }
          }}
          // Hover and active move together: hover is mouse-only feedback, and
          // a control that lights up under a pointer and does nothing under a
          // finger is half a control on a touch screen.
          className={`${FOCUS_RING} inline-flex min-h-11 w-fit items-center gap-1.5 rounded-[var(--radius-sm)] text-label text-[color:var(--color-text-secondary)] underline-offset-4 hover:text-[color:var(--color-text-primary)] hover:underline active:text-[color:var(--color-text-primary)] active:underline`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5 shrink-0 ltr:-scale-x-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 3 5 5-5 5" />
          </svg>
          {t("backToList")}
        </Link>

        <StickyFormActions
          status={
            missing.length > 0 ? t("createRemaining", { count: missing.length }) : t("createReady")
          }
        >
          <button type="button" onClick={() => leave()} className={BUTTON_GHOST}>
            {t("createCancel")}
          </button>
          {/* Never disabled. A disabled button states that something is wrong
              and refuses to say what, and cannot be focused at all — so the
              press is answered with the first outstanding field instead. */}
          <Button onClick={() => void create()} loading={creating}>
            {t("createAction")}
          </Button>
        </StickyFormActions>

        {createFailure ? (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[color:var(--color-semantic-error)] px-4 py-3 text-body font-medium text-[color:var(--color-text-primary)]"
          >
            {createFailure === "slugTaken" ? t("errorSlugRaced") : errorsCopy(createFailure)}
          </p>
        ) : null}

        {fields({ disabled: creating || !canEdit, clearFailure: () => setCreateFailure(null) })}
        {seoFields({ disabled: creating || !canEdit, clearFailure: () => setCreateFailure(null) })}

        {/* The pause before the one action on this screen that cannot be taken
            back: there is no record yet, so leaving discards the article
            outright rather than reverting it to a saved version. */}
        <ConfirmDialog
          open={leaving}
          tone="destructive"
          title={t("leaveTitle")}
          confirmLabel={t("leaveConfirm")}
          cancelLabel={t("leaveCancel")}
          onConfirm={() => {
            setLeaving(false);
            router.push("/news");
          }}
          onCancel={() => setLeaving(false)}
        >
          {t("leaveBody")}
        </ConfirmDialog>
      </div>
    );
  }

  return (
    <EditorShell
      entityType={ENTITY_TYPE}
      entityId={record._id}
      heading={{
        // The article's own headline, in the reader's language. An untitled
        // draft takes the screen's name rather than an empty `h1`.
        trail: [{ label: t("title"), href: "/news" }, { label: draft.title[locale] || t("title") }],
        title: draft.title[locale] || t("title"),
      }}
      previewHref={draft.slug ? `/news/${draft.slug}` : undefined}
      dirty={dirty}
      body={() => toPatchBody(original, draft)}
      onDiscard={() => setDraft(original)}
      canEdit={canEdit}
      editorial={editorial}
      fieldLabels={fieldLabels}
      seo={seoFields}
    >
      {fields}
    </EditorShell>
  );
};
