import { isUsableHeroUrl } from "@uaeaf/content/hero";
import { selectShowcase, type SponsorshipTier } from "@uaeaf/content/sponsors";
import { dubaiDayEndIso, dubaiDayStartIso, isoToDubaiDay } from "./dubai-day";
import { ORGANIZATION_NAME_MAX, type FieldError } from "./organizations";

/**
 * The sponsors screen's model (ADR-0077 D1–D2, ADR-0085).
 *
 * The organisation (`sponsors`) and its contracts (`sponsorships`) are edited
 * together, one sponsor with its sponsorships beneath it, and saved at once:
 * a new sponsor is created before any sponsorship that names it, and deletions
 * run contracts first, so the API never sees a sponsorship without its sponsor.
 *
 * The SPONSORS section's settings — which sponsorship the banner prefers, and
 * the partnership call to action — are saved with them.
 */

export const SPONSORSHIP_TIERS = ["Strategic", "Official", "Supporting"] as const;
export const SPONSORSHIP_TARGET_TYPES = ["Federation", "Championship", "Event"] as const;
export const SPONSORSHIP_STATUSES = ["Active", "Expired", "Cancelled"] as const;
/** ADR-0077 D2 #2. */
export const SCOPE_LABEL_MAX = 120;

type Name = { ar: string | null; en: string | null };
type Localized = { ar: string; en: string };

export interface SponsorRecord {
  _id: string;
  name: Name;
  logoId: string | null;
  website: string | null;
  categoryLabel: Localized | null;
  isDemo?: boolean;
}

export interface SponsorshipRecord {
  _id: string;
  sponsorId: string;
  targetType: string;
  targetId: string | null;
  tier: string;
  startDate: string;
  endDate: string | null;
  status: string;
  scopeLabel: Localized | null;
  isFeatured: boolean;
  displayOrder: number;
  isVisible: boolean;
  isDemo?: boolean;
}

export interface SponsorsSectionRecord {
  _id: string;
  configuration: Record<string, unknown> | null;
  ctaText: Localized | null;
  ctaUrl: string | null;
}

export interface SponsorshipDraft {
  key: string;
  id: string | null;
  targetType: string;
  tier: string;
  startDay: string;
  endDay: string;
  status: string;
  scopeAr: string;
  scopeEn: string;
  isFeatured: boolean;
  isVisible: boolean;
  isDemo: boolean;
}

export interface SponsorDraft {
  key: string;
  id: string | null;
  nameAr: string;
  nameEn: string;
  logoId: string | null;
  website: string;
  categoryAr: string;
  categoryEn: string;
  isDemo: boolean;
  sponsorships: SponsorshipDraft[];
}

export interface SectionDraft {
  id: string | null;
  bannerSponsorshipId: string | null;
  ctaTextAr: string;
  ctaTextEn: string;
  ctaUrl: string;
}

export interface SponsorsDraft {
  sponsors: SponsorDraft[];
  section: SectionDraft;
}

export type SponsorsStep =
  | { kind: "delete"; entity: "sponsors" | "sponsorships"; key: string; id: string }
  | { kind: "create"; entity: "sponsors"; key: string; body: Record<string, unknown> }
  | { kind: "create"; entity: "sponsorships"; key: string; sponsorKey: string; body: Record<string, unknown> }
  | { kind: "update"; entity: "sponsors" | "sponsorships"; key: string; id: string; body: Record<string, unknown> }
  | { kind: "section"; id: string; body: Record<string, unknown> };

