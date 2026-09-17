import { describe, expect, it } from "vitest";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import { EDITORIAL_ERROR_CODES, HERO_ERROR_CODES, SPONSOR_RELATION_ERROR_CODES, WRITE_ERROR_CODES } from "./admin-write";
import { PANEL_ACTIONS } from "@/lib/admin/editorial-state";
import { REVISION_STATE_KEYS } from "@/lib/admin/revisions";

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
  //
  // `codes` differs per surface because the editorial failures cannot reach
  // the three prefixed ones: a role assignment has no draft to go stale and
  // no publishing policy to be missing. Demanding copy for them there would
  // mean writing sentences for cases that cannot occur, which is how a
  // catalogue fills with text nobody ever reads or corrects.
  { namespace: "WriteErrors", prefix: "", codes: [...WRITE_ERROR_CODES, ...EDITORIAL_ERROR_CODES, ...HERO_ERROR_CODES, ...SPONSOR_RELATION_ERROR_CODES] },
  { namespace: "UsersDirectory", prefix: "assign_", codes: WRITE_ERROR_CODES },
  { namespace: "UsersDirectory", prefix: "status_", codes: WRITE_ERROR_CODES },
  { namespace: "RolesWorkbench", prefix: "save_", codes: WRITE_ERROR_CODES },
] as const;

/**
 * Keys the editorial panels BUILD at run time from a closed list, rather than
 * writing out.
 *
 * `t(`success${action}`)` and `REVISION_STATE_KEYS[state]` are string
 * concatenation, and two of them are cast (`as "successPublish"`) to satisfy
 * the type checker — so the compiler cannot see the key and neither can the
 * table above, which only knows about write-failure codes. Add a seventh
 * action or a fifth revision state and the panel renders its own key at the
 * reader.
 *
 * These live in the generic components, so a gap is a gap on all twelve
 * content pages at once, not on one.
 */
const GENERATED = [
  {
    namespace: "Editorial",
    keys: [
      ...PANEL_ACTIONS,
      ...PANEL_ACTIONS.map((action) => `success${action[0].toUpperCase()}${action.slice(1)}`),
    ],
  },
  { namespace: "Revisions", keys: Object.values(REVISION_STATE_KEYS) },
] as const;

// `unknown` at the leaf, not `string`: a namespace may group related keys in
// a nested object (`Toasts.tone.error`), and claiming every namespace is flat
// made adding one a type error in this file. What this test needs is only
// that the specific keys it names below are strings, which it checks itself.
const CATALOGUES = { ar, en } as Record<string, Record<string, Record<string, unknown>>>;

describe("write-failure copy", () => {
  for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
    for (const { namespace, prefix, codes } of SURFACES) {
      it(`covers every write error code under ${namespace}.${prefix} in ${locale}`, () => {
        const missing = (codes as readonly string[]).filter(
          (code) => typeof catalogue[namespace]?.[`${prefix}${code}`] !== "string",
        );
        expect(missing).toEqual([]);
      });
    }
  }

  for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
    for (const { namespace, keys } of GENERATED) {
      it(`covers every key ${namespace} builds at run time in ${locale}`, () => {
        const missing = (keys as readonly string[]).filter(
          (key) => typeof catalogue[namespace]?.[key] !== "string",
        );
        expect(missing).toEqual([]);
      });
    }
  }

  it("keeps the two catalogues in step", () => {
    // A key added to one language and forgotten in the other renders as the
    // key itself for half the users.
    for (const { namespace } of [...SURFACES, ...GENERATED]) {
      const inAr = Object.keys(ar[namespace as keyof typeof ar] ?? {});
      const inEn = Object.keys(en[namespace as keyof typeof en] ?? {});
      expect([...inAr].sort()).toEqual([...inEn].sort());
    }
  });
});
