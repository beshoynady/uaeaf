"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { SwitchField } from "@/components/ui/switch-field";
import { ALBUM_STATES } from "@/lib/admin/albums/types";
import type { AlbumFilters } from "@/lib/admin/albums/list-filters";

/**
 * The list's four narrowing controls: search, status, period and "no season".
 *
 * Shared primitives only. "No season" is a switch rather than a fourth select
 * because it is a yes/no question, and a select offering "all / only those
 * without a season" is a switch that takes two presses.
 */
export const AlbumsFilters = ({
  filters,
  periods,
  onChange,
}: {
  filters: AlbumFilters;
  /** The years that actually hold an album, newest first. */
  periods: readonly string[];
  onChange: (next: AlbumFilters) => void;
}) => {
  const t = useTranslations("Albums");
  const ids = { state: useId(), period: useId(), noSeason: useId() };
  const set = <K extends keyof AlbumFilters>(key: K, value: AlbumFilters[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <SearchField
        label={t("searchLabel")}
        value={filters.search}
        onValueChange={(value) => set("search", value)}
        className="min-w-56 flex-1"
      />

      <SelectField
        id={ids.state}
        label={t("colStatus")}
        value={filters.state}
        onChange={(event) => set("state", event.target.value as AlbumFilters["state"])}
        options={[
          { value: "all", label: t("filterAllStates") },
          ...ALBUM_STATES.map((state) => ({ value: state, label: t(`state_${state}`) })),
        ]}
      />

      <SelectField
        id={ids.period}
        label={t("filterPeriod")}
        value={filters.period}
        onChange={(event) => set("period", event.target.value)}
        options={[
          { value: "all", label: t("filterAllPeriods") },
          ...periods.map((year) => ({ value: year, label: year })),
        ]}
      />

      <div className="min-w-48">
        <SwitchField
          id={ids.noSeason}
          label={t("filterNoSeason")}
          checked={filters.noSeason}
          onChange={(value) => set("noSeason", value)}
        />
      </div>
    </div>
  );
};
