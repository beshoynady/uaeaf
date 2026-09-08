import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  StaticPageScreen,
  buildStaticPageMetadata,
  loadStaticPage,
  text,
} from "@/components/pages/static-page-screen";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import type { ContactUsPage, PostalAddress } from "@/lib/api/types";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "contact-us";

/** Standalone links, not links inside a sentence — so IA §12's ≥44px touch
 *  target applies to each of them. `inline-flex` + `min-h-11` grows the hit
 *  area without moving the text off its baseline. */
const LINK =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xs text-[color:var(--color-brand-primary)] underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]";

/** The eight parts in the order they are written on an envelope in the UAE —
 *  the same order and the same names the admin form uses, so what an editor
 *  typed into a labelled field appears in the position that label implied. */
const ADDRESS_PARTS: readonly (keyof PostalAddress)[] = [
  "building",
  "street",
  "area",
  "city",
  "emirate",
  "country",
  "poBox",
  "postalCode",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // The one page of the twelve whose public read carries a complete page:
  // email, telephone, postal address and opening hours are all in the
  // singleton record, so the Chapter 14 §11 threshold is met as soon as an
  // editor saves it.
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
}

export default async function ContactPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { record, title, subtitle } = await loadStaticPage<ContactUsPage>(KEY, locale);
  const t = await getTranslations({ locale, namespace: "Sections" });

  const addressLines = record?.address
    ? ADDRESS_PARTS.map((part) => record.address?.[part]).filter(
        (value): value is string => Boolean(value && value.trim()),
      )
    : [];

  return (
    <StaticPageScreen
      pageKey={KEY}
      locale={locale}
      title={title}
      subtitle={subtitle}
      contact={{
        email: record?.email,
        telephones: record?.phones?.map((phone) => phone.number),
        address: record?.address ? schemaAddress(record.address) : undefined,
      }}
    >
      {record ? (
        <Section labelledBy="contact-details-heading" className="py-12 md:py-16">
          <h2 id="contact-details-heading" className="text-h2">
            {t("contactDetails")}
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="rise-scroll">
              <h3 className="text-h4">{t("email")}</h3>
              {/* `dir="ltr"` regardless of the interface language: an email
                  address is a Latin token, and under RTL bidi reordering an
                  address ending in a dot renders with the dot on the wrong
                  side. */}
              <a href={`mailto:${record.email}`} dir="ltr" className={`mt-3 ${LINK}`}>
                {record.email}
              </a>
            </Card>

            {record.phones && record.phones.length > 0 ? (
              <Card className="rise-scroll">
                <h3 className="text-h4">{t("phones")}</h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {record.phones.map((phone) => (
                    <li key={phone.number} className="text-body-sm">
                      <span className="text-[color:var(--color-text-secondary)]">
                        {phone.label[locale]}
                      </span>{" "}
                      <a href={`tel:${phone.number.replace(/\s+/g, "")}`} dir="ltr" className={LINK}>
                        {phone.number}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {addressLines.length > 0 ? (
              <Card className="rise-scroll">
                <h3 className="text-h4">{t("address")}</h3>
                {/* A real `<address>`, which is the element for the contact
                    details of its nearest article or body — screen readers
                    expose it as such. */}
                <address className="mt-3 text-body-sm not-italic text-[color:var(--color-text-secondary)]">
                  {addressLines.join(locale === "ar" ? "، " : ", ")}
                </address>
                {record.googleMapsUrl ? (
                  <a
                    href={record.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-3 ${LINK}`}
                  >
                    {t("openMap")}
                  </a>
                ) : null}
              </Card>
            ) : null}

            {record.officeHours ? (
              <Card className="rise-scroll">
                <h3 className="text-h4">{t("officeHours")}</h3>
                <p className="mt-3 text-body-sm text-[color:var(--color-text-secondary)]">
                  {text(record.officeHours, locale)}
                </p>
              </Card>
            ) : null}

            {record.website ? (
              <Card className="rise-scroll">
                <h3 className="text-h4">{t("website")}</h3>
                <a
                  href={record.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className={`mt-3 break-all ${LINK}`}
                >
                  {record.website}
                </a>
              </Card>
            ) : null}

            {record.socialLinks && record.socialLinks.length > 0 ? (
              <Card className="rise-scroll">
                <h3 className="text-h4">{t("socialLinks")}</h3>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {record.socialLinks.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-body-sm ${LINK}`}
                      >
                        {link.platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </Section>
      ) : null}
    </StaticPageScreen>
  );
}

/** Chapter 14 §4: every property asserted here is rendered above. */
function schemaAddress(address: PostalAddress): Record<string, string> {
  const mapped: Record<string, string> = {};
  const street = [address.building, address.street].filter(Boolean).join(" ");
  if (street) mapped.streetAddress = street;
  if (address.city) mapped.addressLocality = address.city;
  if (address.emirate) mapped.addressRegion = address.emirate;
  if (address.poBox) mapped.postOfficeBoxNumber = address.poBox;
  if (address.postalCode) mapped.postalCode = address.postalCode;
  if (address.country) mapped.addressCountry = address.country;
  return mapped;
}
