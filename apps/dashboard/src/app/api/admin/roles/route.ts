import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { isLocalizedText, isMongoIdList } from "@/lib/admin/request-shapes";

/**
 * Creates a role.
 *
 * The body is checked here before it is forwarded, and that is load-bearing
 * rather than belt-and-braces: `CreateRoleDto.name` carries only
 * `@ValidateNested()`, and class-validator returns early on an undefined
 * nested value — so a request with no `name` passes the API's ValidationPipe
 * and fails in Mongoose instead, which, with no exception filter registered,
 * surfaces as a bare 500 (verified 2026-09-08). A 400 from here is the
 * difference between "you left the name empty" and "something went wrong".
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const { name, description, permissionIds } = (body ?? {}) as Record<string, unknown>;

  if (!isLocalizedText(name)) {
    return NextResponse.json({ code: "nameRequired" }, { status: 400 });
  }
  if (description !== undefined && description !== null && !isLocalizedText(description)) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  if (!isMongoIdList(permissionIds)) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return forwardWrite("/roles", {
    method: "POST",
    body: {
      name,
      // Omitted rather than sent as null: the DTO marks it `@IsOptional()`,
      // and `null` would fail `@ValidateNested` on a field that simply was
      // not filled in.
      ...(description ? { description } : {}),
      permissionIds,
    },
  });
}
