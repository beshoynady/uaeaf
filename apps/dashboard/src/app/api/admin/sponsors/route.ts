import { createHandler } from "@/lib/admin/sponsor-relations/relation-routes";

/** Creates one sponsor record. Its fields are narrowed (`requests.ts`); the values are the API's to judge. */
export const POST = createHandler("sponsors");
