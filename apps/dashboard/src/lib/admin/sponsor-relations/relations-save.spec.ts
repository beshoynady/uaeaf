import { describe, expect, it, vi } from "vitest";
import { organizationRequests, runRelationSave, sponsorRequests, stripRequests } from "./relations-save";
import { fromStripRecord } from "./strip-settings";
import type { OrganizationStep } from "./organizations";
import type { SponsorsStep } from "./sponsors";

/**
 * Running a planned save through the dashboard's route handlers (ADR-0084's
 * pattern): one step at a time, in order, stopping at the first refusal and
 * saying which records were created before it, so the screen re-reads what is
 * stored and keeps only what did not land as unsaved.
 */
describe("relations save", () => {
  const ok = (body: unknown) => ({ ok: true, status: 200, body });

  it("maps partner steps to the partnerships route handlers", () => {
    const steps: OrganizationStep[] = [
      { kind: "delete", key: "a", id: "6aa0850000000000000000a1" },
      { kind: "create", key: "new-1", body: { partnerName: { ar: null, en: "X" } } },
      { kind: "update", key: "b", id: "6aa0850000000000000000a2", body: { isVisible: true } },
    ];

    expect(organizationRequests("partners", steps).map((request) => [request.method, request.url])).toEqual([
      ["DELETE", "/api/admin/partnerships/6aa0850000000000000000a1"],
      ["POST", "/api/admin/partnerships"],
      ["PATCH", "/api/admin/partnerships/6aa0850000000000000000a2"],
    ]);
  });

  it("creates a sponsor, then its sponsorship naming the new id", async () => {
    const steps: SponsorsStep[] = [
      { kind: "create", entity: "sponsors", key: "sponsor-1", body: { name: { ar: null, en: "Demo" } } },
      { kind: "create", entity: "sponsorships", key: "ship-1", sponsorKey: "sponsor-1", body: { tier: "Official" } },
    ];
    const send = vi
      .fn()
      .mockResolvedValueOnce(ok({ _id: "6aa0850000000000000000a9" }))
      .mockResolvedValueOnce(ok({ _id: "6aa0850000000000000000b9" }));

    const result = await runRelationSave(sponsorRequests(steps), send);

    expect(send).toHaveBeenNthCalledWith(2, "POST", "/api/admin/sponsorships", { tier: "Official", sponsorId: "6aa0850000000000000000a9" });
    expect(result).toEqual({ ok: true, created: { "sponsor-1": "6aa0850000000000000000a9", "ship-1": "6aa0850000000000000000b9" } });
  });

  it("stops at a refusal, placing it beside the draft field the API named", async () => {
    const steps: SponsorsStep[] = [
      { kind: "update", entity: "sponsors", key: "s1", id: "6aa0850000000000000000a1", body: { website: "https://x.test" } },
      { kind: "update", entity: "sponsorships", key: "p1", id: "6aa0850000000000000000b1", body: { endDate: "2020-01-01T00:00:00.000Z" } },
      { kind: "update", entity: "sponsors", key: "s2", id: "6aa0850000000000000000a2", body: { website: null } },
    ];
    const send = vi
      .fn()
      .mockResolvedValueOnce(ok({ _id: "6aa0850000000000000000a1" }))
      .mockResolvedValueOnce({ ok: false, status: 400, body: { code: "sponsorshipEndsBeforeStart", field: "endDate" } });

    const result = await runRelationSave(sponsorRequests(steps), send);

    expect(send).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: false,
      completed: 1,
      code: "sponsorshipEndsBeforeStart",
      errors: [{ path: "sponsorships.p1.endDay", code: "sponsorshipEndsBeforeStart" }],
      created: {},
    });
  });

  it("maps an organisation name side the API names to its draft field", async () => {
    const steps: OrganizationStep[] = [{ kind: "create", key: "new-1", body: {} }];
    const send = vi.fn().mockResolvedValueOnce({ ok: false, status: 400, body: { code: "organizationNameTooLong", field: "organizationName.ar", limit: 150 } });

    const result = await runRelationSave(organizationRequests("memberships", steps), send);

    expect(result).toMatchObject({ ok: false, errors: [{ path: "items.new-1.nameAr", code: "organizationNameTooLong", limit: 150 }] });
  });

  it("reports an unreachable service rather than throwing", async () => {
    const steps: OrganizationStep[] = [{ kind: "delete", key: "a", id: "6aa0850000000000000000a1" }];
    const send = vi.fn().mockRejectedValueOnce(new Error("offline"));

    expect(await runRelationSave(organizationRequests("partners", steps), send)).toEqual({
      ok: false,
      completed: 0,
      code: "serviceUnavailable",
      errors: [],
      created: {},
    });
  });

  it("writes the section through its own guarded route", () => {
    const steps: SponsorsStep[] = [{ kind: "section", id: "6aa0850000000000000000e1", body: { configuration: { bannerSponsorshipId: null } } }];
    expect(sponsorRequests(steps)[0]).toMatchObject({ method: "PATCH", url: "/api/admin/sponsors-section/6aa0850000000000000000e1" });
  });

  it("writes the strip settings whole, in one request, only when they changed", () => {
    const saved = fromStripRecord(null);
    expect(stripRequests(saved, { ...saved })).toEqual([]);

    const draft = { ...saved, speed: "slow" as const };
    expect(stripRequests(saved, draft)).toEqual([
      { method: "PUT", url: "/api/admin/site-settings/sponsor-strip", body: { ...draft }, errorPrefix: "strip" },
    ]);
  });
});
