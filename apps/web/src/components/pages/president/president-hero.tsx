import type { ReactNode } from "react";
import { IdentityHero } from "@/components/ui/identity-hero";
import type { AppLocale } from "@/i18n/routing";
import type { PresidentMessagePublic } from "@/lib/api/types";

/**
 * The portrait hero of the President's Message (ADR-0069 D8, D10): the shared
 * identity-lines hero, with the president's portrait and, between the title
 * and the role, the name that signs the message.
 */
export const PresidentHero = ({
  record,
  locale,
  breadcrumb = null,
}: {
  record: PresidentMessagePublic;
  locale: AppLocale;
  breadcrumb?: ReactNode;
}) => (
  <IdentityHero
    titleId="president-hero-title"
    title={record.heroTitle[locale]}
    lead={record.signatoryName[locale]}
    subtitle={record.heroSubtitle[locale]}
    ground={record.heroImage}
    portrait={record.featuredImage}
    locale={locale}
    breadcrumb={breadcrumb}
  />
);
