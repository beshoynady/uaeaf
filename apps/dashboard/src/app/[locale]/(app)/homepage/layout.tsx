import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionRail } from "@/components/admin/homepage/section-rail";
import { sectionCopy } from "@/components/admin/homepage/section-copy";
import { loadHomepageSections } from "@/lib/admin/homepage/load";
import { resolveLocale } from "@/i18n/params";
import { HomepageLayoutFrame } from "@/components/admin/homepage/layout-frame";

/**
 * Every homepage screen, with the list of sections beside it.
 *
 * -- Why a layout and not a component each screen imports -------------------
 *
 * Six screens edit one section each and none of them knew it was part of
 * anything. Adding the rail to each would be six imports, six loader calls and
 * six chances for one screen to forget. A layout reads it once and wraps all
 * of them, including the ones added later.
 *
 * -- The index is the exception ---------------------------------------------
 *
 * `/homepage` IS the list. `HomepageLayoutFrame` reads the path on the client
 * and draws the rail only beside a child route, because a layout cannot ask
 * which of its children rendered.
 *
 * A failed read costs the rail, never the screen: a section editor must still
 * open when the sections list cannot be fetched.
 */
const HomepageLayout = async ({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Homepage");
  const screen = await loadHomepageSections(locale);
  const { names } = sectionCopy(t);

  return (
    <HomepageLayoutFrame
      rail={
        screen.status === "ready" ? (
          <SectionRail sections={screen.data.sections} canUpdate={screen.data.canUpdate} names={names} />
        ) : null
      }
    >
      {children}
    </HomepageLayoutFrame>
  );
};

export default HomepageLayout;
