import { deleteHandler, updateHandler } from "@/lib/admin/sponsor-relations/relation-routes";

/** Edits or deletes one sponsor record. */
export const PATCH = updateHandler("sponsors");
export const DELETE = deleteHandler("sponsors");
