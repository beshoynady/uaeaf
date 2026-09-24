import type { AppLocale } from "@/i18n/routing";

/**
 * A live Google map at one place (owner request 2026-09-22).
 *
 * Google's embed without an API key, as the owner asked: `q` places the
 * marker, `z` frames the street around it, `hl` labels the map in the page's
 * own language. `loading="lazy"`, because a third-party frame costs a
 * cross-origin request and its weight, and most visitors to the page come
 * for the form above it.
 *
 * It fills the frame it is placed in; the frame decides the size.
 */
export const LocationMap = ({
  latitude,
  longitude,
  locale,
  title,
}: {
  latitude: number;
  longitude: number;
  locale: AppLocale;
  /** What a screen reader announces for the frame (WCAG 4.1.2). */
  title: string;
}) => {
  const source = new URL("https://www.google.com/maps");
  source.searchParams.set("q", `${latitude},${longitude}`);
  source.searchParams.set("z", "16");
  source.searchParams.set("hl", locale);
  source.searchParams.set("output", "embed");

  return (
    <iframe
      src={source.toString()}
      title={title}
      loading="lazy"
      // Owner instruction, 2026-09-23. This is the pre-2020 default: the
      // embedding page's full URL travels to Google over HTTPS, and nothing
      // travels if the page is ever served over plain HTTP.
      //
      // Stated plainly because it reads the other way round: it is WIDER than
      // what the browser does on its own. Chromium and Firefox default to
      // `strict-origin-when-cross-origin`, which sends only the origin here.
      // Google's Maps Embed API needs a referrer only to match an HTTP-referrer
      // key restriction, and an origin satisfies that — so if the intent was to
      // send Google less rather than more, the value wanted is
      // `strict-origin-when-cross-origin`. Flagged in the session report.
      referrerPolicy="no-referrer-when-downgrade"
      className="absolute inset-0 size-full border-0"
    />
  );
};
