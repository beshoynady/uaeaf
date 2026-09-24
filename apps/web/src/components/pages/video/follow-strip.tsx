import { useTranslations } from "next-intl";
import { PlatformChipMark } from "./platform-badge";
import { SOCIAL_LINKS } from "@/lib/navigation";
import { VIDEO_PLATFORMS } from "@/lib/video/types";
import type { VideoPlatform } from "@/lib/video/types";
import { FOCUS } from "@/components/ui/interactive";

/**
 * The federation's own channels, at the foot of the library.
 *
 * The addresses come from `SOCIAL_LINKS` -- the same list the footer draws --
 * rather than being written again here. Two lists of the federation's
 * accounts is one list that eventually points somewhere the federation no
 * longer posts.
 *
 * The marks are this system's own rather than the footer's artwork: these sit
 * on the dark register beside a page full of the same five marks on the cards,
 * and two visual treatments of one platform on one page reads as two
 * platforms. Only the five that carry video are drawn; the list is filtered by
 * the video vocabulary rather than by a second hardcoded list, so a channel
 * added to `SOCIAL_LINKS` appears here the moment videos can come from it.
 */
export const FollowStrip = () => {
  const t = useTranslations("VideoSystem");

  const channels = SOCIAL_LINKS.filter((link): link is (typeof SOCIAL_LINKS)[number] & { key: VideoPlatform } =>
    (VIDEO_PLATFORMS as readonly string[]).includes(link.key),
  );

  if (channels.length === 0) return null;

  return (
    <section
      className="vs-fill flex flex-wrap items-center justify-between gap-6 p-8"
      style={{ borderRadius: "var(--radius-xl)" }}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-h4 font-bold" style={{ color: "var(--surface-text)" }}>
          {t("followTitle")}
        </h2>
        <p className="text-body-sm" style={{ color: "var(--surface-text-muted)" }}>
          {t("followBody")}
        </p>
      </div>

      <ul className="flex flex-wrap items-center gap-3">
        {channels.map((channel) => (
          <li key={channel.key}>
            <a
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              // The name is on the link, not beside the mark: a row of five
              // unlabelled circles is a guessing game for a screen reader, and
              // the label says where the reader is being sent rather than just
              // naming a company.
              aria-label={t("followOn", { platform: t(`platform_${channel.key}`) })}
              // `.lift` rather than a hand-rolled translate: ADR-0065 D5 makes
              // it the one definition of the hover response, and it already
              // answers focus and press as well — which a `hover:` utility
              // never did, so this rose for a mouse and stayed flat for a
              // keyboard. Two implementations had drifted to 2px and 4px.
              className={`lift inline-flex size-11 items-center justify-center rounded-full ${FOCUS}`}
            >
              <PlatformChipMark platform={channel.key} size={44} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
