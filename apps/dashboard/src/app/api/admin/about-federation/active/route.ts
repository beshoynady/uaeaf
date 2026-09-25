import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { findEditorialEntity } from "@/lib/admin/editorial-entities";

const ENTITY_TYPE = "aboutFederationPage";

/**
 * Switches the About page on or off for visitors.
 *
 * A route of its own rather than an editorial action, because it is not one:
 * the editorial route handler forwards saves and review decisions, and this is
 * neither. It does not touch the draft, does not open or close a review, and
 * takes effect the moment it lands. Upstream it is gated on `Publish`, not
 * `Update` — deciding what the public sees is a publishing decision.
 *
 * The body is rebuilt here from one boolean rather than forwarded as sent.
 * Upstream refuses the whole request over a single unexpected key
 * (`forbidNonWhitelisted`), and more to the point, a handler that passes a
 * caller's object through is a handler whose contract is whatever the caller
 * types.
 */
export async function PATCH(request: Request) {
  const entity = findEditorialEntity(ENTITY_TYPE);
  if (!entity) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const { id, isActive } = (body ?? {}) as { id?: unknown; isActive?: unknown };

  if (typeof id !== "string" || id.length === 0 || typeof isActive !== "boolean") {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return forwardWrite(`${entity.apiPath}/${encodeURIComponent(id)}/active`, {
    method: "PATCH",
    body: { isActive },
  });
}
