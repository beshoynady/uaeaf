import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isMongoIdList } from "@/lib/admin/request-shapes";

/**
 * Replaces the roles assigned to a user.
 *
 * Two upstream behaviours the screen depends on: the API refuses when the
 * target is the caller themselves (403, "You cannot assign roles to
 * yourself."), and it does NOT check that the role ids exist — a well-formed
 * id for a role that was archived is stored silently and simply grants
 * nothing. The picker therefore only ever offers roles from the live list.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const { roleIds } = (body ?? {}) as Record<string, unknown>;
  if (!isMongoIdList(roleIds)) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return forwardWrite(`/users/${encodeURIComponent(id)}/roles`, {
    method: "PATCH",
    body: { roleIds },
  });
}
