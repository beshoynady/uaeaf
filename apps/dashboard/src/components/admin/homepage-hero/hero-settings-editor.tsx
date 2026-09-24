"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { HERO_PLAYBACK, HERO_TEXT_LIMITS, dubaiLocalToIso, isoToDubaiLocal } from "@uaeaf/content/hero";
import { TextField } from "@/components/auth/text-field";
import type { FieldError, NextEventDraft, PlaybackDraft } from "@/lib/admin/homepage-hero";
import { errorAt, fieldMessage } from "./field-errors";
import type { PreviewEventState } from "./hero-preview";
import { LocalizedTextPair } from "./localized-text-pair";
import { SwitchField } from "@/components/ui/switch-field";

/**
 * The hero's two settings that are not slides: the next-event bar, typed by
 * hand (owner decision 2026-09-17: no link, no details button, not clickable),
 * and how the slides play.
 */

const RADIO_CARD =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-3 text-label font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-sunken)] has-[:checked]:border-[color:var(--color-brand-primary)] has-[:checked]:bg-[color:var(--color-surface-sunken)]";

const Panel = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4 md:p-6">
    <h2 id={id} className="text-h4 text-[color:var(--color-text-primary)]">
      {title}
    </h2>
    {children}
  </section>
);

const PlaybackEditorView = ({
  value,
  onChange,
  errors,
}: {
  value: PlaybackDraft;
  onChange: (value: PlaybackDraft) => void;
  errors: readonly FieldError[];
}) => {
  const t = useTranslations("HomepageHero");
  const error = fieldMessage(t, errorAt(errors, "playback.intervalMs"));
  return (
    <Panel id="hero-playback-heading" title={t("playbackHeading")}>
      <SwitchField id="hero-autoplay" label={t("autoplay")} checked={value.autoplay} onChange={(autoplay) => onChange({ ...value, autoplay })} />
      <div id="hero-interval" className="flex flex-col gap-2">
        <p id="hero-interval-label" className="mb-2 text-label font-medium text-[color:var(--color-text-secondary)]">
          {t("interval")}
        </p>
        <div role="radiogroup" aria-labelledby="hero-interval-label" aria-describedby="hero-playback-note" className="flex flex-wrap gap-2">
          {HERO_PLAYBACK.intervals.map((intervalMs) => (
            <label key={intervalMs} className={RADIO_CARD}>
              <input
                type="radio"
                name="hero-interval"
                value={intervalMs}
                checked={value.intervalMs === intervalMs}
                onChange={() => onChange({ ...value, intervalMs })}
                className="size-4 accent-[color:var(--color-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
              />
              {t("seconds", { seconds: intervalMs / 1000 })}
            </label>
          ))}
        </div>
        {error ? <p className="text-caption font-medium text-[color:var(--color-text-primary)]">{error}</p> : null}
      </div>
      <p id="hero-playback-note" className="text-caption text-[color:var(--color-text-secondary)]">
        {t("playbackNote")}
      </p>
    </Panel>
  );
};

const EventBarEditorView = ({
  value,
  onChange,
  errors,
  previewState,
  onPreviewState,
}: {
  value: NextEventDraft;
  onChange: (value: NextEventDraft) => void;
  errors: readonly FieldError[];
  previewState: PreviewEventState;
  onPreviewState: (state: PreviewEventState) => void;
}) => {
  const t = useTranslations("HomepageHero");
  const message = (path: string) => fieldMessage(t, errorAt(errors, path));
  const change = (patch: Partial<NextEventDraft>) => onChange({ ...value, ...patch });

  return (
    <Panel id="hero-event-heading" title={t("eventHeading")}>
      <SwitchField id="hero-event-visible" label={t("eventVisible")} checked={value.isVisible} onChange={(isVisible) => change({ isVisible })} />
      <LocalizedTextPair
        id="hero-event-label"
        label={t("eventLabel")}
        value={value.label}
        onChange={(label) => change({ label })}
        limit={HERO_TEXT_LIMITS.eventLabel}
        linesHint={t("oneLine")}
        errors={errors}
        errorPath="nextEvent.label"
      />
      <LocalizedTextPair
        id="hero-event-name"
        label={t("eventName")}
        value={value.name}
        onChange={(name) => change({ name })}
        limit={HERO_TEXT_LIMITS.eventName}
        linesHint={t("oneLine")}
        errors={errors}
        errorPath="nextEvent.name"
      />
      <LocalizedTextPair
        id="hero-event-venue"
        label={t("eventVenue")}
        value={value.venue}
        onChange={(venue) => change({ venue })}
        limit={HERO_TEXT_LIMITS.eventVenue}
        linesHint={t("oneLine")}
        errors={errors}
        errorPath="nextEvent.venue"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="hero-event-starts"
          type="datetime-local"
          label={t("startsAt")}
          hint={t("startsHint")}
          value={value.startsAt ? isoToDubaiLocal(value.startsAt) : ""}
          error={message("nextEvent.startsAt")}
          onChange={(event) => change({ startsAt: dubaiLocalToIso(event.target.value) ?? "" })}
        />
        <TextField
          id="hero-event-ends"
          type="datetime-local"
          label={t("endsAt")}
          hint={t("endsHint")}
          value={value.endsAt ? isoToDubaiLocal(value.endsAt) : ""}
          error={message("nextEvent.endsAt")}
          onChange={(event) => change({ endsAt: dubaiLocalToIso(event.target.value) ?? "" })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p id="hero-event-state-label" className="mb-2 text-label font-medium text-[color:var(--color-text-secondary)]">
          {t("eventState")}
        </p>
        <div role="radiogroup" aria-labelledby="hero-event-state-label" className="flex flex-wrap gap-2">
          {(
            [
              ["before", "stateBefore"],
              ["live", "stateLive"],
              ["after", "stateAfter"],
            ] as const
          ).map(([state, key]) => (
            <label key={state} className={RADIO_CARD}>
              <input
                type="radio"
                name="hero-event-state"
                value={state}
                checked={previewState === state}
                onChange={() => onPreviewState(state)}
                className="size-4 accent-[color:var(--color-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
              />
              {t(key)}
            </label>
          ))}
        </div>
      </div>
    </Panel>
  );
};

// Memoised: the screen re-renders on every keystroke, and this part only has to
// when its own props change (the props it receives are kept stable for that).
export const PlaybackEditor = memo(PlaybackEditorView);
export const EventBarEditor = memo(EventBarEditorView);
