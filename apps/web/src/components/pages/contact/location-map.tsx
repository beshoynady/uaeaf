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
      className="absolute inset-0 size-full border-0"
    />
  );
};
