/**
 * Whether the rebuilt governance screens are the ones served.
 *
 * The board and committees pages already read live records through the API.
 * The rebuilt screens read a sample file instead, because the endpoints they
 * are shaped for do not exist yet, so switching them on unconditionally would
 * replace real names on a served page with placeholders. The switch keeps both
 * in the tree until the API lands.
 *
 * `NEXT_PUBLIC_`, so it is fixed into the build and a client component reads
 * the same value the server rendered with. The literal
 * `process.env.NEXT_PUBLIC_GOVERNANCE_V2` has to appear here for the bundler to
 * substitute it; a computed key is left untouched and always reads undefined.
 *
 * Only `"1"` switches it on. Unset, empty, `"true"`, `"0"` — all off, so a
 * half-written value fails towards the pages that work.
 */
export const governanceV2Enabled = (
  raw: string | undefined = process.env.NEXT_PUBLIC_GOVERNANCE_V2,
): boolean => raw === "1";
