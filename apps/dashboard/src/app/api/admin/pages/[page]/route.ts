import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { findStaticPage, readPageBody } from "@/lib/admin/static-pages";

/**
 * Saves one singleton content page.
 *
 * The URL segment is looked up in the registry rather than pasted into the
 * upstream path. That lookup is the security boundary of this handler: with
 * it, `/api/admin/pages/news` can only ever reach `PUT /news-page`; without
 * it, the caller would be choosing which upstream route their body is
 * forwarded to.
 *
 * `readPageBody` then drops anything the page does not declare, because
 * `forbidNonWhitelisted` upstream rejects the whole request over a single
 * stray key — which would fail the save with nothing on screen to explain
 * it.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page: key } = await params;
  const page = findStaticPage(key);
  if (!page) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const parsed = readPageBody(page, body);
  if (!parsed.ok) {
    return NextResponse.json({ code: parsed.code }, { status: 400 });
  }

  return forwardWrite(page.apiPath, { method: "PUT", body: parsed.body });
}
