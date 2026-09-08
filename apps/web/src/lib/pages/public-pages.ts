import type { Register } from "@/components/ui/section";

/**
 * The twelve singleton content pages, on the public side.
 *
 * `apps/dashboard/src/lib/admin/static-pages.ts` is the same twelve seen from
 * the editor's side; the `key` values are identical on purpose so the two
 * lists can be diffed. Everything here is what the *public* surface needs and
 * the editor does not: a URL, a colour register, a Schema.org type, and an
 * honest statement of whether the API can serve this page's content yet.
 *
 * ── Where the URLs come from ───────────────────────────────────────────────
 *
 * IA §8.1 (Product Owner ruling, resolves Master Spec §52 OPEN-004) fixes the
 * nine-item main navigation and the children of its four dropdowns. Two of
 * those dropdowns give four of these pages a parent — About → مجلس الإدارة ·
 * اللجان, Media Centre → ألبوم الصور · الفيديوهات — so those four nest, and
 * Contact is a top-level item at `/contact`. The rest are flat under the
 * locale root, matching Chapter 14 §5's clean-URL requirement.
 *
 * `/records` and `/results-rankings` are the one uncertain pair: IA §3.1's
 * tree puts them under Events, but §8.1's resolved navigation — which
 * explicitly supersedes the older description — lists neither. Flat is the
 * reading that does not invent a parent. Recorded as PENDING FIGMA BACK-SYNC
 * per root CLAUDE.md §1a.3.
 *
 * ── Where the registers come from ──────────────────────────────────────────
 *
 * ADR-0059 §D1 retired the 70–80/15–20/≤5 numeric budget and replaced it with
 * the guide's own logic: colour marks *what a region is*. The guide states
 * that logic in its page captions and repeats it across the document —
 * §2.3 referees wear **red**, §3.3 administrators wear **green**, §1.3
 * athletes in international context wear **white**, and every local
 * championship garment from §4.3 onward is **red**. Two axes: role, and
 * context.
 *
 * Read onto these twelve pages, that gives:
 *
 *   green  → governance and administration            board-members, committees
 *   red    → officiating and ratified competition     records, results-rankings
 *   black  → the one category §3.34.2 sanctions a     contact-us
 *            flat dark hero for
 *   neutral→ athletes, their community, and editorial the remaining seven
 *
 * Seven of twelve staying neutral is the correct outcome, not a shortfall:
 * §3.34.3's binding rule is that the identity MUST NOT be applied "in the
 * same way or proportion on all pages", and §3.34.2 assigns News/Media a
 * neutral background in as many words. What changed from the state ADR-0059
 * diagnosed is that green no longer wins by default — it now has two pages,
 * red has two, black has one plus the site footer, and each is traceable to a
 * caption in the federation's own guide.
 */

export interface PublicPage {
  /** Identical to the admin key — the two registries are meant to be diffable. */
  key: string;
  /** Locale-relative, no leading locale segment: `Link` from `@/i18n/navigation`
   *  adds that. */
  route: string;
  /** `@Public()` upstream — every one of these is a public GET. */
  apiPath: string;
  /** Message key into the `Pages` namespace. The names are transcribed from
   *  the dashboard's own `SitePages.page_*` labels, which are already
   *  approved bilingual copy, rather than translated afresh here. */
  messageKey: string;
  register: Register;
  /** Why this page carries this register. Kept next to the value so the
   *  reasoning cannot drift away from the decision. */
  registerBasis: string;
  /** Chapter 14 §4. `null` where no listed type fits — a listing page whose
   *  items are not yet served has nothing to describe, and §4 forbids
   *  structured data that describes content the page does not show. */
  schemaType: "CollectionPage" | "ContactPage" | "AboutPage" | null;
  /**
   * Whether the API can serve this page's *content*, as opposed to its hero.
   *
   * Chapter 14 §11 is explicit about what to do when it cannot: a page that
   * does not meet the minimum content threshold "MAY exist internally within
   * the platform but SHOULD remain temporarily `noindex` until the required
   * content is complete." That is why this field exists and why it drives
   * `robots` rather than being a note in a report.
   */
  listEndpoint: string | null;
}

