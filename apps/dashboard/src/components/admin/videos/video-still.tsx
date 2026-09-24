import { UiIcon } from "@/lib/icons/ui-icons";

/**
 * A video's still, with no way for it to be a hole.
 *
 * The public site answers this once in `VideoThumbnail` — the federation's
 * motif on the dark register — so that no card can forget and leave a gap.
 * The dashboard had no equivalent: the broadcast banner drew nothing at all,
 * and the form preview drew an empty frame whenever the platform named no
 * picture. Same problem, so the same shape of answer.
 *
 * The mark is the video icon rather than the motif: the dashboard does not
 * ship the motif component, and the icon set already carries exactly this
 * meaning. On the site the motif stays, because there it sits beside twelve
 * cards already using it and a second placeholder would read as a different
 * kind of absence.
 *
 * `aria-hidden` on the placeholder: "there is no still" is not information
 * worth reading out. The title beside it is the record's accessible name.
 */
export const VideoStill = ({
  url,
  className = "",
  rounded = "rounded-[var(--radius-sm)]",
}: {
  url?: string | null;
  className?: string;
  rounded?: string;
}) => {
  if (url) {
    return (
      // A plain `<img>`, not `next/image`: these are media-library URLs whose
      // host `images.remotePatterns` does not list, and the optimiser would
      // refuse them outright.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" loading="lazy" className={`size-full object-cover ${rounded} ${className}`} />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex size-full items-center justify-center ${rounded} ${className}`}
      // The site's own dark register, as literals for the same reason the
      // preview card uses literals: it belongs to the video system alone, and
      // a token would invite it into screens that never agreed to it.
      style={{ background: "linear-gradient(135deg, #121614, #0A0C0B)", color: "#4C5651" }}
    >
      <UiIcon name="video" className="size-[var(--icon-size-sm)]" />
    </span>
  );
};
