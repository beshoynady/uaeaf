/**
 * Which content types the editorial screens may act on, and where each one
 * lives upstream.
 *
 * This registry is the security boundary of the generic editorial route
 * handler, in exactly the sense `static-pages.ts` is for the singleton page
 * editor. The route's URL carries an `entityType` and an `action`; without a
 * closed list to resolve both against, the caller would be choosing which
 * upstream endpoint their body reaches — `/api/admin/editorial/users/<id>/…`
 * would forward a body to the users module.
 *
 * One registry rather than a route per entity because the editorial actions
 * are identical for every workflow-governed type — save, submit, publish,
 * approve, restore — and the eleven content pages after the president's
 * message need this screen, not a copy of it.
 */

/**
 * Everything the editorial panel may ask the API to do.
 *
 * A closed list, and the omission is the point: `delegate` is not on it.
 * Delegation is disabled upstream (`DELEGATION_ENABLED=false`, answered 403)
 * pending the audit's unresolved questions, and a route that cannot express
 * the action cannot forward it whatever a caller types into the URL.
 */
export const EDITORIAL_ACTIONS = [
  "submit",
  "resubmit",
  "publish",
  "restore",
  "approve",
  "reject",
  "return",
] as const;

export type EditorialAction = (typeof EDITORIAL_ACTIONS)[number];

/** Where an action is mounted upstream. Most hang off the entity's own
 *  record; the three review decisions belong to the workflow instance, which
 *  is a different collection with a different id. */
export type ActionTarget = "entity" | "workflowInstance";

const ACTION_TARGETS: Record<EditorialAction, ActionTarget> = {
  submit: "entity",
  resubmit: "workflowInstance",
  publish: "entity",
  restore: "entity",
  approve: "workflowInstance",
  reject: "workflowInstance",
  return: "workflowInstance",
};

export interface EditorialEntity {
  /** The API's `entityType` value — also the collection name, and also the
   *  `resourceType` its permissions are declared against. */
  entityType: string;
  /** The controller this type's own actions are mounted on. */
  apiPath: string;
  /** Permissions the screen checks before drawing anything, so it never
   *  offers a control the API would refuse. */
  readPermission: string;
  updatePermission: string;
  publishPermission: string;
}

/**
 * The types with an editorial screen today.
 *
 * Only one so far. The other eleven are registered here as each is built —
 * one line, no new route, no new handler. A type absent from this list is
 * refused by the route rather than forwarded, which is what makes the
 * absence safe rather than merely incomplete.
 */
export const EDITORIAL_ENTITIES: readonly EditorialEntity[] = [
  {
    entityType: "presidentMessagePage",
    apiPath: "/president-message-page",
    readPermission: "presidentMessagePage:Read",
    updatePermission: "presidentMessagePage:Update",
    publishPermission: "presidentMessagePage:Publish",
  },
];

export function findEditorialEntity(entityType: string): EditorialEntity | undefined {
  return EDITORIAL_ENTITIES.find((entity) => entity.entityType === entityType);
}

export function isEditorialAction(action: string): action is EditorialAction {
  return (EDITORIAL_ACTIONS as readonly string[]).includes(action);
}

/**
 * The upstream path for one action on one record.
 *
 * `id` is the entity's id for an action on the record, and the workflow
 * instance's id for a review decision — the caller holds both and passes the
 * one this action needs, which is why the target is declared here rather
 * than guessed from the action's name at the call site.
 */
export function editorialActionPath(entity: EditorialEntity, action: EditorialAction, id: string): string {
  return ACTION_TARGETS[action] === "workflowInstance"
    ? `/workflow-instances/${id}/${action}`
    : `${entity.apiPath}/${id}/${action}`;
}

/** Where a draft is saved. Not an action: it is a `PATCH` on the record
 *  itself, with a body of content rather than a decision. */
export function editorialSavePath(entity: EditorialEntity, id: string): string {
  return `${entity.apiPath}/${id}`;
}
