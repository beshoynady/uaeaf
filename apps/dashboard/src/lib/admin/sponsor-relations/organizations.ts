import { dubaiDayEndIso, dubaiDayStartIso, isoToDubaiDay } from "./dubai-day";

/**
 * The partners and memberships screens' model (ADR-0077 D3, ADR-0085).
 *
 * One list per screen, edited in memory and saved at once. Saving is publishing
 * (ADR-0084's pattern): nothing is stored until Save, the plan is the fewest
 * writes in an order the API accepts, and everything the API would refuse is
 * caught by `validateOrganizations` first with the API's own codes.
 *
 * The two kinds are the same card with different field names upstream; the
 * names live in `FIELDS`, so the rest of the model is written once.
 */

export type OrganizationKind = "partners" | "memberships";

/** A record as the API returns it (the RBAC-gated list read). */
export interface OrganizationRecord {
  _id: string;
  partnerName?: { ar: string | null; en: string | null };
  organizationName?: { ar: string | null; en: string | null };
  partnerLogoId?: string | null;
  organizationLogoId?: string | null;
  partnershipType?: string;
  membershipType?: string;
  startDate: string;
  endDate: string | null;
  isActive?: boolean;
  status?: string;
  displayOrder: number;
  isVisible: boolean;
  isDemo?: boolean;
}

export interface OrganizationDraft {
  key: string;
  id: string | null;
  nameAr: string;
  nameEn: string;
  logoId: string | null;
  type: string;
  startDay: string;
  endDay: string;
  /** Partners: whether the agreement is in force. */
  isActive: boolean;
  /** Memberships: Active · Suspended · Terminated. */
  status: string;
  isVisible: boolean;
  /** A fictional seed record: shown with a badge, never editable into real. */
  isDemo: boolean;
}

export interface OrganizationsDraft {
  items: OrganizationDraft[];
}

export interface FieldError {
  path: string;
  code: string;
  limit?: number;
}

export type OrganizationStep =
  | { kind: "delete"; key: string; id: string }
  | { kind: "create"; key: string; body: Record<string, unknown> }
  | { kind: "update"; key: string; id: string; body: Record<string, unknown> };

export const PARTNERSHIP_TYPES = ["BilateralAgreement", "MOU", "TechnicalCooperation", "Other"] as const;
export const MEMBERSHIP_TYPES = ["RegionalBody", "ContinentalBody", "InternationalBody", "OlympicCommittee"] as const;
export const MEMBERSHIP_STATUSES = ["Active", "Suspended", "Terminated"] as const;

/** `07-Mongoose-Schema-Specification.md` Domain 9: 150 a side. */
export const ORGANIZATION_NAME_MAX = 150;

const FIELDS = {
  partners: { name: "partnerName", logo: "partnerLogoId", type: "partnershipType" },
  memberships: { name: "organizationName", logo: "organizationLogoId", type: "membershipType" },
} as const;

const graphemes = (text: string): number =>
  [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text.trim())].length;

let counter = 0;
const newKey = () => `new-${Date.now().toString(36)}-${(counter += 1)}`;

export const fromOrganizationRecords = (kind: OrganizationKind, records: readonly OrganizationRecord[]): OrganizationsDraft => ({
  items: [...records]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((record) => {
      const name = (kind === "partners" ? record.partnerName : record.organizationName) ?? { ar: null, en: null };
      return {
        key: record._id,
        id: record._id,
        nameAr: name.ar ?? "",
        nameEn: name.en ?? "",
        logoId: (kind === "partners" ? record.partnerLogoId : record.organizationLogoId) ?? null,
        type: (kind === "partners" ? record.partnershipType : record.membershipType) ?? "",
        startDay: isoToDubaiDay(record.startDate),
        endDay: isoToDubaiDay(record.endDate),
        isActive: record.isActive ?? true,
        status: record.status ?? "Active",
        isVisible: record.isVisible,
        isDemo: record.isDemo === true,
      };
    }),
});

/** A new record starts hidden (ADR-0084's pattern), at the end of the list. */
export const addOrganization = (kind: OrganizationKind, draft: OrganizationsDraft): OrganizationsDraft => ({
  items: [
    ...draft.items,
    {
      key: newKey(),
      id: null,
      nameAr: "",
      nameEn: "",
      logoId: null,
      type: "",
      startDay: "",
      endDay: "",
      isActive: true,
      status: "Active",
      isVisible: false,
      isDemo: false,
    },
  ],
});

export const updateOrganization = (draft: OrganizationsDraft, key: string, patch: Partial<OrganizationDraft>): OrganizationsDraft => ({
  items: draft.items.map((item) => (item.key === key ? { ...item, ...patch, key: item.key, id: item.id, isDemo: item.isDemo } : item)),
});

