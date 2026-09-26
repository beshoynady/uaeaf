import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { findActivatablePage } from "@/lib/admin/activatable-pages";

/**
 * Switches one page on or off for visitors.
 *
 * A route of its own rather than an editorial action, because it is not one: the
 * editorial handler forwards saves and review decisions, and this touches no
 * draft, opens and closes no review, and takes effect the moment it lands.
 * Upstream it is gated on `Publish`, not `Update` — deciding what the public sees
 * is a publishing decision (ADR-0102 §D2).
 *
 * One handler for all sixteen pages, resolved through `ACTIVATABLE_PAGES`. That
 * registry is the security boundary: without a closed list, the entity segment
 * in the URL would let a caller choose which upstream endpoint their body
 * reaches.
 *
 * The body is rebuilt here from one boolean rather than forwarded as sent.
 * Upstream refuses the whole request over a single unexpected key
 * (`forbidNonWhitelisted`), and more to the point, a handler that passes a
 * caller's object through is a handler whose contract is whatever the caller
 * types.
 */
export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) => {
  const page = findActivatablePage((await params).entity);
  if (!page) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const { recordId, isActive } = (body ?? {}) as { recordId?: unknown; isActive?: unknown };
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  // A singleton page has one row and the route takes no id. Forwarding one would
  // reach a path that does not exist, so a caller that sends one is refused here
  // rather than upstream: the two shapes are this registry's business.
  if (page.shape === "singleton") {
    if (recordId !== undefined) {
      return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
    }
    return forwardWrite(`${page.apiPath}/active`, { method: "PATCH", body: { isActive } });
  }

  if (typeof recordId !== "string" || recordId.length === 0) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite(`${page.apiPath}/${encodeURIComponent(recordId)}/active`, {
    method: "PATCH",
    body: { isActive },
  });
};
