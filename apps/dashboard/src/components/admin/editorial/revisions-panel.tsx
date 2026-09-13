"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { localized } from "@/lib/api/types";
import { REVISION_STATE_KEYS, hasMore, mergePages } from "@/lib/admin/revisions";
import type { RevisionDetail, RevisionHistoryPage, RevisionSummary } from "@/lib/admin/revisions";
import type { AppLocale } from "@/i18n/routing";
import { RevisionReader } from "./revision-reader";

const PAGE_SIZE = 20;

/**
 * A record's version history, and the one destructive thing this screen does.
 *
 * Generic across the twelve workflow-governed types, like everything else
 * under `admin/editorial/`: it takes an `entityType` and a record id and
 * knows nothing about the president's message.
 *
 * ## Why restoring is guarded twice
 *
 * `PublishingService.restore` writes a frozen snapshot over the record and
 * freezes nothing first — what it replaces is kept only if some earlier
 * publish or submission happened to freeze it. So it is not undoable, and two
 * different things can be lost by pressing it:
 *
 *  - work sitting unsaved in this browser, which the stored record has never
 *    seen. That is the first guard, and it refuses rather than warns: the
 *    reader is given the two moves that resolve it and has to pick one.
 *  - the stored draft itself, which the confirmation names in words before
 *    it goes — which version replaces it, when that version was saved, that
 *    the replacement is total, and that what comes back is a draft.
 *
 * There is no word-level comparison (owner decision). The reader beside each
 * version answers "what did this say"; deciding whether to want it back is
 * the editor's judgement, not a diff's.
 */
