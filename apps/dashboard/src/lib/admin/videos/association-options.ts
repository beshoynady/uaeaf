import type { VideoAssociationType } from "./types";

/**
 * The championships and events an editor can link a video to.
 *
 * ── Why this returns nothing, and why it exists anyway ─────────────────────
 *
 * None of the three owner collections is built. A search of the repository on
 * 2026-09-23 found no `championships`, `sportsEvents`, `publicEvents`,
 * `events`, `fixtures`, `calendar` or `competitions` collection — the names
 * appear only as string literals in `CONTENT_ASSOCIATION_OWNER_TYPES` and the
 * workflow list, with nothing behind them.
 *
 * So there is nothing to offer, and this returns an empty list. It is a real
 * function rather than a `TODO` comment for one reason: the API already
 * accepts and filters by these associations, and every screen that would offer
 * one is written against **this one adapter**. The day the entity ships, the
 * body below is the only thing that changes — no screen, no form, no filter
 * and no API call moves.
 *
 * **It must never return invented data.** A picker offering three plausible
 * championship names that do not exist would let an editor link a video to
 * nothing and believe it worked.
 *
 * Every consumer hides its control entirely while this is empty — a select
 * with no options is a dead affordance, which this project treats as a defect
 * in its own right rather than a cosmetic one.
 *
 * TODO(uaeaf): when the championships / sports-events / public-events module
 * ships, replace the body with a fetch of its public list — expected shape
 * `GET /api/v1/<collection>/public?fields=id,name` — and map each row to
 * `{ value: "<ownerType>:<id>", label: <name in the active locale> }`. Nothing
 * else in the dashboard or the public site needs to change.
 */
export interface AssociationOption {
  /** `<ownerType>:<id>` — the exact string the API's `association` filter and
   *  the section's `configuration.carousel.association` both expect. */
  value: string;
  label: string;
}

export const getAssociationOptions = async (
  _type: VideoAssociationType,
): Promise<AssociationOption[]> => [];

/**
 * All the options across every owner type, for a control that does not care
 * which kind of event a video belongs to — the library's filter bar, and the
 * add drawer.
 */
export const getAllAssociationOptions = async (): Promise<AssociationOption[]> => {
  const byType = await Promise.all(
    (["championships", "sportsEvents", "publicEvents"] as const).map(getAssociationOptions),
  );
  return byType.flat();
};
