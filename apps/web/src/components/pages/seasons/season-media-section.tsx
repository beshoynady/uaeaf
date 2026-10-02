import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button, SectionHeading } from "@uaeaf/brand-ui";
import { AlbumCard } from "@/components/shared/albums/album-card";
import { Section } from "@/components/ui/section";
import { Link } from "@/i18n/navigation";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { VideoPublic } from "@/lib/video/types";
import type { AppLocale } from "@/i18n/routing";
import { SeasonVideos } from "./season-videos";

/**
 * The season's albums and videos, side by side from `lg`, each with a way into
 * its library already filtered to the season. The cards are the libraries' own
 * (`AlbumCard`, `VideoCard`); nothing here draws a gallery of its own.
 *
 * `null` for a list means the API could not answer, which is said as such; an
 * empty list says the season has none yet.
 */
export const SeasonMediaSection = ({
  albums,
  videos,
  thumbnails,
  albumsHref,
  videosHref,
  locale,
  ground,
}: {
  albums: readonly AlbumListItem[] | null;
  videos: readonly VideoPublic[] | null;
  thumbnails: Map<string, MediaAssetPublic>;
  /** The libraries filtered to this season, or `null` where no filter reaches it. */
  albumsHref: string | null;
  videosHref: string | null;
  locale: AppLocale;
  ground: "base" | "sunken";
}) => {
  const t = useTranslations("Seasons.media");

  return (
    <Section ground={ground} className="py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <Column
          id="season-albums-heading"
          title={t("albumsHeading")}
          action={albumsHref ? <LibraryLink href={albumsHref}>{t("albumsLink")}</LibraryLink> : undefined}
          empty={albums === null ? t("unavailable") : albums.length === 0 ? t("albumsEmpty") : null}
        >
          <ul className="grid gap-6 sm:grid-cols-2">
            {(albums ?? []).map((album) => (
              <li key={album.id}>
                <AlbumCard album={album} locale={locale} />
              </li>
            ))}
          </ul>
        </Column>

        <Column
          id="season-videos-heading"
          title={t("videosHeading")}
          action={videosHref ? <LibraryLink href={videosHref}>{t("videosLink")}</LibraryLink> : undefined}
          empty={videos === null ? t("unavailable") : videos.length === 0 ? t("videosEmpty") : null}
        >
          <SeasonVideos videos={videos ?? []} thumbnails={thumbnails} listName={t("videosHeading")} locale={locale} />
        </Column>
      </div>
    </Section>
  );
};

const Column = ({
  id,
  title,
  action,
  empty,
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  /** A sentence to show instead of the list, or `null` to show the list. */
  empty: string | null;
  children: ReactNode;
}) => (
  <section aria-labelledby={id} className="flex min-w-0 flex-col gap-6">
    <SectionHeading title={<span id={id}>{title}</span>} action={action} />
    {empty === null ? children : <p className="text-body text-[color:var(--color-text-secondary)]">{empty}</p>}
  </section>
);

const LibraryLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Button variant="ghost" href={href} linkComponent={Link}>
    {children}
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5" />
    </svg>
  </Button>
);
