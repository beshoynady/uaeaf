import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callUpstream } from "@/lib/api/upstream";
import { classifyWriteFailure } from "@/lib/api/admin-write";
import { readAccessToken } from "@/lib/auth/session-cookies";

/**
 * Uploads one image on behalf of the signed-in editor.
 *
 * Separate from `forwardWrite` for one reason: every other administration
 * write carries JSON, and this carries a file. Sending it through a helper
 * that serializes its body would corrupt the upload; giving that helper a
 * second mode would put a multipart branch in the path of thirteen handlers
 * that will never take it.
 *
 * The upstream path is one of two constants, never assembled from the
 * request. The browser chooses what to upload, how to describe it and
 * whether it is an icon; it does not choose which API route its bytes are
 * forwarded to.
 *
 * Nothing is validated here. Type, size, dimensions and the required
 * bilingual alt text are all enforced by the API, and a second copy of those
 * rules in the dashboard would be a copy that drifts — the screen's job is
 * to show the refusal, not to predict it.
 */
export const POST = async (request: Request) => {
  const store = await cookies();
  const accessToken = readAccessToken((name) => store.get(name)?.value);
  if (!accessToken) {
    return NextResponse.json({ code: "sessionExpired" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  try {
    // An icon has a smaller floor at the API (`ICON_MIN_EDGE`); every other
    // value is a page image.
    const icon = new URL(request.url).searchParams.get("purpose") === "icon";
    const created = await callUpstream<unknown>(icon ? "/media-assets/upload?purpose=icon" : "/media-assets/upload", {
      method: "POST",
      form,
      accessToken,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const { status, code } = classifyWriteFailure(error);
    return NextResponse.json({ code }, { status });
  }
};
