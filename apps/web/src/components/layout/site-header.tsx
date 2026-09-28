import { HeaderShell } from "./header-shell";

/**
 * Public entry point for the global site header.
 *
 * Stays a client component and passes no live `features` — no server fetch is
 * wired in yet, so `HeaderShell` falls back to its standing cards for every
 * panel. Everything the header actually renders lives in `HeaderShell`.
 */
export const SiteHeader = ({ activePath }: { activePath?: string }) => (
  <HeaderShell features={null} activePath={activePath} />
);
