/**
 * The championships and events a visitor can narrow the library by.
 *
 * -- Why this returns nothing, and why it exists anyway ---------------------
 *
 * None of the three owner collections is built. A search of the repository on
 * 2026-09-23 found no `championships`, `sportsEvents`, `publicEvents`,
 * `events`, `fixtures`, `calendar` or `competitions` collection: the names
 * appear only as string literals in the API's `CONTENT_ASSOCIATION_OWNER_TYPES`
 * and in the workflow list, with nothing behind them.
 *
 * So there is nothing to offer, and this returns an empty list. It is a real
 * function rather than a `TODO` because the whole chain above it is already
 * built: the API accepts and filters by `association`, the URL carries it, the
 * library's query module reads it, and the filter panel renders a control for
 * it. The day the entity ships, the body below is the only thing that changes.
 *
 * **It must never return invented data.** Three plausible championship names
 * that do not exist would let a visitor filter the library down to nothing and
 * conclude the federation has published nothing about that championship.
 *
 * Every consumer draws nothing while this is empty -- a select with no options
 * is a dead affordance, which this project treats as a defect rather than a
 * cosmetic issue. This is the dashboard's
 * `lib/admin/videos/association-options.ts` on the public side; the two are
 * separate because the two applications fetch differently, and neither may
 * import the other.
 *
 * TODO(uaeaf): when the championships / sports-events / public-events module
 * ships, replace the body with `fetchPublic` of its public list and map each
 * row to `{ value: "<ownerType>:<id>", label: <name in the active locale> }`.
 * Nothing else on the public site needs to change.
 */
export interface AssociationOption {
  /** `<ownerType>:<id>` -- the exact string the API's `association` filter and
   *  the section's `configuration.carousel.association` both expect. */
  value: string;
  label: string;
}

export const getAssociationOptions = async (): Promise<AssociationOption[]> => [];
