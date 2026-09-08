import type { LocalizedText } from "@/lib/api/types";
import { isLocalizedText, isMongoId } from "./request-shapes";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-strength";

/** What `POST /api/admin/users` forwards upstream, once it is known good. */
export interface CreateUserBody {
  name: LocalizedText;
  email: string;
  password: string;
  /** Empty means an account with no access — legitimate, and the form says
   *  so rather than treating it as an omission. */
  roleIds: string[];
  /** The federationPersonnel record this account belongs to, or null. */
  personId: string | null;
}

export type CreateUserResult =
  | { ok: true; body: CreateUserBody }
  | { ok: false; code: "nameRequired" | "invalidEmail" | "weakPassword" | "invalidRole" | "invalidPerson" };

/**
 * Reads and normalises the create-account body.
 *
 * Not a second validation layer for its own sake — it exists to name the
 * field that failed. The API rejects each of these in a way the form cannot
 * usefully relay: a missing `name` never reaches the ValidationPipe at all
 * (class-validator's nested executor returns early on `undefined`), a single
 * malformed role id rejects the whole array without saying which, and a short
 * password returns a generic constraint list.
 *
 * Email is lowercased and trimmed here because the schema does the same on
 * write. Without it the form's idea of "this address" and the unique index's
 * idea of it differ, and a duplicate is discovered only by the 409.
 */
export function readCreateUserBody(value: unknown): CreateUserResult {
  const { name, email, password, roleIds, personId } = (value ?? {}) as Record<string, unknown>;

  if (!isLocalizedText(name)) {
    return { ok: false, code: "nameRequired" };
  }
  if (typeof email !== "string" || !isEmailish(email)) {
    return { ok: false, code: "invalidEmail" };
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, code: "weakPassword" };
  }

  const roles = roleIds === undefined ? [] : roleIds;
  if (!Array.isArray(roles) || !roles.every(isMongoId)) {
    return { ok: false, code: "invalidRole" };
  }

  // "" is the select's empty option, which means "no link" rather than a
  // malformed one.
  const person = typeof personId === "string" && personId.length > 0 ? personId : null;
  if (person !== null && !isMongoId(person)) {
    return { ok: false, code: "invalidPerson" };
  }

  return {
    ok: true,
    body: {
      name: { ar: name.ar.trim(), en: name.en.trim() },
      email: email.trim().toLowerCase(),
      password,
      roleIds: roles,
      personId: person,
    },
  };
}

/** Deliberately loose. `@IsEmail()` upstream is the authority; this only has
 *  to be sure enough to say "that is not an email address" beside the field
 *  instead of forwarding a request that cannot succeed. */
function isEmailish(value: string): boolean {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
