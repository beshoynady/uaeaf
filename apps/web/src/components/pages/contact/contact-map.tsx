import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import type { ContactUsPage, MediaAssetPublic } from "@/lib/api/types";
import { altOf, isExternalMedia } from "@/lib/api/media";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import { text } from "@/components/pages/static-page-screen";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { GLASS_EDGE, PANEL, PANEL_FILL, RECESS } from "@/components/ui/surface";
import { ContactIcon } from "@/components/ui/contact-icon";

/**
 * The location panel: heading, a still map, and the two ways out to a real map.
 *
 * Figma `1192:2304` (AR) / `1475:2614` (EN). The map is a picture, not an
 * embed — the federation has not approved an official Maps address yet, which
 * is what `map.note` says on the page. Nothing here loads a third-party map
 * script, so the page ships no cross-origin request a visitor did not ask for.
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
export async function ContactMap({
  locale,
  record,
  mapImage,
  headingId,
}: {
  locale: AppLocale;
  record: ContactUsPage;
  mapImage: MediaAssetPublic | undefined;
  headingId: string;
}) {
  const t = await getTranslations({ locale, namespace: "Contact" });

  const title = text(record.map?.title, locale) ?? t("map.title");
  const pinTitle = text(record.map?.pinTitle, locale);
  const pinSubtitle = text(record.map?.pinSubtitle, locale);
  const note = text(record.map?.note, locale);

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

      <div className={`relative flex min-h-[220px] w-full items-center justify-center overflow-hidden ${RECESS} ${PANEL_FILL} md:min-h-[300px] xl:min-h-[380px]`}>
        {mapImage ? (
          isCloudinaryUrl(mapImage.file.url) ? (
            // See the hero: the CDN does the resizing, and only a string can
            // carry that instruction across the server/client boundary.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapImage.file.url}
              srcSet={cloudinarySrcSet(mapImage.file.url, mapImage.file.width)}
              sizes="(min-width: 1280px) 600px, (min-width: 768px) 688px, 350px"
              alt={altOf(mapImage, locale)}
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <Image
              src={mapImage.file.url}
              alt={altOf(mapImage, locale)}
              fill
              unoptimized={isExternalMedia(mapImage.file.url)}
              sizes="(min-width: 1280px) 600px, (min-width: 768px) 688px, 350px"
              className="object-cover"
            />
          )
        ) : null}

        {pinTitle ? (
          <div className="relative flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-1 rounded-lg bg-[color:var(--color-surface-base)] px-3 py-2 shadow-[0_4px_6px_rgb(0_0_0/0.12)]">
              <p className="flex items-center gap-1.5 text-label font-bold text-[color:var(--color-text-primary)]">
                <ContactIcon name="mapPin" className="size-3.5 text-[color:var(--color-text-secondary)]" />
                {pinTitle}
              </p>
              {/* `text-caption`, not the 11px the frame carries: Chapter 4's
                  floor is 13px and neither ADR-0041 exception covers this
                  label (ADR-0064 C4). */}
              {pinSubtitle ? (
                <p className="text-caption text-[color:var(--color-text-secondary)]">
                  {pinSubtitle}
                </p>
              ) : null}
            </div>
            {/* The position marker — the one element on this page whose
                colour is wayfinding rather than one of ADR-0065 D2's roles. It
                has to separate from whatever map imagery sits behind it, and
                the ground is a photograph, so the value must not follow the
                theme. `--color-red-500` rather than `--color-brand-secondary`:
                both are #C8102E, and `token-contract.spec.ts` keeps the
                identity token out of text utilities. */}
            <ContactIcon name="mapPinAnchor" className="size-3 text-[color:var(--color-red-500)]" />
          </div>
        ) : null}
      </div>

      {record.googleMapsUrl || record.map?.directionsUrl ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {record.googleMapsUrl ? (
            <a
              href={record.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BUTTON} ${FOCUS} border border-[color:var(--color-green-500)] bg-[color:var(--color-surface-base)] text-[color:var(--color-text-link)] hover:bg-[color-mix(in_srgb,var(--color-green-500)_8%,var(--color-surface-base))] active:bg-[color-mix(in_srgb,var(--color-green-500)_16%,var(--color-surface-base))]`}
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
}
