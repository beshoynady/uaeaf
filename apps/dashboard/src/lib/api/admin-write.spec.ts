import { describe, expect, it } from "vitest";
import { UpstreamError } from "./upstream";
import { MissingRecordError, classifyWriteFailure } from "./admin-write";

describe("classifyWriteFailure", () => {
  it("separates the four distinct 403s by the code the API sends", () => {
    // One status, four causes, four remedies. Collapsing them would leave the
    // administrator with a refusal and no next step.
    const cases: Array<[string, string]> = [
      ["systemRole", "systemRole"],
      ["ungrantablePermission", "ungrantablePermission"],
      ["selfAssignment", "selfAssignment"],
      ["forbidden", "forbidden"],
    ];

    for (const [apiCode, code] of cases) {
      expect(classifyWriteFailure(new UpstreamError(403, { code: apiCode }))).toEqual({
        status: 403,
        code,
      });
    }
  });

  it("is unaffected by the wording of the message", () => {
    // The whole point of the change on 2026-09-08: copy is not a contract.
    // Reword the sentence, keep the code, keep the behaviour.
    expect(
      classifyWriteFailure(
        new UpstreamError(403, { code: "systemRole", message: "Totally different wording." }),
      ),
    ).toEqual({ status: 403, code: "systemRole" });
  });

  it("classifies a refused self status-change as a self-edit, not a missing permission", () => {
    // The case that proved message-matching was the wrong contract. The
    // refusal added with PATCH /users/:id/status shares no fragment with the
    // self role-assignment refusal, so the old classifier reported it as
    // "you lack permission" — which it is not, and no permission would fix.
    expect(
      classifyWriteFailure(
        new UpstreamError(403, {
          code: "selfAssignment",
          message: "You cannot change the status of your own account.",
        }),
      ),
    ).toEqual({ status: 403, code: "selfAssignment" });
  });

  it("degrades to the generic refusal when no code arrives", () => {
    // Less information, never wrong information — an older API build, or a
    // proxy that replaced the body.
    expect(classifyWriteFailure(new UpstreamError(403, { message: "Nope." }))).toEqual({
      status: 403,
      code: "forbidden",
    });
    expect(classifyWriteFailure(new UpstreamError(403, {}))).toEqual({
      status: 403,
      code: "forbidden",
    });
  });

  it("ignores a code it does not recognise", () => {
    // A code added to the API before this app learned to handle it must fall
    // back to the status, not reach the screen as a missing translation key.
    expect(classifyWriteFailure(new UpstreamError(409, { code: "emailTaken" }))).toEqual({
      status: 409,
      code: "conflict",
    });
  });

  it("turns an empty 200 into a not-found rather than a false success", () => {
    // PATCH /roles/:id/name and three sibling routes answer 200 with no body
    // when the id does not resolve. Reporting that as success would tell the
    // user a change landed on a record that does not exist.
    expect(classifyWriteFailure(new MissingRecordError("/roles/x/name"))).toEqual({
      status: 404,
      code: "notFound",
    });
  });

  it("passes the API's own conflict through, rather than inferring one", () => {
    // A taken email arrived as a bare 500 until 2026-09-08 and had to be
    // guessed at. UsersService.create now answers 409 itself, with the
    // global exception filter as the net behind it.
    expect(classifyWriteFailure(new UpstreamError(409, {}))).toEqual({
      status: 409,
      code: "conflict",
    });
  });

  it("reports an unexpected 500 as an availability problem, not as a conflict", () => {
    // The old mapping read every 500 as a duplicate key. Now that the API
    // classifies its own failures, a 500 means something genuinely broke and
    // telling the user their email is taken would be a lie.
    expect(classifyWriteFailure(new UpstreamError(500, {}))).toEqual({
      status: 502,
      code: "serviceUnavailable",
    });
  });

  it.each([
    [400, 400, "invalidRequest"],
    [404, 404, "notFound"],
    [429, 429, "tooManyRequests"],
    [418, 502, "serviceUnavailable"],
  ])("maps upstream %i to %i", (upstream, status, code) => {
    expect(classifyWriteFailure(new UpstreamError(upstream, {}))).toEqual({ status, code });
  });

  it("names an expired session, rather than blaming the server", () => {
    // A 401 on an authenticated write means the access token was rejected —
    // the person's session ended while the form was open. Reporting that as
    // "could not reach the server" sends them to check their connection for
    // a problem that is fixed by signing in again.
    expect(classifyWriteFailure(new UpstreamError(401, { code: "unauthorized" }))).toEqual({
      status: 401,
      code: "sessionExpired",
    });
  });

  it("treats any 401 as an expired session, code or no code", () => {
    // The status alone is conclusive here: nothing else answers 401 to a
    // request that carried a bearer token.
    expect(classifyWriteFailure(new UpstreamError(401, {}))).toEqual({
      status: 401,
      code: "sessionExpired",
    });
  });

  it("reports a transport failure as an availability problem", () => {
    expect(classifyWriteFailure(new Error("ECONNREFUSED"))).toEqual({
      status: 502,
      code: "serviceUnavailable",
    });
  });
});
