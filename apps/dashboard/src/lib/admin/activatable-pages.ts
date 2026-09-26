/**
 * Which pages the activation route may switch, and how each one is addressed
 * upstream.
 *
 * This registry is the security boundary of the generic activation route, in
 * exactly the sense `editorial-entities.ts` is for the editorial one: the
 * route's URL carries an entity name, and without a closed list to resolve it
 * against, the caller would be choosing which upstream endpoint their body
 * reaches — `/api/admin/page-activation/users` would forward a body to the users
 * module.
 *
 * One registry rather than a route per page, because the request is identical
 * for all sixteen: one boolean, one `PATCH`, one `Publish` grant (ADR-0102 §D2).
 *
 * Deliberately NOT here:
 *
 * - `siteSettings`. It is not a page — maintenance mode, analytics ids, session
 *   timeouts — it has no URL to be withheld from, and it carries no `isActive`.
 * - The homepage. `pages.status` is not a public routing source and already
 *   means two other things (ADR-0102 §D6), so `/` gets no switch in this change.
 * - `governanceDocuments` (`/about/governance/policies`). It has no dashboard
 *   screen, so there is nowhere to put the bar; the page is a list of documents
 *   whose visibility each document already governs.
 */

/**
 * How the row is named upstream.
 *
 * `singleton` — one row, so `PATCH /<path>/active` with no id. A path parameter
 * would be a second way to name the row there is only one of.
 * `byId` — a workflow-governed collection with many rows, so `PATCH
 * /<path>/:id/active`.
 */
export type ActivationShape = "singleton" | "byId";

export interface ActivatablePage {
  /** The API's `entityType`, the collection name, and the `resourceType` whose
   *  `Publish` grant gates the switch — one string, as everywhere else in the
   *  platform. */
  entity: string;
  apiPath: string;
  shape: ActivationShape;
}

export const ACTIVATABLE_PAGES: readonly ActivatablePage[] = [
  { entity: "newsPage", apiPath: "/news-page", shape: "singleton" },
  { entity: "athletesPage", apiPath: "/athletes-page", shape: "singleton" },
  { entity: "clubsPage", apiPath: "/clubs-page", shape: "singleton" },
  { entity: "coachesPage", apiPath: "/coaches-page", shape: "singleton" },
  { entity: "disciplinesPage", apiPath: "/disciplines-page", shape: "singleton" },
  { entity: "recordsPage", apiPath: "/records-page", shape: "singleton" },
  { entity: "resultsRankingsPage", apiPath: "/results-rankings-page", shape: "singleton" },
  { entity: "albumsPage", apiPath: "/albums-page", shape: "singleton" },
  { entity: "videosPage", apiPath: "/videos-page", shape: "singleton" },
  { entity: "boardMembersPage", apiPath: "/board-members-page", shape: "singleton" },
  { entity: "committeesPage", apiPath: "/committees-page", shape: "singleton" },
  { entity: "contactUsPage", apiPath: "/contact-us-page", shape: "singleton" },
  { entity: "presidentMessagePage", apiPath: "/president-message-page", shape: "byId" },
  { entity: "visionMissionPage", apiPath: "/vision-mission-page", shape: "byId" },
  { entity: "strategicPlansPage", apiPath: "/strategic-plans-page", shape: "byId" },
  { entity: "aboutFederationPage", apiPath: "/about-federation-page", shape: "byId" },
];

export const findActivatablePage = (entity: string): ActivatablePage | undefined =>
  ACTIVATABLE_PAGES.find((page) => page.entity === entity);

/** The twelve hero pages, keyed by the `resourceType` the `/pages` workbench
 *  already uses — so that screen can look a page's switch up by the key it
 *  holds rather than mapping between two vocabularies. */
export const isSingletonPage = (entity: string): boolean =>
  findActivatablePage(entity)?.shape === "singleton";
