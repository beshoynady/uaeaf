"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BUTTON_SECONDARY } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { EditorialStatusPanel } from "@/components/admin/editorial/status-panel";
import { EditorialRevisionsPanel } from "@/components/admin/editorial/revisions-panel";
import { EditorTabs, panelId, tabId, type EditorTabSpec } from "./editor-tabs";
import { availableTabs, readEditorTab, type EditorTab } from "@/lib/admin/editor-tab";
import type { EditorialState } from "@/lib/admin/editorial-state";

/** What the shell hands the sections it frames. */
export interface EditorShellState {
  /** True while saving, and for a reader who may not edit. */
  disabled: boolean;
  /** Called on every edit, so a failure message never outlives the input
   *  that answered it. */
  clearFailure: () => void;
}

/** One step of the trail above the title. `href` absent means the current
 *  page — the last crumb, which is text rather than a link. */
export interface EditorCrumb {
  label: string;
  href?: string;
}

/**
 * The frame every workflow-governed page editor shares (ADR-0070, re-laid out
 * by ADR-0102 §D1): a sticky header, the activation bar, four tabs, the save,
 * the browser's leave guard, and the inline save failure.
 *
 * ── Why tabs, and what that fixed ─────────────────────────────────────────
 *
 * The status and versions panels used to hold a fixed 340px column beside the
 * form, and About then put its section list in another 290px. At 1360px that
 * left the field column between 170 and 350px wide: labels wrapped, inputs were
 * clipped, and the description field scrolled inside itself. The panels are
 * content a reader consults occasionally; the fields are content they work in
 * continuously, so the fields get the width and the panels get a tab.
 *
 * ── Why one panel is mounted at a time ────────────────────────────────────
 *
 * Every field on every panel is controlled from state the *page* holds, above
 * this component — so unmounting a panel cannot lose a value, and
 * `editor-shell.spec.tsx` pins that. Four panels mounted with `hidden` would
 * instead put four copies of the page's controls in the accessibility tree and
 * in the tab order, and would make the versions table fetch on every page open
 * whether or not anyone looked at it.
 *
 * ── Why the tab is in the URL ─────────────────────────────────────────────
 *
 * So a colleague can be sent to the versions table. Written with `replace`
 * rather than `push`: a tab is a view of one record, and four of them in the
 * back stack would make Back stop meaning "leave this record".
 *
 * ── The rest, unchanged from ADR-0070 ─────────────────────────────────────
 *
 * - Saving sends only what changed (`body`), and re-reads the record, which is
 *   what makes the form clean again.
 * - A failure is shown beside the control that failed, not as a toast
 *   (ADR-0016); success is a toast.
 * - `save` returns whether it landed: the version panel's restore goes ahead
 *   only on `true` (CLAUDE.md §31).
 */
