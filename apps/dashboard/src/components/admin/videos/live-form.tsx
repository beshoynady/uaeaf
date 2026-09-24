"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BackToVideos } from "./back-to-videos";
import { BilingualField } from "@/components/admin/bilingual-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormSection } from "@/components/ui/form-section";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { TextField } from "@/components/auth/text-field";
import { BUTTON_GHOST, FOCUS_RING, TRANSITION } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { WriteFailure } from "@/components/ui/write-failure";
import { AssociationField } from "./association-field";
import { VideoPreviewCard } from "./video-preview-card";
import { useAdminWrite } from "@/lib/admin/use-admin-write";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { DEFAULT_LIVE_HOURS, dubaiInstant, dubaiParts, expectedEndDefault } from "@/lib/admin/videos/dubai-time";
import type { AssociationOption } from "@/lib/admin/videos/association-options";
import type { AdminLiveStream } from "@/lib/admin/videos/types";

/**
 * Putting a broadcast on the site, and correcting the one that is running.
 *
 * Manual from start to finish: no YouTube Data API, no detection, no polling.
 * The editor pastes a link and says when they expect it to finish, and that
 * time is the only thing that takes the broadcast down by itself.
 *
 * -- Which makes the end time the most consequential field here -------------
 *
 * Too early and a live race vanishes mid-event; too late and the site claims a
 * broadcast that finished hours ago. The quick chips exist so the common cases
 * need no arithmetic, and the note under them says plainly that the time is a
 * mechanism rather than a label.
 *
 * -- Both languages, always --------------------------------------------------
 *
 * The dialog this replaces had one title field and sent it as both `ar` and
 * `en`. On a new broadcast that is a convenience; on an edit it is an
 * erasure — an editor fixing an Arabic typo overwrote the English title with
 * the Arabic one and nothing said so. The pair is a pair here.
 *
 * -- Starting and correcting are different requests -------------------------
 *
 * `POST` ends whatever is live and inserts a new record. Sending one when the
 * editor meant to fix a typo would take the broadcast off the air, give it a
 * new id and a new start time, and look like it worked. So the screen knows
 * which it is, from the address, and never infers it.
 */

/** The quick chips, in the design's order. */
const QUICK_HOURS = [1, 2, 3, 5] as const;

const YOUTUBE_HOSTS = ["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"];

/**
 * Only the shape of the link is checked.
 *
 * Nothing here claims the stream is genuinely live — only YouTube could answer
 * that, and the API that would ask is out of scope. The server re-checks with
 * the same parser the rest of the system uses, so this is the courteous early
 * answer, not the guard.
 *
 * Module scope: it reads no state, and rebuilding it per render made it look
 * like it did.
 */
const isYouTube = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:") return false;
    if (parsed.username !== "" || parsed.password !== "") return false;
    return YOUTUBE_HOSTS.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
};

