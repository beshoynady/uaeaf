import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";

/**
 * Suspends, deactivates or restores an account.
 *
 * `PATCH /users/:id/status` was added to the API on 2026-09-08. Before that
 * nothing wrote `accountStatus` at all and the screen said so; this route is
 * what replaced that note with a control.
 *
 * Moving away from Active also ends every live session for that account,
 * upstream — so the effect is immediate rather than waiting out whatever is
 * left of an already-issued access token.
 */
const STATUSES = new Set(["Active", "Suspended", "Deactivated"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const { accountStatus } = (body ?? {}) as Record<string, unknown>;
  if (typeof accountStatus !== "string" || !STATUSES.has(accountStatus)) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return forwardWrite(`/users/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { accountStatus },
  });
}