export function EditorialRevisionsPanel({
  entityType,
  entityId,
  canRestore,
  hasUnsavedChanges,
  onSaveFirst,
  onDiscard,
  fieldLabels,
}: {
  entityType: string;
  entityId: string;
  /** Whether this reader may restore at all. The API decides again; this only
   *  keeps the screen from offering what it would refuse. */
  canRestore: boolean;
  hasUnsavedChanges: boolean;
  /** Saves the open draft. Resolves true when the save landed — a failed save
   *  must not become a silent restore over the work it failed to keep. */
  onSaveFirst: () => Promise<boolean>;
  /** Throws the unsaved changes away, returning the form to the stored
   *  record. */
  onDiscard: () => void;
  fieldLabels?: Readonly<Record<string, string>>;
}) {
  const t = useTranslations("Revisions");
  const errors = useTranslations("WriteErrors");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();

  const [versions, setVersions] = useState<RevisionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  /**
   * The version being read, and its content once it arrives.
   *
   * One state, not two. As an id and a detail held separately they could
   * disagree, and they did under an ordinary double-press: open version 3,
   * then open version 2 before the first response lands, and version 3's
   * content renders under version 2's row with version 3's heading. On a panel
   * whose only job is answering "what did this version say", that is the worst
   * shape the bug could take. Held together, the disagreement cannot be
   * represented.
   */
  const [reading, setReading] = useState<{ id: string; detail: RevisionDetail | null } | null>(
    null,
  );

  /** The version a restore has been asked for, and how far that ask has got. */
  const [target, setTarget] = useState<RevisionSummary | null>(null);
  const [blockedByUnsaved, setBlockedByUnsaved] = useState(false);

  // Whether the confirmation is open: a version has been asked for, and the
  // unsaved-changes guard is not standing in front of it.
  const confirming = target !== null && !blockedByUnsaved;
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState<number | null>(null);

  const listId = useId();

  const base = `/api/admin/editorial/${entityType}/${entityId}`;

  /**
   * Reads one page and reports what came back, touching no state of its own.
   *
   * Kept apart from `apply` below so the first read can run from an effect
   * without a synchronous `setState` in front of it — which is both what the
   * hook rules require and the honest shape: fetching is the effect, and
   * reacting to the answer is what happens once it arrives.
   */
  const fetchPage = useCallback(
    async (
      next: number,
    ): Promise<{ ok: true; body: RevisionHistoryPage } | { ok: false; code: string }> => {
      try {
        const response = await fetch(`${base}/revisions?page=${next}&limit=${PAGE_SIZE}`);
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { code?: string } | null;
          return { ok: false, code: body?.code ?? "serviceUnavailable" };
        }
        return { ok: true, body: (await response.json()) as RevisionHistoryPage };
      } catch {
        return { ok: false, code: "serviceUnavailable" };
      }
    },
    [base],
  );

  const apply = useCallback(
    (result: Awaited<ReturnType<typeof fetchPage>>, replace: boolean) => {
      setLoading(false);
      if (!result.ok) {
        // A failed read leaves whatever is already listed on screen rather
        // than blanking it: stale and labelled beats empty and unexplained.
        setFailure(result.code);
        return;
      }
      const { items, total: count, page: loaded } = result.body;
      setVersions((current) => (replace ? items : mergePages(current, items)));
      setTotal(count);
      setPage(loaded);
    },
    [],
  );

  const reload = useCallback(
    async (next: number, replace: boolean) => {
      setLoading(true);
      setFailure(null);
      apply(await fetchPage(next), replace);
    },
    [apply, fetchPage],
  );

  // Read once when the panel opens, and after that only when something
  // happened — never on a timer. A screen left open all afternoon would
  // otherwise spend it asking a question whose answer only this reader's own
  // actions change.
  //
  // `loading` already starts true, so this path sets nothing before its
  // first await, and a page that unmounts mid-read applies nothing.
  useEffect(() => {
    let live = true;
    void fetchPage(1).then((result) => {
      if (live) {
        apply(result, true);
      }
    });
    return () => {
      live = false;
    };
  }, [apply, fetchPage]);

  async function read(version: RevisionSummary): Promise<void> {
    if (reading?.id === version.id) {
      setReading(null);
      return;
    }
    setReading({ id: version.id, detail: null });
    // Every write below is conditional on this still being the version the
    // reader is asking about: a response that arrives after they have moved on
    // belongs to a question nobody is asking any more.
    const stillOpen = (open: { id: string } | null) => open?.id === version.id;
    try {
      const response = await fetch(`${base}/revisions/${version.id}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setFailure(body?.code ?? "serviceUnavailable");
        setReading((open) => (stillOpen(open) ? null : open));
        return;
      }
      const detail = (await response.json()) as RevisionDetail;
      setReading((open) => (stillOpen(open) ? { id: version.id, detail } : open));
    } catch {
      setFailure("serviceUnavailable");
      setReading((open) => (stillOpen(open) ? null : open));
    }
  }

  function askToRestore(version: RevisionSummary): void {
    setFailure(null);
    setRestored(null);
    setTarget(version);
    // The guard comes first and refuses. Showing the confirmation and warning
    // inside it would make "restore" and "lose your unsaved work" one press.
    setBlockedByUnsaved(hasUnsavedChanges);
  }

  function dismiss(): void {
    setTarget(null);
    setBlockedByUnsaved(false);
  }

  async function saveThenRestore(): Promise<void> {
    setRestoring(true);
    try {
      const saved = await onSaveFirst();
      // A failed save leaves the guard up. The editor has already said why in
      // its own alert, and repeating it here would put the same failure on
      // screen twice.
      if (saved) {
        setBlockedByUnsaved(false);
      }
    } finally {
      setRestoring(false);
    }
  }

  function discardThenRestore(): void {
    onDiscard();
    setBlockedByUnsaved(false);
  }

  async function restore(): Promise<void> {
    if (!target) {
      return;
    }
    // Checked again at the press, not only when the restore was asked for. The
    // modal makes the form behind it inert, so nothing can be typed there while
    // it waits; this covers the record changing under it instead.
    if (hasUnsavedChanges) {
      setBlockedByUnsaved(true);
      return;
    }
    setRestoring(true);
    setFailure(null);
    try {
      const response = await fetch(`${base}/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revisionId: target.id }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setFailure(body?.code ?? "serviceUnavailable");
        // Closed, so the refusal can be read: the page behind a modal is inert,
        // and a message drawn there while it stayed open is neither seen nor
        // heard.
        dismiss();
        return;
      }

      const version = target.versionNumber;
      dismiss();
      setRestored(version);
      toast.show({
        tone: "success",
        title: t("restoredTitle"),
        description: t("restoredBody", { number: version }),
        source: "api",
        dedupeKey: `editorial:${entityType}:restored`,
      });
      // The form above was built from the record this just overwrote.
      router.refresh();
      await reload(1, true);
    } catch {
      setFailure("serviceUnavailable");
      dismiss();
    } finally {
      setRestoring(false);
    }
  }

  const actorName = (version: RevisionSummary) =>
    version.createdBy?.name ? localized(version.createdBy.name, locale) : t("unknownActor");

  return (
    <section
      aria-labelledby={listId}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 py-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={listId} className="text-label font-bold text-[color:var(--color-text-primary)]">
          {t("title")}
        </h2>
        <Button variant="ghost" loading={loading} onClick={() => void reload(1, true)}>
          {loading ? t("refreshing") : t("refresh")}
        </Button>
      </div>

      {/*
        The record of the last restore, kept on screen after the toast has
        gone — which version is now in the form is not something the reader
        can reconstruct once it has.

        Deliberately NOT a live region. The toast already announces this, and
        a second polite region carrying the identical sentence makes a screen
        reader say it twice for one event.
      */}
      {restored === null ? null : (
        <p className="text-caption text-[color:var(--color-text-secondary)]">
          {t("restoredBody", { number: restored })}
        </p>
      )}

      {failure ? (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-error)] px-3 py-2"
        >
          <p className="text-label font-bold text-[color:var(--color-text-primary)]">
            {t("failedTitle")}
          </p>
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{errors(failure)}</p>
        </div>
      ) : null}

      {versions.length === 0 ? (
        <p className="text-body-sm text-[color:var(--color-text-muted)]">
          {loading ? t("loading") : t("empty")}
        </p>
      ) : (
        <>
          <ol aria-label={t("listLabel")} className="flex list-none flex-col gap-2">
            {versions.map((version) => (
              <li
                key={version.id}
                className={`flex flex-col gap-2 rounded-[var(--radius-sm)] border px-3 py-2 ${
                  version.state === "Live"
                    ? "border-[color:var(--color-brand-primary)]"
                    : "border-[color:var(--color-border-default)]"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-body-sm font-bold text-[color:var(--color-text-primary)]">
                    {t("version", { number: version.versionNumber })}
                  </p>
                  {/* Said in words, not only by the border colour, which is
                      not a status on its own (WCAG 1.4.1). */}
                  <p className="text-caption text-[color:var(--color-text-secondary)]">
                    {t(REVISION_STATE_KEYS[version.state] as "stateDraft")}
                  </p>
                </div>

                <p className="text-caption text-[color:var(--color-text-muted)]">
                  {t("savedBy", {
                    actor: actorName(version),
                    date: format.dateTime(new Date(version.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void read(version)}>
                    {reading?.id === version.id ? t("closeReader") : t("read")}
                  </Button>
                  {canRestore ? (
                    <Button variant="ghost" onClick={() => askToRestore(version)}>
                      {t("restore")}
                    </Button>
                  ) : null}
                </div>

                {reading?.id === version.id && reading.detail ? (
                  <RevisionReader
                    revision={reading.detail}
                    fieldLabels={fieldLabels}
                    onClose={() => setReading(null)}
                  />
                ) : null}
              </li>
            ))}
          </ol>

          <p className="text-caption text-[color:var(--color-text-muted)]">
            {t("shownOfTotal", { shown: versions.length, total })}
          </p>

          {hasMore(versions.length, total) ? (
            <div>
              <Button variant="secondary" loading={loading} onClick={() => void reload(page + 1, false)}>
                {t("olderVersions")}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {!canRestore ? (
        <p className="text-body-sm text-[color:var(--color-text-muted)]">{t("readOnly")}</p>
      ) : null}

      {/* The guard. `alert`, because it interrupted something the reader just
          asked for and it has to be heard before anything else. */}
      {target && blockedByUnsaved ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-warning)] px-3 py-3"
        >
          <p className="text-label font-bold text-[color:var(--color-text-primary)]">
            {t("unsavedTitle")}
          </p>
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("unsavedBody")}</p>
          <div className="flex flex-wrap gap-2">
            <Button loading={restoring} onClick={() => void saveThenRestore()}>
              {t("saveFirst")}
            </Button>
            <Button variant="destructive" disabled={restoring} onClick={discardThenRestore}>
              {t("discardFirst")}
            </Button>
            <Button variant="ghost" disabled={restoring} onClick={dismiss}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {/*
        A native modal (owner decision 2026-09-13). `showModal()` makes the page
        behind it inert, so the form cannot be typed into while the question is
        open: the unsaved-changes guard holds by structure, not by a condition
        someone has to remember. The dialog names the version and when it was
        saved, which is what the decision needs.

        Mounted throughout, so closing it is `close()` and focus goes back to the
        restore button that opened it. Its text exists only while it is open: a
        closed dialog still carrying a version's title would be a sentence sitting
        in the page that no reader can see.
      */}
      <ConfirmDialog
        open={confirming}
        tone="destructive"
        busy={restoring}
        title={target && !blockedByUnsaved ? t("confirmTitle", { number: target.versionNumber }) : ""}
        confirmLabel={t("confirmAction")}
        cancelLabel={t("cancel")}
        onConfirm={() => void restore()}
        onCancel={dismiss}
      >
        {target && !blockedByUnsaved
          ? t("confirmBody", {
              date: format.dateTime(new Date(target.createdAt), {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })
          : null}
      </ConfirmDialog>
    </section>
  );
}
