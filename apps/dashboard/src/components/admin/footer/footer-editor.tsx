"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { BilingualField } from "@/components/admin/bilingual-field";
import { EditorFrame } from "@/components/admin/sponsor-relations/editor-frame";
import { errorAt, useFieldMessage } from "@/components/admin/sponsor-relations/relation-parts";
import { focusElement, useRelationEditor } from "@/components/admin/sponsor-relations/use-relation-editor";
import {
  footerRequests,
  isFooterDirty,
  validateFooter,
  type FooterDraft,
  type FooterSourced,
  type HeadingKey,
  type LocalizedDraft,
} from "@/lib/admin/footer-settings";

/**
 * The footer screen (ADR-0092 D12).
 *
 * One panel per footer column, in the footer's own order, then its bottom
 * strip: an editor finds each thing where it appears on the site. The number
 * and order of the columns are the design's and are not offered here.
 *
 * The footer's own words are edited in their panels. What the contact page's
 * record supplies is listed in the panel of the column that shows it, read
 * only, with the way to where it is edited: one record, one screen that saves
 * it.
 *
 * The homepage screens' save cycle (`useRelationEditor`, `EditorFrame`), so an
 * editor meets one way of saving across them.
 */

const PANEL =
  "flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-5";

const NOTE = "text-caption text-[color:var(--color-text-secondary)]";

const LINK =
  "text-body-sm font-medium text-[color:var(--color-text-link)] underline underline-offset-4 hover:text-[color:var(--color-text-primary)] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]";

const keep = (draft: FooterDraft) => draft;

const idOf = (path: string) => path.replace(/\./g, "-");

/** A footer column's panel, headed by its name and its place in the footer. */
const Column = ({
  id,
  title,
  position,
  children,
}: {
  id: string;
  title: string;
  /** "Column n of 4"; absent for the bottom strip, which is not a column. */
  position?: string;
  children: ReactNode;
}) => (
  <section aria-labelledby={`footer-${id}-heading`} className={PANEL}>
    <div className="flex flex-col gap-1">
      {position ? <p className="text-caption font-medium text-[color:var(--color-text-secondary)]">{position}</p> : null}
      <h2 id={`footer-${id}-heading`} className="text-h4 text-[color:var(--color-text-primary)]">
        {title}
      </h2>
    </div>
    {children}
  </section>
);

/** What a column shows from the contact page's record, and where it is edited. */
const Sourced = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("FooterSettings");
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-4">
      <p className="text-label font-medium text-[color:var(--color-text-primary)]">{t("fromContact")}</p>
      <dl className="flex flex-col gap-3">{children}</dl>
      <Link href="/pages" className={`${LINK} self-start`}>
        {t("editInContact")}
      </Link>
    </div>
  );
};

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-caption text-[color:var(--color-text-secondary)]">{label}</dt>
    <dd className="text-body-sm text-[color:var(--color-text-primary)]">{children}</dd>
  </div>
);

