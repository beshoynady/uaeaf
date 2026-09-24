"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BackToVideos } from "./back-to-videos";
import { BilingualField } from "@/components/admin/bilingual-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormSection } from "@/components/ui/form-section";
import { SelectField } from "@/components/ui/select-field";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { TextField } from "@/components/auth/text-field";
import { BUTTON_GHOST } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { WriteFailure } from "@/components/ui/write-failure";
import { AssociationField } from "./association-field";
import { PlatformMark } from "./platform-mark";
import { StatusBadge, StatusRow, VideoPreviewCard } from "./video-preview-card";
import { useAdminWrite } from "@/lib/admin/use-admin-write";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { formatShortDate } from "@/lib/admin/videos/dubai-time";
import { useResolvedVideo } from "@/lib/admin/videos/use-resolved-video";
import { VIDEO_CATEGORIES } from "@/lib/admin/videos/types";
import type { AssociationOption } from "@/lib/admin/videos/association-options";
import type { AdminVideo, ResolvedVideo, VideoCategory } from "@/lib/admin/videos/types";

/**
 * Adding a video, and changing one.
 *
 * -- One component for both -------------------------------------------------
 *
 * The two screens ask the same questions in the same order and differ in
 * three places: where the answers go, whether the link can still be changed,
 * and what the buttons at the bottom say. Two components would be one
 * component and a copy of it that drifts — which is how a project ends up
 * with a field that can be set when a video is created and never corrected.
 *
 * -- Resolution failing is not an error state -------------------------------
 *
 * Instagram and Facebook need a Meta app token this deployment may not have,
 * and any platform can rate-limit. An editor who meets either gets the same
 * form with two fields to fill, because the link is perfectly good and the
 * video can still be added. Showing them an error about a token they cannot
 * obtain would strand them.
 *
 * -- The link cannot be changed after the fact ------------------------------
 *
 * Not an omission: `UpdateVideoDto` carries no `externalUrl`, and it should
 * not. Changing the link on a published row silently swaps what every visitor
 * is watching under a title and a date that still describe the old one. The
 * field is shown, disabled, with the reason beside it — the alternative,
 * hiding it, leaves an editor hunting for a control that was never there.
 */
