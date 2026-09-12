import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { editorialSavePath, findEditorialEntity } from "@/lib/admin/editorial-entities";

/**
 * Saves a draft.
 *
 * Separate from the action handler beside it because saving is not a
 * decision: it is a `PATCH` carrying content, where the actions are `POST`s
 * carrying at most a reason and a timestamp. Folding them together would put
 * an editor's whole document through a route whose other six callers send two
 * fields.
 *
 * The entity type is resolved against the registry for the same reason it is
 * there — it is what stops the URL from choosing the upstream module.
 *
 * The body is forwarded as sent. Upstream `forbidNonWhitelisted` refuses an
 * unknown key outright, which is the behaviour wanted: an editor screen that
 * quietly dropped a field it did not recognise would save less than the
 * person typed and report success.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> },
) {
  const { entityType, id } = await params;

  const entity = findEditorialEntity(entityType);
  if (!entity) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return forwardWrite(editorialSavePath(entity, id), { method: "PATCH", body });
}
