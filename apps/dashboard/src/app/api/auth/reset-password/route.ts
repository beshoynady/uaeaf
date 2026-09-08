import { NextResponse } from "next/server";
import { submitPasswordReset, translateResetSubmitFailure } from "@/lib/auth/password-reset";
import { clearSessionTokens } from "@/lib/auth/session-cookies";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-strength";

/**
 * Completes password recovery.
 *
 * On success the session cookies are cleared before the response leaves.
 * The API is expected to revoke every session for that user as part of the
 * reset; if this browser held one, keeping its cookies would leave the user
 * on a dashboard whose next request 401s for reasons it cannot explain.
 * Signing in again with the new password is the honest end of this flow.
 *
 * ⚠ `POST /auth/reset-password` does not exist on the API yet — see
 * lib/auth/password-reset.ts for the contract this expects.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidToken", retryAfterSeconds: null }, { status: 400 });
  }

  const { token, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof token !== "string" || token.length === 0) {
    return NextResponse.json({ code: "invalidToken", retryAfterSeconds: null }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    // Checked here as well as in the form: the form's rule is a courtesy to
    // the person typing, not a boundary, and this handler is reachable
    // without it.
    return NextResponse.json({ code: "weakPassword", retryAfterSeconds: null }, { status: 400 });
  }

  try {
    await submitPasswordReset(token, password);
    const response = new NextResponse(null, { status: 204 });
    clearSessionTokens(response.cookies);
    return response;
  } catch (error) {
    const { status, code, retryAfterSeconds } = translateResetSubmitFailure(error);
    return NextResponse.json({ code, retryAfterSeconds }, { status });
  }
}
