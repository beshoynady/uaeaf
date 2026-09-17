import { refusalToErrors, type FieldError, type Refusal, type SaveStep } from "./homepage-hero";

/**
 * Runs a planned save (`planSave`) through the dashboard's route handlers, one
 * step at a time, in order.
 *
 * Saving is publishing (owner decision 2026-09-17), and the API has no
 * transaction across slides and settings, so a refusal part-way leaves the
 * earlier steps live. The result says how many landed and which slides were
 * created, so the screen can re-read what is now stored and keep only what did
 * not land as unsaved.
 */

export type Send = (
  method: "POST" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
) => Promise<{ ok: boolean; status: number; body: unknown }>;

export type SaveResult =
  | { ok: true; created: Record<string, string> }
  | {
      ok: false;
      /** Steps that landed before the refusal. */
      completed: number;
      code: string;
      /** The refusal placed beside its field; empty when it names none. */
      errors: FieldError[];
      /** Local key → id for the slides created before the refusal. */
      created: Record<string, string>;
    };

const SLIDES = "/api/admin/hero-slides";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRefusal = (body: unknown): Refusal => {
  if (!isRecord(body) || typeof body.code !== "string") return { code: "serviceUnavailable" };
  return {
    code: body.code,
    field: typeof body.field === "string" ? body.field : undefined,
    missing: Array.isArray(body.missing) ? body.missing.filter((name): name is string => typeof name === "string") : undefined,
    limit: typeof body.limit === "number" ? body.limit : undefined,
  };
};

const request = (step: SaveStep, created: Map<string, string>): [Parameters<Send>[0], string, unknown?] => {
  switch (step.kind) {
    case "delete":
      return ["DELETE", `${SLIDES}/${step.id}`];
    case "create":
      return ["POST", SLIDES, step.body];
    case "update":
      return ["PATCH", `${SLIDES}/${step.id}`, step.body];
    case "reorder":
      return ["PATCH", `${SLIDES}/reorder`, { pageSectionId: step.sectionId, slideIds: step.keys.map((key) => created.get(key) ?? key) }];
    case "section":
      return ["PATCH", `/api/admin/page-sections/${step.sectionId}`, step.body];
  }
};

export const runSave = async (steps: readonly SaveStep[], send: Send): Promise<SaveResult> => {
  const created = new Map<string, string>();
  const failed = (completed: number, step: SaveStep, refusal: Refusal): SaveResult => ({
    ok: false,
    completed,
    code: refusal.code,
    errors: refusalToErrors(step, refusal).map((error) => {
      const { limit, ...rest } = error;
      return typeof limit === "number" ? { ...rest, limit } : rest;
    }),
    created: Object.fromEntries(created),
  });

  for (const [index, step] of steps.entries()) {
    try {
      const [method, url, body] = request(step, created);
      const response = await send(method, url, body);
      if (!response.ok) return failed(index, step, asRefusal(response.body));
      if (step.kind === "create") {
        const id = isRecord(response.body) && typeof response.body._id === "string" ? response.body._id : null;
        // Without the new id the order step could not name the slide.
        if (!id) return failed(index, step, { code: "serviceUnavailable" });
        created.set(step.key, id);
      }
    } catch {
      return failed(index, step, { code: "serviceUnavailable" });
    }
  }
  return { ok: true, created: Object.fromEntries(created) };
};

/** The browser's transport: JSON in and out, the body read even on a refusal. */
export const fetchSend: Send = async (method, url, body) => {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed: unknown = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body: parsed };
};
