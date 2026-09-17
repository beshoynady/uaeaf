import { describe, expect, it } from "vitest";
import {
  adoptCreatedOrganizations,
  addOrganization,
  fromOrganizationRecords,
  isOrganizationsDirty,
  moveOrganization,
  planOrganizations,
  removeOrganization,
  updateOrganization,
  validateOrganizations,
  type OrganizationRecord,
} from "./organizations";

/**
 * The partners and memberships screens' model (ADR-0085): a list of logo-and-
 * name records an editor adds, edits, orders, shows or hides, and saves at
 * once. Saving is publishing (ADR-0084's pattern), so the plan is the fewest
 * writes, and everything the API would refuse is caught first.
 */
describe("organizations model", () => {
  const partner = (overrides: Partial<OrganizationRecord> = {}): OrganizationRecord => ({
    _id: "6aa0850000000000000000c1",
    partnerName: { ar: "أكاديمية ميريديان التجريبية", en: "Meridian Demo Academy" },
    partnerLogoId: "6aa0850000000000000000f1",
    partnershipType: "MOU",
    startDate: "2024-02-29T20:00:00.000Z",
    endDate: null,
    isActive: true,
    displayOrder: 0,
    isVisible: true,
    isDemo: true,
    ...overrides,
  });

  it("reads records in display order, dates as Dubai days", () => {
    const draft = fromOrganizationRecords("partners", [
      partner({ _id: "b", displayOrder: 2 }),
      partner({ _id: "a", displayOrder: 1, endDate: "2025-12-31T19:59:59.000Z" }),
    ]);

    expect(draft.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(draft.items[0]).toMatchObject({ startDay: "2024-03-01", endDay: "2025-12-31", isDemo: true, type: "MOU" });
  });

  it("adds a new record hidden, at the end", () => {
    const draft = addOrganization("memberships", fromOrganizationRecords("memberships", []));

    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]).toMatchObject({ id: null, isVisible: false, isDemo: false, status: "Active" });
  });

  it("refuses a record with no name on either side, no start day, or an end before the start", () => {
    let draft = addOrganization("partners", fromOrganizationRecords("partners", []));
    const key = draft.items[0].key;
    draft = updateOrganization(draft, key, { type: "MOU", startDay: "2026-05-01", endDay: "2026-04-01" });

    const errors = validateOrganizations("partners", draft);

    expect(errors).toEqual(
      expect.arrayContaining([
        { path: `items.${key}.name`, code: "missingRequiredField" },
        { path: `items.${key}.endDay`, code: "sponsorshipEndsBeforeStart" },
      ]),
    );
    expect(validateOrganizations("partners", updateOrganization(draft, key, { startDay: "" }))).toEqual(
      expect.arrayContaining([{ path: `items.${key}.startDay`, code: "missingRequiredField" }]),
    );
  });

  it("accepts an English-only or Arabic-only name", () => {
    let draft = addOrganization("partners", fromOrganizationRecords("partners", []));
    const key = draft.items[0].key;
    draft = updateOrganization(draft, key, { nameEn: "Elite Demo Co", type: "MOU", startDay: "2026-01-01" });
    expect(validateOrganizations("partners", draft)).toEqual([]);

    draft = updateOrganization(draft, key, { nameEn: "", nameAr: "شركة تجريبية" });
    expect(validateOrganizations("partners", draft)).toEqual([]);
  });

  it("refuses a name side longer than 150 characters", () => {
    let draft = addOrganization("memberships", fromOrganizationRecords("memberships", []));
    const key = draft.items[0].key;
    draft = updateOrganization(draft, key, { nameAr: "ا".repeat(151), type: "RegionalBody", startDay: "2026-01-01" });

    expect(validateOrganizations("memberships", draft)).toEqual([{ path: `items.${key}.nameAr`, code: "organizationNameTooLong", limit: 150 }]);
  });

  it("plans nothing when nothing changed", () => {
    const draft = fromOrganizationRecords("partners", [partner()]);
    expect(planOrganizations("partners", draft, draft)).toEqual([]);
    expect(isOrganizationsDirty(draft, draft)).toBe(false);
  });

  it("sends only the fields that changed, under the API's own names", () => {
    const saved = fromOrganizationRecords("partners", [partner()]);
    const draft = updateOrganization(saved, saved.items[0].key, { isVisible: false, nameEn: "" });

    expect(planOrganizations("partners", saved, draft)).toEqual([
      { kind: "update", key: saved.items[0].key, id: "6aa0850000000000000000c1", body: { partnerName: { ar: "أكاديمية ميريديان التجريبية", en: null }, isVisible: false } },
    ]);
  });

  it("creates new records with their place in the list, and stores days as Dubai instants", () => {
    let draft = addOrganization("memberships", fromOrganizationRecords("memberships", []));
    const key = draft.items[0].key;
    draft = updateOrganization(draft, key, { nameEn: "Demo Body", type: "ContinentalBody", startDay: "2026-09-01", endDay: "2027-08-31", logoId: "6aa0850000000000000000f2" });

    expect(planOrganizations("memberships", fromOrganizationRecords("memberships", []), draft)).toEqual([
      {
        kind: "create",
        key,
        body: {
          organizationName: { ar: null, en: "Demo Body" },
          organizationLogoId: "6aa0850000000000000000f2",
          membershipType: "ContinentalBody",
          startDate: "2026-08-31T20:00:00.000Z",
          endDate: "2027-08-31T19:59:59.000Z",
          status: "Active",
          displayOrder: 0,
          isVisible: false,
        },
      },
    ]);
  });

  it("deletes first, then writes the new order to every record whose place changed", () => {
    const saved = fromOrganizationRecords("partners", [
      partner({ _id: "6aa0850000000000000000a1", displayOrder: 0 }),
      partner({ _id: "6aa0850000000000000000a2", displayOrder: 1 }),
      partner({ _id: "6aa0850000000000000000a3", displayOrder: 2 }),
    ]);
    const [first, , third] = saved.items;
    let draft = removeOrganization(saved, first.key);
    draft = moveOrganization(draft, third.key, -1);

    const steps = planOrganizations("partners", saved, draft);

    expect(steps[0]).toEqual({ kind: "delete", key: first.key, id: "6aa0850000000000000000a1" });
    // The second record is now at index 1, where it already was: no write.
    expect(steps.slice(1)).toEqual([{ kind: "update", key: third.key, id: "6aa0850000000000000000a3", body: { displayOrder: 0 } }]);
  });

  it("gives each created record the id the API returned, as its key too", () => {
    const draft = addOrganization("partners", fromOrganizationRecords("partners", [partner()]));
    const created = draft.items[1];
    const adopted = adoptCreatedOrganizations(draft, { [created.key]: "6aa0850000000000000000c9" });
    expect(adopted.items[1]).toMatchObject({ key: "6aa0850000000000000000c9", id: "6aa0850000000000000000c9" });
    expect(adopted.items[0]).toBe(draft.items[0]);
  });
});
