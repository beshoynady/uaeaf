import { createHandler } from "@/lib/admin/sponsor-relations/relation-routes";

/** Creates one partnership record. Its fields are narrowed (`requests.ts`); the values are the API's to judge. */
export const POST = createHandler("partnerships");
