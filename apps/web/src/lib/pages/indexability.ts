import { fetchPublic } from "@/lib/api/public-client";
import type { AboutPage } from "@/lib/about/types";
import type {
  ArticlePublic,
  AthletePublic,
  CommitteesPage,
  ContactUsPage,
  Paginated,
  PresidentMessagePublic,
  StrategicPlanPublic,
  VisionMissionPublic,
} from "@/lib/api/types";
import type { PublicPage } from "./public-pages";
import { isServed } from "./activation";

/**
 * Chapter 14 §11 — the Minimum Content Threshold — decided in one place.
 *
 * §11: a page that does not meet the threshold "MAY exist internally within
 * the platform but SHOULD remain temporarily `noindex` until the required
 * content is complete." Nine of the twelve listing pages have no public list
 * endpoint upstream, so they are hero-and-nothing-else and stay out of the
 * index until that changes.
 *
 * The rule lives here rather than in each route because it has two consumers
 * that must never disagree: the page's own `robots` directive, and §13's
 * sitemap ("Content in any state other than `Published` MUST NOT appear in
 * any Sitemap"). A page that is `noindex` in its head and present in the
 * sitemap is a contradiction we would be publishing to search engines.
 *
 * The fetches here are the same ones the pages make, and Next.js dedupes
 * identical requests within a render, so asking twice costs nothing.
 */
export async function isIndexable(page: PublicPage): Promise<boolean> {
  // A page the federation has switched off is §11's case by definition: a title
  // and a status line (ADR-0102 §D2). Checked ahead of every per-page rule
  // because there is no page for which "withheld but indexable" is a state, and
  // because this is also what keeps it out of the sitemap — §13 forbids a page
  // being `noindex` in its head and present in the sitemap at the same time.
  //
  // `page.apiPath` is the record the page itself reads, and Next.js dedupes
  // identical requests within a render, so this costs nothing extra.
  const record = await fetchPublic<{ isActive?: boolean }>(page.apiPath);
  if (!isServed(record)) {
    return false;
  }

  switch (page.key) {
    case "contact-us": {
      // The record itself is the content: email, phones, address, hours.
      const record = await fetchPublic<ContactUsPage>(page.apiPath);
      return Boolean(record?.email);
    }
    case "committees": {
      const record = await fetchPublic<CommitteesPage>(page.apiPath);
      return Boolean(record?.introText);
    }
    case "president-message": {
      // The public read answers only while a message is Live, and a Live
      // message always carries its body in both languages.
      const record = await fetchPublic<PresidentMessagePublic>(page.apiPath);
      return Boolean(record?.messageBody);
    }
    case "vision-mission": {
      // Answered only while a version is Live, which always carries both
      // statements in both languages.
      const record = await fetchPublic<VisionMissionPublic>(page.apiPath);
      return Boolean(record?.visionText);
    }
    case "strategic-plan": {
      // Answered only while a version is Live, which always carries the
      // overview in both languages.
      const record = await fetchPublic<StrategicPlanPublic>(page.apiPath);
      return Boolean(record?.introText);
    }
    case "about": {
      // Two conditions, because this page has two ways of having no content.
      // The read answers `{ isActive: false }` and nothing else while the page
      // is switched off, which is exactly §11's case — a title and a status
      // line — and it is also what the route's own `robots` directive says.
      // The hero is the one section that always prints, so its title standing
      // is the same test as "a version is Live and complete".
      const record = await fetchPublic<AboutPage>(page.apiPath);
      return record?.isActive === true && Boolean(record.hero?.title);
    }
    case "board-members": {
      const members = await fetchPublic<unknown[]>("/federation-personnel/public");
      return Array.isArray(members) && members.length > 0;
    }
    case "athletes": {
      const response = await fetchPublic<Paginated<AthletePublic>>("/athletes/public");
      return Array.isArray(response?.items) && response.items.length > 0;
    }
    case "news": {
      // The listing's threshold is met the moment one article is live. A
      // newsroom with nothing published is still §11's case, and the page
      // stays out of the index and the sitemap together until it is not.
      const response = await fetchPublic<Paginated<ArticlePublic>>("/articles/public?page=1&limit=1");
      return Array.isArray(response?.items) && response.items.length > 0;
    }
    case "videos": {
      // The library's threshold is met the moment one video is published. The
      // page shipped `noindex` because `videos` had no public list at all;
      // it has one now, so the flag follows the content rather than the
      // history — and it flips here, where the sitemap reads it too.
      const response = await fetchPublic<Paginated<unknown>>("/videos/public?page=1&limit=1");
      return Array.isArray(response?.items) && response.items.length > 0;
    }
    default:
      // The remaining six have no content source at all yet. This is not a
      // pessimistic default — it is the accurate one, and it flips per page
      // in the same change that gives that page a list to render.
      return false;
  }
}
