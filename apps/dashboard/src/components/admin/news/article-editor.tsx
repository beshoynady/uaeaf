"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/auth/text-field";
import { BilingualField } from "@/components/admin/bilingual-field";
import { EditorShell } from "@/components/admin/editorial-editor/editor-shell";
import { SeoFields } from "@/components/admin/editorial-editor/seo-fields";
import { EditorSection } from "@/components/admin/president-message/section";
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

  // A set, and rebuilt only when the list changes: this is read on every
  // keystroke in the address field.
  const taken = useMemo(() => new Set(takenSlugs), [takenSlugs]);

  const dirty = changedFrom(original, draft).length > 0;
  const errors = validateArticle(draft, taken, { creating: record === null });
  // A notice, never a block. The API accepts an empty body, and refusing a
  // save over one would mean an author could not keep the headline until the
  // text was finished. What it must not do is go unmentioned until a reviewer
  // opens a blank page.
  const unwritten = emptyBodyLanguages(draft);
  const onUploaded = (image: MediaAssetOption) => setLibrary((current) => [image, ...current]);

  const create = async () => {
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

    const slugSeen = slugTouched || draft.slug !== "";
    const slugMessage = !slugSeen
      ? null
      : errors.slug === "taken"
        ? t("errorSlugTaken")
        : errors.slug === "invalid"
          ? t("errorSlugInvalid")
          : null;

    return (
      <>
        <EditorSection number={1} title={t("sectionStory")}>
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

          <TagsField
            id="article-tags"
            tags={draft.tags}
            onChange={(tags) => change({ tags })}
            disabled={disabled}
          />

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

          <MediaPicker
            label={t("fieldCover")}
            value={draft.coverMediaId}
            images={library}
            canRead={canReadMedia}
            disabled={disabled}
            locale={locale}
            onChange={(coverMediaId) => change({ coverMediaId })}
            onUploaded={onUploaded}
          />
        </EditorSection>

        <EditorSection number={2} title={t("sectionBody")}>
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
        </EditorSection>

        <EditorSection number={3} title={t("sectionSeo")}>
          <SeoFields
            seo={draft.seo}
            onChange={(seo) => change({ seo })}
            disabled={disabled}
            images={library}
            canReadMedia={canReadMedia}
            locale={locale}
            onUploaded={onUploaded}
          />
        </EditorSection>
      </>
    );
  };

  if (record === null) {
    // No shell: there is no record to review, no version to restore and no
    // state to report. Drawing those panels empty would promise controls that
    // appear only after the first save.
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 py-3">
          <p className="text-label text-[color:var(--color-text-secondary)]">{t("createHint")}</p>
          <Button onClick={() => void create()} loading={creating} disabled={hasArticleErrors(errors)}>
            {t("createAction")}
          </Button>
        </div>

        {createFailure ? (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[color:var(--color-semantic-error)] px-4 py-3 text-body font-medium text-[color:var(--color-text-primary)]"
          >
            {createFailure === "slugTaken" ? t("errorSlugRaced") : errorsCopy(createFailure)}
          </p>
        ) : null}

        {fields({ disabled: creating || !canEdit, clearFailure: () => setCreateFailure(null) })}
      </div>
    );
  }

  return (
    <EditorShell
      entityType={ENTITY_TYPE}
      entityId={record._id}
      dirty={dirty}
      body={() => toPatchBody(original, draft)}
      onDiscard={() => setDraft(original)}
      canEdit={canEdit}
      editorial={editorial}
      fieldLabels={fieldLabels}
    >
      {fields}
    </EditorShell>
  );
};
