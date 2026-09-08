import { forwardWrite } from "@/lib/api/admin-write";

/**
 * Archives a role.
 *
 * Soft delete: the API sets `archivedAt`/`archivedBy` and the role stops
 * granting immediately, because permission resolution filters archived rows.
 * It does NOT clear the id from `users.roleIds` (verified 2026-09-08 — no
 * code anywhere writes that field on deletion), so a user keeps a dangling
 * reference. That is why the screens count role usage against the roles the
 * API actually returned rather than against whatever ids a user carries.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forwardWrite(`/roles/${encodeURIComponent(id)}`, { method: "DELETE" });
}
