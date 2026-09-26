"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { EditorShell } from "@/components/admin/editorial-editor/editor-shell";
import { SeoPanel } from "@/components/admin/editorial-editor/seo-panel";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { EditorialState } from "@/lib/admin/editorial-state";
import type { AppLocale } from "@/i18n/routing";
import { changedFrom, toDraft, toPatchBody } from "@/lib/admin/about-federation";
import type { AboutFederationResponse } from "@/lib/admin/about-federation";
import { SECTION_ORDER, readinessOf, submissionBlocked } from "@/lib/admin/about-readiness";
import type { AboutDraft, AboutSectionKey } from "@/lib/admin/about-readiness";
import { PageActivationBar } from "@/components/admin/activation/page-activation-bar";
import { SectionList } from "./section-list";
import { ReadinessPanel } from "./readiness-panel";
import { SectionEditor } from "./section-editor";
import type { EcosystemFigure } from "./sections/ecosystem-fields";

const ENTITY_TYPE = "aboutFederationPage";

/** What the two automatic sections would print right now, read alongside the
 *  record. */
export interface AboutSources {
  leaders: number;
  stats: number;
  figures: EcosystemFigure[];
}

const sameValue = (left: unknown, right: unknown): boolean =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

/**
 * The About page, on one screen (ADR-0101): the sections down one side in the
 * order they are printed, the selected section's fields beside them.
 *
 * ── What is deliberately not here ─────────────────────────────────────────
 *
 * No control for section order. The printed order carries the identity
 * guide's colour cadence and the sequence the nine scroll scenes are composed
 * against, and an editor reordering rows can see neither. Absent rather than
 * disabled: a disabled handle invites someone to find out why.
 *
 * ── Where the parts sit ───────────────────────────────────────────────────
 *
 * The shell owns the frame (ADR-0102 §D1): the header, the activation bar, and
 * four tabs. This component owns the page: the rail of sections, the selected
 * section's fields, the readiness notices, and the SEO draft. The activation bar
 * goes into the shell's own slot rather than into this form, because switching
 * the page on is not a save — it is a different act with a different grant, it
 * takes effect at once, and it is confirmed separately.
 *
 * The selected section is in the URL (`?section=`), so a colleague can be sent
 * to the timeline rather than to the page.
 */
