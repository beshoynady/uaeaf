"use client";

import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import {
  HEADER_HEIGHT_PX,
  eventBarState,
  formatEventDateTime,
  heroDevice,
  heroFrameLayout,
  heroHeight,
  heroScrim,
  heroType,
  resolveImage,
  type EventBarState,
} from "@uaeaf/content/hero";
import type { CtaDraft, MediaLookup, NextEventDraft, SlideDraft } from "@/lib/admin/homepage-hero";
import { toPreviewSlide } from "@/lib/admin/homepage-hero";

/**
 * The slide being edited as the site will draw it, at a chosen device and
 * language, still (no transition, no camera move, no countdown tick).
 *
 * Every value that decides what the reader sees comes from `@uaeaf/content/hero`,
 * the module the site draws with (ADR-0083): the height (`heroHeight`), which
 * picture and where it is cropped and whether it is flipped (`resolveImage`),
 * the reading wash (`heroScrim`), the gutters, measure and text reserve
 * (`heroFrameLayout`), the type (`heroType`), and the event bar's state
 * (`eventBarState`). The frame is laid out at the device's real width and
 * scaled down to fit the column, so the dashboard window's own width never
 * changes a line break.
 */

export type PreviewDevice = "desktop" | "tablet" | "mobile";
export type PreviewEventState = "before" | "live" | "after";

export const PREVIEW_DEVICES: Record<PreviewDevice, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

const DAY = 86_400_000;

/** The instant the preview reads the bar at, for the state the editor picked. */
export const previewNow = (event: NextEventDraft, state: PreviewEventState, now: Date): Date => {
  const starts = Date.parse(event.startsAt);
  const ends = Date.parse(event.endsAt);
  if (state === "live") return Number.isNaN(starts) ? now : new Date(starts);
  if (state === "after") return Number.isNaN(ends) ? now : new Date(ends);
  if (Number.isNaN(starts)) return now;
  // Before: the real clock while the start is ahead, otherwise three days out,
  // so a past event still shows what its countdown looks like.
  return now.getTime() < starts ? now : new Date(starts - 3 * DAY - 4 * 3_600_000 - 12 * 60_000);
};

const pad = (value: number) => String(value).padStart(2, "0");

const Choice = <T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) => (
  <div role="radiogroup" aria-label={legend} className="inline-flex rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] p-0.5">
    {options.map((option) => (
      <label
        key={option.value}
        title={option.title}
        className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] px-3 text-label font-medium text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-duration-fast)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-sunken)] has-[:checked]:bg-[color:var(--color-surface-sunken)] has-[:checked]:text-[color:var(--color-text-primary)] focus-within:ring-2 focus-within:ring-[color:var(--a11y-focus-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--a11y-focus-offset)]"
      >
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
          className="sr-only"
        />
        <span aria-hidden={option.title ? true : undefined}>{option.label}</span>
        {option.title ? <span className="sr-only">{option.title}</span> : null}
      </label>
    ))}
  </div>
);

const PreviewButton = ({ cta, filled, language, fontSize }: { cta: CtaDraft; filled: boolean; language: "ar" | "en"; fontSize: CSSProperties }) => (
  <span
    className={
      filled
        ? "inline-flex min-h-11 items-center justify-center rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] px-4 py-3.5 text-[color:var(--button-primary-text)]"
        : "inline-flex min-h-11 items-center justify-center px-2 text-[color:var(--color-text-on-brand)] underline underline-offset-4"
    }
    style={fontSize}
  >
    {cta.label[language]}
  </span>
);

