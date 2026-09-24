import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import type { ContactUsPage } from "@/lib/api/types";
import { text } from "@/components/pages/static-page-screen";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { GLASS_EDGE, PANEL, PANEL_FILL, RECESS } from "@/components/ui/surface";
import { ContactIcon } from "@/components/ui/contact-icon";
import { FooterMapFrame } from "@/components/layout/footer-map-frame";
import { LocationMap } from "./location-map";

/**
 * The location panel: heading, the live map, the place, and the two ways out
 * to Google Maps.
 *
 * Figma `1192:2304` (AR) / `1475:2614` (EN) drew a still picture with the
 * place on a card over it, while no official address existed. The address is
 * now official (owner 2026-09-22) and the map is live, at the record's own
 * coordinates. The place moved under the map: over a live map, the card
 * would cover Google's own marker and take the pointer from the map beneath
 * it. With no coordinates stored, no map is drawn, and no empty frame either.
 *
 * Both call-to-action targets are optional and independent: `googleMapsUrl`
 * opens the place, `map.directionsUrl` opens routing. A button whose target is
 * unset is not rendered at all rather than rendered dead.
 *
 * The panel carries no hue. ADR-0065 R2: a tinted ground and a green heading
 * say nothing the words do not already say. Federation Green appears on one
 * element here — the button that opens a map — because that is the action
 * (D2), and the panel is a peer of the form panel beside it, painted the same
 * way.
 */
export const ContactMap = async ({
  locale,
  record,
  headingId,
}: {
  locale: AppLocale;
  record: ContactUsPage;
  headingId: string;
}) => {
  const t = await getTranslations({ locale, namespace: "Contact" });

  const title = text(record.map?.title, locale) ?? t("map.title");
  const pinTitle = text(record.map?.pinTitle, locale);
  const pinSubtitle = text(record.map?.pinSubtitle, locale);
  const note = text(record.map?.note, locale);
  const latitude = record.map?.latitude;
  const longitude = record.map?.longitude;

  const BUTTON = `inline-flex min-h-11 items-center justify-center rounded-[var(--button-radius)] px-4 py-3.5 text-body-sm font-semibold ${TRANSITION}`;

  return (
    <section
      aria-labelledby={headingId}
      data-testid="contact-map"
      className={`flex h-full flex-col gap-5 ${PANEL} ${GLASS_EDGE} p-5 md:p-8 xl:p-10`}
    >
      <h2 id={headingId} className="text-h2">
        {title}
      </h2>

      {typeof latitude === "number" && typeof longitude === "number" ? (
        // The footer's frame, not a second one: both draw the same third-party
        // map, and `loading="lazy"` does not hold it back on its own — measured
        // 2026-09-22, Chromium fetched a lazy frame 3741px below the fold at
        // load. The map is the last thing on this page; most readers come for
        // the form above it.
        <FooterMapFrame
          testId="contact-map-frame"
          className={`relative min-h-[220px] w-full overflow-hidden ${RECESS} ${PANEL_FILL} md:min-h-[300px] xl:min-h-[380px]`}
        >
          <LocationMap latitude={latitude} longitude={longitude} locale={locale} title={t("map.frameTitle")} />
        </FooterMapFrame>
      ) : null}

      {pinTitle ? (
        <p className="flex items-start gap-2 text-start">
          <ContactIcon name="mapPin" className="mt-1 size-3.5 shrink-0 text-[color:var(--color-text-secondary)]" />
          <span className="flex flex-col gap-1">
            <span className="text-label font-bold text-[color:var(--color-text-primary)]">{pinTitle}</span>
            {/* `text-caption`, not the 11px the frame carries: Chapter 4's
                floor is 13px and neither ADR-0041 exception covers this
                label (ADR-0064 C4). */}
            {pinSubtitle ? (
              <span className="text-caption text-[color:var(--color-text-secondary)]">{pinSubtitle}</span>
            ) : null}
          </span>
        </p>
      ) : null}

      {record.googleMapsUrl || record.map?.directionsUrl ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {record.googleMapsUrl ? (
            <a
              href={record.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BUTTON} ${FOCUS} border border-[color:var(--color-border-accent)] bg-[color:var(--color-surface-base)] text-[color:var(--color-text-link)] hover:bg-[color-mix(in_srgb,var(--color-border-accent)_8%,var(--color-surface-base))] active:bg-[color-mix(in_srgb,var(--color-border-accent)_16%,var(--color-surface-base))]`}
            >
              {t("map.viewOnMaps")}
            </a>
          ) : null}
          {record.map?.directionsUrl ? (
            <a
              href={record.map.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              // Demoted to a text action, not promoted to match its
              // neighbour. Three levels have to fit on this page and only
              // three: the form's solid green submit is what the page is for,
              // the outlined "view on maps" is what this section is for, and
              // this is the alternative to that. Two identical outlined
              // buttons side by side made the reader choose between peers
              // when one of them is plainly the lesser errand.
              className={`${BUTTON} ${FOCUS} text-[color:var(--color-text-secondary)] underline decoration-transparent underline-offset-4 hover:text-[color:var(--color-text-primary)] hover:decoration-current active:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-sunken)]`}
            >
              {t("map.openDirections")}
            </a>
          ) : null}
        </div>
      ) : null}

      {note ? <p className="text-caption text-[color:var(--color-text-secondary)]">{note}</p> : null}
    </section>
  );
};
