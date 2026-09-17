import { deleteHandler, updateHandler } from "@/lib/admin/sponsor-relations/relation-routes";

/** Edits or deletes one membership record. */
export const PATCH = updateHandler("memberships");
export const DELETE = deleteHandler("memberships");
