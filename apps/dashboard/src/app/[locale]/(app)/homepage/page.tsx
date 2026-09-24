import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/params";

/**
 * `/homepage` is not a screen: it sends the reader to the hero.
 *
 * It WAS a list of every section, and the sidebar's "Homepage" opened it. The
 * owner replaced that on 2026-09-24 with one sidebar entry that opens the hero
 * directly, because the rail inside every `/homepage/*` screen is the better
 * list — it names all eight sections in the order the page draws them,
 * including the two news shelves and the sponsor strip, which have no editor
 * and so could never appear in a menu of editors.
 *
 * The route stays as a redirect rather than being deleted: `/homepage` is an
 * address people have already used, and a 404 for it would be a worse answer
 * than the screen they meant.
 */
const HomepageIndex = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  redirect({ href: "/homepage/hero", locale });
};

export default HomepageIndex;
