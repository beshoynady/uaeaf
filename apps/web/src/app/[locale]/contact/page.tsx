import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandBorder } from "@uaeaf/brand-ui";
import {
  buildStaticPageMetadata,
  loadStaticPage,
  text,
} from "@/components/pages/static-page-screen";
import { ContactHero } from "@/components/pages/contact/contact-hero";
import { ContactForm } from "@/components/pages/contact/contact-form";
import { ContactMap } from "@/components/pages/contact/contact-map";
import { ContactSocial } from "@/components/pages/contact/contact-social";
import { addressLinesOf, messageTypesOf, schemaAddress } from "@/components/pages/contact/contact-record";
import { PANEL_ROW, PANEL_TALL } from "@/components/ui/surface";
import { ContactPageJsonLd } from "@/lib/seo/json-ld";
import { fetchPublicMedia } from "@/lib/api/media";
import type { ContactUsPage } from "@/lib/api/types";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "contact-us";

/**
 * Rendered per request, never prerendered: `fetchPublic` resolves every failure
 * to `null`, and a build that could not reach the API once baked a page of
 * four empty cards into `.next`, served to the first visitor after each deploy.
 */
export const dynamic = "force-dynamic";

/** ...with the data still cached for `fetchPublic`'s window (Chapter 14 §7):
 *  cache the data, not the page. */
export const fetchCache = "default-cache";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  // The one page of the twelve whose public read carries a complete page:
  // email, telephone, postal address and opening hours are all in the
  // singleton record, so the Chapter 14 §11 threshold is met as soon as an
  // editor saves it.
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
};

const ContactPage = async ({ params }: { params: Promise<{ locale: AppLocale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const { page, record, title, subtitle } = await loadStaticPage<ContactUsPage>(KEY, locale);
  const t = await getTranslations({ locale, namespace: "Contact" });

  // One request for every picture the page references: the hero, and any
  // icon an editor uploaded for a social channel.
  const media = await fetchPublicMedia([
    record?.heroImageId,
    ...(record?.socialLinks ?? []).map((link) => link.iconId),
  ]);

  const addressLines = addressLinesOf(record);
  const messageTypes = messageTypesOf(record, locale, (value) => t(`messageTypes.${value}`));

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
        <>
          {/* The neutral ground under the form and the map. ADR-0065 R2: the
              green wash it once carried was decoration. */}
          <div className="bg-[color:var(--color-surface-base)]">
            {/* `max-w-[1248px]` inside the project's gutters reproduces the
                designed 96px margin at the 1440 root frame. DOM order is form
                then map — the order the design stacks on small screens, and the
                page's action ahead of a picture for a linear reader;
                `xl:flex-row-reverse` restores the side-by-side composition. */}
            <div
              className={`mx-auto w-full max-w-[1248px] gap-12 px-4 pt-16 pb-16 sm:px-6 md:px-8 lg:px-12 xl:flex-row-reverse xl:px-16 ${PANEL_ROW}`}
            >
              {/* The form's identity edge is the full tricolour, `static`
                  (ADR-0098 D5); the panel inside stays on its own neutral
                  `raised` ground. `*:flex-1` stretches the ring's wrapper so the
                  two panels keep one height in the row. */}
              <BrandBorder variant="static" tone="tricolor" className={`rise-scroll ${PANEL_TALL} *:flex *:flex-1 *:flex-col`}>
                <ContactForm
                  headingId="contact-form-heading"
                  title={text(record.form?.title, locale) ?? t("form.title")}
                  consentNote={text(record.form?.consentNote, locale)}
                  messageTypes={messageTypes}
                />
              </BrandBorder>
              {/* The map's edge is the green line. The frame inside is the
                  live, interactive map and is untouched. */}
              <BrandBorder variant="static" tone="green" className={`rise-scroll ${PANEL_TALL} *:flex *:flex-1 *:flex-col`}>
                <ContactMap locale={locale} record={record} headingId="contact-map-heading" />
              </BrandBorder>
            </div>
          </div>

          {/* The social channels answer "and if I would rather not write" —
              after the form, never in competition with it, on the page's one
              identity band. They come from the record: content an editor
              controls. */}
          <ContactSocial links={record.socialLinks ?? []} icons={media} />

          {/* The postal address is in the record but not the composition — the
              footer renders it a screen below. Exposed to assistive technology
              and to the structured data, so the `ContactPage` schema describes
              something the page carries (Chapter 14 §4). */}
          {addressLines.length > 0 ? (
            <address className="sr-only not-italic">
              {addressLines.join(locale === "ar" ? "، " : ", ")}
            </address>
          ) : null}
        </>
      ) : null}
    </>
  );
};

export default ContactPage;

