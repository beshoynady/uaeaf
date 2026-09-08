import { describe, expect, it } from "vitest";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import { WRITE_ERROR_CODES } from "./admin-write";

/**
 * Every failure an administration write can produce has copy, in both
 * languages, on every screen that can produce it.
 *
 * A missing key is not a cosmetic gap: next-intl renders the key itself, so
 * the person who just lost their work reads `status_sessionExpired` instead
 * of being told what happened. And it is silent — nothing fails until the
 * failure it describes actually occurs, which is exactly when nobody is
 * watching.
 *
 * The prefixes are the three write surfaces: role assignment and status
 * change on the users screen, permission save on the roles screen.
 */
const SURFACES = [
  // The shared set, used by every surface built from 2026-09-08 on. The two
  // prefixed sets below predate it and stay because their wording is
  // specific to what was not saved ("the roles", "the permissions"), which
  // is worth more than the deduplication.
  { namespace: "WriteErrors", prefix: "" },
  { namespace: "UsersDirectory", prefix: "assign_" },
  { namespace: "UsersDirectory", prefix: "status_" },
  { namespace: "RolesWorkbench", prefix: "save_" },
] as const;

const CATALOGUES = { ar, en } as Record<string, Record<string, Record<string, string>>>;

describe("write-failure copy", () => {
  for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
    for (const { namespace, prefix } of SURFACES) {
      it(`covers every write error code under ${namespace}.${prefix} in ${locale}`, () => {
        const missing = WRITE_ERROR_CODES.filter(
          (code) => typeof catalogue[namespace]?.[`${prefix}${code}`] !== "string",
        );
        expect(missing).toEqual([]);
      });
    }
  }

  it("keeps the two catalogues in step", () => {
    // A key added to one language and forgotten in the other renders as the
    // key itself for half the users.
    for (const { namespace } of SURFACES) {
      const inAr = Object.keys(ar[namespace as keyof typeof ar] ?? {});
      const inEn = Object.keys(en[namespace as keyof typeof en] ?? {});
      expect([...inAr].sort()).toEqual([...inEn].sort());
    }
  });
});
