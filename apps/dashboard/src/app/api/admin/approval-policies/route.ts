import { NextResponse } from "next/server";
import { forwardRead } from "@/lib/api/admin-write";

/**
 * The governable entity types and each one's current arrangement.
 *
 * A read with no parameters, so there is no path segment for a caller to
 * choose and nothing to resolve against a registry — unlike the editorial
 * handlers beside it, where the URL names a record. The upstream route is
 * guarded by `workflowPolicies:Read`, which is the only gate this needs.
 */
export async function GET() {
  return forwardRead("/workflow-policies/governable");
}

/**
 * Turns approvals on or off for one entity type.
 *
 * The type is in the BODY rather than the path, deliberately. Upstream it is a
 * path segment, and putting it in this handler's path too would mean writing
 * `/api/admin/approval-policies/${entityType}/…` from the browser — one more
 * place a caller chooses which upstream record their body reaches. Read from
 * the body, it passes through the same `forwardWrite` pipe as everything else
 * and the API's own closed-list check is what refuses an unknown type.
 */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const { entityType, ...choice } = (body ?? {}) as { entityType?: unknown };

  if (typeof entityType !== "string" || entityType.length === 0) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  // Encoded, because it becomes a path segment upstream. The API refuses any
  // type outside its own two closed lists, so this only has to make sure the
  // string cannot escape the segment it belongs in.
  const { forwardWrite } = await import("@/lib/api/admin-write");
  return forwardWrite(`/workflow-policies/${encodeURIComponent(entityType)}/approval`, {
    method: "PUT",
    body: choice,
  });
}
