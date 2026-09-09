import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  buildStaticPageMetadata,
  loadStaticPage,
  text,
} from "@/components/pages/static-page-screen";
import { ContactHero } from "@/components/pages/contact/contact-hero";
import { ContactForm, type MessageTypeOption } from "@/components/pages/contact/contact-form";
import { ContactMap } from "@/components/pages/contact/contact-map";
import { ContactPageJsonLd } from "@/lib/seo/json-ld";
import { fetchPublicMedia } from "@/lib/api/media";
import { CONTACT_MESSAGE_TYPES, type ContactUsPage, type PostalAddress } from "@/lib/api/types";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "contact-us";

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

  const { page, record, title, subtitle } = await loadStaticPage<ContactUsPage>(KEY, locale);
  const t = await getTranslations({ locale, namespace: "Contact" });

  // One request for both pictures: the hero and the map still are the only two
  // `mediaAssets` references on the page.
  const media = await fetchPublicMedia([record?.heroImageId, record?.map?.imageId]);

  const addressLines = record?.address
    ? ADDRESS_PARTS.map((part) => record.address?.[part]).filter(
        (value): value is string => Boolean(value && value.trim()),
      )
    : [];

  // An option the editor has not labelled still needs a name, or the select
  // shows a blank row; a label carrying a value outside the four the API
  // accepts is dropped rather than offered, because submitting it would fail
  // validation upstream.
  const labelled = new Map(
    (record?.form?.messageTypeLabels ?? [])
      .filter((entry) => (CONTACT_MESSAGE_TYPES as readonly string[]).includes(entry.value))
      .map((entry) => [entry.value, text(entry.label, locale)] as const),
  );
  const messageTypes: MessageTypeOption[] = CONTACT_MESSAGE_TYPES.map((value) => ({
    value,
    label: labelled.get(value) ?? t(`messageTypes.${value}`),
  }));

  const titleId = `page-title-${page.key}`;

  return (
    <>
      <ContactPageJsonLd
        locale={locale}
        route={page.route}
        name={title}
        description={subtitle ?? title}
        email={record?.email}
        telephones={record?.phones?.map((phone) => phone.number)}
        address={record?.address ? schemaAddress(record.address) : undefined}
      />

      <ContactHero
        locale={locale}
        record={record}
        titleId={titleId}
        title={title}
        subtitle={subtitle}
        heroImage={record?.heroImageId ? media.get(record.heroImageId) : undefined}
      />

      {record ? (
        // The section ground is the page's own neutral surface. ADR-0065 R2:
        // the green wash it carried was decoration — removing it loses no
        // information, and it was the last hue on a page whose register
        // (`public-pages.ts`) is black.
        <div className="bg-[color:var(--color-surface-base)]">
          {/* `max-w-[1248px]` inside the project's own gutters reproduces the
              designed 96px margin at the 1440 root frame exactly — 1440 − 2×64
              leaves 1312, and the cap centres 1248 in it — while narrower
              viewports keep the gutters every other page uses.

              DOM order is form then map: that is the order the design stacks on
              small screens, and it puts the page's action ahead of a picture
              for anyone reading linearly. `xl:flex-row-reverse` restores the
              designed side-by-side composition, which places the map at the
              reading start in both languages. */}
          <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-12 px-4 pt-4 pb-20 sm:px-6 md:px-8 lg:px-12 xl:flex-row-reverse xl:items-start xl:px-16">
            <div className="rise-scroll min-w-0 flex-1">
              <ContactForm
                headingId="contact-form-heading"
                title={text(record.form?.title, locale) ?? t("form.title")}
                consentNote={text(record.form?.consentNote, locale)}
                messageTypes={messageTypes}
              />
            </div>
            <div className="rise-scroll min-w-0 flex-1">
              <ContactMap
                locale={locale}
                record={record}
                mapImage={record.map?.imageId ? media.get(record.map.imageId) : undefined}
                headingId="contact-map-heading"
              />
            </div>
          </div>

          {/* The postal address is part of the record but not of the designed
              composition — the footer already renders it a screen height below.
              It is exposed to assistive technology and to the structured-data
              block so the `ContactPage` schema above describes something the
              page really carries (Chapter 14 §4), without repeating the footer
              on screen. */}
          {addressLines.length > 0 ? (
            <address className="sr-only not-italic">
              {addressLines.join(locale === "ar" ? "، " : ", ")}
            </address>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** Chapter 14 §4: every property asserted here is rendered or exposed above. */
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
