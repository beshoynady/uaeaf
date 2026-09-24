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
    // Live since the articles module was built (2026-09-20). Chapter 14 §11's
    // noindex hold lifts by itself: `isIndexable` asks this same endpoint, so
    // a newsroom that has published nothing is still held, and one that has
    // published something is not.
    listEndpoint: "/articles/public",
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
    key: "policies",
    route: "/about/governance/policies",
    /**
     * **Not reachable publicly yet, and that is the recorded gap.**
     *
     * `GET /governance-documents` requires the `governanceDocuments:Read`
     * permission, so a public page cannot call it. The only public read is
     * `GET /governance-documents/:id/public` — one document, by id — which
     * cannot enumerate a list. The missing piece is a public list route; until
     * it exists the page renders clearly-marked seed records from
     * `lib/pages/governance-documents.ts`, and `listEndpoint: null` below is
     * what keeps it out of the index.
     *
     * This path is written as the one the page will read, so the day the route
     * is opened the change is one module, not one page.
     */
    apiPath: "/governance-documents",
    messageKey: "policies",
    register: "green",
    registerBasis:
      "§3.34.2 files Policies under Quiet/Institutional; ADR-0098 A9 amended that row for this page only — green marks the Regulations category and red the Policies category, per category and never per item (ADR-0065 D3). The page ground stays neutral and the hero is the black register.",
    schemaType: "CollectionPage",
    // No public list route exists (see `apiPath`), so the page's content is
    // seed data and Chapter 14 §11 keeps it `noindex` until that changes.
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
  {
    // Not one of the twelve singleton wrappers: its own entity with its own
    // publishing workflow (ADR-0069), registered here for its URL, register,
    // schema type and indexability like any other public page.
    key: "president-message",
    route: "/about/president",
    apiPath: "/president-message-page/current/public",
    messageKey: "president-message",
    register: "green",
    registerBasis:
      "Same guide caption and same §3.34.2 row as the board (page-president-message.md §7.4, Register row).",
    schemaType: "AboutPage",
    listEndpoint: null,
  },
  {
    // Its own workflow-governed entity, like the President's Message (ADR-0070).
    // The route is the one IA §8.1's navigation already gives it, under About ›
    // Governance & Strategy.
    key: "vision-mission",
    route: "/about/governance/vision-mission",
    apiPath: "/vision-mission-page/current/public",
    messageKey: "vision-mission",
    register: "green",
    registerBasis:
      "Governance: guide §3.3 gives administration green, and §3.34.2 files governance pages under Quiet/Institutional, 'White + Green only' — the board's row.",
    schemaType: "AboutPage",
    listEndpoint: null,
  },
  {
    // Its own workflow-governed entity (ADR-0075), under About › Governance &
    // Strategy as IA §8.1 places it. Moved here from `PREPARING_PAGES` the day
    // its full page was built, under the same route, so no link changed.
    key: "strategic-plan",
    route: "/about/governance/strategic-plan",
    apiPath: "/strategic-plans-page/current/public",
    messageKey: "strategic-plan",
    register: "green",
    registerBasis: "§3.34.2 names Strategic Plan in the Quiet/Institutional row, 'White + Green only' — the board's row.",
    schemaType: "AboutPage",
    listEndpoint: null,
  },
];

export function findPublicPage(key: string): PublicPage | undefined {
  return PUBLIC_PAGES.find((page) => page.key === key);
}

/**
 * A destination the site already links to whose full page is not built yet.
 *
 * Every link resolves (batch brief 2026-09-15 §6.4): until its page is built,
 * each destination here is served by `PreparingPageScreen` with its title, its
 * trail and one status line from the `Preparing` messages, and no other copy.
 * Building the full page moves its entry into `PUBLIC_PAGES` under the same
 * route, so no link changes.
 *
 * A list of its own rather than a state on `PublicPage`: a page in preparation
 * has no API read, no schema type and no `Pages` label, and `apiPath` is a
 * string every built route hands straight to `fetchPublic`.
 *
 * Out of the index and the sitemap by construction (Chapter 14 §11, §13): its
 * metadata is always `noindex, follow`, and the sitemap reads `PUBLIC_PAGES`.
 *
 * PR-010 lists "Coming Soon" on public pages as an anti-pattern. The status
 * line is the owner's explicit instruction of 2026-09-15, which CLAUDE.md §1
 * ranks above it.
 */
export interface PreparingPage {
  key: string;
  /** Locale-relative, as in `PublicPage`. */
  route: string;
  /** Dotted path to the label the header or footer already prints for this
   *  destination (`Nav.*`, `Legal.*`, `Footer.*`): the page carries the name
   *  its link carries rather than a new one. */
  titleKey: string;
  register: Register;
  registerBasis: string;
}

export const PREPARING_PAGES: readonly PreparingPage[] = [
  {
    key: "about",
    route: "/about",
    titleKey: "Nav.aboutOverview",
    register: "green",
    registerBasis:
      "Derived (CLAUDE.md §1a): §3.34.2 files the About section's pages it names (board, committees, policies, strategic plan) under Quiet/Institutional, 'White + Green only'.",
  },
  {
    key: "organisational-structure",
    route: "/about/organisational-structure",
    titleKey: "Nav.organisationalStructure",
    register: "green",
    registerBasis:
      "Derived (CLAUDE.md §1a): guide §3.3 gives administration green; the structure is the board's and committees' own subject, §3.34.2 Quiet/Institutional.",
  },
  {
    key: "officials",
    route: "/officials",
    titleKey: "Nav.officials",
    register: "red",
    registerBasis: "Guide §2.3 — referees wear red; the basis records takes for officiating.",
  },
  {
    key: "championships",
    route: "/championships",
    titleKey: "Nav.championships",
    register: "red",
    registerBasis:
      "Guide §4.3 onward — every local championship garment is red; the basis records and results-rankings take.",
  },
  {
    key: "federation-events",
    route: "/events/federation-events",
    titleKey: "Nav.events",
    register: "neutral",
    registerBasis:
      "DESIGN DECISION REQUIRED: §3.34.2's Dynamic/Athletic row names championships and 'live/major events', and IA §8.1 keeps Events distinct from Championships (CLAUDE.md §11). The neutral base surface commits to neither until the page's register is decided.",
  },
  {
    key: "help",
    route: "/help",
    titleKey: "Footer.helpCenter",
    register: "neutral",
    registerBasis:
      "Derived (CLAUDE.md §1a) from §3.34.2 Contact Us, the service row: 'Neutral-dominant'. Its flat dark hero is that category's alone.",
  },
  {
    key: "accessibility",
    route: "/accessibility",
    titleKey: "Legal.accessibility",
    register: "neutral",
    registerBasis: "Same service row of §3.34.2 as help.",
  },
  {
    key: "privacy",
    route: "/privacy",
    titleKey: "Legal.privacy",
    register: "neutral",
    registerBasis: "Same service row of §3.34.2 as help.",
  },
  {
    key: "terms",
    route: "/terms",
    titleKey: "Legal.terms",
    register: "neutral",
    registerBasis: "Same service row of §3.34.2 as help.",
  },
  {
    key: "sitemap",
    route: "/sitemap",
    titleKey: "Legal.sitemap",
    register: "neutral",
    registerBasis: "Same service row of §3.34.2 as help.",
  },
];

export const findPreparingPage = (key: string): PreparingPage | undefined =>
  PREPARING_PAGES.find((page) => page.key === key);