export const EditorShell = ({
  entityType,
  entityId,
  heading,
  activation,
  previewHref,
  dirty,
  body,
  onDiscard,
  canEdit,
  editorial,
  fieldLabels,
  notices,
  noticeCount,
  seo,
  children,
}: {
  /** The registry key, upstream and in the BFF. */
  entityType: string;
  entityId: string;
  /** The trail and the page's own name, for the sticky header. */
  heading: { trail: readonly EditorCrumb[]; title: string };
  /** The activation bar, under the title row. Absent for a page with no
   *  switch. */
  activation?: ReactNode;
  /** Where the draft can be looked at. Absent where the page has no preview. */
  previewHref?: string;
  dirty: boolean;
  body: () => Record<string, unknown>;
  onDiscard: () => void;
  /** False for a reviewer who may decide on the page but not rewrite it. */
  canEdit: boolean;
  /** Null when the API refused that read, which costs the panels and not the
   *  form. */
  editorial?: EditorialState | null;
  fieldLabels?: Readonly<Record<string, string>>;
  /** The page's own "before submitting" block, drawn under the publishing path
   *  in the review tab. The shell does not compute it: what makes a page ready
   *  is the page's business. */
  notices?: ReactNode;
  /** How many of those notices are outstanding, for the tab's badge and the
   *  header's signpost. */
  noticeCount?: number;
  /** The SEO tab. Absent where the page has no SEO fields. */
  seo?: (state: EditorShellState) => ReactNode;
  /** The content tab. */
  children: (state: EditorShellState) => ReactNode;
}) => {
  const t = useTranslations("EditorialEditor");
  const errors = useTranslations("WriteErrors");
  const router = useRouter();
  const searchParams = useSearchParams();
  const format = useFormatter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // The browser's own leave guard. Shared with the create screen, which had
  // none at all and lost a whole draft to a closed tab.
  useUnsavedGuard(dirty);

  // Which tabs this page offers. Review needs the editorial state the panel
  // draws; history needs a reader who could act on a version — either of the
  // two grants this screen opens for; SEO needs the fields.
  const tabs = availableTabs({
    review: Boolean(editorial),
    history: canEdit || Boolean(editorial),
    seo: Boolean(seo),
  });
  const selected = readEditorTab(searchParams.get("tab"), tabs);

  /** Writes the tab into the URL, keeping every other parameter — `?section=`
   *  and `?record=` both matter and both belong to the page, not to this. */
  const select = (tab: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "content") {
      next.delete("tab");
    } else {
      next.set("tab", tab);
    }
    const query = next.toString();
    router.replace(query.length > 0 ? `?${query}` : "?", { scroll: false });
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setFailure(null);

    try {
      const response = await fetch(`/api/admin/editorial/${entityType}/${entityId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body()),
      });

      if (!response.ok) {
        const answer = (await response.json().catch(() => null)) as { code?: string } | null;
        setFailure(answer?.code ?? "serviceUnavailable");
        return false;
      }

      toast.show({
        tone: "success",
        title: t("savedTitle"),
        description: t("savedBody"),
        source: "api",
        dedupeKey: `${entityType}:saved`,
      });
      router.refresh();
      return true;
    } catch {
      setFailure("serviceUnavailable");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setFailure(null);
    onDiscard();
  };

  const state: EditorShellState = { disabled: saving || !canEdit, clearFailure: () => setFailure(null) };

  const LABELS: Record<EditorTab, string> = {
    content: t("tabContent"),
    review: t("tabReview"),
    history: t("tabHistory"),
    seo: t("tabSeo"),
  };

  const specs: EditorTabSpec[] = tabs.map((tab) => ({
    id: tab,
    label: LABELS[tab],
    // Only the review tab counts: it is the one whose number is work outstanding.
    // A badge on the versions tab would be a count of history, which nobody
    // needs to clear.
    count: tab === "review" && noticeCount ? noticeCount : undefined,
    tone: "warning",
  }));

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="sticky top-0 z-20 -mx-1 flex flex-col gap-4 bg-[color:var(--color-surface-base)] px-1 pb-0 pt-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            {heading.trail.length > 0 ? (
              <nav aria-label={t("breadcrumbLabel")}>
                <ol className="flex flex-wrap items-center gap-2 text-label text-[color:var(--color-text-secondary)]">
                  {heading.trail.map((crumb, index) => (
                    <li key={crumb.label} className="flex items-center gap-2">
                      {index > 0 ? <span aria-hidden="true">/</span> : null}
                      {crumb.href ? (
                        <a
                          href={crumb.href}
                          // `py-1 -my-1`: 24px of height to press (WCAG 2.2
                          // 2.5.8) pulled back out of the layout, so the trail
                          // reads at the size it was designed at. Measured
                          // 55×17 before this — a 17px target in a header, not
                          // a link inside a sentence, so the inline exception
                          // does not cover it.
                          className="-my-1 inline-block rounded-[var(--radius-sm)] py-1 underline decoration-[color:var(--color-border-strong)] underline-offset-4 hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-primary)] active:decoration-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)]"
                        >
                          {crumb.label}
                        </a>
                      ) : (
                        <span aria-current="page" className="text-[color:var(--color-text-primary)]">
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-h3 font-extrabold text-[color:var(--color-text-primary)]">{heading.title}</h1>

              {editorial ? <StateChip state={editorial} /> : null}

              {/* The saved state, as a live region: whether there is unsaved
                  work is a standing fact the reader returns to, and it changes
                  without them asking. `data-dirty` is read by the screens' own
                  tests, and it belongs on the region itself rather than a
                  wrapper. */}
              <p role="status" data-dirty={dirty} className="text-label text-[color:var(--color-text-secondary)]">
                {/* When, as a time and not as "two minutes ago". `relativeTime`
                    needs a `now` it cannot have on the server, and a string that
                    is right only for the second it rendered in is a hydration
                    mismatch waiting to happen. `dateTime` is what every other
                    panel on these screens already uses. */}
                {dirty
                  ? t("unsaved")
                  : editorial?.updatedAt
                    ? t("savedAt", {
                        when: format.dateTime(new Date(editorial.updatedAt), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }),
                      })
                    : t("allSaved")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {previewHref ? (
              // A link, not a button: it opens a page, and a button that
              // navigates is a button a reader cannot middle-click. Styled from
              // the secondary button's own token so there is one appearance
              // rather than a lookalike.
              <a href={previewHref} target="_blank" rel="noreferrer" className={BUTTON_SECONDARY}>
                {t("preview")}
              </a>
            ) : null}

            {canEdit ? (
              <Button variant="secondary" onClick={() => void save()} loading={saving} disabled={!dirty}>
                {saving ? t("saving") : t("save")}
              </Button>
            ) : (
              <p className="text-label text-[color:var(--color-text-muted)]">{t("readOnly")}</p>
            )}

            {/* A signpost, not a second publish control. The decisions live in
                the status panel, in the review tab; a publish button here would
                leave an author unsure which of two places their unsaved work
                belongs to (Chapter 12 §12.15 — one primary action). So this
                takes them to where the decision is made, carrying the count of
                what is still outstanding. */}
            {editorial && selected !== "review" ? (
              <Button variant="primary" onClick={() => select("review")}>
                {t("goToReview")}
                {noticeCount ? (
                  <span // `currentColor`, not a named ink: the badge sits on the primary
                    // button, so it takes that button's own text colour — which
                    // the contrast guard has already paired with the button's
                    // background. A token named here would be a second colour
                    // to pair, on a surface it does not know about.
                    className="inline-flex h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-[var(--radius-full)] bg-[color-mix(in_srgb,currentColor_22%,transparent)] px-1.5 text-caption font-extrabold tabular-nums">
                    {noticeCount}
                  </span>
                ) : null}
              </Button>
            ) : null}
          </div>
        </div>

        {activation}

        <EditorTabs tabs={specs} selected={selected} onSelect={select} label={t("tabsLabel")} />
      </header>

      {failure ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-semantic-error)] px-4 py-3 text-body font-medium text-[color:var(--color-text-primary)]"
        >
          {t("saveFailed")} {errors(failure)}
        </p>
      ) : null}

      <div
        role="tabpanel"
        id={panelId(selected)}
        aria-labelledby={tabId(selected)}
        tabIndex={-1}
        // `@container/editor`: the bilingual fields inside fold on **this**
        // element's width rather than the screen's, which is what the brief's
        // "side by side from a content width of 1024" actually means. Named, so
        // it governs only the editors — every other screen's fields are
        // unaffected.
        className="@container/editor flex min-w-0 flex-col gap-5"
      >
        {selected === "content" ? children(state) : null}

        {selected === "review" && editorial ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <EditorialStatusPanel
              entityType={entityType}
              entityId={entityId}
              state={editorial}
              fieldLabels={fieldLabels}
            />
            {notices ? <div className="flex flex-col gap-4">{notices}</div> : null}
          </div>
        ) : null}

        {selected === "history" ? (
          <EditorialRevisionsPanel
            entityType={entityType}
            entityId={entityId}
            canRestore={canEdit && (editorial?.canEdit ?? true)}
            hasUnsavedChanges={dirty}
            onSaveFirst={save}
            onDiscard={discard}
            fieldLabels={fieldLabels}
          />
        ) : null}

        {selected === "seo" && seo ? seo(state) : null}
      </div>
    </div>
  );
};

/**
 * What is on the site, as a chip.
 *
 * The publication state and when it went live — not a version number, because
 * the shell is not told one. A number invented from the history's length would
 * be wrong the first time a revision was created without being published.
 */
/** The `Editorial` namespace's own name for each publication state. Written
 *  out rather than interpolated, so a state with no copy is a type error here
 *  instead of a raw key on the screen. */
const STATE_KEYS: Readonly<Record<string, string>> = {
  Draft: "stateDraft",
  InReview: "stateInReview",
  Published: "statePublished",
  Live: "statePublished",
  Unpublished: "stateUnpublished",
  Archived: "stateArchived",
};

const StateChip = ({ state }: { state: EditorialState }) => {
  const t = useTranslations("Editorial");
  const format = useFormatter();
  const live = state.publicationState === "Live";

  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 text-caption font-bold ${
        live
          ? "bg-[color-mix(in_srgb,var(--color-semantic-success)_14%,transparent)] text-[color:var(--color-semantic-success-text)]"
          : "bg-[color:var(--color-surface-skeleton)] text-[color:var(--color-text-secondary)]"
      }`}
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-[var(--radius-full)]"
        style={{ background: live ? "var(--color-semantic-success)" : "var(--color-text-muted)" }}
      />
      {t(STATE_KEYS[state.publicationState] ?? "stateDraft")}
      {live && state.publishedAt
        ? ` · ${format.dateTime(new Date(state.publishedAt), { dateStyle: "short", timeStyle: "short" })}`
        : null}
    </span>
  );
};
