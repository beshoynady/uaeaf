import { deleteHandler, updateHandler } from "@/lib/admin/sponsor-relations/relation-routes";

/** Edits or deletes one partnership record. */
export const PATCH = updateHandler("partnerships");
export const DELETE = deleteHandler("partnerships");
