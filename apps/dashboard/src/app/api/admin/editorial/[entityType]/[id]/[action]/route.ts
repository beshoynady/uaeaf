import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import {
  editorialActionPath,
  findEditorialEntity,
  isEditorialAction,
} from "@/lib/admin/editorial-entities";

/**
 * One handler for every editorial decision on every workflow-governed type.
 *
 * Both URL segments are resolved against closed lists rather than pasted into
 * the upstream path, and that pair of lookups is the whole security boundary
 * of this handler. Without them `/api/admin/editorial/users/<id>/delete`
 * would forward a body to the users module, and the caller — not this
 * application — would be deciding which API endpoint their request reaches.
 *
 * The action list has no `delegate` on it. Delegation is disabled upstream
 * pending the workflow audit's unresolved questions, and a route that cannot
 * name the action cannot forward it however the URL is typed.
 *
 * The body is passed through untouched, unlike the singleton page editor's
 * handler which reshapes it. These actions carry at most two fields —
 * `expectedUpdatedAt`, `revisionId`, `reason` — and the API's own
 * `forbidNonWhitelisted` validation is the right place to refuse a third.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityType: string; id: string; action: string }> },
) {
  const { entityType, id, action } = await params;

  const entity = findEditorialEntity(entityType);
  if (!entity || !isEditorialAction(action)) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  // An empty body is legitimate here — `submit` and `approve` carry nothing —
  // so only malformed JSON is a refusal.
  let body: unknown = {};
  const raw = await request.text();
  if (raw.trim() !== "") {
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
    }
  }

  return forwardWrite(editorialActionPath(entity, action, id), { method: "POST", body });
}
