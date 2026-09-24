"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * The two-column frame every homepage section editor sits in.
 *
 * A client component for one reason: a layout in the App Router cannot ask
 * which of its children rendered, and `/homepage` must not draw the rail —
 * that page IS the list, and a column repeating it beside itself would be the
 * same nine rows twice. `usePathname` is the only thing that knows.
 *
 * Below `lg` the rail collapses to its own one-line menu (`SectionRail`) and
 * sits above the content; from `lg` it is a 300px column beside it.
 *
 * Both frames carry `data-surface="canvas"`: the shared library's controls
 * read their ink, edge and focus ring from the surface variables, and the
 * shell's `<main>` publishes none (see `ui/brand-ground.tsx`). The attribute
 * paints nothing — the ground stays the shell's own neutral.
 */
export const HomepageLayoutFrame = ({ rail, children }: { rail: ReactNode; children: ReactNode }) => {
  const pathname = usePathname();
  const isIndex = pathname === "/homepage";

  if (isIndex || !rail) {
    return (
      <div data-surface="canvas" className="flex flex-col gap-6">
        {children}
      </div>
    );
  }

  return (
    <div data-surface="canvas" className="flex flex-col gap-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8">
      {rail}
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </div>
  );
};
