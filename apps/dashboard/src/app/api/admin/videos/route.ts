import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { classifyWriteFailure } from "@/lib/api/admin-write";
import { callUpstream } from "@/lib/api/upstream";
import { readAccessToken } from "@/lib/auth/session-cookies";
import { readJson } from "@/lib/admin/hero-requests";
import { readVideoBody } from "@/lib/admin/videos/requests";

/**
 * Adds one video, and publishes it if that is what the editor pressed.
 *
 * -- Why this is two upstream calls ----------------------------------------
 *
 * The API creates every video as a draft. `CreateVideoDto` carries neither
 * `status` nor `publishedAt`, and its ValidationPipe refuses a body that has
 * them — verified against a running API on 2026-09-23, which answered
 * `400 "property status should not exist"`. Publishing is a transition, and
 * the service stamps `publishedAt` on the draft-to-published move rather than
 * trusting a date the browser chose.
 *
 * So "نشر" is a create followed by a patch. Both happen here, on the server,
 * rather than as two fetches from the drawer: the second call is not the
 * browser's business, and a drawer that had to remember to make it is a
 * drawer that will one day publish nothing and report success.
 *
 * -- What happens if the patch fails ---------------------------------------
 *
 * The video exists, as a draft, and the editor is told the publish failed.
 * That is the honest outcome and the recoverable one: the row is in the list,
 * its status says مسودة, and publishing it again is one press. Deleting the
 * draft to make the failure atomic would throw away work the editor did.
 */
export const POST = async (request: Request) => {
  const parsed = readVideoBody(await readJson(request));
  if (!parsed.ok) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const store = await cookies();
  const accessToken = readAccessToken((name) => store.get(name)?.value);
  if (!accessToken) {
    return NextResponse.json({ code: "sessionExpired" }, { status: 401 });
  }

  let created: { id?: string; _id?: string } | null;
  try {
    created = await callUpstream<{ id?: string; _id?: string }>("/videos", {
      method: "POST",
      body: parsed.body.create,
      accessToken,
    });
  } catch (error) {
    const { status, code } = classifyWriteFailure(error);
    return NextResponse.json({ code }, { status });
  }

  const id = created?.id ?? created?._id;
  if (!parsed.body.publish || !id) {
    return NextResponse.json(created ?? {});
  }

  try {
    const published = await callUpstream<unknown>(`/videos/${id}`, {
      method: "PATCH",
      body: parsed.body.publish,
      accessToken,
    });
    return NextResponse.json(published ?? created);
  } catch (error) {
    // The draft is saved. Say what happened rather than reporting a clean
    // success over a video nobody can see.
    const { status, code } = classifyWriteFailure(error);
    return NextResponse.json({ code, savedAsDraft: true, id }, { status });
  }
};
