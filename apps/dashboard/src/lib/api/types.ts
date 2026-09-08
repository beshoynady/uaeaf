import type { PermissionGrant } from "../auth/permissions";

/**
 * The API response shapes this dashboard consumes.
 *
 * Hand-written rather than generated, deliberately and temporarily: the
 * generated-client decision recorded in the Phase 1 plan is still blocked on
 * the public snapshot DTOs (plan §1.2), and these four shapes are stable,
 * small, and covered by the API's own DTO tests. When the generator lands,
 * this file is the thing it replaces — it is written to be deleted.
 *
 * `users` comes from `UserResponseDto`, an explicit allowlist. `roles` and
 * `permissions` are still returned as raw Mongoose documents by their
 * controllers, which is why those two carry `_id` rather than `id`. That
 * asymmetry is the API's, not this file's, and is recorded as an open item
 * rather than papered over here.
 */
export interface LocalizedText {
  en: string;
  ar: string;
}

export interface UserResponse {
  id: string;
  name: LocalizedText;
  email: string;
  roleIds: string[];
  personId: string | null;
  /** Mirrors ACCOUNT_STATUSES in api/src/.../user.schema.ts. This read
   *  `Active | Inactive | Suspended` until 2026-09-08 — `Inactive` is a
   *  value the API has never produced, and `Deactivated`, which it does
   *  produce, was missing. A deactivated account therefore matched no
   *  status branch and rendered a missing translation key. */
  accountStatus: "Active" | "Suspended" | "Deactivated";
  lastLogin: string | null;
  photoId: string | null;
  preferredLanguage: "ar" | "en" | null;
  preferredTheme: "light" | "dark" | null;
}

/** `GET /users/me` only — the profile plus what the caller may actually do.
 *
 *  `permissions` is resolved by the API for that request (JwtStrategy ->
 *  RolesService.resolvePermissions). It lives on the response rather than in
 *  the access token because of the owner's 2026-09-07 decision, and it is
 *  the dashboard's only source of truth for which navigation entries and
 *  affordances to render. */
export interface MeResponse extends UserResponse {
  permissions: PermissionGrant[];
}

export interface RoleResponse {
  _id: string;
  name: LocalizedText;
  description: LocalizedText | null;
  permissionIds: string[];
  isSystemRole: boolean;
}

/** A federation person, as the account form needs them. `GET /federation-personnel`
 *  returns the whole document; only these three are read here. */
export interface FederationPersonResponse {
  _id: string;
  fullName: LocalizedText;
  status: string;
}

export interface PermissionResponse {
  _id: string;
  name: LocalizedText;
  resourceType: string;
  action: string;
}

/** Picks the field matching the reading locale. A record created before the
 *  second language was filled in can hold an empty string, so this falls
 *  back to the other language rather than rendering a blank cell — an
 *  administrator needs to see *something* identifying the row. */
export function localized(text: LocalizedText | null, locale: "ar" | "en"): string {
  if (!text) {
    return "";
  }
  return text[locale] || text[locale === "ar" ? "en" : "ar"] || "";
}
