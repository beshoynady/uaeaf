import { getTranslations } from "next-intl/server";
import { Button, CtaBand } from "@uaeaf/brand-ui";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText } from "@/lib/api/types";

/**
 * The closing call, «نبني اليوم مستقبل ألعاب القوى الإماراتية», after the green
 * execution band.
 *
 * - A red `CtaBand` **inset as a card** into the canvas: full-bleed, it would
 *   abut the green band before it at 1.15:1 and the two would read as one
 *   (ADR-0098 §8.6). The canvas gutter is the separator.
 * - The title and the text are the record's. The two actions point at two
 *   places in the site's navigation, so their names are the navigation's
 *   (IA §8.1): Vision & Mission as the primary, the policies as the secondary.
 * - `Button` is a `next/link`, not the locale-aware one, so each destination
 *   carries its locale explicitly.
 */
export const PlanCta = async ({
  title,
  text,
  locale,
}: {
  title: LocalizedText;
  text: LocalizedText | null;
  locale: AppLocale;
}) => {
  const nav = await getTranslations({ locale, namespace: "Nav" });

  return (
    <CtaBand
      tone="red"
      layout="card"
      title={<span data-field="ctaTitle">{title[locale]}</span>}
      description={text ? <span data-field="ctaText">{text[locale]}</span> : undefined}
      action={
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" href={`/${locale}/about/governance/vision-mission`}>
            {nav("visionMission")}
          </Button>
          <Button variant="secondary" href={`/${locale}/about/governance/policies`}>
            {nav("policies")}
          </Button>
        </div>
      }
    />
  );
};
