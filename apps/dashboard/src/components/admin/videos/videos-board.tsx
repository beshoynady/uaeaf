"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { FOCUS_RING, TOGGLE_SEGMENT } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { WriteFailure } from "@/components/ui/write-failure";
import { AddVideoLink } from "./videos-actions";
import { LiveBanner } from "./live-banner";
import { byNewest, VideoTable } from "./video-table";
import { useAdminWrite } from "@/lib/admin/use-admin-write";
import { VIDEO_PLATFORMS, VIDEO_STATUSES } from "@/lib/admin/videos/types";
import type { RowMenuItem } from "@/components/ui/row-menu";
import type { ActiveLiveStream, AdminVideo, VideoKind } from "@/lib/admin/videos/types";

/**
 * The videos screen: the running broadcast, the filters, and the list.
 *
 * -- Filters live in component state, not the URL ---------------------------
 *
 * Unlike the public library. The two screens answer different questions: a
 * visitor shares a filtered library page, an editor narrows a working list
 * they are about to act on. Nobody links a colleague to "drafts on TikTok".
 *
 * -- Adding is a page, not an overlay ---------------------------------------
 *
 * Both forms moved out of this screen on 2026-09-24. A drawer over the list it
 * is adding to had no address, could not be linked or returned to, and gave a
 * six-question form the width of a sidebar. What is left here is the list and
 * the two things that act on it in place: publishing a row, and ending the
 * broadcast.
 *
 * -- Every write reports what happened --------------------------------------
 *
 * Through `useAdminWrite`, which reads the route handler's `code` and puts the
 * matching `WriteErrors` copy on screen. Discarding the response and acting on
 * `response.ok` alone is the failure mode this project has already shipped
 * once: nothing moves and the editor reads that as success.
 */

type KindTab = "all" | VideoKind;

/** Ten rows: enough that the common case is one page, few enough that the
 *  live banner above stays on screen while the list is scanned. */
const PAGE_SIZE = 10;

const matches = (video: AdminVideo, tab: KindTab, search: string, platform: string, status: string): boolean => {
  if (tab !== "all" && video.kind !== tab) return false;
  if (platform !== "all" && video.platform !== platform) return false;
  if (status !== "all" && video.status !== status) return false;
  if (search.trim().length === 0) return true;
  const needle = search.trim().toLowerCase();
  return `${video.title.ar} ${video.title.en}`.toLowerCase().includes(needle);
};

