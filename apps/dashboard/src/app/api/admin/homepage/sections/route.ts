import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { classifyWriteFailure } from "@/lib/api/admin-write";
import { callUpstream } from "@/lib/api/upstream";
import { readAccessToken } from "@/lib/auth/session-cookies";
import { isMongoId } from "@/lib/admin/request-shapes";
import { readJson } from "@/lib/admin/hero-requests";
import { isLocked } from "@/lib/admin/homepage/sections";

/**
 * The homepage list's two writes: hide a section, and move one.
 *
 * Separate from `/api/admin/page-sections/[id]`, which is how a section's own
 * editor saves its settings. That one requires `configuration` — it exists to
 * write a form. These two send neither a form nor a `configuration`, and
 * relaxing that guard so they could share a route would let a settings save
 * through with no settings in it.
 *
 * Both go to the same upstream `PATCH /page-sections/:id`. No API change was
 * needed: `UpdatePageSectionDto` already accepts `enabled` and `displayOrder`,
 * and `pageSections` is not in `WORKFLOW_ENTITY_TYPES`, so neither write has
 * an approval step to route through.
 */

interface OrderChange {
  id: string;
  displayOrder: number;
}

const readBody = (
  value: unknown,
): { kind: "enabled"; id: string; enabled: boolean } | { kind: "order"; orders: OrderChange[] } | null => {
  if (typeof value !== "object" || value === null) return null;
  const body = value as Record<string, unknown>;

  if (typeof body.enabled === "boolean" && isMongoId(body.id)) {
    return { kind: "enabled", id: body.id, enabled: body.enabled };
  }

  if (Array.isArray(body.orders) && body.orders.length > 0) {
    const orders: OrderChange[] = [];
    for (const entry of body.orders) {
      if (typeof entry !== "object" || entry === null) return null;
      const { id, displayOrder } = entry as Record<string, unknown>;
      if (!isMongoId(id) || !Number.isInteger(displayOrder) || (displayOrder as number) < 0) return null;
      orders.push({ id, displayOrder: displayOrder as number });
    }
    return { kind: "order", orders };
  }

  return null;
};

export const PATCH = async (request: Request) => {
  const parsed = readBody(await readJson(request));
  if (!parsed) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const store = await cookies();
  const accessToken = readAccessToken((name) => store.get(name)?.value);
  if (!accessToken) {
    return NextResponse.json({ code: "sessionExpired" }, { status: 401 });
  }

  try {
    if (parsed.kind === "enabled") {
      /**
       * The hero lock, enforced here and not only by not drawing a switch.
       *
       * A rule that lives in the markup is not a rule — it is an omission, and
       * the request that ignores it is one line of `fetch`. So the section's
       * real type is read from the API before the write, rather than taken
       * from a body the browser composed.
       */
      const section = await callUpstream<{ sectionType?: string }>(`/page-sections/${parsed.id}`, {
        accessToken,
      });
      if (section?.sectionType && isLocked(section.sectionType) && !parsed.enabled) {
        return NextResponse.json({ code: "sectionLocked" }, { status: 400 });
      }

      const updated = await callUpstream<unknown>(`/page-sections/${parsed.id}`, {
        method: "PATCH",
        body: { enabled: parsed.enabled },
        accessToken,
      });
      return NextResponse.json(updated ?? {});
    }

    /**
     * A reorder is several writes and the API has no batch route.
     *
     * Sequential, not `Promise.all`: two concurrent PATCHes on the same page's
     * sections can interleave, and a half-applied swap is a list whose order
     * nobody chose. On a failure the ones already written stay — the screen
     * re-reads from the server, so what it shows afterwards is what was
     * actually stored rather than what was attempted.
     */
    for (const order of parsed.orders) {
      await callUpstream(`/page-sections/${order.id}`, {
        method: "PATCH",
        body: { displayOrder: order.displayOrder },
        accessToken,
      });
    }
    return NextResponse.json({ moved: parsed.orders.length });
  } catch (error) {
    const { status, code } = classifyWriteFailure(error);
    return NextResponse.json({ code }, { status });
  }
};