let counter = 0;
const newKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter += 1)}`;

const graphemes = (text: string): number =>
  [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text.trim())].length;

/** Where a sponsor stands in the list: at its first sponsorship's place in the
 *  site's order, so the order an editor saved is the order they reopen. */
const firstPlace = (sponsorId: string, sponsorships: readonly SponsorshipRecord[]) =>
  Math.min(Number.MAX_SAFE_INTEGER, ...sponsorships.filter((item) => String(item.sponsorId) === sponsorId).map((item) => item.displayOrder));

export const fromSponsorRecords = (
  sponsors: readonly SponsorRecord[],
  sponsorships: readonly SponsorshipRecord[],
  section: SponsorsSectionRecord | null,
): SponsorsDraft => ({
  sponsors: [...sponsors].sort((a, b) => firstPlace(a._id, sponsorships) - firstPlace(b._id, sponsorships)).map((sponsor) => ({
    key: sponsor._id,
    id: sponsor._id,
    nameAr: sponsor.name?.ar ?? "",
    nameEn: sponsor.name?.en ?? "",
    logoId: sponsor.logoId ?? null,
    website: sponsor.website ?? "",
    categoryAr: sponsor.categoryLabel?.ar ?? "",
    categoryEn: sponsor.categoryLabel?.en ?? "",
    isDemo: sponsor.isDemo === true,
    sponsorships: sponsorships
      .filter((sponsorship) => String(sponsorship.sponsorId) === sponsor._id)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((sponsorship) => ({
        key: sponsorship._id,
        id: sponsorship._id,
        targetType: sponsorship.targetType,
        tier: sponsorship.tier,
        startDay: isoToDubaiDay(sponsorship.startDate),
        endDay: isoToDubaiDay(sponsorship.endDate),
        status: sponsorship.status,
        scopeAr: sponsorship.scopeLabel?.ar ?? "",
        scopeEn: sponsorship.scopeLabel?.en ?? "",
        isFeatured: sponsorship.isFeatured,
        isVisible: sponsorship.isVisible,
        isDemo: sponsorship.isDemo === true,
      })),
  })),
  section: {
    id: section?._id ?? null,
    bannerSponsorshipId: typeof section?.configuration?.bannerSponsorshipId === "string" ? section.configuration.bannerSponsorshipId : null,
    ctaTextAr: section?.ctaText?.ar ?? "",
    ctaTextEn: section?.ctaText?.en ?? "",
    ctaUrl: section?.ctaUrl ?? "",
  },
});

export const addSponsor = (draft: SponsorsDraft): SponsorsDraft => ({
  ...draft,
  sponsors: [
    ...draft.sponsors,
    { key: newKey("sponsor"), id: null, nameAr: "", nameEn: "", logoId: null, website: "", categoryAr: "", categoryEn: "", isDemo: false, sponsorships: [] },
  ],
});

export const updateSponsor = (draft: SponsorsDraft, key: string, patch: Partial<Omit<SponsorDraft, "sponsorships">>): SponsorsDraft => ({
  ...draft,
  sponsors: draft.sponsors.map((sponsor) => (sponsor.key === key ? { ...sponsor, ...patch, key: sponsor.key, id: sponsor.id, isDemo: sponsor.isDemo } : sponsor)),
});

/** One place up (-1) or down (+1); its sponsorships move with it in the site's order. */
export const moveSponsor = (draft: SponsorsDraft, key: string, delta: -1 | 1): SponsorsDraft => {
  const from = draft.sponsors.findIndex((sponsor) => sponsor.key === key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= draft.sponsors.length) return draft;
  const sponsors = [...draft.sponsors];
  const [moved] = sponsors.splice(from, 1);
  sponsors.splice(to, 0, moved);
  return { ...draft, sponsors };
};

export const removeSponsor = (draft: SponsorsDraft, key: string): SponsorsDraft => ({
  ...draft,
  sponsors: draft.sponsors.filter((sponsor) => sponsor.key !== key),
});

/** A new sponsorship starts hidden (ADR-0084's pattern), for the federation. */
export const addSponsorship = (draft: SponsorsDraft, sponsorKey: string): SponsorsDraft => ({
  ...draft,
  sponsors: draft.sponsors.map((sponsor) =>
    sponsor.key === sponsorKey
      ? {
          ...sponsor,
          sponsorships: [
            ...sponsor.sponsorships,
            { key: newKey("sponsorship"), id: null, targetType: "Federation", tier: "Official", startDay: "", endDay: "", status: "Active", scopeAr: "", scopeEn: "", isFeatured: false, isVisible: false, isDemo: false },
          ],
        }
      : sponsor,
  ),
});

export const updateSponsorship = (draft: SponsorsDraft, sponsorKey: string, key: string, patch: Partial<SponsorshipDraft>): SponsorsDraft => ({
  ...draft,
  sponsors: draft.sponsors.map((sponsor) =>
    sponsor.key === sponsorKey
      ? {
          ...sponsor,
          sponsorships: sponsor.sponsorships.map((item) => (item.key === key ? { ...item, ...patch, key: item.key, id: item.id, isDemo: item.isDemo } : item)),
        }
      : sponsor,
  ),
});

export const removeSponsorship = (draft: SponsorsDraft, sponsorKey: string, key: string): SponsorsDraft => ({
  ...draft,
  sponsors: draft.sponsors.map((sponsor) =>
    sponsor.key === sponsorKey ? { ...sponsor, sponsorships: sponsor.sponsorships.filter((item) => item.key !== key) } : sponsor,
  ),
});

export const updateSection = (draft: SponsorsDraft, patch: Partial<SectionDraft>): SponsorsDraft => ({
  ...draft,
  section: { ...draft.section, ...patch, id: draft.section.id },
});

/** Every refusal the API would make, with its code and the field it names. */
export const validateSponsors = (draft: SponsorsDraft): FieldError[] => {
  const errors: FieldError[] = [];
  for (const sponsor of draft.sponsors) {
    const at = (field: string) => `sponsors.${sponsor.key}.${field}`;
    if (!sponsor.nameAr.trim() && !sponsor.nameEn.trim()) errors.push({ path: at("name"), code: "missingRequiredField" });
    for (const [field, value] of [
      ["nameAr", sponsor.nameAr],
      ["nameEn", sponsor.nameEn],
    ] as const) {
      if (graphemes(value) > ORGANIZATION_NAME_MAX) errors.push({ path: at(field), code: "organizationNameTooLong", limit: ORGANIZATION_NAME_MAX });
    }
    if (!sponsor.logoId) errors.push({ path: at("logoId"), code: "missingRequiredField" });
    if (sponsor.website.trim() && !/^https?:\/\/.+/.test(sponsor.website.trim())) errors.push({ path: at("website"), code: "invalidRequest" });
    if (Boolean(sponsor.categoryAr.trim()) !== Boolean(sponsor.categoryEn.trim())) {
      errors.push({ path: at(sponsor.categoryAr.trim() ? "categoryEn" : "categoryAr"), code: "missingRequiredField" });
    }

    for (const sponsorship of sponsor.sponsorships) {
      const on = (field: string) => `sponsorships.${sponsorship.key}.${field}`;
      if (!(SPONSORSHIP_TIERS as readonly string[]).includes(sponsorship.tier)) errors.push({ path: on("tier"), code: "missingRequiredField" });
      if (!dubaiDayStartIso(sponsorship.startDay)) errors.push({ path: on("startDay"), code: "missingRequiredField" });
      if (sponsorship.targetType !== "Federation" && !sponsorship.endDay) {
        errors.push({ path: on("endDay"), code: "sponsorshipEndRequired" });
      } else if (sponsorship.endDay && sponsorship.startDay && sponsorship.endDay < sponsorship.startDay) {
        errors.push({ path: on("endDay"), code: "sponsorshipEndsBeforeStart" });
      }
      for (const [field, value] of [
        ["scopeAr", sponsorship.scopeAr],
        ["scopeEn", sponsorship.scopeEn],
      ] as const) {
        if (graphemes(value) > SCOPE_LABEL_MAX) errors.push({ path: on(field), code: "scopeLabelTooLong", limit: SCOPE_LABEL_MAX });
      }
      if (Boolean(sponsorship.scopeAr.trim()) !== Boolean(sponsorship.scopeEn.trim())) {
        errors.push({ path: on(sponsorship.scopeAr.trim() ? "scopeEn" : "scopeAr"), code: "missingRequiredField" });
      }
    }
  }

  const { section } = draft;
  const text = Boolean(section.ctaTextAr.trim()) && Boolean(section.ctaTextEn.trim());
  const anyText = Boolean(section.ctaTextAr.trim()) || Boolean(section.ctaTextEn.trim());
  const url = section.ctaUrl.trim();
  if ((anyText || url) && !(text && url)) errors.push({ path: `section.${url ? "ctaText" : "ctaUrl"}`, code: "incompleteCta" });
  else if (url && !isUsableHeroUrl(url)) errors.push({ path: "section.ctaUrl", code: "invalidCtaUrl" });
  return errors;
};

const localizedOrNull = (ar: string, en: string): Localized | null => (ar.trim() && en.trim() ? { ar: ar.trim(), en: en.trim() } : null);

const sponsorBody = (sponsor: SponsorDraft): Record<string, unknown> => ({
  name: { ar: sponsor.nameAr.trim() || null, en: sponsor.nameEn.trim() || null },
  logoId: sponsor.logoId,
  website: sponsor.website.trim() || null,
  categoryLabel: localizedOrNull(sponsor.categoryAr, sponsor.categoryEn),
});

const sponsorshipBody = (sponsorship: SponsorshipDraft, index: number): Record<string, unknown> => ({
  targetType: sponsorship.targetType,
  tier: sponsorship.tier,
  startDate: dubaiDayStartIso(sponsorship.startDay),
  endDate: sponsorship.endDay ? dubaiDayEndIso(sponsorship.endDay) : null,
  status: sponsorship.status,
  scopeLabel: localizedOrNull(sponsorship.scopeAr, sponsorship.scopeEn),
  isFeatured: sponsorship.isFeatured,
  displayOrder: index,
  isVisible: sponsorship.isVisible,
});

const sectionBody = (section: SectionDraft): Record<string, unknown> => ({
  configuration: { bannerSponsorshipId: section.bannerSponsorshipId },
  ctaText: localizedOrNull(section.ctaTextAr, section.ctaTextEn),
  ctaUrl: section.ctaUrl.trim() || null,
});

const changedFields = (next: Record<string, unknown>, previous: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(next).filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(previous[field])));

/**
 * The fewest writes that turn `saved` into `draft`: contracts deleted before
 * their sponsors; each sponsor created or updated before its contracts; the
 * section last, once every sponsorship it may name exists.
 */
/** Each sponsorship's place in the site's order: the list read top to bottom,
 *  sponsor by sponsor. `displayOrder` is global upstream (the grid and the
 *  strip order across sponsors), so a per-sponsor count would collide. */
const places = (draft: SponsorsDraft): Map<string, number> =>
  new Map(draft.sponsors.flatMap((sponsor) => sponsor.sponsorships).map((item, index) => [item.key, index]));

export const planSponsors = (saved: SponsorsDraft, draft: SponsorsDraft): SponsorsStep[] => {
  const steps: SponsorsStep[] = [];
  const draftPlaces = places(draft);
  const savedPlaces = places(saved);
  const draftSponsors = new Map(draft.sponsors.map((sponsor) => [sponsor.key, sponsor]));
  const draftShips = new Set(draft.sponsors.flatMap((sponsor) => sponsor.sponsorships.map((item) => item.key)));

  for (const sponsor of saved.sponsors) {
    for (const item of sponsor.sponsorships) {
      if (item.id && !draftShips.has(item.key)) steps.push({ kind: "delete", entity: "sponsorships", key: item.key, id: item.id });
    }
  }
  for (const sponsor of saved.sponsors) {
    if (sponsor.id && !draftSponsors.has(sponsor.key)) steps.push({ kind: "delete", entity: "sponsors", key: sponsor.key, id: sponsor.id });
  }

  const savedSponsors = new Map(saved.sponsors.map((sponsor) => [sponsor.key, sponsor]));
  for (const sponsor of draft.sponsors) {
    const before = savedSponsors.get(sponsor.key);
    if (!sponsor.id || !before) {
      steps.push({ kind: "create", entity: "sponsors", key: sponsor.key, body: sponsorBody(sponsor) });
    } else {
      const changed = changedFields(sponsorBody(sponsor), sponsorBody(before));
      if (Object.keys(changed).length > 0) steps.push({ kind: "update", entity: "sponsors", key: sponsor.key, id: sponsor.id, body: changed });
    }

    const savedShips = new Map((before?.sponsorships ?? []).map((item) => [item.key, item]));
    sponsor.sponsorships.forEach((item) => {
      const previous = savedShips.get(item.key);
      const place = draftPlaces.get(item.key)!;
      if (!item.id || !previous) {
        steps.push({ kind: "create", entity: "sponsorships", key: item.key, sponsorKey: sponsor.key, body: sponsorshipBody(item, place) });
        return;
      }
      const changed = changedFields(sponsorshipBody(item, place), sponsorshipBody(previous, savedPlaces.get(item.key)!));
      if (Object.keys(changed).length > 0) steps.push({ kind: "update", entity: "sponsorships", key: item.key, id: item.id, body: changed });
    });
  }

  if (draft.section.id && JSON.stringify(sectionBody(draft.section)) !== JSON.stringify(sectionBody(saved.section))) {
    steps.push({ kind: "section", id: draft.section.id, body: sectionBody(draft.section) });
  }
  return steps;
};

/** After a save, created sponsors and sponsorships are named by the ids the API
 *  gave them, keys included, so the re-read matches the draft one for one. */
export const adoptCreatedSponsors = (draft: SponsorsDraft, created: Readonly<Record<string, string>>): SponsorsDraft => {
  if (Object.keys(created).length === 0) return draft;
  const adopt = <T extends { key: string; id: string | null }>(item: T): T =>
    created[item.key] ? { ...item, key: created[item.key], id: created[item.key] } : item;
  return {
    ...draft,
    sponsors: draft.sponsors.map((sponsor) => ({ ...adopt(sponsor), sponsorships: sponsor.sponsorships.map(adopt) })),
  };
};

export const isSponsorsDirty = (saved: SponsorsDraft, draft: SponsorsDraft): boolean => JSON.stringify(saved) !== JSON.stringify(draft);

export interface PreviewItem {
  key: string;
  sponsorName: Name;
  tier: SponsorshipTier;
  isFeatured: boolean;
}

/**
 * What the site's sponsors section would show at `now`, from the site's own
 * rule (`selectShowcase`): visible, not cancelled or archived, inside its Dubai
 * window; the banner the highest tier present (ADR-0085 D5.1).
 */
export const previewShowcase = (draft: SponsorsDraft, now: Date): { banner: PreviewItem | null; grid: PreviewItem[] } => {
  const order = places(draft);
  const candidates = draft.sponsors.flatMap((sponsor) =>
    sponsor.sponsorships
      .filter((item) => item.isVisible && item.status === "Active" && dubaiDayStartIso(item.startDay))
      .map((item) => ({
        id: item.key,
        sponsorId: sponsor.key,
        tier: item.tier as SponsorshipTier,
        targetType: item.targetType as "Federation" | "Championship" | "Event",
        displayOrder: order.get(item.key)!,
        startDate: dubaiDayStartIso(item.startDay)!,
        endDate: item.endDay ? dubaiDayEndIso(item.endDay) : null,
        sponsorName: { ar: sponsor.nameAr.trim() || null, en: sponsor.nameEn.trim() || null },
        isFeatured: item.isFeatured,
      })),
  );
  const { banner, grid } = selectShowcase(candidates, { bannerSponsorshipId: draft.section.bannerSponsorshipId }, now);
  const toItem = (item: (typeof candidates)[number]): PreviewItem => ({ key: item.id, sponsorName: item.sponsorName, tier: item.tier, isFeatured: item.isFeatured });
  return { banner: banner ? toItem(banner) : null, grid: grid.map(toItem) };
};
