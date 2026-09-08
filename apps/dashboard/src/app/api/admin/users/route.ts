import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { readCreateUserBody } from "@/lib/admin/create-user-body";

/**
 * Creates an account, with its roles and its optional personnel link, in one
 * upstream call.
 *
 * `POST /users` gained `roleIds` and `personId` on 2026-09-08 (owner
 * approval). Before that the account was created with no access and the roles
 * had to be assigned by a second request — so a failure between the two left
 * an account nobody meant to create in that state, and `personId` had no
 * writer anywhere in the platform at all.
 *
 * The body is validated here to name the field that failed; `readCreateUserBody`
 * carries the reasoning for each rule.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const parsed = readCreateUserBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ code: parsed.code }, { status: 400 });
  }

  const { name, email, password, roleIds, personId } = parsed.body;

  return forwardWrite("/users", {
    method: "POST",
    body: {
      name,
      email,
      password,
      // Both omitted rather than sent empty: `@IsOptional()` upstream skips
      // an absent field, while `null` would fail `@IsMongoId()` on a link
      // that simply was not made.
      ...(roleIds.length > 0 ? { roleIds } : {}),
      ...(personId ? { personId } : {}),
    },
  });
}
