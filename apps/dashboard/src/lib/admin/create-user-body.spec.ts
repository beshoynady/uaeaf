import { describe, expect, it } from "vitest";
import { readCreateUserBody } from "./create-user-body";

/**
 * The create-account form's body, checked before it is forwarded.
 *
 * Each rule here exists because of how the API rejects without it, and every
 * one of those rejections is worse than the check (all verified 2026-09-08):
 * a missing `name` reaches Mongoose rather than the ValidationPipe, a
 * malformed role id rejects the whole array with no indication which one, and
 * a short password comes back as a generic constraint list.
 *
 * The point is not to duplicate the API's validation. It is to name the field
 * that caused the failure, so the form can put the message beside it.
 */
const valid = {
  name: { ar: "سارة", en: "Sara" },
  email: "  Sara@UAEAF.ae ",
  password: "correct horse battery staple",
};

describe("readCreateUserBody", () => {
  it("accepts the minimum an account needs", () => {
    const result = readCreateUserBody(valid);

    expect(result).toEqual({
      ok: true,
      body: {
        name: { ar: "سارة", en: "Sara" },
        email: "sara@uaeaf.ae",
        password: "correct horse battery staple",
        roleIds: [],
        personId: null,
      },
    });
  });

  it("normalises the email the way the schema does", () => {
    // `lowercase` and `trim` on the schema mean "Admin@x.ae" and "admin@x.ae"
    // collide. Normalising here makes the form's own duplicate check agree
    // with the unique index rather than disagree with it.
    const result = readCreateUserBody({ ...valid, email: " NOOR@UAEAF.AE " });

    expect(result).toMatchObject({ ok: true, body: { email: "noor@uaeaf.ae" } });
  });

  it.each([
    [{ ...valid, name: undefined }, "nameRequired"],
    [{ ...valid, name: { ar: "سارة", en: "   " } }, "nameRequired"],
    [{ ...valid, email: "not-an-email" }, "invalidEmail"],
    [{ ...valid, email: "" }, "invalidEmail"],
    [{ ...valid, password: "short" }, "weakPassword"],
    [{ ...valid, roleIds: ["not-an-id"] }, "invalidRole"],
    [{ ...valid, roleIds: "abc" }, "invalidRole"],
    [{ ...valid, personId: "nope" }, "invalidPerson"],
    [null, "nameRequired"],
  ])("rejects %#  as %s", (body, code) => {
    expect(readCreateUserBody(body)).toEqual({ ok: false, code });
  });

  it("carries roles and a personnel link through when they are given", () => {
    const roleId = "a".repeat(24);
    const personId = "b".repeat(24);

    expect(readCreateUserBody({ ...valid, roleIds: [roleId], personId })).toMatchObject({
      ok: true,
      body: { roleIds: [roleId], personId },
    });
  });

  it("treats an empty personnel link as no link", () => {
    // The select's empty option submits "", which is not a valid id and is
    // also not an error — it is the field left alone.
    expect(readCreateUserBody({ ...valid, personId: "" })).toMatchObject({
      ok: true,
      body: { personId: null },
    });
  });
});
