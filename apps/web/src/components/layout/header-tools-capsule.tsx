import { SearchTrigger } from "@/components/search/search-trigger";
import { LanguageSwitch } from "./language-switch";
import { ThemeSwitch } from "./theme-switch";

const Divider = () => (
  <span aria-hidden="true" className="h-6 border-s border-[color:var(--color-border-default)]" />
);

/**
 * The header's three controls, in one order for both layouts.
 *
 * `layout` changes sizes, never structure: a second arrangement for the drawer
 * would be a second tab order and a second set of accessible names to keep
 * in step.
 */
export const HeaderToolsCapsule = ({
  layout,
  onOpenSearch,
}: {
  layout: "row" | "drawer";
  onOpenSearch: () => void;
}) => (
  <div
    data-layout={layout}
    className="flex items-center gap-1 rounded-full border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-1"
  >
    <SearchTrigger onOpen={onOpenSearch} />
    <Divider />
    <LanguageSwitch />
    <Divider />
    <ThemeSwitch />
  </div>
);
