import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callUpstream } from "@/lib/api/upstream";
import {
  clearSessionTokens,
  readAccessToken,
  readRefreshToken,
} from "@/lib/auth/session-cookies";

/**
 * Ends the session in both places it exists: the `authSessions` row upstream
 * and the cookies here.
 *
 * The upstream call is best-effort, but the cookie clearing is not. If the
 * API is unreachable, refusing to clear the cookies would leave the user
 * staring at a dashboard they cannot log out of; clearing them without the
 * API call leaves a refresh token alive until its natural 7-day expiry,
 * which is the lesser problem and is exactly what `logout-all` exists to
 * clean up. The user-visible promise — "I am signed out on this machine" —
 * is kept either way.
 */
export async function POST() {
  const cookieStore = await cookies();
  const read = (name: string) => cookieStore.get(name)?.value;
  const refreshToken = readRefreshToken(read);
  const accessToken = readAccessToken(read);

  if (refreshToken && accessToken) {
    try {
      await callUpstream("/auth/logout", {
        method: "POST",
        body: { refreshToken },
        accessToken,
      });
    } catch {
      // Deliberately ignored — see the note above.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionTokens(response.cookies);
  return response;
}
