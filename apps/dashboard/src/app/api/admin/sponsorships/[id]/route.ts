import { deleteHandler, updateHandler } from "@/lib/admin/sponsor-relations/relation-routes";

/** Edits or deletes one sponsorship record. */
export const PATCH = updateHandler("sponsorships");
export const DELETE = deleteHandler("sponsorships");
