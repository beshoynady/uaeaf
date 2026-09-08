import { callUpstream } from "../api/upstream";

/** A refreshed token pair, or `null` when the refresh token is spent —
 *  revoked, already rotated (reuse detection), or simply expired. The
 *  caller's only correct response to `null` is to clear the session
 *  cookies: keeping a cookie the API will never honour again turns every
 *  subsequent page load into a failed refresh. */
export async function refreshSession(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    return await callUpstream<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  } catch {
    return null;
  }
}