export const VideosBoard = ({
  videos,
  live,
  thumbnails,
  canCreate,
  canUpdate,
  canDelete,
  locale,
}: {
  videos: readonly AdminVideo[];
  live: ActiveLiveStream | null;
  thumbnails: ReadonlyMap<string, string>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Videos");
  const toast = useToast();
  const { busy, failure, send, json } = useAdminWrite();

  const [tab, setTab] = useState<KindTab>("all");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<AdminVideo | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Sorted here, before it is paged. The API returns rows in no particular
  // order, so paging an unsorted list and letting the table sort each page put
  // newer videos on page two — an order that was wrong in a way nobody could
  // see from either page.
  const shown = useMemo(
    () => videos.filter((video) => matches(video, tab, search, platform, status)).sort(byNewest),
    [videos, tab, search, platform, status],
  );

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  // Clamped rather than reset in an effect: narrowing a filter while on page 3
  // can leave one page of results, and a page number past the end shows an
  // empty table that looks like "no matches" and is not.
  const current = Math.min(page, pageCount);
  const rows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const filtering = tab !== "all" || search.trim() !== "" || platform !== "all" || status !== "all";

  const clearFilters = () => {
    setTab("all");
    setSearch("");
    setPlatform("all");
    setStatus("all");
    setPage(1);
  };

  const narrow = <T,>(setter: (value: T) => void) => (value: T) => {
    // Any change to what is being shown returns to the first page: staying on
    // page 3 of a list that now has one is the same empty table as above.
    setPage(1);
    setter(value);
  };

  const togglePublished = async (video: AdminVideo) => {
    const next = video.status === "published" ? "draft" : "published";
    const outcome = await send(`/api/admin/videos/${video.id}`, json({ status: next }, "PATCH"));
    if (!outcome.ok) return;

    toast.show({
      tone: "success",
      title: t("updatedToast"),
      description: video.title[locale] || video.title.ar,
      source: "api",
      dedupeKey: `videos:${video.id}:status`,
    });
  };

  const remove = async () => {
    // Read at the confirming press, not at the press that opened the dialog.
    const target = confirmDelete;
    if (!target) return;

    const outcome = await send(`/api/admin/videos/${target.id}`, { method: "DELETE" });
    setConfirmDelete(null);
    if (!outcome.ok) return;

    toast.show({
      tone: "success",
      title: t("deletedToast"),
      description: target.title[locale] || target.title.ar,
      source: "api",
      dedupeKey: "videos:deleted",
    });
  };

  const endLive = async () => {
    const running = live;
    if (!running) return;

    const outcome = await send(`/api/admin/live-streams/${running.id}/end`, { method: "POST" });
    setConfirmEnd(false);
    if (!outcome.ok) return;

    toast.show({ tone: "success", title: t("liveEndedToast"), source: "api", dedupeKey: "live:ended" });
  };

  // No "edit" entry: the title in the row is the link that opens it. What is
  // left here are the acts that happen without leaving the list.
  const rowMenu = (row: AdminVideo): RowMenuItem[] => {
    const items: RowMenuItem[] = [
      {
        key: "open",
        label: t("openOnPlatform"),
        onSelect: () => window.open(row.url, "_blank", "noopener,noreferrer"),
      },
    ];

    if (canUpdate) {
      items.push({
        key: "publish",
        label: row.status === "published" ? t("unpublish") : t("publish"),
        disabled: busy,
        onSelect: () => void togglePublished(row),
      });
    }

    if (canDelete) {
      items.push({
        key: "delete",
        label: t("deleteVideo"),
        danger: true,
        disabled: busy,
        onSelect: () => setConfirmDelete(row),
      });
    }

    return items;
  };

  const tabs: readonly { value: KindTab; label: string }[] = [
    { value: "all", label: t("tabAll") },
    { value: "video", label: t("tabVideos") },
    { value: "reel", label: t("tabReels") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <LiveBanner
        stream={live}
        thumbnailUrl={live?.thumbnailId ? thumbnails.get(live.thumbnailId) : null}
        locale={locale}
        busy={busy}
        onEnd={() => setConfirmEnd(true)}
      />

      <WriteFailure message={failure} />

      <div className="flex flex-wrap items-end gap-3">
        {/* A group of toggles, not a tablist. `role="tab"` promises a tabpanel
            and arrow-key movement with a roving tabindex, and neither is here:
            a screen-reader user told "tab 1 of 3" would press arrow keys and
            get nothing. `aria-pressed` describes what these actually do. */}
        <div
          role="group"
          aria-label={t("colKind")}
          className="flex gap-1 rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-1"
        >
          {tabs.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={tab === option.value}
              onClick={() => narrow(setTab)(option.value)}
              className={TOGGLE_SEGMENT}
            >
              {option.label}
            </button>
          ))}
        </div>

        <SearchField
          label={t("searchLabel")}
          value={search}
          onValueChange={narrow(setSearch)}
          className="min-w-56 flex-1"
        />

        <SelectField
          id="videos-platform"
          label={t("colPlatform")}
          value={platform}
          onChange={(event) => narrow(setPlatform)(event.target.value)}
          options={[
            { value: "all", label: t("filterAllPlatforms") },
            ...VIDEO_PLATFORMS.map((value) => ({ value, label: t(`platform_${value}`) })),
          ]}
        />

        <SelectField
          id="videos-status"
          label={t("colStatus")}
          value={status}
          onChange={(event) => narrow(setStatus)(event.target.value)}
          options={[
            { value: "all", label: t("filterAllStatuses") },
            ...VIDEO_STATUSES.map((value) => ({ value, label: t(`status_${value}`) })),
          ]}
        />
      </div>

      {/* Three different nothings, three different next moves. A single empty
          table for all of them tells an editor with an unmatched filter to go
          and add their first video. */}
      {videos.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={t("noVideosTitle")}
          body={t("noVideosBody")}
          action={canCreate ? <AddVideoLink label={t("addFirstVideo")} /> : undefined}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="search"
          title={t("noMatchesTitle")}
          body={t("noMatchesBody")}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          }
        />
      ) : (
        <>
          <VideoTable videos={rows} locale={locale} thumbnails={thumbnails} rowMenu={rowMenu} />

          <Pagination
            page={current}
            pageCount={pageCount}
            onChange={setPage}
            busy={busy}
            labels={{
              label: t("pagerLabel"),
              previous: t("pagerPrevious"),
              next: t("pagerNext"),
              position: t("pagerPosition", { page: current, total: pageCount }),
            }}
          />
        </>
      )}

      {filtering && shown.length > 0 ? (
        <p className="text-caption text-[color:var(--color-text-secondary)]">
          <button
            type="button"
            onClick={clearFilters}
            className={`min-h-11 font-semibold text-[color:var(--color-text-primary)] underline underline-offset-4 ${FOCUS_RING}`}
          >
            {t("clearFilters")}
          </button>
        </p>
      ) : null}

      {/* Deleting a video is not undoable and the row carries no second
          chance, so the press that does it is not the first one. */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title={t("deleteConfirmTitle")}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("cancel")}
        tone="destructive"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(null)}
      >
        {t("deleteConfirmBody", { title: confirmDelete?.title[locale] || confirmDelete?.title.ar || "" })}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmEnd}
        title={t("endLiveConfirmTitle")}
        confirmLabel={t("endLive")}
        cancelLabel={t("cancel")}
        tone="destructive"
        busy={busy}
        onConfirm={() => void endLive()}
        onCancel={() => setConfirmEnd(false)}
      >
        {t("endLiveConfirmBody")}
      </ConfirmDialog>
    </div>
  );
};
