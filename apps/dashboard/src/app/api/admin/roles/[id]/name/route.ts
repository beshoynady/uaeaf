import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isLocalizedText } from "@/lib/admin/request-shapes";

/**
 * Renames a role and, when the body carries one, rewrites its description.
 *
 * The route keeps its `/name` path even though it now carries both: renaming
 * it would break every existing caller for a naming improvement. `description`
 * was creation-only until 2026-09-08, so a description written with a mistake
 * in it could be corrected only by deleting the role and rebuilding it.
 *
 * Omitting `description` leaves the stored one untouched. Sending `null`
 * clears it — the two are deliberately distinguishable.
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

  const { name, description } = (body ?? {}) as Record<string, unknown>;
  if (!isLocalizedText(name)) {
    return NextResponse.json({ code: "nameRequired" }, { status: 400 });
  }
  if (description !== undefined && description !== null && !isLocalizedText(description)) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return forwardWrite(`/roles/${encodeURIComponent(id)}/name`, {
    method: "PATCH",
    body: { name, ...(description === undefined ? {} : { description }) },
  });
}
