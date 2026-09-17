import { describe, expect, it } from "vitest";
import type { SaveStep } from "./homepage-hero";
import { runSave, type Send } from "./hero-save";

const SECTION = "64b000000000000000000001";
const STORED = "64b0000000000000000000a1";
const CREATED = "64b0000000000000000000c1";

/** A fake transport that records every call and answers from a script. */
const transport = (answers: Record<string, { status: number; body: unknown }> = {}) => {
  const calls: { method: string; url: string; body: unknown }[] = [];
  const send: Send = async (method, url, body) => {
    calls.push({ method, url, body });
    const answer = answers[`${method} ${url}`] ?? { status: 200, body: {} };
    return { ok: answer.status < 400, status: answer.status, body: answer.body };
  };
  return { calls, send };
};

const steps: SaveStep[] = [
  { kind: "delete", id: "64b0000000000000000000d1", key: "64b0000000000000000000d1" },
  { kind: "create", key: "new-1", body: { pageSectionId: SECTION, displayOrder: 1 } },
  { kind: "update", id: STORED, key: STORED, body: { title: { ar: "أ", en: "A" } } },
  { kind: "reorder", sectionId: SECTION, keys: ["new-1", STORED] },
  { kind: "section", sectionId: SECTION, body: { configuration: { playback: { autoplay: false, intervalMs: 5000 } } } },
];

describe("running a save", () => {
  it("sends each step to its route in order, and reorders with the id the create returned", async () => {
    const { calls, send } = transport({ "POST /api/admin/hero-slides": { status: 201, body: { _id: CREATED } } });
    const result = await runSave(steps, send);
    expect(result).toEqual({ ok: true, created: { "new-1": CREATED } });
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      "DELETE /api/admin/hero-slides/64b0000000000000000000d1",
      "POST /api/admin/hero-slides",
      `PATCH /api/admin/hero-slides/${STORED}`,
      "PATCH /api/admin/hero-slides/reorder",
      `PATCH /api/admin/page-sections/${SECTION}`,
    ]);
    expect(calls[3].body).toEqual({ pageSectionId: SECTION, slideIds: [CREATED, STORED] });
  });

  it("stops at the first refusal, places it beside its field, and says how many steps landed", async () => {
    const { calls, send } = transport({
      "POST /api/admin/hero-slides": { status: 201, body: { _id: CREATED } },
      [`PATCH /api/admin/hero-slides/${STORED}`]: { status: 400, body: { code: "heroTextTooLong", field: "title.en", limit: 44 } },
    });
    const result = await runSave(steps, send);
    expect(calls).toHaveLength(3);
    expect(result).toEqual({
      ok: false,
      completed: 2,
      code: "heroTextTooLong",
      errors: [{ path: `slides.${STORED}.title.en`, code: "heroTextTooLong", limit: 44 }],
      created: { "new-1": CREATED },
    });
  });

  it("reports a network failure as the service being unavailable, with nothing placed on a field", async () => {
    const send: Send = async () => {
      throw new Error("offline");
    };
    expect(await runSave(steps.slice(2), send)).toEqual({
      ok: false,
      completed: 0,
      code: "serviceUnavailable",
      errors: [],
      created: {},
    });
  });

  it("treats a create answered without an id as a failure, since the order could not name it", async () => {
    const { send } = transport({ "POST /api/admin/hero-slides": { status: 201, body: {} } });
    const result = await runSave(steps.slice(1), send);
    expect(result).toMatchObject({ ok: false, completed: 0, code: "serviceUnavailable" });
  });
});