const HeroPreviewView = ({
  slide,
  index,
  count,
  media,
  nextEvent,
  eventState,
  now,
}: {
  slide: SlideDraft | null;
  index: number;
  count: number;
  media: MediaLookup;
  nextEvent: NextEventDraft;
  eventState: PreviewEventState;
  now: Date;
}) => {
  const t = useTranslations("HomepageHero");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const column = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);

  useEffect(() => {
    const target = column.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = frame.current;
    if (!target) return;
    // `offsetHeight` is the layout height: the scale transform does not change it.
    const observer = new ResizeObserver(() => setFrameHeight(target.offsetHeight));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const viewport = PREVIEW_DEVICES[device];
  const layout = heroFrameLayout(viewport.width);
  const type = heroType(layout.type);
  const wide = layout.wash === "wide";
  const dir = language === "ar" ? "rtl" : "ltr";
  const scale = available > 0 ? Math.min(1, available / viewport.width) : 0;

  const picture = slide ? resolveImage(toPreviewSlide(slide, media), language, heroDevice(viewport.width)) : null;
  const bar: EventBarState = eventBarState(nextEvent, previewNow(nextEvent, eventState, now));
  const hasEvent = bar.state !== "hidden";

  const primary = slide?.primaryCta.isVisible ? slide.primaryCta : null;
  const secondary = slide?.secondaryCta.isVisible ? slide.secondaryCta : null;
  const buttons = [primary, secondary].filter((cta): cta is CtaDraft => cta !== null);

  const explanation = !picture
    ? t("explainNoImage")
    : picture.source === "mobile"
      ? t("explainMobile")
      : picture.source === "ltr"
        ? picture.mirrored
          ? t("explainMirror")
          : slide?.ltrImageMode === "separate"
            ? t("explainSeparate")
            : t("explainSame")
        : language === "en"
          ? t("explainSame")
          : t("explainComposed");

  const deviceName = t(device === "desktop" ? "deviceDesktop" : device === "tablet" ? "deviceTablet" : "deviceMobile");

  return (
    <section aria-labelledby="hero-preview-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="hero-preview-heading" className="text-h4 text-[color:var(--color-text-primary)]">
          {t("previewHeading")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Choice
            legend={t("previewDevice")}
            name="hero-preview-device"
            value={device}
            onChange={setDevice}
            options={[
              { value: "desktop", label: t("deviceDesktop") },
              { value: "tablet", label: t("deviceTablet") },
              { value: "mobile", label: t("deviceMobile") },
            ]}
          />
          <Choice
            legend={t("previewLanguage")}
            name="hero-preview-language"
            value={language}
            onChange={setLanguage}
            options={[
              { value: "ar", label: t("languageAr"), title: t("languageArName") },
              { value: "en", label: t("languageEn"), title: t("languageEnName") },
            ]}
          />
        </div>
      </div>

      <div dir="ltr" className="w-full">
        {/* Measured here, inside its border: the frame is scaled to this box's
            content width, so it never overflows the edge it is clipped by. */}
        <div
          ref={column}
          className="relative box-content overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)]"
          style={{ height: frameHeight * scale }}
        >
          <div
            ref={frame}
            role="img"
            aria-label={t("previewFrame", {
              device: deviceName,
              width: viewport.width,
              height: viewport.height,
              language: t(language === "ar" ? "languageArName" : "languageEnName"),
            })}
            data-hero-preview=""
            data-device={device}
            data-language={language}
            dir={dir}
            lang={language}
            // Physical `left-0`, not `start-0`: the frame carries the previewed
            // language's direction, so `start` would anchor an Arabic frame by its
            // right edge, and the top-left scale would then draw it outside the box.
            className="absolute left-0 top-0 isolate grid origin-top-left overflow-hidden bg-[color:var(--color-surface-base)]"
            style={{
              width: viewport.width,
              minHeight: heroHeight(viewport, HEADER_HEIGHT_PX),
              transform: `scale(${scale})`,
              visibility: scale > 0 ? "visible" : "hidden",
            }}
          >
            {picture ? (
              // eslint-disable-next-line @next/next/no-img-element -- a still frame of a library picture, drawn at the frame's size and scaled; next/image would resize it for the dashboard window instead.
              <img
                src={picture.image.url}
                alt=""
                data-hero-preview-image=""
                className="absolute inset-0 size-full object-cover"
                style={{ objectPosition: picture.objectPosition, transform: picture.mirrored ? "scaleX(-1)" : undefined }}
              />
            ) : null}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: heroScrim(layout.wash, dir) }} />

            <div
              className="relative col-start-1 row-start-1 flex items-end"
              style={{ paddingBlockStart: "var(--space-24)", paddingBlockEnd: layout.textPaddingBottom(hasEvent) }}
            >
              <div className="mx-auto w-full" style={{ maxWidth: layout.frameMax, paddingInline: layout.gutter }}>
                <div className="flex min-w-0 flex-col gap-4 text-start text-[color:var(--color-text-on-brand)]" style={{ maxWidth: layout.measure }}>
                  {slide?.eyebrow[language].trim() ? <p style={type.eyebrow}>{slide.eyebrow[language]}</p> : null}
                  <p className="text-balance" style={type.title}>
                    {slide?.title[language] || " "}
                  </p>
                  <p style={type.subtitle}>{slide?.subtitle[language]}</p>
                  {buttons.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {buttons.map((cta, at) => (
                        <PreviewButton key={at} cta={cta} filled={at === 0} language={language} fontSize={type.button} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* The foot: the controls row and the event bar, with the site's
                classes for the frame's width (`hero.tsx`, `hero-controls.tsx`,
                `hero-event-bar.tsx`, `hero-countdown.tsx`), chosen here by the
                frame's width because the window's breakpoints are not the frame's. */}
            <div className={`absolute inset-x-0 bottom-0 flex flex-col ${wide ? "gap-4" : "gap-3"}`}>
              <div className="mx-auto flex min-h-11 w-full items-center text-[color:var(--color-text-on-brand)]" style={{ maxWidth: layout.frameMax, paddingInline: layout.gutter }}>
                <div className={`flex items-center ${wide ? "gap-4" : "gap-2"}`}>
                  <span className="inline-flex size-11 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current">
                      <path d="M4 2h3v12H4zM9 2h3v12H9z" />
                    </svg>
                  </span>
                  <span className={`flex items-center ${wide ? "gap-3" : "gap-1"}`}>
                    {Array.from({ length: Math.max(count, 1) }, (_, at) => (
                      <span key={at} className="flex min-h-11 min-w-11 flex-col items-start justify-center gap-1.5 px-1">
                        {at === index || wide ? (
                          <span className={`font-bold tabular-nums ${at === index ? "" : "opacity-75"}`} style={type.caption}>
                            {pad(at + 1)}
                          </span>
                        ) : null}
                        <span className={`relative block h-0.5 overflow-hidden bg-[color-mix(in_srgb,var(--color-text-on-brand)_45%,transparent)] ${wide ? "w-14" : "w-8"}`}>
                          {at === index ? <span className="absolute inset-0 bg-[color:var(--color-brand-primary)]" /> : null}
                        </span>
                      </span>
                    ))}
                  </span>
                </div>
              </div>

              {bar.state !== "hidden" ? (
                <div
                  data-hero-preview-event={bar.state}
                  className="w-full border-t-2 border-[color:var(--color-brand-primary)] bg-[color-mix(in_srgb,var(--color-surface-overlay)_40%,transparent)] text-[color:var(--color-text-on-brand)]"
                >
                  <div
                    className={`mx-auto flex w-full ${wide ? "min-h-[var(--space-16)] flex-row items-center justify-between gap-6 py-3" : "min-h-[var(--space-24)] flex-col justify-center gap-1 py-2"}`}
                    style={{ maxWidth: layout.frameMax, paddingInline: layout.gutter }}
                  >
                    <div className={`flex min-w-0 ${wide ? "flex-row items-baseline gap-4" : "flex-col gap-1"}`}>
                      {wide ? <p style={type.eyebrow}>{nextEvent.label[language]}</p> : null}
                      <p className="opacity-85" style={type.caption}>
                        {formatEventDateTime(nextEvent.startsAt, language)} · {nextEvent.venue[language]}
                      </p>
                      <p style={{ ...type.button, fontWeight: "var(--font-weight-bold)" }}>{nextEvent.name[language]}</p>
                    </div>
                    {bar.state === "live" ? (
                      <span style={{ ...type.button, fontWeight: "var(--font-weight-bold)" }}>{t(`previewCopy.${language}.live`)}</span>
                    ) : (
                      <span className="flex items-baseline gap-3">
                        {(
                          [
                            [bar.days, "days"],
                            [bar.hours, "hours"],
                            [bar.minutes, "minutes"],
                          ] as const
                        ).map(([value, unit]) => (
                          <span key={unit} className="flex items-baseline gap-1">
                            <span className="tabular-nums" style={{ ...type.subtitle, fontWeight: "var(--font-weight-bold)" }}>
                              {pad(value)}
                            </span>
                            <span className="opacity-85" style={type.caption}>
                              {t(`previewCopy.${language}.${unit}`)}
                            </span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-[var(--space-4)]" />
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-caption text-[color:var(--color-text-secondary)]" data-hero-preview-explain="">
        {explanation}
      </p>
      {nextEvent.isVisible && !hasEvent ? (
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("stateHidden")}</p>
      ) : null}
    </section>
  );
};

// Memoised: the screen re-renders on every keystroke, and this part only has to
// when its own props change (the props it receives are kept stable for that).
export const HeroPreview = memo(HeroPreviewView);
