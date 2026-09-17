import { fromApi, type HeroDraft, type SectionRecord, type SlideRecord } from "./homepage-hero";

/**
 * What the homepage hero screen opens on: the homepage (`pages`, slug `home`),
 * its HERO section, and that section's slides as stored, hidden ones included.
 *
 * `read` is `fetchAsUser` on the server: it resolves `null` for a refused read
 * and throws for anything else, with the upstream status on the error.
 */

export type Read = (path: string) => Promise<unknown>;

export type HeroLoad = { state: "ready"; draft: HeroDraft } | { state: "noHomePage" } | { state: "loadFailed" };

const HOMEPAGE_SLUG = "home";

const statusOf = (error: unknown): number | undefined =>
  typeof error === "object" && error !== null && typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : undefined;

export const loadHomepageHero = async (read: Read): Promise<HeroLoad> => {
  try {
    const page = (await read(`/pages/public/${HOMEPAGE_SLUG}`)) as { id?: unknown } | null;
    // The public read answers null for a page that is missing or not published:
    // either way there is no live homepage for this screen to edit.
    if (!page || typeof page.id !== "string") return { state: "noHomePage" };

    const sections = (await read(`/page-sections/by-page/${page.id}`)) as SectionRecord[] | null;
    if (!Array.isArray(sections)) return { state: "loadFailed" };
    const hero = sections.find((section) => section.sectionType === "HERO");
    if (!hero) return { state: "noHomePage" };

    const slides = (await read(`/hero-slides/by-section/${hero._id}`)) as SlideRecord[] | null;
    if (!Array.isArray(slides)) return { state: "loadFailed" };

    return { state: "ready", draft: fromApi(hero, slides) };
  } catch (error) {
    // A missing homepage is a state of the system, not a failure to reach it.
    return statusOf(error) === 404 ? { state: "noHomePage" } : { state: "loadFailed" };
  }
};
