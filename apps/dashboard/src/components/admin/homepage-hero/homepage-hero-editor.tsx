"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { AppLocale } from "@/i18n/routing";
import { errorTarget } from "@/lib/admin/hero-error-targets";
import { fetchSend, runSave } from "@/lib/admin/hero-save";
import {
  HERO_SLIDE_MAX,
  addSlide,
  adoptCreated,
  heroPosition,
  duplicateSlide,
  isDirty,
  moveSlide,
  moveSlideTo,
  planSave,
  removeSlide,
  slideChanged,
  temporaryImageCount,
  updateSlide,
  validateDraft,
  type FieldError,
  type HeroDraft,
  type MediaLookup,
  type SlideDraft,
} from "@/lib/admin/homepage-hero";
import { fieldMessage } from "./field-errors";
import { HeroPreview, type PreviewEventState } from "./hero-preview";
import { EventBarEditor, PlaybackEditor } from "./hero-settings-editor";
import { SlideEditor } from "./slide-editor";
import { SlideStrip } from "./slide-strip";

/**
 * The homepage hero screen: the slides, the slide being edited beside its live
 * preview, the next-event bar and the playback.
 *
 * Saving is publishing (owner decision 2026-09-17): there are no drafts, so
 * nothing leaves this screen until Save, and Save sends everything at once as
 * the fewest writes (`planSave`, `runSave`). Before anything is sent the draft
 * is checked with the API's own rules (`validateDraft`), so a refusal the
 * screen could have predicted never costs a half-applied save. What the API
 * still refuses is placed beside its field; what landed before the refusal is
 * re-read, and only what did not land stays unsaved.
 */

const toLookup = (images: readonly MediaAssetOption[]): MediaLookup =>
  new Map(
    images.map((image) => [
      image.id,
      {
        url: image.url,
        width: image.width ?? 0,
        height: image.height ?? 0,
        altText: { ar: image.altText?.ar ?? "", en: image.altText?.en ?? "" },
        isAiGenerated: image.isAiGenerated === true,
      },
    ]),
  );

/** Moves focus to a field, or into the first control of a group. */
const focusElement = (id: string) => {
  const element = document.getElementById(id);
  if (!element) return;
  const control = element.matches("input, textarea, select, button")
    ? element
    : element.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select, button");
  if (control) {
    control.focus();
    return;
  }
  element.setAttribute("tabindex", "-1");
  element.focus();
};

type Failure = { code: string; partial: boolean } | null;