export const VideoForm = ({
  record,
  thumbnailUrl,
  canPublish,
  canDelete,
  associationOptions,
  locale,
}: {
  /** `null` when adding. */
  record: AdminVideo | null;
  /** The stored still for an existing video. There is no resolve on an edit —
   *  the link cannot change — so without this the preview would draw an empty
   *  frame for a video that has a picture. */
  thumbnailUrl?: string | null;
  canPublish: boolean;
  canDelete: boolean;
  associationOptions: readonly AssociationOption[];
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Videos");
  const router = useRouter();
  const toast = useToast();
  const { busy, failure, setFailure, send, json } = useAdminWrite();

  const editing = record !== null;

  const [url, setUrl] = useState(record?.url ?? "");
  const [titleAr, setTitleAr] = useState(record?.title.ar ?? "");
  const [titleEn, setTitleEn] = useState(record?.title.en ?? "");
  const [category, setCategory] = useState<VideoCategory>(record?.category ?? "championships");
  const [publishDate, setPublishDate] = useState(record?.publishedAt?.slice(0, 10) ?? "");
  const [association, setAssociation] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Covers the closed tab, the reload and the typed address. The dialog
  // below covers Cancel; neither covers the other.
  useUnsavedGuard(dirty);

  /** Stable across renders, so the resolve effect is not restarted by a new
   *  function identity on every keystroke. */
  const resolveUrl = useCallback(async (value: string): Promise<ResolvedVideo> => {
    // Not through `send`: a refusal here is an answer ("nothing recognises
    // this link"), not a failed write, and it must not raise the form's alert.
    const response = await fetch("/api/admin/videos/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: value }),
    });
    return response.ok ? ((await response.json()) as ResolvedVideo) : null;
  }, []);

  const seedTitles = useCallback((fetched: string) => {
    // Both languages, so neither starts empty; they stay independently
    // editable, because the Arabic wording is the federation's and not the
    // platform's.
    setTitleAr((current) => (current === "" ? fetched : current));
    setTitleEn((current) => (current === "" ? fetched : current));
  }, []);

  // An existing video is not re-resolved: its link cannot change, so there is
  // nothing to ask about, and asking would spend an outbound request per open.
  const lookup = useResolvedVideo(editing ? "" : url, resolveUrl, seedTitles);

  const platform = editing ? record.platform : lookup.platform;
  const kind = editing ? record.kind : lookup.kind;
  const identified = editing || lookup.identified;

  const touch = <T,>(setter: (value: T) => void) => (value: T) => {
    setDirty(true);
    setFailure(null);
    setter(value);
  };

  const categoryLabel = t(`category_${category}`);
  const kindLabel = t(`kind${kind === "reel" ? "Reel" : "Video"}Long`);
  const dateLabel = publishDate === "" ? undefined : (formatShortDate(publishDate, locale) ?? undefined);

  /**
   * What is still missing, read at the moment it is asked for.
   *
   * A function rather than a memo because it is called from inside the submit
   * handler, immediately before the write — the state it must judge is the
   * state at the press, not the state when the form last rendered.
   */
  const outstanding = (): string[] => {
    const missing: string[] = [];
    if (!editing && url.trim() === "") missing.push(t("errUrlRequired"));
    else if (lookup.state === "unsupported") missing.push(t("errUrlUnsupported"));
    if (titleAr.trim() === "") missing.push(t("errTitleArRequired"));
    return missing;
  };

  const submit = async (status: "draft" | "published") => {
    if (outstanding().length > 0) {
      setShowErrors(true);
      return;
    }

    const title = { ar: titleAr.trim(), en: titleEn.trim() };
    const publishedAt = publishDate === "" ? null : new Date(publishDate).toISOString();

    const outcome = editing
      ? await send(
          `/api/admin/videos/${record.id}`,
          json({ title, category, status, ...(publishedAt ? { publishedAt } : {}) }, "PATCH"),
          { refresh: false },
        )
      : await send(
          "/api/admin/videos",
          json({
            title,
            category,
            kind,
            externalPlatform: platform,
            externalUrl: url.trim(),
            externalId: lookup.resolved?.externalId ?? "",
            status,
            publishedAt,
            association,
          }),
          { refresh: false, savedAsDraftMessage: t("savedAsDraftOnly") },
        );

    if (!outcome.ok) return;

    toast.show({
      tone: "success",
      title: editing ? t("updatedToast") : t("createdToast"),
      description: title[locale] || title.ar,
      source: "api",
      dedupeKey: `videos:${editing ? "updated" : "created"}`,
    });
    setDirty(false);
    router.push("/videos");
  };

  const remove = async () => {
    // Re-read at the confirming press, not at the press that opened this
    // dialog: nothing else on the screen may have changed, but the rule is
    // that a guard reads the state it is guarding against now.
    if (!record) return;
    const outcome = await send(`/api/admin/videos/${record.id}`, { method: "DELETE" }, { refresh: false });
    setDeleting(false);
    if (!outcome.ok) return;

    toast.show({
      tone: "success",
      title: t("deletedToast"),
      description: record.title[locale] || record.title.ar,
      source: "api",
      dedupeKey: "videos:deleted",
    });
    setDirty(false);
    router.push("/videos");
  };

  const leave = () => {
    // Read now, so work typed after this handler was wired still counts.
    if (dirty) {
      setLeaving(true);
      return;
    }
    router.push("/videos");
  };

  const missing = outstanding();

  return (
    <div className="flex flex-col gap-5">
      <BackToVideos />

      {/* The status says what is still outstanding, from the first press to
          the last: before anything is typed that reads as guidance, and after
          a refused save it is the same sentence the field carries. Naming the
          screen there instead would waste the one line that can answer "why
          did nothing happen". */}
      <StickyFormActions
        status={missing.length > 0 ? missing[0] : t("formReady")}
        statusProps={{ "aria-live": "polite" }}
      >
        <button type="button" onClick={leave} className={BUTTON_GHOST}>
          {t("cancel")}
        </button>

        {/* Never disabled. A disabled button states that something is wrong and
            refuses to say what, and cannot be focused at all — so the press is
            answered with the first outstanding field instead. */}
        <Button variant="secondary" loading={busy} onClick={() => void submit("draft")}>
          {t("saveDraft")}
        </Button>

        {canPublish ? (
          <Button loading={busy} onClick={() => void submit("published")}>
            {editing && record.status === "published" ? t("saveChanges") : t("publish")}
          </Button>
        ) : null}
      </StickyFormActions>

      <WriteFailure message={failure} />

      <FormSection
        number={1}
        title={t("linkCardTitle")}
        completeLabel={t("sectionComplete")}
        complete={identified}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            <TextField
              id="video-url"
              label={t("videoUrlLabel")}
              dir="ltr"
              value={url}
              disabled={editing}
              required={!editing}
              onChange={(event) => touch(setUrl)(event.target.value)}
              error={showErrors && !editing && url.trim() === "" ? t("errUrlRequired") : null}
              hint={
                editing ? (
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{t("urlReadOnlyHint")}</span>
                    <a
                      href={record.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-semibold text-[color:var(--color-text-primary)] underline"
                    >
                      {t("openOnPlatform")}
                    </a>
                  </span>
                ) : (
                  t("linkCardHint")
                )
              }
            />

            {/* One line, four outcomes: still asking, recognised, recognised
                but thin, or a link nothing here can address. Each says what
                the editor can do next rather than only what went wrong. */}
            {lookup.state === "resolving" ? (
              <p className="text-caption text-[color:var(--color-text-secondary)]">{t("resolving")}</p>
            ) : null}

            {lookup.state === "unsupported" ? (
              <p role="alert" className="text-caption font-medium text-[color:var(--color-text-primary)]">
                {t("resolveUnsupported")}
              </p>
            ) : null}

            {/* A tick rather than the platform's logo: `resolvedAs` already
                names the platform in words, and the mark beside it said the
                same thing twice. What the line is for is the confirmation. */}
            {identified && platform ? (
              <p className="flex flex-wrap items-center gap-2 text-caption font-semibold text-[color:var(--color-text-primary)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="size-4 shrink-0 text-[color:var(--color-brand-primary)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 8.5 3.5 3.5L13 5" />
                </svg>
                <span>
                  {t("resolvedAs", {
                    platform: t(`platform_${platform}`),
                    kind: kindLabel,
                  })}
                </span>
              </p>
            ) : null}

            {lookup.state === "ready" && lookup.thumbnailUrl === null ? (
              <p className="text-caption text-[color:var(--color-text-secondary)]">{t("fallbackNotice")}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-label font-bold text-[color:var(--color-text-primary)]">{t("previewTitle")}</p>
            {identified && platform ? (
              <VideoPreviewCard
                title={titleAr || titleEn || "—"}
                categoryLabel={categoryLabel}
                dateLabel={dateLabel}
                platform={platform}
                kind={kind}
                thumbnailUrl={editing ? (thumbnailUrl ?? null) : lookup.thumbnailUrl}
              />
            ) : (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-4 py-8 text-center text-caption text-[color:var(--color-text-secondary)]">
                {t("previewEmpty")}
              </p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection
        number={2}
        title={t("dataCardTitle")}
        completeLabel={t("sectionComplete")}
        complete={titleAr.trim() !== ""}
      >
        <BilingualField
          id="video-title"
          labelAr={t("titleArLabel")}
          labelEn={t("titleEnLabel")}
          valueAr={titleAr}
          valueEn={titleEn}
          onChangeAr={touch(setTitleAr)}
          onChangeEn={touch(setTitleEn)}
          required
          hint={t("titleFetchedHint")}
          error={showErrors && titleAr.trim() === "" ? t("errTitleArRequired") : null}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="video-category"
            label={t("categoryLabel")}
            value={category}
            onChange={(event) => touch(setCategory)(event.target.value as VideoCategory)}
            options={VIDEO_CATEGORIES.map((value) => ({ value, label: t(`category_${value}`) }))}
          />

          <AssociationField
            options={associationOptions}
            value={association}
            onChange={touch(setAssociation)}
            label={t("associationLabel")}
          />
        </div>

        <TextField
          id="video-publish-date"
          label={t("publishDateLabel")}
          type="date"
          dir="ltr"
          value={publishDate}
          onChange={(event) => touch(setPublishDate)(event.target.value)}
          hint={t("publishDateHint")}
        />
      </FormSection>

      {editing ? (
        <FormSection number={3} title={t("statusCardTitle")}>
          <div className="flex flex-col divide-y divide-[color:var(--color-border-default)]">
            <StatusRow label={t("statusLabel")}>
              <StatusBadge status={record.status} label={t(`status_${record.status}`)} />
            </StatusRow>
            {/* `PlatformMark` draws the logo AND names the platform; a second
                copy beside it read "YouTube YouTube". */}
            <StatusRow label={t("platformLabel")}>
              {platform ? <PlatformMark platform={platform} /> : <span>—</span>}
            </StatusRow>
            <StatusRow label={t("kindLabel")}>{kindLabel}</StatusRow>
          </div>

          {canDelete ? (
            <div className="flex justify-start pt-2">
              <Button variant="destructive" disabled={busy} onClick={() => setDeleting(true)}>
                {t("deleteVideo")}
              </Button>
            </div>
          ) : null}
        </FormSection>
      ) : null}

      <ConfirmDialog
        open={deleting}
        title={t("deleteConfirmTitle")}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("cancel")}
        tone="destructive"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(false)}
      >
        {t("deleteConfirmBody", { title: record?.title[locale] || record?.title.ar || "" })}
      </ConfirmDialog>

      <ConfirmDialog
        open={leaving}
        title={t("leaveConfirmTitle")}
        confirmLabel={t("leaveConfirmLeave")}
        cancelLabel={t("leaveConfirmStay")}
        tone="destructive"
        onConfirm={() => {
          setLeaving(false);
          router.push("/videos");
        }}
        onCancel={() => setLeaving(false)}
      >
        {t("leaveConfirmBody")}
      </ConfirmDialog>
    </div>
  );
};