export const PUBLIC_PAGES: readonly PublicPage[] = [
  {
    key: "news",
    route: "/news",
    apiPath: "/news-page",
    messageKey: "news",
    register: "neutral",
    registerBasis: "§3.34.2 News/Media — 'Neutral background, Green typography accents'.",
    schemaType: "CollectionPage",
    // No public read exists for articles: `CT-ARTICLE-001` has no @Public()
    // controller upstream at all.
    listEndpoint: null,
  },
  {
    key: "athletes",
    route: "/athletes",
    apiPath: "/athletes-page",
    messageKey: "athletes",
    register: "neutral",
    registerBasis: "Guide §1.3 — athletes in international context wear white.",
    schemaType: "CollectionPage",
    listEndpoint: "/athletes/public",
  },
  {
    key: "clubs",
    route: "/clubs",
    apiPath: "/clubs-page",
    messageKey: "clubs",
    register: "neutral",
    registerBasis:
      "§3.34.2 Clubs — 'White + Green; club identity marks', hero crest-led rather than a colour wash.",
    schemaType: "CollectionPage",
    listEndpoint: null,
  },
  {
    key: "coaches",
    route: "/coaches",
    apiPath: "/coaches-page",
    messageKey: "coaches",
    register: "neutral",
    registerBasis:
      "Derived (CLAUDE.md §1a) from the Clubs row of §3.34.2 — the same directory-of-people pattern; no row of its own exists.",
    schemaType: "CollectionPage",
    listEndpoint: null,
  },
  {
    key: "disciplines",
    route: "/disciplines",
    apiPath: "/disciplines-page",
    messageKey: "disciplines",
    register: "neutral",
    registerBasis:
      "Derived (CLAUDE.md §1a): reference content explaining the sport, nearest documented personality is Quiet/Institutional — 'Typography-led, minimal color'.",
    schemaType: "CollectionPage",
    listEndpoint: null,
  },
  {
    key: "records",
    route: "/records",
    apiPath: "/records-page",
    messageKey: "records",
    register: "red",
    registerBasis:
      "§3.34.1 Red — 'competitive/results emphasis'; guide §2.3 gives red to officiating, and a ratified national record is officiating's output. §3.34.2 also calls this category 'the boldest register on the site'.",
    schemaType: "CollectionPage",
    listEndpoint: null,
  },
  {
    key: "results-rankings",
    route: "/results-rankings",
    apiPath: "/results-rankings-page",
    messageKey: "results-rankings",
    register: "red",
    registerBasis: "Same basis as records — one continuous data chain (IA §9).",
    schemaType: "CollectionPage",
    listEndpoint: null,
  },
  {
    key: "albums",
    route: "/media/albums",
    apiPath: "/albums-page",
    messageKey: "albums",
    register: "neutral",
    registerBasis: "§3.34.2 Media Centre — 'Neutral background... large imagery'.",
    schemaType: "CollectionPage",
    // `GET /albums/public/:slug` is public, but it resolves one album by slug;
    // there is no public list to build an index from.
    listEndpoint: null,
  },
  {
    key: "videos",
    route: "/media/videos",
    apiPath: "/videos-page",
    messageKey: "videos",
    register: "neutral",
    registerBasis: "Same row of §3.34.2 as albums.",
    schemaType: "CollectionPage",
    listEndpoint: null,
  },
  {
    key: "board-members",
    route: "/about/board-members",
    apiPath: "/board-members-page",
    messageKey: "board-members",
    register: "green",
    registerBasis:
      "Guide §3.3 — administrators' apparel is green; §3.34.2 files Board of Directors under Quiet/Institutional, 'White + Green only'.",
    schemaType: "AboutPage",
    listEndpoint: "/federation-personnel/public",
  },
  {
    key: "committees",
    route: "/about/committees",
    apiPath: "/committees-page",
    messageKey: "committees",
    register: "green",
    registerBasis: "Same guide caption and same §3.34.2 row as the board.",
    schemaType: "AboutPage",
    // `GET /committees/:id/public` resolves one committee; no public list.
    listEndpoint: null,
  },
  {
    key: "contact-us",
    route: "/contact",
    apiPath: "/contact-us-page",
    messageKey: "contact-us",
    register: "black",
    registerBasis:
      "§3.34.2 Contact Us — the one row that names a flat dark hero as acceptable, 'for this category specifically, not elsewhere'.",
    schemaType: "ContactPage",
    // Not a list: the contact record itself carries address, phones, hours and
    // social links, which is why this is the only one of the twelve whose
    // public read is enough to build a complete page today.
    listEndpoint: null,
  },
];

export function findPublicPage(key: string): PublicPage | undefined {
  return PUBLIC_PAGES.find((page) => page.key === key);
}