export const AboutFederationEditor = ({
  record,
  sources,
  images,
  canEdit,
  canPublish,
  canReadMedia,
  locale,
  editorial,
}: {
  record: AboutFederationResponse;
  sources: AboutSources;
  images: readonly MediaAssetOption[];
  canEdit: boolean;
  /** `aboutFederationPage:Publish` — the activation bar's control, not the
   *  form's. */
  canPublish: boolean;
  canReadMedia: boolean;
  locale: AppLocale;
  editorial?: EditorialState | null;
}) => {
  const t = useTranslations("AboutFederation");

  // Built once per record: the baseline every keystroke is compared against.
  const original = useMemo(() => toDraft(record), [record]);
  const [draft, setDraft] = useState<AboutDraft>(original);
  const [library, setLibrary] = useState<readonly MediaAssetOption[]>(images);

  const router = useRouter();
  const searchParams = useSearchParams();

  /** The section named in `?section=`, or the hero. Validated against the
   *  printed order, so a stale link opens the editor rather than an empty
   *  frame. */
  const selected: AboutSectionKey =
    SECTION_ORDER.find((key) => key === searchParams.get("section")) ?? "hero";

  /**
   * Opens a section.
   *
   * Written with `replace`, not `push`: a section is a view of one record, and
   * ten of them in the back stack would make Back stop meaning "leave this
   * page". The hero is the absence of the parameter rather than
   * `?section=hero`, so a link to the editor is the editor's own address.
   *
   * `alsoOpenContent` is for the readiness notices, which are pressed from the
   * review tab: without it they would change the selection behind a panel the
   * reader cannot see.
   */
  const openSection = useCallback(
    (key: AboutSectionKey, alsoOpenContent = false) => {
      const next = new URLSearchParams(searchParams.toString());
      if (alsoOpenContent) {
        next.delete("tab");
      }
      if (key === "hero") {
        next.delete("section");
      } else {
        next.set("section", key);
      }
      const query = next.toString();
      router.replace(query.length > 0 ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const setSelected = useCallback((key: AboutSectionKey) => openSection(key), [openSection]);
  const goToSection = useCallback((key: AboutSectionKey) => openSection(key, true), [openSection]);

  /** The baseline the draft was last reconciled with, the record's version
   *  that baseline came from, and the draft as it stood when a save was sent. */
  const baseline = useRef(original);
  const baselineVersion = useRef(record.updatedAt);
  const sent = useRef<AboutDraft | null>(null);

  /**
   * After a save the page re-reads the record, and a list item added in this
   * draft comes back with the id the API gave it. Without this the draft keeps
   * the item without its id: the form stays "unsaved", and the next save sends
   * the item as new again, so the API gives it another id.
   *
   * A section takes the record's value only when the editor has not touched it
   * since: it still equals the previous baseline, or, when a write landed (a
   * new `updatedAt`), it still equals what the save sent. Anything typed after
   * the save was sent is kept (CLAUDE.md §31).
   */
  useEffect(() => {
    const previous = baseline.current;
    if (previous === original) {
      return;
    }
    const written = baselineVersion.current !== record.updatedAt;
    const atSave = written ? sent.current : null;
    baseline.current = original;
    baselineVersion.current = record.updatedAt;
    if (written) {
      sent.current = null;
    }
    setDraft((current) => {
      const next = { ...current };
      for (const key of Object.keys(original) as (keyof AboutDraft)[]) {
        const untouched =
          sameValue(current[key], previous[key]) || (atSave !== null && sameValue(current[key], atSave[key]));
        if (untouched) {
          (next as Record<string, unknown>)[key] = original[key];
        }
      }
      return next;
    });
  }, [original, record.updatedAt]);

  const readiness = useMemo(
    () => readinessOf(draft, { leaderCount: sources.leaders, statCount: sources.stats }),
    [draft, sources.leaders, sources.stats],
  );

  const dirty = changedFrom(original, draft);
  const onUploaded = useCallback(
    (image: MediaAssetOption) => setLibrary((current) => [image, ...current]),
    [],
  );

  const patchSeo = useCallback(
    (clearFailure: () => void) => (seo: AboutDraft["seo"]) => {
      clearFailure();
      setDraft((current) => ({ ...current, seo }));
    },
    [],
  );

  return (
    <EditorShell
      entityType={ENTITY_TYPE}
      entityId={record._id}
      heading={{ trail: [{ label: t("trailPages"), href: "/pages" }, { label: t("title") }], title: t("title") }}
      previewHref="/about"
      activation={
        <PageActivationBar
          entity={ENTITY_TYPE}
          pageName={t("title")}
          recordId={record._id}
          isActive={record.isActive === true}
          canPublish={canPublish}
        />
      }
      dirty={dirty}
      body={() => {
        sent.current = draft;
        return toPatchBody(original, draft);
      }}
      onDiscard={() => setDraft(original)}
      canEdit={canEdit}
      editorial={editorial}
      noticeCount={readiness.notices.length}
      notices={
        <>
          <ReadinessPanel notices={readiness.notices} onGoTo={goToSection} />

          {submissionBlocked(readiness) ? (
            <p
              id="about-submit-blocked"
              className="rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-semantic-error)_10%,transparent)] px-3.5 py-3 text-label leading-relaxed text-[color:var(--color-semantic-error-text)]"
            >
              {t("beforeSubmit.blocksSubmission")}
            </p>
          ) : null}
        </>
      }
      seo={({ disabled, clearFailure }) => (
        <SeoPanel
          seo={draft.seo}
          onChange={patchSeo(clearFailure)}
          disabled={disabled}
          images={library}
          canReadMedia={canReadMedia}
          onUploaded={onUploaded}
        />
      )}
    >
      {({ disabled, clearFailure }) => {
        const patchSection = <K extends AboutSectionKey>(key: K) =>
          (change: Partial<AboutDraft[K]>) => {
            clearFailure();
            setDraft((current) => ({ ...current, [key]: { ...current[key], ...change } }));
          };

        const toggleSection = (key: AboutSectionKey, shown: boolean) => {
          clearFailure();
          setDraft((current) => ({
            ...current,
            hiddenSections: shown
              ? current.hiddenSections.filter((entry) => entry !== key)
              : [...current.hiddenSections, key],
          }));
        };

        return (
          // 290px is the rail's width on the approved canvas
          // (`docs/design-specs/about/about-admin-tabs.design.html`); the fields
          // take the rest, which is the whole point of ADR-0102 §D1.
          <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
            <div className="flex flex-col gap-4 lg:sticky lg:top-[9.5rem] lg:self-start">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-heading-sm font-bold">{t("sections.title")}</h2>
                <p className="text-label text-[color:var(--color-text-muted)]">{t("sections.orderIsFixed")}</p>
              </div>

              <SectionList
                sections={readiness.sections}
                selected={selected}
                hiddenSections={draft.hiddenSections}
                disabled={disabled}
                onSelect={setSelected}
                onToggle={toggleSection}
              />
            </div>

            <div id="about-section-panel" className="flex min-w-0 flex-col gap-5">
              <SectionEditor
                sectionKey={selected}
                draft={draft}
                patch={patchSection}
                disabled={disabled}
                images={library}
                canReadMedia={canReadMedia}
                locale={locale}
                onUploaded={onUploaded}
                figures={sources.figures}
              />
            </div>
          </div>
        );
      }}
    </EditorShell>
  );
};