export const removeOrganization = (draft: OrganizationsDraft, key: string): OrganizationsDraft => ({
  items: draft.items.filter((item) => item.key !== key),
});

/** One place up (-1) or down (+1), from wherever the record is now. */
export const moveOrganization = (draft: OrganizationsDraft, key: string, delta: -1 | 1): OrganizationsDraft => {
  const from = draft.items.findIndex((item) => item.key === key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= draft.items.length) return draft;
  const items = [...draft.items];
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  return { items };
};

/** Every refusal the API would make, with its code and the field it names. */
export const validateOrganizations = (kind: OrganizationKind, draft: OrganizationsDraft): FieldError[] =>
  draft.items.flatMap((item) => {
    const errors: FieldError[] = [];
    const at = (field: string) => `items.${item.key}.${field}`;
    if (!item.nameAr.trim() && !item.nameEn.trim()) errors.push({ path: at("name"), code: "missingRequiredField" });
    for (const [field, value] of [
      ["nameAr", item.nameAr],
      ["nameEn", item.nameEn],
    ] as const) {
      if (graphemes(value) > ORGANIZATION_NAME_MAX) errors.push({ path: at(field), code: "organizationNameTooLong", limit: ORGANIZATION_NAME_MAX });
    }
    const types: readonly string[] = kind === "partners" ? PARTNERSHIP_TYPES : MEMBERSHIP_TYPES;
    if (!types.includes(item.type)) errors.push({ path: at("type"), code: "missingRequiredField" });
    if (!dubaiDayStartIso(item.startDay)) errors.push({ path: at("startDay"), code: "missingRequiredField" });
    if (item.endDay && item.startDay && item.endDay < item.startDay) errors.push({ path: at("endDay"), code: "sponsorshipEndsBeforeStart" });
    return errors;
  });

/** The body the API reads for one record, at its place in the list. */
const bodyOf = (kind: OrganizationKind, item: OrganizationDraft, index: number): Record<string, unknown> => {
  const fields = FIELDS[kind];
  const body: Record<string, unknown> = {
    [fields.name]: { ar: item.nameAr.trim() || null, en: item.nameEn.trim() || null },
    [fields.logo]: item.logoId,
    [fields.type]: item.type,
    startDate: dubaiDayStartIso(item.startDay),
    endDate: item.endDay ? dubaiDayEndIso(item.endDay) : null,
  };
  if (kind === "partners") body.isActive = item.isActive;
  else body.status = item.status;
  body.displayOrder = index;
  body.isVisible = item.isVisible;
  return body;
};

/**
 * The fewest writes that turn `saved` into `draft`: deletions first, then each
 * new record, then each field that changed on a stored one — its place in the
 * list included.
 */
export const planOrganizations = (kind: OrganizationKind, saved: OrganizationsDraft, draft: OrganizationsDraft): OrganizationStep[] => {
  const kept = new Set(draft.items.map((item) => item.key));
  const deletes: OrganizationStep[] = saved.items
    .filter((item) => item.id && !kept.has(item.key))
    .map((item) => ({ kind: "delete", key: item.key, id: item.id! }));

  const savedIndex = new Map(saved.items.map((item, index) => [item.key, index]));
  const writes: OrganizationStep[] = draft.items.flatMap((item, index): OrganizationStep[] => {
    const next = bodyOf(kind, item, index);
    const before = savedIndex.has(item.key) ? saved.items[savedIndex.get(item.key)!] : null;
    if (!item.id || !before) return [{ kind: "create", key: item.key, body: next }];
    const previous = bodyOf(kind, before, savedIndex.get(item.key)!);
    const changed = Object.fromEntries(
      Object.entries(next).filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(previous[field])),
    );
    return Object.keys(changed).length > 0 ? [{ kind: "update", key: item.key, id: item.id, body: changed }] : [];
  });

  return [...deletes, ...writes];
};

/** After a save, a created record is named by the id the API gave it, key
 *  included, so the re-read's records match the draft one for one. */
export const adoptCreatedOrganizations = (draft: OrganizationsDraft, created: Readonly<Record<string, string>>): OrganizationsDraft =>
  Object.keys(created).length === 0
    ? draft
    : { items: draft.items.map((item) => (created[item.key] ? { ...item, key: created[item.key], id: created[item.key] } : item)) };

export const isOrganizationsDirty = (saved: OrganizationsDraft, draft: OrganizationsDraft): boolean =>
  JSON.stringify(saved.items) !== JSON.stringify(draft.items);
