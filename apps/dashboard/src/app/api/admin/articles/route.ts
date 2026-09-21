import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";

/**
 * Creating an article.
 *
 * A route of its own rather than a case in the generic editorial handler,
 * because creation is the one editorial act with no record to address yet:
 * every path that handler builds ends in an id. Everything after this — save,
 * submit, publish, approve — goes through the generic handler as usual.
 *
 * The body passes through untouched. `CreateArticleDto` upstream refuses an
 * unknown property, an address that is not a clean segment, and a body that
 * breaks the rich-text allowlist, and those refusals are better made in one
 * place than approximated in two.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  return forwardWrite("/articles", { method: "POST", body });
}
