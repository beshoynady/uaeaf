import { createHandler } from "@/lib/admin/sponsor-relations/relation-routes";

/** Creates one sponsorship record. Its fields are narrowed (`requests.ts`); the values are the API's to judge. */
export const POST = createHandler("sponsorships");
