"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { SwitchField } from "@/components/ui/switch-field";
import { UiIcon } from "@/lib/icons/ui-icons";
import { toRailEntries } from "@/lib/admin/homepage/sections";
import type { HomepageSection, RailEntry } from "@/lib/admin/homepage/sections";

/**
 * The homepage's sections, beside whichever section editor is open.
 *
 * -- The only navigation between sections -----------------------------------
 *
 * The sidebar used to carry a nested menu of the six sections that have an
 * editor. The owner replaced it on 2026-09-24 with one entry that opens the
 * hero, because this rail is the better list: it names all eight sections in
 * the order the page draws them, including the two news shelves and the
 * sponsor strip, which have no editor and so could never be menu entries.
 *
 * -- Three kinds of entry ---------------------------------------------------
 *
 * 1. **A section with a row and an editor** — a link, and a switch.
 * 2. **A section with a row and no editor** (the two news shelves) — plain
 *    text, and a switch. There is nowhere to send the reader, and a link to a
 *    route that does not exist is worse than no link.
 * 3. **A section with an editor and no row** (the sponsor strip, stored in
 *    `siteSettings`) — a link, and no switch, because there is nothing to
 *    switch. It says so rather than showing a dead control.
 *
 * The hero is a fourth case only in that its switch is a padlock: it may not
 * be hidden, and the route handler refuses the write too.
 *
 * No reorder arrows. `SECTION_REORDER_ENABLED` is off until the page reads
 * `displayOrder` (backlog §7), and this rail's own order is hardcoded to match
 * the page for the same reason.
 *
 * -- Below 1024px it becomes a menu ------------------------------------------
 *
 * A 300px column beside a form does not fit, and stacking eight rows above the
 * form would put the whole list between the reader and the thing they came to
 * edit. A `<details>` collapses to one line naming the current section.
 */
export const SectionRail = ({
  sections,
  canUpdate,
  names,
}: {
  sections: readonly HomepageSection[];
  canUpdate: boolean;
  names: Record<string, string>;
}) => {
  const t = useTranslations("Homepage");
  const writeErrors = useTranslations("WriteErrors");
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const panelId = useId();

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const entries = toRailEntries(sections);
  const nameOf = (entry: RailEntry) => names[entry.messageKey] ?? entry.key;
  const isActive = (entry: RailEntry) => entry.href !== null && pathname === entry.href;
  const enabledOf = (entry: RailEntry) =>
    entry.section ? (overrides[entry.section.id] ?? entry.section.enabled) : true;

  const current = entries.find(isActive);

  const setEnabled = async (section: HomepageSection, enabled: boolean) => {
    setOverrides((current) => ({ ...current, [section.id]: enabled }));
    setBusy(true);

    const response = await fetch("/api/admin/homepage/sections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: section.id, enabled }),
    });
    setBusy(false);

    if (!response.ok) {
      // Put the switch back. An optimistic toggle that never reverts tells the
      // editor they hid something they did not.
      setOverrides((current) => ({ ...current, [section.id]: !enabled }));
      const failure = (await response.json().catch(() => null)) as { code?: string } | null;
      toast.show({
        tone: "error",
        title: t("saveFailed"),
        description:
          failure?.code === "sectionLocked" ? t("lockedHint") : writeErrors(failure?.code ?? "serviceUnavailable"),
        source: "api",
      });
      return;
    }

    // The header switch on the editor beside this reads the same value from the
    // server tree, so redrawing is what keeps the two in step.
    router.refresh();
    const name = names[section.messageKey ?? ""] ?? section.sectionType;
    toast.show({
      tone: "success",
      title: enabled ? t("shownToast", { name }) : t("hiddenToast", { name }),
      source: "api",
      dedupeKey: `homepage:section:${section.id}`,
    });
  };

  const list = (
    <ol className="flex flex-col gap-1.5">
      {entries.map((entry) => {
        const active = isActive(entry);
        const name = nameOf(entry);
        const enabled = enabledOf(entry);

        return (
          <li
            key={entry.key}
            className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 transition-colors duration-[var(--motion-duration-fast)] ${
              active
                ? "border-[color:var(--color-brand-primary)] bg-[color-mix(in_srgb,var(--color-brand-primary)_8%,transparent)]"
                : "border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)]"
            }`}
          >
            <span className={`flex min-w-0 flex-1 items-center gap-2 ${enabled ? "" : "opacity-70"}`}>
              {entry.href ? (
                <Link
                  href={entry.href}
                  aria-current={active ? "page" : undefined}
                  className={`truncate text-body-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] ${
                    active ? "text-[color:var(--color-brand-primary)]" : "text-[color:var(--color-text-primary)]"
                  }`}
                >
                  {name}
                </Link>
              ) : (
                <span className="truncate text-body-sm font-semibold text-[color:var(--color-text-primary)]">
                  {name}
                </span>
              )}

              {entry.section && !enabled ? (
                <span className="shrink-0 rounded-[var(--radius-full)] bg-[color:var(--color-surface-sunken)] px-2 py-0.5 text-caption font-medium text-[color:var(--color-text-secondary)]">
                  {t("hidden")}
                </span>
              ) : null}
            </span>

            <span className="flex shrink-0 items-center">
              {entry.section === null ? (
                // No row, so nothing to switch. Saying so beats a control that
                // looks operable and writes nowhere.
                <span
                  title={t("visibilitySoon")}
                  aria-label={t("visibilitySoon")}
                  className="inline-flex size-9 items-center justify-center text-[color:var(--color-text-muted)]"
                >
                  <UiIcon name="circle-alert" className="size-[var(--icon-size-xs)]" />
                </span>
              ) : entry.section.locked ? (
                <span
                  title={t("lockedHint")}
                  aria-label={t("lockedHint")}
                  className="inline-flex size-9 items-center justify-center text-[color:var(--color-text-muted)]"
                >
                  <UiIcon name="lock" className="size-[var(--icon-size-xs)]" />
                </span>
              ) : (
                <SwitchField
                  id={`rail-${entry.section.id}`}
                  label={`${t("visibility")}: ${name}`}
                  labelHidden
                  checked={enabled}
                  disabled={!canUpdate || busy}
                  onChange={(value) => void setEnabled(entry.section!, value)}
                />
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      {/* Below lg: one line naming the section being edited, opening to the
          list. `<details>` so it works with no script and announces its own
          expanded state. */}
      <details className="lg:hidden">
        <summary
          aria-controls={panelId}
          className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 py-2.5 text-body-sm font-semibold text-[color:var(--color-text-primary)] [&::-webkit-details-marker]:hidden"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-caption font-normal text-[color:var(--color-text-secondary)]">
              {t("currentSection")}
            </span>
            <span className="truncate">{current ? nameOf(current) : t("title")}</span>
          </span>
          <UiIcon name="chevron-down" className="size-[var(--icon-size-xs)] shrink-0" />
        </summary>
        <div id={panelId} className="pt-2">
          {list}
        </div>
      </details>

      {/* From lg: the column itself. Sticky, so the list stays beside a long
          form rather than scrolling away from it. */}
      <nav aria-label={t("railLabel")} className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
        <p className="mb-3 text-caption font-medium text-[color:var(--color-text-secondary)]">{t("railLabel")}</p>
        {list}
      </nav>
    </>
  );
};
