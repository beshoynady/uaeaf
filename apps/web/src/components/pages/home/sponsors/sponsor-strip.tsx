import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { displayName } from "@uaeaf/content/sponsors";
import { STRIP_GAP, STRIP_ITEM_MIN, stripCopies, stripCopyWidth, stripItems, stripLoopSeconds } from "@uaeaf/content/sponsors";
import { CONTAINER, REGISTER_CLASSES } from "@/components/ui/section";
import { FOCUS, TOUCH_TARGET, TRANSITION } from "@/components/ui/interactive";
import type { AppLocale } from "@/i18n/routing";
import type { SponsorStripSettingsPublic, SponsorshipPublic } from "@/lib/api/types";
import { OrganizationLogo } from "./organization-logo";
import { OrganizationName } from "./organization-name";
import { SponsorStripControls } from "./sponsor-strip-controls";

/**
 * The global sponsor strip (ADR-0043, ADR-0077 D5, ADR-0085 D7 and D9),
 * directly under the hero and outside the first screen (ADR-0078 D3).
 *
 * ── The anchor, and what moves ────────────────────────────────────────────
 *
 * A fixed block at the start of the line carries the strip's title, a divider
 * and the pause button; the logos travel through the track beside it (D9.5).
 * Below `md` the anchor becomes a line above the strip, because Chapter 5
 * §5.2's content width at `sm` (592px) leaves under 300px of track once the
 * anchor is placed — less than one item.
 *
 * The held sponsorship is the one the editor chose (ADR-0086 D2), drawn still
 * beside the anchor with its own edge, and left out of the travelling row so
 * it is never in two places at once.
 *
 * The title is the name the `aside` used to carry as `aria-label`. It is
 * printed now, and the `aside` points at it, so a screen reader announces the
 * region's name once rather than hearing it twice.
 *
 * ── The loop ──────────────────────────────────────────────────────────────
 *
 * The row moves whenever there is more than one sponsor to move through, and
 * a single sponsor is drawn once, standing (ADR-0086 D5) — one question about
 * the count, with no width in it. Above that the list is repeated
 * `stripCopies` times and one cycle travels exactly one copy's width, so the
 * frame after the last is the first and no seam can appear (D9.3). Speed is a
 * rate in pixels per second and the duration is derived from the distance
 * (D9.2), so five sponsors and ten move at the same visible speed.
 *
 * Every number is computed here, on the server, from widths D8 #4 fixed —
 * nothing is measured in the browser and nothing shifts (Chapter 5 §5.9).
 *
 * It only moves once the controls have hydrated (`data-enhanced`): moving
 * content without a working pause button fails WCAG 2.2.2. Until then, and
 * always under `prefers-reduced-motion`, the row is still and scrolls. Every
 * copy after the first is `aria-hidden` and `inert`, so each sponsor is read
 * and tabbed once.
 *
 * ── Colour and type ───────────────────────────────────────────────────────
 *
 * The black register, not Figma's untokenised `#070c08` and amber; nothing
 * under 13px (ADR-0085 D3 #1–2). Logos stand on `--color-logo-plate`, at full
 * colour in every state — no filter, ever (Chapter 8 §M.9).
 */

const BLACK = REGISTER_CLASSES.black;

type Item = SponsorshipPublic;

/** One sponsor in the row. A link when the sponsor has a website, and a plain
 *  block when it does not — never a link to nowhere. The hover ground is the
 *  one the pause button in this same strip uses, so the strip has a single
 *  hover language; the lift is elevation, because no spacing token describes
 *  a 2–3px rise and inventing one would be an arbitrary value (D9.6). */
const StripItem = ({
  item,
  locale,
  displayMode,
  visit,
  newTab,
}: {
  item: Item;
  locale: AppLocale;
  displayMode: SponsorStripSettingsPublic["displayMode"];
  visit: (name: string) => string;
  newTab: string;
}) => {
  const logoOnly = displayMode === "logo";
  const shown = displayName(item.sponsor.name, locale);
  const body = (
    <>
      <OrganizationLogo logo={item.sponsor.logo} name={item.sponsor.name} locale={locale} size="strip" decorative={!logoOnly} />
      {logoOnly ? null : (
        <span className="flex min-w-0 flex-1 flex-col">
          <OrganizationName name={item.sponsor.name} locale={locale} className="text-body-sm font-semibold text-balance" />
          {displayMode === "logoNameScope" && item.scopeLabel ? (
            // "What they sponsor" falls back to logo + name below md (ADR-0077 D5 #7).
            <span className={`max-md:hidden text-body-sm text-balance ${BLACK.muted}`}>{item.scopeLabel[locale]}</span>
          ) : null}
        </span>
      )}
    </>
  );

  return (
    // Exactly the width `stripCopyWidth` counts with, so the distance the loop
    // travels is the distance drawn: a long name wraps inside the item rather
    // than widening it.
    <li
      className="flex shrink-0 items-center justify-center"
      data-strip-item=""
      data-mode={displayMode}
      style={{ inlineSize: STRIP_ITEM_MIN[displayMode] }}
    >
      {item.sponsor.website && shown ? (
        <a
          href={item.sponsor.website}
          target="_blank"
          rel="noopener noreferrer"
          data-strip-link=""
          className={`strip-item-link flex w-full ${TOUCH_TARGET} items-center justify-center gap-3 rounded-[var(--radius-md)] px-2 ${TRANSITION} ${FOCUS}`}
        >
          {body}
          <span className="sr-only">
            {visit(shown.text)} ({newTab})
          </span>
        </a>
      ) : (
        <span className="flex w-full items-center justify-center gap-3 px-2">{body}</span>
      )}
    </li>
  );
};