export const FooterEditor = ({ initial, sourced }: { initial: FooterDraft; sourced: FooterSourced }) => {
  const t = useTranslations("FooterSettings");
  const tLabel = useTranslations("SitePages");
  const locale = useLocale() as AppLocale;
  const message = useFieldMessage();

  const editor = useRelationEditor<FooterDraft>({
    initial,
    isDirty: isFooterDirty,
    adopt: keep,
    validate: validateFooter,
    requests: footerRequests,
    savedKey: "footer-settings:saved",
  });
  const { draft, update, errors } = editor;

  const notSet = <span className="text-[color:var(--color-text-secondary)]">{t("notSet")}</span>;

  /** One of the footer's texts: both languages, one field, one error, found
   *  by its draft path (`footer.headings.location` is `footer-headings-location`). */
  const text = (path: string, label: string, value: LocalizedDraft, write: (next: LocalizedDraft) => void, multiline = false) => (
    <BilingualField
      id={idOf(path)}
      labelAr={tLabel("labelAr", { label })}
      labelEn={tLabel("labelEn", { label })}
      valueAr={value.ar}
      valueEn={value.en}
      onChangeAr={(ar) => write({ ...value, ar })}
      onChangeEn={(en) => write({ ...value, en })}
      hint={t("emptyHint")}
      error={message(errorAt(errors, path))}
      multiline={multiline}
    />
  );

  const heading = (key: HeadingKey) =>
    text(`footer.headings.${key}`, t("fields.heading"), draft.headings[key], (next) =>
      update((current) => ({ ...current, headings: { ...current.headings, [key]: next } })),
    );

  const fieldLabel: Record<string, string> = {
    "footer.footerAboutBlurb": t("fields.aboutBlurb"),
    "footer.copyrightText": t("fields.copyright"),
    "footer.headings.quickLinks": `${t("columns.quickLinks")}: ${t("fields.heading")}`,
    "footer.headings.location": `${t("columns.location")}: ${t("fields.heading")}`,
    "footer.headings.contact": `${t("columns.contact")}: ${t("fields.heading")}`,
  };

  const summaryItems = errors.map((error) => ({
    id: `${error.path}:${error.code}`,
    label: `${fieldLabel[error.path] ?? error.path}: ${message(error)}`,
    onGo: () => focusElement(`${idOf(error.path)}-ar`),
  }));

  // Both numbers through the formatter, so they are written in one numeral
  // system; a literal total in the catalogue was written in the other.
  const position = (n: number) => t("columnOf", { n, total: 4 });
  const inLocale = (value: { ar: string; en: string } | null) => (value ? value[locale] : null);

  return (
    <EditorFrame
      id="footer"
      title={t("title")}
      description={t("description")}
      dirty={editor.dirty}
      saving={editor.saving}
      awaiting={editor.awaiting}
      onSave={() => void editor.save()}
      items={summaryItems}
      failure={editor.failure}
      summaryRef={editor.summary}
      pendingLeave={editor.pendingLeave}
      onLeave={editor.leave}
      onStay={() => editor.setPendingLeave(null)}
    >
      <p className={NOTE}>{t("layoutNote")}</p>

      {/* The footer's own two-column arrangement, which is how it stands at
          `md`: four panels side by side would leave each bilingual field a
          quarter of the screen, too narrow for its two languages. */}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Column id="brand" title={t("columns.brand")} position={position(1)}>
          {text("footer.footerAboutBlurb", t("fields.aboutBlurb"), draft.footerAboutBlurb, (next) =>
            update((current) => ({ ...current, footerAboutBlurb: next })), true,
          )}
          <Sourced>
            <Fact label={t("channels")}>
              {sourced.channels.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {sourced.channels.map((channel) => (
                    <li key={channel.url} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-medium">{channel.platform}</span>
                      <span dir="ltr" className="break-all text-caption text-[color:var(--color-text-secondary)]">
                        {channel.url}
                      </span>
                      {channel.hasIcon ? (
                        <span className="rounded-full border border-[color:var(--color-border-default)] px-2 text-caption">{t("channelIcon")}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-[color:var(--color-text-secondary)]">{t("noChannels")}</span>
              )}
            </Fact>
          </Sourced>
        </Column>

        <Column id="quickLinks" title={t("columns.quickLinks")} position={position(2)}>
          {heading("quickLinks")}
          <p className={NOTE}>{t("quickLinksNote")}</p>
        </Column>

        <Column id="location" title={t("columns.location")} position={position(3)}>
          {heading("location")}
          <Sourced>
            <Fact label={t("coordinates")}>
              {sourced.coordinates ? (
                <span dir="ltr">
                  {sourced.coordinates.latitude}, {sourced.coordinates.longitude}
                </span>
              ) : (
                <span className="text-[color:var(--color-text-secondary)]">{t("noCoordinates")}</span>
              )}
            </Fact>
            <Fact label={t("place")}>
              {inLocale(sourced.place) ? (
                <>
                  {inLocale(sourced.place)}
                  {inLocale(sourced.region) ? <span className="block text-[color:var(--color-text-secondary)]">{inLocale(sourced.region)}</span> : null}
                </>
              ) : (
                notSet
              )}
            </Fact>
            <Fact label={t("directions")}>
              {sourced.directionsUrl ? (
                <span dir="ltr" className="break-all">
                  {sourced.directionsUrl}
                </span>
              ) : (
                notSet
              )}
            </Fact>
          </Sourced>
        </Column>

        <Column id="contact" title={t("columns.contact")} position={position(4)}>
          {heading("contact")}
          <Sourced>
            <Fact label={t("email")}>{sourced.email ? <span dir="ltr">{sourced.email}</span> : notSet}</Fact>
            <Fact label={t("officeHours")}>{inLocale(sourced.officeHours) ?? notSet}</Fact>
          </Sourced>
          <p className={NOTE}>{t("helpCenterNote")}</p>
        </Column>
      </div>

      <Column id="strip" title={t("columns.strip")}>
        {text("footer.copyrightText", t("fields.copyright"), draft.copyrightText, (next) =>
          update((current) => ({ ...current, copyrightText: next })),
        )}
        <p className={NOTE}>{t("stripNote")}</p>
      </Column>
    </EditorFrame>
  );
};