export const HomepageHeroEditor = ({
  initial,
  images: initialImages,
  canReadMedia,
  siteUrl,
  now: nowIso,
}: {
  initial: HeroDraft;
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  siteUrl: string | null;
  /** The server's clock at render, so status and countdown agree on both sides. */
  now: string;
}) => {
  const t = useTranslations("HomepageHero");
  const writeErrors = useTranslations("WriteErrors");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const toast = useToast();

  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [seenInitial, setSeenInitial] = useState(initial);
  // What the last save stored, while the server's re-read is on its way. The
  // re-read replaces the draft only if nothing was typed since; `stored: null`
  // after a partial save, when only the stored side can move on.
  const [awaiting, setAwaiting] = useState<{ stored: HeroDraft | null } | null>(null);
  const [pendingLeave, setPendingLeave] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(initial.slides[0]?.key ?? null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [failure, setFailure] = useState<Failure>(null);
  const [saving, setSaving] = useState(false);
  const [library, setLibrary] = useState(initialImages);
  const [eventState, setEventState] = useState<PreviewEventState>("before");
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  // Every edit goes through one stable updater, so the memoised parts below are
  // handed callbacks that keep their identity from one keystroke to the next.
  const update = useCallback((recipe: (current: HeroDraft) => HeroDraft) => {
    setDraft(recipe);
    // A refusal stays listed until the next save attempt re-checks it: clearing
    // the list on the first keystroke would hide the reason mid-fix. Only a
    // whole-save failure message goes, since nothing it named is pending now.
    setFailure((current) => (current && !current.partial ? null : current));
  }, []);

  // A re-read arrives as a new `initial`. The stored side always moves to it.
  // The draft follows only when it is still exactly what the save stored, so an
  // edit typed between the save and the re-read is kept, and shows as unsaved.
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setSaved(initial);
    if (awaiting) {
      if (awaiting.stored && !isDirty(awaiting.stored, draft)) setDraft(initial);
      setAwaiting(null);
    }
  }

  const media = useMemo(() => toLookup(library), [library]);
  const dirty = isDirty(saved, draft);
  const temporary = temporaryImageCount(draft, media);
  const selectedIndex = draft.slides.findIndex((slide) => slide.key === selectedKey);
  const selected = selectedIndex >= 0 ? draft.slides[selectedIndex] : null;
  // The strip and the preview follow the draft a beat behind the fields: a
  // keystroke renders its field at once, and they catch up when the browser is
  // free (measured: the whole screen per keystroke was ~660ms at CPU x4).
  const deferred = useDeferredValue(draft);
  const deferredSelected = deferred.slides.find((slide) => slide.key === selectedKey) ?? null;
  const previewPosition = heroPosition(deferred.slides, selectedKey, now);
  const changedKeys = useMemo(
    () => new Set(deferred.slides.filter((slide) => slideChanged(saved, slide)).map((slide) => slide.key)),
    [saved, deferred.slides],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Some browsers still need the legacy return value to show the prompt.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // `beforeunload` does not see the app's own navigation (the sidebar's links go
  // through the router), so a click on a link that leaves this page asks first.
  // Captured before React's handlers, so a router link never starts navigating.
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // The error summary's links move within the page.
      if (url.pathname === window.location.pathname && url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLeave(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [dirty]);

  const edit = (next: HeroDraft) => update(() => next);

  const select = (key: string) => {
    if (key === selectedKey) return;
    if (selected && slideChanged(saved, selected)) {
      setPendingSwitch(key);
      return;
    }
    setSelectedKey(key);
  };

  const add = () => {
    const next = addSlide(draft);
    if (next === draft) return;
    edit(next);
    setSelectedKey(next.slides[next.slides.length - 1].key);
  };

  const duplicate = (key: string) => {
    const next = duplicateSlide(draft, key);
    if (next === draft) return;
    edit(next);
    const at = next.slides.findIndex((slide) => slide.key === key);
    setSelectedKey(next.slides[at + 1].key);
  };

  const confirmRemove = () => {
    const key = pendingRemove;
    setPendingRemove(null);
    if (!key) return;
    const at = draft.slides.findIndex((slide) => slide.key === key);
    const next = removeSlide(draft, key);
    edit(next);
    setErrors((current) => current.filter((error) => !error.path.startsWith(`slides.${key}.`)));
    setSelectedKey(next.slides[Math.min(at, next.slides.length - 1)]?.key ?? null);
  };

  // Selecting and adding read the current draft and selection, so the strip gets
  // stable wrappers that call the latest version of each.
  const handlers = useRef({ select, add });
  useEffect(() => {
    handlers.current = { select, add };
  });
  const onSelect = useCallback((key: string) => handlers.current.select(key), []);
  const onAdd = useCallback(() => handlers.current.add(), []);
  const onMove = useCallback((key: string, to: number) => update((current) => moveSlideTo(current, key, to)), [update]);
  // Buttons and arrow keys move by one place from wherever the slide is now, not
  // from the index the (deferred) strip last drew, so a quick second press counts.
  const onMoveBy = useCallback((key: string, delta: -1 | 1) => update((current) => moveSlide(current, key, delta)), [update]);
  const onSlideChange = useCallback(
    (key: string, patch: Partial<SlideDraft>) => update((current) => updateSlide(current, key, patch)),
    [update],
  );
  const onEventChange = useCallback((nextEvent: HeroDraft["nextEvent"]) => update((current) => ({ ...current, nextEvent })), [update]);
  const onPlaybackChange = useCallback((playback: HeroDraft["playback"]) => update((current) => ({ ...current, playback })), [update]);
  const onUploaded = useCallback((image: MediaAssetOption) => setLibrary((current) => [image, ...current]), []);

  const goToError = (error: FieldError) => {
    const target = errorTarget(error.path);
    if (target.slideKey && target.slideKey !== selectedKey) setSelectedKey(target.slideKey);
    // After the slide's fields have rendered.
    window.requestAnimationFrame(() => focusElement(target.elementId));
  };

  const save = async () => {
    // Read at the press (CLAUDE.md §31). The editor is inert while the requests
    // run, so this is still the draft when they come back.
    const current = draft;
    const found = validateDraft(current);
    setErrors(found);
    setFailure(null);
    if (found.length > 0) {
      window.requestAnimationFrame(() => summary.current?.focus());
      return;
    }

    setSaving(true);
    try {
      const result = await runSave(planSave(saved, current), fetchSend);
      if (result.ok) {
        const stored = adoptCreated(current, result.created);
        setDraft(stored);
        // Saved now, not when the re-read lands: a second Save in between would
        // re-plan writes that already happened.
        setSaved(stored);
        setAwaiting({ stored });
        setSelectedKey((key) => (key && result.created[key]) || key);
        toast.show({ tone: "success", title: t("savedToast"), description: t("savedToastBody"), source: "api", dedupeKey: "homepage-hero:saved" });
        router.refresh();
        return;
      }
      setDraft(adoptCreated(current, result.created));
      setSelectedKey((key) => (key && result.created[key]) || key);
      setErrors(result.errors);
      setFailure({ code: result.code, partial: result.completed > 0 });
      if (result.completed > 0) {
        // Part landed: Save waits for the re-read, so the next plan starts from
        // what is actually stored.
        setAwaiting({ stored: null });
        router.refresh();
      }
      window.requestAnimationFrame(() => summary.current?.focus());
    } finally {
      setSaving(false);
    }
  };

  const errorLabel = (error: FieldError) => {
    const target = errorTarget(error.path);
    const where =
      target.group === "slide"
        ? t("slideNumber", { number: draft.slides.findIndex((slide) => slide.key === target.slideKey) + 1 })
        : t(target.group === "event" ? "eventHeading" : "playbackHeading");
    const field = [target.slot ? t(target.slot) : null, t(target.field), target.language ? t(target.language === "ar" ? "inArabic" : "inEnglish") : null]
      .filter(Boolean)
      .join(" ");
    const message = fieldMessage(t, error) ?? writeErrors(error.code);
    return `${where} · ${field}: ${message}`;
  };

  const status = saving ? t("saving") : dirty ? t("unsaved") : t("saved");
  const siteHref = siteUrl ? `${siteUrl.replace(/\/$/, "")}/${locale}` : null;

  return (
    <div className="flex flex-col gap-6">
      {/* The top bar: where this is, whether it is saved, and the two actions. */}
      <div className="sticky top-0 z-20 -mx-6 flex flex-col gap-3 border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <nav aria-label={t("trail")}>
            <ol className="flex items-center gap-2 text-caption text-[color:var(--color-text-secondary)]">
              <li>{t("trailHome")}</li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-[color:var(--color-text-primary)]">
                {t("trailHero")}
              </li>
            </ol>
          </nav>
          <h1 className="text-h3 text-[color:var(--color-text-primary)]">{t("title")}</h1>
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {temporary > 0 ? (
            <span className="rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-warning)] px-2 py-1 text-caption font-medium text-[color:var(--color-semantic-warning-text)]">
              {t("temporaryImages", { count: temporary })}
            </span>
          ) : null}
          <span role="status" aria-live="polite" data-save-state={saving ? "saving" : dirty ? "unsaved" : "saved"} className="inline-flex items-center gap-2 text-label text-[color:var(--color-text-secondary)]">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${dirty ? "border-2 border-[color:var(--color-brand-primary)]" : "bg-[color:var(--color-semantic-success)]"}`}
            />
            {status}
          </span>
          {siteHref ? (
            <a
              href={siteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--button-radius)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 text-label font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-skeleton)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
            >
              {t("openSite")}
              <span className="sr-only"> ({t("openSiteHint")})</span>
            </a>
          ) : null}
          <Button onClick={() => void save()} disabled={!dirty || awaiting !== null} loading={saving} title={!dirty ? t("noChanges") : undefined}>
            {t("save")}
          </Button>
        </div>
      </div>

      {errors.length > 0 || failure ? (
        <div
          ref={summary}
          tabIndex={-1}
          role="region"
          aria-labelledby="hero-summary-title"
          className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-error)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)]"
        >
          <h2 id="hero-summary-title" className="text-label font-bold text-[color:var(--color-text-primary)]">
            {failure?.partial ? t("summaryPartial") : t("summaryTitle")}
          </h2>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-body-sm text-[color:var(--color-text-primary)]">
            {errors.map((error) => (
              <li key={`${error.path}:${error.code}`}>
                <a
                  href={`#${errorTarget(error.path).elementId}`}
                  onClick={(event) => {
                    event.preventDefault();
                    goToError(error);
                  }}
                  className="underline underline-offset-4 hover:text-[color:var(--color-brand-primary)] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
                >
                  {errorLabel(error)}
                </a>
              </li>
            ))}
            {failure && errors.length === 0 ? <li>{writeErrors(failure.code)}</li> : null}
          </ul>
        </div>
      ) : null}

      <div data-hero-editor-body="" inert={saving || undefined} className="flex flex-col gap-6">
      {draft.slides.length > 0 ? (
        <SlideStrip
          slides={deferred.slides}
          selectedKey={selectedKey}
          changedKeys={changedKeys}
          media={media}
          now={now}
          onSelect={onSelect}
          onMove={onMove}
          onMoveBy={onMoveBy}
          onAdd={onAdd}
        />
      ) : (
        <section aria-labelledby="hero-empty-title" className="flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border-strong)] p-6">
          <h2 id="hero-empty-title" className="text-h4 text-[color:var(--color-text-primary)]">
            {t("emptyTitle")}
          </h2>
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("emptyBody")}</p>
          <Button onClick={add}>{t("addFirst")}</Button>
        </section>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {selected ? (
            <SlideEditor
              key={selected.key}
              slide={selected}
              number={selectedIndex + 1}
              onChange={onSlideChange}
              onDuplicate={() => duplicate(selected.key)}
              onRemove={() => setPendingRemove(selected.key)}
              canDuplicate={draft.slides.length < HERO_SLIDE_MAX}
              errors={errors}
              images={library}
              canReadMedia={canReadMedia}
              locale={locale}
              onUploaded={onUploaded}
            />
          ) : null}
          <EventBarEditor
            value={draft.nextEvent}
            onChange={onEventChange}
            errors={errors}
            previewState={eventState}
            onPreviewState={setEventState}
          />
          <PlaybackEditor value={draft.playback} onChange={onPlaybackChange} errors={errors} />
        </div>
        <div className="min-w-0 xl:sticky xl:top-40">
          <HeroPreview
            slide={deferredSelected}
            index={previewPosition.index}
            count={previewPosition.count}
            media={media}
            nextEvent={deferred.nextEvent}
            eventState={eventState}
            now={now}
          />
        </div>
      </div>
      </div>

      <ConfirmDialog
        open={pendingSwitch !== null}
        title={t("switchTitle")}
        confirmLabel={t("switchConfirm")}
        cancelLabel={t("switchCancel")}
        onConfirm={() => {
          if (pendingSwitch) setSelectedKey(pendingSwitch);
          setPendingSwitch(null);
        }}
        onCancel={() => setPendingSwitch(null)}
      >
        {t("switchBody")}
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingRemove !== null}
        title={t("removeTitle", { number: draft.slides.findIndex((slide) => slide.key === pendingRemove) + 1 })}
        confirmLabel={t("removeConfirm")}
        cancelLabel={t("cancel")}
        tone="destructive"
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      >
        {t("removeBody")}
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingLeave !== null}
        title={t("leaveTitle")}
        confirmLabel={t("leaveConfirm")}
        cancelLabel={t("leaveCancel")}
        tone="destructive"
        onConfirm={() => {
          const href = pendingLeave;
          setPendingLeave(null);
          if (href) router.push(href);
        }}
        onCancel={() => setPendingLeave(null)}
      >
        {t("leaveBody")}
      </ConfirmDialog>
    </div>
  );
};