export const LiveForm = ({
  record,
  template,
  active,
  thumbnailUrl,
  canEnd,
  associationOptions,
  locale,
}: {
  /** The running broadcast being corrected, or `null` when starting one. */
  record: AdminLiveStream | null;
  /** A finished broadcast whose details this one starts from. */
  template: AdminLiveStream | null;
  /** What is on air right now — the warning that starting ends it. */
  active: AdminLiveStream | null;
  /** The still of the broadcast being edited or copied, if it has one. */
  thumbnailUrl?: string | null;
  canEnd: boolean;
  associationOptions: readonly AssociationOption[];
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Videos");
  // The bilingual label pattern every other editor uses: "<field> — in
  // Arabic". Spelled once, so a pair never reads "Venue (ar)" on one screen
  // and "Venue in Arabic" on the next.
  const e = useTranslations("EditorialEditor");
  const router = useRouter();
  const toast = useToast();
  const { busy, failure, setFailure, send, json } = useAdminWrite();

  const editing = record !== null;
  const seed = record ?? template;

  const [url, setUrl] = useState(seed?.url ?? "");
  const [titleAr, setTitleAr] = useState(seed?.title.ar ?? "");
  const [titleEn, setTitleEn] = useState(seed?.title.en ?? "");
  const [venueAr, setVenueAr] = useState(seed?.venue?.ar ?? "");
  const [venueEn, setVenueEn] = useState(seed?.venue?.en ?? "");
  const [association, setAssociation] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [ending, setEnding] = useState(false);

  // Covers the closed tab, the reload and the typed address. The dialog
  // below covers Cancel; neither covers the other.
  useUnsavedGuard(dirty);

  /**
   * The end time, seeded once when the form mounts.
   *
   * An existing broadcast keeps its own; a new one is offered three hours from
   * **now**, and "now" is the moment this screen opened rather than the moment
   * a tab was left open this morning. Taken at the wrong moment, the default
   * would be in the past — and a broadcast whose expected end has already
   * passed never appears on the site at all. The editor would have pressed
   * "go live" and seen nothing happen.
   *
   * A template's end time is deliberately NOT carried: it is in the past, and
   * the whole reason for copying a finished broadcast is that it needs a new
   * window.
   */
  const [end, setEnd] = useState(() =>
    dubaiParts(record ? new Date(record.expectedEndAt) : expectedEndDefault()),
  );

  const touch = <T,>(setter: (value: T) => void) => (value: T) => {
    setDirty(true);
    setFailure(null);
    setter(value);
  };

  const setQuick = (hours: number) => {
    setDirty(true);
    // "in 3 hours" means three hours from the press, so the clock has to be
    // read here. This runs only from the chip's onClick; the rule cannot see
    // that a plain function reached solely through a JSX event prop never runs
    // during render, and it accepts the identical read in `submit` only
    // because that one happens to be async.
    // eslint-disable-next-line react-hooks/purity
    setEnd(dubaiParts(new Date(Date.now() + hours * 60 * 60 * 1000)));
  };

  /** One half of the end time. Spelled out because the inline form of this —
   *  `touch((v) => setEnd((c) => ({ ...c, date: v })))(event.target.value)` —
   *  took three readings to parse at the call site. */
  const setEndPart = (part: "date" | "time") => (value: string) => {
    setDirty(true);
    setFailure(null);
    setEnd((current) => ({ ...current, [part]: value }));
  };

  /**
   * The fields that are still empty or wrong, read fresh each time.
   *
   * Pure: it reads state and nothing else, so the status line can call it
   * during render. The end time is judged separately, in `submit`, because
   * judging it means reading a clock — and a clock read during render is an
   * impurity that makes the same component render two different things at two
   * different moments.
   */
  const outstanding = (): string[] => {
    const missing: string[] = [];
    // Empty and wrong are different things to be told. On a form nobody has
    // typed into yet, "unsupported link" accuses a field that holds nothing.
    if (url.trim() === "") missing.push(t("errUrlRequired"));
    else if (!isYouTube(url)) missing.push(t("errUrlUnsupported"));
    if (titleAr.trim() === "") missing.push(t("errTitleArRequired"));
    return missing;
  };

  const submit = async () => {
    // Both checks at the press, against the state as it is now. The end time
    // in particular moves on its own: a default chosen ten minutes ago is ten
    // minutes closer to being in the past, and the only reading that matters
    // is the one taken when the broadcast is actually about to start.
    const expectedEndAt = dubaiInstant(end.date, end.time);
    const endIsPast = !expectedEndAt || new Date(expectedEndAt).getTime() <= Date.now();
    setEndError(endIsPast ? t("errEndInPast") : null);

    if (outstanding().length > 0 || endIsPast) {
      setShowErrors(true);
      return;
    }

    const title = { ar: titleAr.trim(), en: titleEn.trim() || titleAr.trim() };
    const venue =
      venueAr.trim() === "" && venueEn.trim() === ""
        ? null
        : { ar: venueAr.trim(), en: venueEn.trim() || venueAr.trim() };

    const outcome = editing
      ? // Never the URL: changing it mid-broadcast would silently swap what
        // visitors are watching. Starting a second broadcast is the way to do
        // that, and it ends this one on the record.
        await send(`/api/admin/live-streams/${record.id}`, json({ title, venue, expectedEndAt }, "PATCH"), {
          refresh: false,
        })
      : await send("/api/admin/live-streams", json({ url: url.trim(), title, venue, expectedEndAt, association }), {
          refresh: false,
        });

    if (!outcome.ok) return;

    toast.show({
      tone: "success",
      title: editing ? t("liveUpdatedToast") : t("liveStartedToast"),
      description: title[locale] || title.ar,
      source: "api",
      dedupeKey: `live:${editing ? "updated" : "started"}`,
    });
    setDirty(false);
    router.push("/videos");
  };

  const endNow = async () => {
    if (!record) return;
    const outcome = await send(`/api/admin/live-streams/${record.id}/end`, { method: "POST" }, { refresh: false });
    setEnding(false);
    if (!outcome.ok) return;

    toast.show({
      tone: "success",
      title: t("liveEndedToast"),
      source: "api",
      dedupeKey: "live:ended",
    });
    setDirty(false);
    router.push("/videos");
  };

  const leave = () => {
    if (dirty) {
      setLeaving(true);
      return;
    }
    router.push("/videos");
  };

  // Computed every render, not only after a refused press: the status line
  // above reads from it, and that line is guidance before it is an error.
  const missing = outstanding();
  const firstProblem = missing[0] ?? endError;
  const urlValid = isYouTube(url);
  const urlWrong = url.trim() !== "" && !urlValid;

  return (
    <div className="flex flex-col gap-5">
      <BackToVideos />

      <StickyFormActions
        status={firstProblem ?? t("liveOnlyOneNote")}
        statusProps={{ "aria-live": "polite" }}
      >
        <button type="button" onClick={leave} className={BUTTON_GHOST}>
          {t("cancel")}
        </button>

        {editing && canEnd ? (
          <Button variant="secondary" disabled={busy} onClick={() => setEnding(true)}>
            {t("endLive")}
          </Button>
        ) : null}

        <Button variant="destructive" loading={busy} onClick={() => void submit()}>
          {editing ? t("saveChanges") : t("startLive")}
        </Button>
      </StickyFormActions>

      <WriteFailure message={failure} />

      {/* Starting a second broadcast ends the first, on the record and on the
          site. An editor who does not know that is one press from taking a
          live event off the air. */}
      {!editing && active ? (
        <p className="rounded-[var(--radius-md)] border border-[color:var(--color-semantic-error)] bg-[color-mix(in_srgb,var(--color-semantic-error)_6%,var(--color-surface-raised))] px-4 py-3 text-body-sm text-[color:var(--color-text-primary)]">
          {t("liveReplacesActive", { title: active.title[locale] || active.title.ar })}
        </p>
      ) : null}

      {/* Where the filled-in values came from, so nobody wonders. */}
      {!editing && template ? (
        <p className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] px-4 py-3 text-body-sm text-[color:var(--color-text-secondary)]">
          {t("liveTemplateNotice")}
        </p>
      ) : null}

      <FormSection
        number={1}
        title={t("liveLinkCardTitle")}
        completeLabel={t("sectionComplete")}
        complete={urlValid}
      >
        <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("goLiveIntro")}</p>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            <TextField
              id="live-url"
              label={t("liveUrlLabel")}
              dir="ltr"
              value={url}
              required
              disabled={editing}
              placeholder="https://www.youtube.com/live/..."
              onChange={(event) => touch(setUrl)(event.target.value)}
              error={urlWrong ? t("goLiveUrlInvalid") : null}
              hint={editing ? t("urlReadOnlyHint") : t("liveUrlHint")}
            />

            {urlValid ? (
              <p className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-brand-primary)] bg-[color-mix(in_srgb,var(--color-brand-primary)_6%,var(--color-surface-raised))] px-3 py-2 text-caption font-semibold text-[color:var(--color-text-primary)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="size-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 8.5 3.5 3.5L13 5" />
                </svg>
                {t("liveUrlValid")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-label font-bold text-[color:var(--color-text-primary)]">{t("livePreviewTitle")}</p>
            <VideoPreviewCard
              title={titleAr || titleEn || "—"}
              categoryLabel={venueAr || venueEn || undefined}
              platform="youtube"
              kind="video"
              thumbnailUrl={thumbnailUrl ?? null}
              live
              // The badge, not the banner's sentence: "بث مباشر ظاهر على الموقع
              // الآن" is a line of prose, and inside a 320px card it ran into
              // the platform mark at the opposite corner.
              liveLabel={t("liveBadge")}
            />
            <p className="text-caption text-[color:var(--color-text-secondary)]">{t("livePreviewNote")}</p>
          </div>
        </div>
      </FormSection>

      <FormSection
        number={2}
        title={t("liveDataCardTitle")}
        completeLabel={t("sectionComplete")}
        complete={titleAr.trim() !== ""}
      >
        <BilingualField
          id="live-title"
          labelAr={t("titleArLabel")}
          labelEn={t("titleEnLabel")}
          valueAr={titleAr}
          valueEn={titleEn}
          onChangeAr={touch(setTitleAr)}
          onChangeEn={touch(setTitleEn)}
          required
          error={showErrors && titleAr.trim() === "" ? t("errTitleArRequired") : null}
        />

        <BilingualField
          id="live-venue"
          labelAr={e("labelAr", { label: t("liveVenueLabel") })}
          labelEn={e("labelEn", { label: t("liveVenueLabel") })}
          valueAr={venueAr}
          valueEn={venueEn}
          onChangeAr={touch(setVenueAr)}
          onChangeEn={touch(setVenueEn)}
          hint={t("liveVenuePlaceholder")}
        />

        {!editing ? (
          <AssociationField
            options={associationOptions}
            value={association}
            onChange={touch(setAssociation)}
            label={t("associationLabel")}
          />
        ) : null}
      </FormSection>

      <FormSection
        number={3}
        title={t("liveEndCardTitle")}
        completeLabel={t("sectionComplete")}
        complete={endError === null && end.date !== "" && end.time !== ""}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="live-end-date"
            label={t("liveEndDateLabel")}
            type="date"
            dir="ltr"
            value={end.date}
            required
            onChange={(event) => setEndPart("date")(event.target.value)}
          />
          <TextField
            id="live-end-time"
            label={t("liveEndTimeLabel")}
            type="time"
            dir="ltr"
            value={end.time}
            required
            onChange={(event) => setEndPart("time")(event.target.value)}
          />
        </div>

        {/* A group of shortcuts, not a choice: each one sets the two fields
            above and the fields remain the answer. `aria-pressed` would claim
            a state that stops being true the moment either field is typed
            into, so these are plain buttons. */}
        <div className="flex flex-wrap gap-2">
          {QUICK_HOURS.map((hours) => (
            <button
              key={hours}
              type="button"
              onClick={() => setQuick(hours)}
              className={`inline-flex min-h-11 items-center rounded-[var(--radius-full)] border px-4 text-body-sm ${TRANSITION} ${FOCUS_RING} ${
                hours === DEFAULT_LIVE_HOURS
                  ? "border-[color:var(--color-semantic-error)] font-semibold text-[color:var(--color-text-primary)] hover:bg-[color-mix(in_srgb,var(--color-semantic-error)_8%,transparent)] active:bg-[color-mix(in_srgb,var(--color-semantic-error)_16%,transparent)]"
                  : "border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-skeleton)]"
              }`}
            >
              {t(`goLiveQuick${hours}`)}
            </button>
          ))}
        </div>

        {endError ? (
          <p role="alert" className="text-caption font-medium text-[color:var(--color-text-primary)]">
            {endError}
          </p>
        ) : null}

        <p className="text-caption text-[color:var(--color-text-secondary)]">{t("liveEndNote")}</p>
      </FormSection>

      <ConfirmDialog
        open={ending}
        title={t("endLiveConfirmTitle")}
        confirmLabel={t("endLive")}
        cancelLabel={t("cancel")}
        tone="destructive"
        busy={busy}
        onConfirm={() => void endNow()}
        onCancel={() => setEnding(false)}
      >
        {t("endLiveConfirmBody")}
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
