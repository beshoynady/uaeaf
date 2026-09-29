"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineConfirm } from "@/components/ui/inline-confirm";
import { useToast } from "@/components/ui/toast";
import { WriteFailure } from "@/components/ui/write-failure";
import { UiIcon } from "@/lib/icons/ui-icons";
import { byNewestStart, seasonNameOf } from "@/lib/admin/seasons/list-filters";
import { useSeasonWrite } from "@/lib/admin/seasons/use-season-write";
import { AddSeasonLink } from "./season-links";
import { SeasonsTable } from "./seasons-table";
import type { AdminSeason, SeasonContent } from "@/lib/admin/seasons/types";

/**
 * The seasons list: every season, which one is current, and the two writes
 * that happen without leaving it — making a season current and deleting one.
 *
 * -- Both writes ask twice --------------------------------------------------
 *
 * Making a season current moves `/seasons/current` and the site's default
 * season filter to it, and clears the season that held it; deleting takes a
 * season off the list. Each is confirmed in place, in the strip the album
 * screens use, and the season acted on is read at the confirming press, not
 * at the press that asked (CLAUDE.md §31).
 *
 * The API is the arbiter of both: a delete of a season that still holds
 * albums or videos is refused upstream as `stillReferenced`, and that refusal
 * is shown even when this screen could not count the content itself.
 */
type Pending = { kind: "current" | "delete"; season: AdminSeason } | null;

export const SeasonsBoard = ({
  seasons,
  content,
  canCreate,
  canUpdate,
  canDelete,
  locale,
  now,
}: {
  seasons: readonly AdminSeason[];
  content: ReadonlyMap<string, SeasonContent>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  locale: "ar" | "en";
  /** The server's clock at render, as an ISO string, so "running" and
   *  "ended" read the same on the server and in the browser. */
  now: string;
}) => {
  const t = useTranslations("Seasons");
  const toast = useToast();
  const { busy, failure, send, json } = useSeasonWrite();
  const [pending, setPending] = useState<Pending>(null);
  const lockReasonId = useId();

  const rows = [...seasons].sort(byNewestStart);

  const confirm = async () => {
    // Read at the confirming press, not at the press that asked.
    const target = pending;
    if (!target) return;
    const name = seasonNameOf(target.season, locale);
    const outcome =
      target.kind === "current"
        ? await send(`/api/admin/seasons/${target.season.id}/set-current`, json({}, "PATCH"))
        : await send(`/api/admin/seasons/${target.season.id}`, { method: "DELETE" });
    setPending(null);
    if (outcome.ok) {
      toast.show({
        tone: "success",
        title: t(target.kind === "current" ? "madeCurrentToast" : "deletedToast"),
        description: name,
        source: "api",
        dedupeKey: `seasons:${target.kind}`,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] px-4 py-3 text-body-sm text-[color:var(--color-text-primary)]">
        <UiIcon name="circle-alert" className="mt-0.5 size-[var(--icon-size-sm)] shrink-0 text-[color:var(--color-brand-primary)]" />
        <span>{t("currentExplainer")}</span>
      </p>

      <WriteFailure message={failure} />

      {pending ? (
        <InlineConfirm
          tone={pending.kind === "current" ? "primary" : "destructive"}
          message={t(pending.kind === "current" ? "makeCurrentConfirmBody" : "deleteConfirmBody", {
            name: seasonNameOf(pending.season, locale),
          })}
          confirmLabel={t(pending.kind === "current" ? "confirmMakeCurrent" : "confirmDelete")}
          cancelLabel={t("cancel")}
          busy={busy}
          onConfirm={() => void confirm()}
          onCancel={() => setPending(null)}
        />
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon="star"
          title={t("noSeasonsTitle")}
          body={t("noSeasonsBody")}
          action={canCreate ? <AddSeasonLink label={t("addFirstSeason")} /> : undefined}
        />
      ) : (
        <SeasonsTable
          seasons={rows}
          content={content}
          locale={locale}
          now={new Date(now)}
          actions={{
            canUpdate,
            canDelete,
            busy,
            lockReasonId,
            onMakeCurrent: (season) => setPending({ kind: "current", season }),
            onDelete: (season) => setPending({ kind: "delete", season }),
          }}
        />
      )}

      <p
        id={lockReasonId}
        className="flex items-start gap-3 rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-strong)] px-4 py-3 text-body-sm text-[color:var(--color-text-secondary)]"
      >
        <UiIcon name="lock" className="mt-0.5 size-[var(--icon-size-sm)] shrink-0" />
        <span>{t("lockedNote")}</span>
      </p>
    </div>
  );
};
