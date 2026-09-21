import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";

/**
 * Hiding a published article from the public feed, or returning it.
 *
 * Not one of the editorial actions, and deliberately not added to that closed
 * list: the list names decisions about whether content may go out, and this is
 * a decision about what the listing shows once it has. The article stays
 * published either way and keeps answering on its own address.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const { archived } = (body ?? {}) as { archived?: unknown };
  if (typeof archived !== "boolean") {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return forwardWrite(`/articles/${encodeURIComponent(id)}/archived`, {
    method: "PATCH",
    body: { archived },
  });
}
