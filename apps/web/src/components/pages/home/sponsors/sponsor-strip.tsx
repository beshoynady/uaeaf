import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { STRIP_ITEM_MIN, stripItems, stripLoopSeconds, stripRowFrom } from "@uaeaf/content/sponsors";
import { CONTAINER, REGISTER_CLASSES } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { SponsorStripSettingsPublic, SponsorshipPublic } from "@/lib/api/types";
import { OrganizationLogo } from "./organization-logo";
import { OrganizationName } from "./organization-name";
import { SponsorStripControls } from "./sponsor-strip-controls";

/**
 * The global sponsor strip (ADR-0043, ADR-0077 D5, ADR-0085 D7), directly under
 * the hero and outside the first screen (ADR-0078 D3).
 *
 * ── What the server draws ─────────────────────────────────────────────────
 *
 * The final layout, from the item count alone (`stripRowFrom`): from
 * `data-row-from` up the items stand still in one row, the pinned one between
 * the rest; below it the pinned one stands above a row that can move. Nothing
 * is measured in the browser, so nothing shifts.
 *
 * ── When it moves ─────────────────────────────────────────────────────────
 *
 * Only once the controls have hydrated (`data-enhanced`): moving content
 * without a working pause button fails WCAG 2.2.2, and without JavaScript the
 * button cannot work. Until then the row is still and scrolls. Under
 * `prefers-reduced-motion: reduce` it never moves and has no button
 * (`motion.css`). The loop's second copy is `aria-hidden` and `inert`, so each
 * sponsor is read and tabbed once.
 *
 * ── Colour and type ───────────────────────────────────────────────────────
 *
 * The black register, not Figma's untokenised `#070c08` and amber; nothing
 * under 13px (ADR-0085 D3 #1–2). Logos stand on `--color-logo-plate`.
 */

const BLACK = REGISTER_CLASSES.black;

type Item = SponsorshipPublic;

const StripItem = ({
  item,
  locale,
  displayMode,
}: {
  item: Item;
  locale: AppLocale;
  displayMode: SponsorStripSettingsPublic["displayMode"];
}) => {
  const logoOnly = displayMode === "logo";
  return (
    // Exactly the width `stripRowFrom` counts with, so the row it promises is
    // the row drawn: a long name wraps inside it rather than widening the row.
    <li
      className="flex shrink-0 items-center justify-center gap-3"
      data-strip-item=""
      data-mode={displayMode}
      style={{ inlineSize: STRIP_ITEM_MIN[displayMode] }}
    >
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
    <div data-strip-pinned="" style={{ inlineSize: STRIP_ITEM_MIN.pinned, maxInlineSize: "100%" }} className={`shrink-0 flex-col items-center gap-2 rounded-[var(--radius-md)] border px-6 py-2 ${BLACK.border} ${className}`}>
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
  bannerId,
  locale,
  now = new Date(),
}: {
  sponsorships: readonly SponsorshipPublic[];
  settings: SponsorStripSettingsPublic;
  /** The sponsors section's banner, so the strip pins the same sponsorship. */
  bannerId: string | null;
  locale: AppLocale;
  now?: Date;
}) => {
  const { pinned, others } = stripItems(
    sponsorships.map((item) => ({ ...item, sponsorId: item.sponsor.id })),
    settings,
    bannerId,
    now,
  );
  if (!pinned && others.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "HomeSponsors" });
  const rowFrom = stripRowFrom(others.length, Boolean(pinned), settings.displayMode);
  const canMove = rowFrom !== "base";
  const half = Math.ceil(others.length / 2);
  const before = pinned ? others.slice(0, half) : others;
  const after = pinned ? others.slice(half) : [];
  const style = { "--strip-duration": `${stripLoopSeconds(others.length, settings.displayMode, settings.speed)}s` } as CSSProperties;
  const trackId = "sponsor-strip-track";
  const tier = pinned
    ? { label: t(`tiers.${pinned.tier}`), english: locale === "ar" ? t(`tiersEnglish.${pinned.tier}`) : null }
    : null;

  return (
    <aside
      aria-label={t("strip.label")}
      data-sponsor-strip=""
      data-row-from={rowFrom ?? "none"}
      data-speed={settings.speed}
      style={style}
      className={`sponsor-strip w-full py-4 md:py-6 ${BLACK.surface}`}
    >
      <div className={`${CONTAINER} flex flex-col items-center gap-4`}>
        {pinned ? <Pinned item={pinned} locale={locale} tier={tier!} className="strip-pinned-stacked" /> : null}
        {others.length > 0 || pinned ? (
          <div className="strip-viewport w-full">
            <div id={trackId} className="strip-track flex w-max min-w-full items-center justify-center gap-8">
              {before.length > 0 ? (
                <ul className="flex items-center gap-8">
                  {before.map((item) => (
                    <StripItem key={item.id} item={item} locale={locale} displayMode={settings.displayMode} />
                  ))}
                </ul>
              ) : null}
              {pinned ? <Pinned item={pinned} locale={locale} tier={tier!} className="strip-pinned-inline" /> : null}
              {after.length > 0 ? (
                <ul className="flex items-center gap-8">
                  {after.map((item) => (
                    <StripItem key={item.id} item={item} locale={locale} displayMode={settings.displayMode} />
                  ))}
                </ul>
              ) : null}
              {canMove && others.length > 0 ? (
                <div data-strip-duplicate="" aria-hidden="true" inert className="strip-duplicate items-center gap-8">
                  <ul className="flex items-center gap-8">
                    {others.map((item) => (
                      <StripItem key={item.id} item={item} locale={locale} displayMode={settings.displayMode} />
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {canMove && others.length > 0 ? (
          <SponsorStripControls trackId={trackId} labels={{ pause: t("strip.pause"), play: t("strip.play") }} />
        ) : null}
      </div>
    </aside>
  );
};
