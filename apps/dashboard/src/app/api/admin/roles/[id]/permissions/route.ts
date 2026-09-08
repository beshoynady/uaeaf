import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isMongoIdList } from "@/lib/admin/request-shapes";

/**
 * Replaces a role's permission set.
 *
 * Full replacement, not a delta — `UpdateRolePermissionsDto` takes the whole
 * list and `RolesService` writes it as-is. The editor therefore always sends
 * every id it wants the role to end up with.
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

  const { permissionIds } = (body ?? {}) as Record<string, unknown>;
  if (!isMongoIdList(permissionIds)) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return forwardWrite(`/roles/${encodeURIComponent(id)}/permissions`, {
    method: "PATCH",
    body: { permissionIds },
  });
}
