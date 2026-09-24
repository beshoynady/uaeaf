import { getTranslations } from "next-intl/server";
import { Button, CtaBand } from "@uaeaf/brand-ui";
import type { AppLocale } from "@/i18n/routing";

/**
 * The closing call to the strategic plan, on the President's Message and on
 * Vision & Mission.
 *
 * The words are the frames', transcribed into the `VisionMission` messages
 * rather than stored: they point at two places in the site's navigation, not
 * at anything a page's record says, as the header's labels do (ADR-0070).
 *
 * - A red `CtaBand` **inset as a card** into the canvas. On both pages it
 *   follows the green values band, and a full-bleed red band there would abut
 *   the green at 1.15:1 — one band with no boundary (ADR-0098 §8.6). The canvas
 *   gutter around the card is the separator, as on Regulations & Policies.
 * - The primary action is the plan, the lesser errand is About. On red the
 *   primary inverts to a white plate and the secondary's tricolour edge turns
 *   white, both by the surface, so the primary always outweighs it.
 * - `Button` is a `next/link`, not the locale-aware one, so each destination
 *   carries its locale explicitly.
 */
export const StrategyCta = async ({ locale }: { locale: AppLocale }) => {
  const t = await getTranslations({ locale, namespace: "VisionMission" });

  return (
    <CtaBand
      tone="red"
      layout="card"
      title={t("ctaTitle")}
      description={t("ctaText")}
      action={
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" href={`/${locale}/about/governance/strategic-plan`}>
            {t("ctaPrimary")}
          </Button>
          <Button variant="secondary" href={`/${locale}/about`}>
            {t("ctaSecondary")}
          </Button>
        </div>
      }
    />
  );
};