const Pinned = ({
  item,
  locale,
  className,
  tier,
}: {
  item: Item;
  locale: AppLocale;
  className: string;
  /** The tier in the page's language, and in English on the Arabic page. */
  tier: { label: string; english: string | null };
}) => {
  return (
    // The marker (ADR-0086 D3): `--color-logo-pinned-edge` at
    // `--border-width-thick`, where every other edge in the strip is the
    // register's own at the default width. Weight as well as hue, so the
    // distinction survives `forced-colors` — where the user's scheme replaces
    // every author colour and only the weight is left — and the tier line
    // above the name says it in words besides (WCAG 1.4.1). Deliberately not
    // the medal gold: a sponsor has not won anything.
    <div
      data-strip-pinned=""
      style={{ inlineSize: STRIP_ITEM_MIN.pinned, maxInlineSize: "100%" }}
      className={`shrink-0 flex-col items-center gap-2 rounded-[var(--radius-md)] border-[length:var(--border-width-thick)] border-[color:var(--color-logo-pinned-edge)] px-6 py-2 ${className}`}
    >
      <span className={`text-body-sm font-semibold ${BLACK.muted}`}>
        {tier.label}
        {tier.english ? (
          <>
            {" · "}
            <bdi lang="en" className="font-latin">{tier.english}</bdi>
          </>
        ) : null}
      </span>
      <span className="flex items-center gap-3">
        <OrganizationLogo logo={item.sponsor.logo} name={item.sponsor.name} locale={locale} size="strip" decorative />
        <OrganizationName name={item.sponsor.name} locale={locale} className="min-w-0 text-body font-bold text-balance" />
      </span>
    </div>
  );
};

export const SponsorStrip = async ({
  sponsorships,
  settings,
  locale,
  now = new Date(),
}: {
  sponsorships: readonly SponsorshipPublic[];
  settings: SponsorStripSettingsPublic;
  locale: AppLocale;
  now?: Date;
}) => {
  // Which sponsorship is held is the editor's choice, carried in the settings
  // (ADR-0086 D2) — the strip no longer needs to be told what the section
  // banners.
  const { pinned, others } = stripItems(
    sponsorships.map((item) => ({ ...item, sponsorId: item.sponsor.id })),
    settings,
    now,
  );
  if (!pinned && others.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "HomeSponsors" });
  const copyWidth = stripCopyWidth(others.length, settings.displayMode);
  const copies = stripCopies(others.length, settings.displayMode);
  const seconds = stripLoopSeconds(others.length, settings.displayMode, settings.speed);
  // The one question: is there a loop at all. `stripCopies` answers it from
  // the number of sponsors and nothing else — a single sponsor is drawn once,
  // still (ADR-0086 D5), and then there is nothing to pause.
  const moves = copies > 0;

  const style = {
    // The distance one cycle travels, and how long it takes. `--strip-copy` is
    // a length so the keyframe can carry the sign that makes the direction
    // (D9.4); the duration is derived from it and the rate, never authored.
    "--strip-copy": `${copyWidth}px`,
    "--strip-duration": `${seconds}s`,
    "--strip-gap": `${STRIP_GAP}px`,
  } as CSSProperties;

  const titleId = "sponsor-strip-title";
  const trackId = "sponsor-strip-track";
  const tier = pinned
    ? { label: t(`tiers.${pinned.tier}`), english: locale === "ar" ? t(`tiersEnglish.${pinned.tier}`) : null }
    : null;

  const row = (copy: number) => (
    <ul
      key={copy}
      className="strip-copy flex items-center"
      // Only the first copy is read and tabbed; the rest exist so the row can
      // run out of content at no point on the widest screen.
      aria-hidden={copy > 0 ? "true" : undefined}
      inert={copy > 0 ? true : undefined}
    >
      {others.map((item) => (
        <StripItem
          key={`${copy}-${item.id}`}
          item={item}
          locale={locale}
          displayMode={settings.displayMode}
          visit={(name) => t("sponsors.visitWebsite", { name })}
          newTab={t("sponsors.opensInNewTab")}
        />
      ))}
    </ul>
  );

  return (
    <aside
      aria-labelledby={titleId}
      data-sponsor-strip=""
      data-speed={settings.speed}
      style={style}
      className={`sponsor-strip w-full py-4 md:py-6 ${BLACK.surface}`}
    >
      <div className={`${CONTAINER} flex flex-col gap-4 md:flex-row md:items-center md:gap-6`}>
        {/* The anchor: title, divider, pause. It never stands alone — a strip
            with nothing to show returns null above, so "no empty shelf" holds
            for the anchor as much as for the row. */}
        <div className="strip-anchor flex shrink-0 items-center gap-4">
          <p id={titleId} className="text-body-sm font-semibold whitespace-nowrap">
            {t("strip.label")}
          </p>
            {moves ? <SponsorStripControls trackId={trackId} labels={{ pause: t("strip.pause"), play: t("strip.play") }} /> : null}
        </div>

        {pinned ? <Pinned item={pinned} locale={locale} tier={tier!} className="strip-pinned flex shrink-0" /> : null}

        {others.length === 0 ? null : moves ? (
          <div className="strip-viewport min-w-0 flex-1">
            <div id={trackId} className="strip-track flex w-max items-center">
              {Array.from({ length: copies }, (_, copy) => row(copy))}
            </div>
          </div>
        ) : (
          // Drawn once, standing: the same row, with no viewport to clip it
          // and no track to travel. Centred in what the anchor leaves, so one
          // sponsor reads as the band's subject rather than as the start of a
          // row that ran out.
          <div className="flex min-w-0 flex-1 justify-center">{row(0)}</div>
        )}
      </div>
    </aside>
  );
};
