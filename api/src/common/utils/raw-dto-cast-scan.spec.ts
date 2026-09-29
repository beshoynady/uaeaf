import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Fix round 2 (Task 6, Batch 2). Measured against this project's pinned
 * `mongoose`: `new Types.ObjectId(null)` and `new Types.ObjectId(undefined)`
 * do not throw and do not answer anything null-like — each mints a brand
 * new, unrelated, valid-looking random id. `new Date(null)` silently answers
 * the Unix epoch. A service that wrote
 * `if (dto.x !== undefined) update.x = new Types.ObjectId(dto.x)` therefore
 * took the ordinary "clear the field" request `{ x: null }` and pointed the
 * record at an id that has never existed — silently, with nothing in the
 * response to reveal it (`disciplines.service.ts`'s `coverImage`, found live
 * in review). `setObjectIdField`/`setDateField`/`setObjectIdArrayField`
 * (`partial-update.util.ts`) are the fix: the one place left allowed to
 * construct one of these from a DTO value, because they read the value
 * BEFORE casting and refuse or clear a `null` per the field's own schema
 * nullability instead of coercing it.
 *
 * Fix round 3 (two holes the re-review found in this guard itself):
 *
 * **Hole 1 — the rule used to key on the literal substring `dto.` inside the
 * cast's arguments.** Renaming the parameter (`payload.coverImage`) or
 * destructuring it (`const { coverImage } = dto`) ships the identical
 * defect invisibly, because neither mentions `dto.` at all. Inverted: the
 * rule is no longer "does the argument mention `dto`", it is "does a raw
 * `new Types.ObjectId(`/`new Date(` appear in this `update()` body at all".
 * Inside the guarded files' `update()` methods the answer is `no, ever` —
 * the setters are the only sanctioned route, which is exactly why Fix
 * round 2 migrated the already-safe ternaries too. That makes the
 * parameter's name and whether the value was destructured irrelevant, and
 * removes the one thing an author could accidentally step around.
 * (`Types.ObjectId(x)` without `new` was checked and ruled out: it throws
 * `TypeError` on this project's pinned mongoose, so it is not a live
 * escape and has no case here.)
 *
 * **Hole 2 — the guard's protection was coupled to a hand-maintained file
 * list**, so the identical defect in the next resource's `update()` stayed
 * invisible until someone remembered to add the file — structurally the
 * same "wrote the guard, forgot to register it" failure
 * `docs/engineering/guard-tests.md` already records happening twice, one
 * level down. Closed with a META-CHECK rather than by widening the scan
 * (deliberately NOT "scan every `update()` body in the codebase": a text
 * scanner cannot tell a safe ternary from an unsafe bare cast without
 * control-flow analysis, and several other, still-unmigrated `update()`
 * methods use that safe ternary — scanning them would false-positive on
 * already-correct code, exactly what this repo has been burned by twice).
 * The meta-check instead asserts that EVERY `*.service.ts` under
 * `api/src/modules` declaring an `update(` method is named in
 * `UPDATE_METHODS_USING_SHARED_SETTERS` or in
 * `UPDATE_METHODS_NOT_USING_SHARED_SETTERS` (below, each with a reason —
 * the same shape this repo already uses for `@SkipAuditLog()` routes and
 * `WRITES_ITS_OWN_ROW`), checked in both directions: an unlisted file fails
 * the guard, and so does a listed file that no longer declares `update(`
 * at all (a stale exclusion). A service added later therefore cannot be
 * silently outside this guard: it fails until someone decides where it
 * goes.
 *
 * Fix round 4 — the exclusion list is not a filing cabinet. Building it
 * honestly in round 3 meant actually reading each of the 13 files rather
 * than assuming them safe, and that surfaced four more live instances of
 * the exact defect class this file exists to close:
 * `pageSections.service.ts` (`items`) and the identical `startDate` bug
 * independently written in `sponsorships.service.ts`,
 * `memberships.service.ts` and `partnerships.service.ts`. The owner ruled
 * that filing them was not good enough — they are live endpoints, the
 * setters they need already exist, and the fix is the one already applied
 * 24 times over — so all four are migrated here, in this round, and moved
 * OUT of `UPDATE_METHODS_NOT_USING_SHARED_SETTERS` into
 * `UPDATE_METHODS_USING_SHARED_SETTERS`. The list two rounds ago held 13;
 * it holds 9 now. A shrinking exclusion list is the only kind worth having.
 *
 * Both lists were renamed in this round, too: a list named after the batch
 * task that first wrote it (`TASK_6_UPDATE_METHODS`) means nothing to
 * whoever reads it next quarter, and "pre-existing" stops being true the
 * moment someone adds a new, deliberately-unmigrated entry. Named instead
 * for what each one actually contains.
 *
 * `rawUpdateCasts`/`extractMethodBody`/`serviceFilesUnder` are exported so
 * that migrating the remaining 9 can reuse them rather than re-deriving
 * the scan.
 */
const UPDATE_METHODS_USING_SHARED_SETTERS = [
  // The 27 resources Task 6 (Batch 2) added `update()` to.
  'modules/athletics/age-categories/age-categories.service.ts',
  'modules/people-organizations/athlete-coach-history/athlete-coach-history.service.ts',
  'modules/people-organizations/athlete-guardian-relationships/athlete-guardian-relationships.service.ts',
  'modules/people-organizations/athlete-national-team-history/athlete-national-team-history.service.ts',
  'modules/people-organizations/athlete-profiles/athlete-profiles.service.ts',
  'modules/people-organizations/athletes/athletes.service.ts',
  'modules/people-organizations/club-teams/club-teams.service.ts',
  'modules/people-organizations/clubs/clubs.service.ts',
  'modules/people-organizations/coaches/coaches.service.ts',
  'modules/federation-governance/committees/committees.service.ts',
  'modules/people-organizations/countries/countries.service.ts',
  'modules/athletics/disciplines/disciplines.service.ts',
  'modules/documents/documents/documents.service.ts',
  'modules/federation-governance/election-cycles/election-cycles.service.ts',
  'modules/federation-governance/federation/federation.service.ts',
  'modules/federation-governance/federation-appointments/federation-appointments.service.ts',
  'modules/federation-governance/federation-personnel/federation-personnel.service.ts',
  'modules/federation-governance/governance-documents/governance-documents.service.ts',
  'modules/media-center/media-assets/media-assets.service.ts',
  'modules/cms-page-composition/navigation-menus/navigation-menus.service.ts',
  'modules/people-organizations/official-assignments/official-assignments.service.ts',
  'modules/people-organizations/official-profiles/official-profiles.service.ts',
  'modules/people-organizations/officials/officials.service.ts',
  'modules/cms-page-composition/pages/pages.service.ts',
  'modules/people-organizations/venues/venues.service.ts',
  'modules/workflow/workflow-definitions/workflow-definitions.service.ts',
  'modules/workflow/workflow-steps/workflow-steps.service.ts',
  // The 4 pre-existing resources migrated in Fix round 4, after the round 3
  // exclusion list's own spot-check found them carrying the same defect
  // live (see the file header): each moved here from
  // `UPDATE_METHODS_NOT_USING_SHARED_SETTERS` in the same change that fixed it.
  'modules/cms-page-composition/page-sections/page-sections.service.ts',
  'modules/sponsorship-relations/sponsorships/sponsorships.service.ts',
  'modules/sponsorship-relations/memberships/memberships.service.ts',
  'modules/sponsorship-relations/partnerships/partnerships.service.ts',
  // A Task 7+ resource, migrated to the shared setters on arrival rather
  // than added to the exclusion list below.
  'modules/media-center/seasons/seasons.service.ts',
] as const;

/**
 * Every OTHER `*.service.ts` under `api/src/modules` that declares an
 * `update(` method, named with the reason it is not (yet) held to this
 * guard's zero-raw-cast rule. Re-read in Fix round 4 after four entries
 * were migrated out (see the file header) — each remaining reason below is
 * re-verified true as of this round, not left over from round 3.
 */
const UPDATE_METHODS_NOT_USING_SHARED_SETTERS: readonly { file: string; reason: string }[] = [
  {
    file: 'modules/cms-page-composition/hero-slides/hero-slides.service.ts',
    reason:
      'Every manual cast is ternary-guarded (`dto.x ? new Types.ObjectId(dto.x) : null`), verified by reading the full method. Migrating this and the other entries below to the shared setters is a separate, future task.',
  },
  {
    file: 'modules/sponsorship-relations/sponsors/sponsors.service.ts',
    reason:
      "logoId's only manual cast is preceded by `assertLogoPresent(dto.logoId)`, which throws `BadRequestException` on a falsy value (including `null`) before the cast runs — verified by reading the method. Correctly guarded, just not via the shared setter.",
  },
  {
    file: 'modules/media-center/albums/albums.service.ts',
    reason:
      "eventDate is handled as `dto.eventDate === null ? null : dto.eventDate ? new Date(dto.eventDate) : undefined` — an explicit, correct null-check ahead of the cast, verified by reading the method. Correctly guarded, just not via the shared setter.",
  },
  {
    file: 'modules/media-center/live-streams/live-streams.service.ts',
    reason:
      'No manual `Types.ObjectId`/`Date` construction anywhere in `update()` — verified by reading the method; every write is a plain field or relies on `repository.updateById`\'s own Mongoose casting.',
  },
  {
    file: 'modules/media-center/videos/videos.service.ts',
    reason:
      "thumbnailId's cast is ternary-guarded. One unconditional zero-argument `new Date()` also appears (stamping `publishedAt` on a status transition, not derived from any DTO value, so not this defect's shape) — verified by reading the method.",
  },
  {
    file: 'modules/federation-governance/about-federation-page/about-federation-page.service.ts',
    reason:
      'Every reference cast goes through this file\'s own `ref(id) => id ? new Types.ObjectId(id) : null` helper or an equivalent inline ternary — spot-checked for the bare/`!`-asserted shape the four Fix round 4 findings had; none found.',
  },
  {
    file: 'modules/federation-governance/president-message-page/president-message-page.service.ts',
    reason:
      'Every reference cast is ternary-guarded (including a generic `set[key] = value ? new Types.ObjectId(value) : null` loop) — spot-checked for the bare/`!`-asserted shape the four Fix round 4 findings had; none found.',
  },
  {
    file: 'modules/federation-governance/vision-mission-page/vision-mission-page.service.ts',
    reason:
      'Every reference cast goes through this file\'s own `ref(id) => id ? new Types.ObjectId(id) : null` helper — spot-checked for the bare/`!`-asserted shape the four Fix round 4 findings had; none found.',
  },
  {
    file: 'modules/federation-governance/strategic-plans-page/strategic-plans-page.service.ts',
    reason:
      'Every reference cast goes through this file\'s own `ref(id) => id ? new Types.ObjectId(id) : null` helper — spot-checked for the bare/`!`-asserted shape the four Fix round 4 findings had; none found.',
  },
] as const;

/**
 * Strips `//` and `/* *\/` comments and blanks out string/template literal
 * CONTENTS (keeping their quotes, so positions are unaffected), leaving
 * everything else untouched. Both halves matter: a naive `//.*$` regex
 * would wrongly treat `'https://example.com'` as a comment start; an
 * un-stripped scan would flag this very file's own header comment, which
 * quotes the forbidden pattern verbatim; and without blanking string
 * contents, an error message that merely CONTAINS the text "new Date(" would
 * falsely read as the construct itself.
 */
const stripNonCode = (source: string): string => {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    const ch = source[i];
    if (two === '//') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (two === '/*') {
      i += 2;
      while (i < source.length && source.slice(i, i + 2) !== '*/') i++;
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      out += ch;
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') {
          i += 2;
          out += '  ';
          continue;
        }
        out += ' ';
        i++;
      }
      out += source[i] ?? '';
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
};

/** The index just past the `close` that balances the `open` at `openIndex`
 *  — not a regex guess at where a construct ends, which is exactly what
 *  broke on a multi-line `@ApiOperation({` elsewhere in this repo's
 *  history: a nested `(`/`)` or `{`/`}` needs real depth tracking, not a
 *  non-greedy `.*?\)`. Assumes `source` is already comment/string-safe. */
const balancedEnd = (source: string, openIndex: number, open: string, close: string): number => {
  let depth = 1;
  let i = openIndex + 1;
  while (i < source.length && depth > 0) {
    if (source[i] === open) depth++;
    else if (source[i] === close) depth--;
    i++;
  }
  return i;
};

/** The bracket-balanced span between the `open` at `openIndex` and its
 *  matching `close`, exclusive of both delimiters. */
const findBalancedSpan = (source: string, openIndex: number, open: string, close: string): string =>
  source.slice(openIndex + 1, balancedEnd(source, openIndex, open, close) - 1);

/** The body of `async <methodName>(...) { ... }` in an already
 *  comment/string-safe `source`, found by balancing first the parameter
 *  list's parens and then the body's braces — never a regex guess at where
 *  either ends. `null` when the method is not declared at all. */
export const extractMethodBody = (source: string, methodName: string): string | null => {
  const signature = new RegExp(`\\basync\\s+${methodName}\\s*\\(`);
  const signatureMatch = signature.exec(source);
  if (!signatureMatch) {
    return null;
  }
  const paramsOpen = signatureMatch.index + signatureMatch[0].length - 1;
  const afterParams = balancedEnd(source, paramsOpen, '(', ')');
  const bodyOpen = source.indexOf('{', afterParams);
  return findBalancedSpan(source, bodyOpen, '{', '}');
};

/**
 * Every `new Types.ObjectId(...)` / `new Date(...)` construction anywhere in
 * `source` — not conditioned on the argument mentioning `dto.` (Fix round 3,
 * Hole 1): inside a guarded `update()` body, the answer must be zero
 * regardless of what the argument is called or whether it was destructured.
 * `source` is stripped internally, so a raw file or method body may be
 * passed directly. `Types.ObjectId(x)` without `new` is deliberately not
 * matched: it throws `TypeError` on this project's pinned mongoose, so it
 * is not a live escape.
 */
export const rawUpdateCasts = (source: string): string[] => {
  const stripped = stripNonCode(source);
  const offenders: string[] = [];
  const pattern = /new\s+(?:Types\.ObjectId|Date)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(stripped)) !== null) {
    const openParenIndex = match.index + match[0].length - 1;
    const args = findBalancedSpan(stripped, openParenIndex, '(', ')');
    offenders.push(`${match[0]}${args})`);
  }
  return offenders;
};

/** Every `*.ts` file under `dir` (recursive), as paths relative to `root`,
 *  using forward slashes regardless of platform. Unqualified by kind, unlike
 *  `serviceFilesUnder`: the DTO check below has to find an `Update*Dto`
 *  wherever it was declared, including the four that live in a
 *  `create-*.dto.ts` file. */
export const sourceFilesUnder = (dir: string, root: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFilesUnder(full, root);
    if (!full.endsWith('.ts')) return [];
    return [full.slice(root.length + 1).split(sep).join('/')];
  });

/**
 * Every `export class <name>Dto extends PartialType(...)` in `source` whose
 * argument list does not pass `skipNullProperties: false`, as
 * `<class>(<arguments>)`.
 *
 * `PartialType` with no options applies `@IsOptional()`, and `@IsOptional()`
 * skips every OTHER validator when the value is `null` — so a required enum,
 * string, number or nested object reaches `partialUpdate` as `null`,
 * `updateById` passes no `runValidators`, and the record holds `null` on a
 * `required` path. The option applies `@ValidateIf((_, v) => v !== undefined)`
 * instead, which refuses `null` and still allows the field to be omitted.
 *
 * Found by derivation, never from a list of files: the rule is a property of
 * the declaration, so any `Update*Dto` added later is inside this scan the
 * moment it is written. The argument span is bracket-balanced, because the
 * option follows a multi-line `OmitType(...)`/`PickType(...)` in five of them.
 */
export const partialTypesAcceptingNull = (source: string): string[] => {
  const stripped = stripNonCode(source);
  const offenders: string[] = [];
  const pattern = /export class (\w+Dto)\s+extends\s+PartialType\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(stripped)) !== null) {
    const openParenIndex = match.index + match[0].length - 1;
    const args = findBalancedSpan(stripped, openParenIndex, '(', ')');
    if (/skipNullProperties\s*:\s*false/.test(args)) continue;
    offenders.push(`${match[1]}(${args.split(/\s+/).join(' ').trim()})`);
  }
  return offenders;
};

/** Every `*.service.ts` under `dir` (recursive), as paths relative to
 *  `root`, using forward slashes regardless of platform so the list matches
 *  the literal strings in `UPDATE_METHODS_USING_SHARED_SETTERS` on Windows
 *  too. */
export const serviceFilesUnder = (dir: string, root: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return serviceFilesUnder(full, root);
    if (!full.endsWith('.service.ts')) return [];
    return [full.slice(root.length + 1).split('\\').join('/')];
  });

describe('no update() casts a raw ObjectId/Date outside the shared helper', () => {
  it('recognises the defect in each of its shapes, so the scan below cannot pass on nothing', () => {
    expect(rawUpdateCasts('update.x = new Types.ObjectId(dto.coverImage);')).toHaveLength(1);
    expect(rawUpdateCasts('update.x = new Date(dto.effectiveDate);')).toHaveLength(1);
    // Hidden inside a ternary — still a raw cast on the "value present" branch.
    expect(rawUpdateCasts('update.x = dto.logoId ? new Types.ObjectId(dto.logoId) : null;')).toHaveLength(1);
    // Multi-line, matching this repo's own formatting — the reason for
    // bracket-balancing rather than a single-line regex.
    expect(rawUpdateCasts('update.x = new Types.ObjectId(\n  dto.ownerId,\n);')).toHaveLength(1);
    // Hole 1: a renamed parameter carries the identical defect and must
    // still be caught — the whole point of no longer keying on `dto.`.
    expect(rawUpdateCasts('async update(id, payload) { x.coverImage = new Types.ObjectId(payload.coverImage); }')).toHaveLength(1);
    // Hole 1: destructuring the value out of `dto` first is the other way
    // an author steps around a `dto.`-keyed rule.
    expect(
      rawUpdateCasts('const { coverImage } = dto;\nupdate.coverImage = new Types.ObjectId(coverImage);'),
    ).toHaveLength(1);
    // A comment quoting the pattern verbatim (this file's own header does)
    // must not trip it.
    expect(rawUpdateCasts('/** new Types.ObjectId(dto.x) is the bug */')).toHaveLength(0);
    expect(rawUpdateCasts('// new Date(dto.x)')).toHaveLength(0);
    // A string that merely CONTAINS the pattern as text must not trip it —
    // its contents are masked to spaces before matching, so there is
    // nothing left inside the quotes to match (the real `new Error(` call
    // around it does not match either: `Error` is neither `Types.ObjectId`
    // nor `Date`).
    expect(rawUpdateCasts("throw new Error('do not call new Types.ObjectId(dto.x) here');")).toHaveLength(0);
    // `Types.ObjectId(x)` without `new` throws on this project's pinned
    // mongoose (checked, per the file header) — deliberately not matched.
    expect(rawUpdateCasts('update.x = Types.ObjectId(dto.x);')).toHaveLength(0);
  });

  it('planted violation: a reverted disciplines.service.ts would be caught', () => {
    // The exact line this defect shipped as, verbatim — proving the scan
    // bites on the real historical bug, not only on synthetic snippets.
    const reverted =
      'if (dto.coverImage !== undefined) {\n  update.coverImage = new Types.ObjectId(dto.coverImage);\n}';

    expect(rawUpdateCasts(reverted)).toEqual(['new Types.ObjectId(dto.coverImage)']);
  });

  it('extracts only the named method, so a file-wide scan cannot flag a safe create()', () => {
    const source = `
      async create(dto) {
        return { x: new Types.ObjectId(dto.x) };
      }
      async update(id, dto) {
        return { y: new Types.ObjectId(dto.y) };
      }
    `;

    expect(rawUpdateCasts(extractMethodBody(source, 'update') ?? '')).toEqual(['new Types.ObjectId(dto.y)']);
  });

  it('is exactly the 32 update() methods migrated to the shared setters so far', () => {
    // A count that silently drops matters as much as one that grows it —
    // same reasoning as the table-driven spec's own count check.
    expect(UPDATE_METHODS_USING_SHARED_SETTERS).toHaveLength(32);
    expect(new Set(UPDATE_METHODS_USING_SHARED_SETTERS).size).toBe(32);
  });

  it('finds none in the update() method of any guarded file', () => {
    const root = join(process.cwd(), 'src');
    const offenders = UPDATE_METHODS_USING_SHARED_SETTERS.flatMap((relativePath) => {
      const source = stripNonCode(readFileSync(join(root, relativePath), 'utf8'));
      const updateBody = extractMethodBody(source, 'update');
      if (updateBody === null) {
        return [`${relativePath}: no async update( method found (list is stale)`];
      }
      return rawUpdateCasts(updateBody).map((snippet) => `${relativePath}: ${snippet}`);
    });

    expect(offenders).toEqual([]);
  });
});

describe("every service's update() method is either using the shared setters or named with a reason", () => {
  const root = join(process.cwd(), 'src');
  const listedFiles = new Set<string>([
    ...UPDATE_METHODS_USING_SHARED_SETTERS,
    ...UPDATE_METHODS_NOT_USING_SHARED_SETTERS.map((entry) => entry.file),
  ]);

  it('is exactly the 9 remaining not-yet-migrated files, down from 13 before Fix round 4', () => {
    expect(UPDATE_METHODS_NOT_USING_SHARED_SETTERS).toHaveLength(9);
  });

  it('has no file listed twice across the two lists', () => {
    const all = [
      ...UPDATE_METHODS_USING_SHARED_SETTERS,
      ...UPDATE_METHODS_NOT_USING_SHARED_SETTERS.map((e) => e.file),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it('names every exclusion with a real reason, not a placeholder', () => {
    for (const entry of UPDATE_METHODS_NOT_USING_SHARED_SETTERS) {
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });

  const realUpdateServices = (): string[] =>
    serviceFilesUnder(join(root, 'modules'), root).filter((relativePath) => {
      const source = readFileSync(join(root, relativePath), 'utf8');
      return extractMethodBody(stripNonCode(source), 'update') !== null;
    });

  it('finds every real update()-declaring service listed in one of the two lists', () => {
    const missing = realUpdateServices().filter((relativePath) => !listedFiles.has(relativePath));

    expect(missing).toEqual([]);
  });

  it('planted violation: a service declaring update() in neither list is reported, not silently passed', () => {
    // The exact failure this check exists to prevent: a Task 7+ resource
    // adds `update()` and nobody remembers to list it. Simulated by adding
    // one FAKE path to the discovered set without adding it to
    // `listedFiles` — the real files are untouched.
    const withAPlantedGap = [...realUpdateServices(), 'modules/made-up/not-listed.service.ts'];

    const missing = withAPlantedGap.filter((relativePath) => !listedFiles.has(relativePath));

    expect(missing).toEqual(['modules/made-up/not-listed.service.ts']);
  });

  it('lists no file that no longer declares an update() method (a stale exclusion)', () => {
    const stale = [...listedFiles].filter((relativePath) => {
      const source = readFileSync(join(root, relativePath), 'utf8');
      return extractMethodBody(stripNonCode(source), 'update') === null;
    });

    expect(stale).toEqual([]);
  });
});

describe('no Update*Dto lets PartialType skip null', () => {
  const root = join(process.cwd(), 'src');

  it('recognises the defect and the fix, so the scan below cannot pass on nothing', () => {
    expect(partialTypesAcceptingNull('export class UpdateXDto extends PartialType(CreateXDto) {}')).toHaveLength(1);
    expect(
      partialTypesAcceptingNull(
        'export class UpdateXDto extends PartialType(CreateXDto, { skipNullProperties: false }) {}',
      ),
    ).toHaveLength(0);
    // The multi-line shape five of the real declarations have: the option
    // follows a nested call, which is why the span is bracket-balanced
    // rather than matched to the first `)`.
    expect(
      partialTypesAcceptingNull(
        [
          'export class UpdateXDto extends PartialType(',
          '  OmitType(CreateXDto, [',
          "    'a',",
          '  ] as const),',
          ') {}',
        ].join('\n'),
      ),
      // The literal's contents are masked to a space before matching, which
      // is why `'a'` reports as `' '`.
    ).toEqual(["UpdateXDto(OmitType(CreateXDto, [ ' ', ] as const),)"]);
    // `skipNullProperties: true` is the default spelled out — still the defect.
    expect(
      partialTypesAcceptingNull(
        'export class UpdateXDto extends PartialType(CreateXDto, { skipNullProperties: true }) {}',
      ),
    ).toHaveLength(1);
    // A DTO built any other way is not this rule's business.
    expect(partialTypesAcceptingNull('export class UpdateXDto extends OmitType(CreateXDto) {}')).toHaveLength(0);
  });

  it('finds every PartialType DTO under modules, so the scan is not looking at an empty set', () => {
    const declared = sourceFilesUnder(join(root, 'modules'), root).flatMap((relativePath) => {
      const source = readFileSync(join(root, relativePath), 'utf8');
      const stripped = stripNonCode(source);
      return [...stripped.matchAll(/export class (\w+Dto)\s+extends\s+PartialType\s*\(/g)].map((m) => m[1]);
    });

    expect(declared).toHaveLength(33);
    expect(new Set(declared).size).toBe(33);
  });

  it('finds none that accepts null', () => {
    const offenders = sourceFilesUnder(join(root, 'modules'), root).flatMap((relativePath) => {
      const source = readFileSync(join(root, relativePath), 'utf8');
      return partialTypesAcceptingNull(source).map((snippet) => `${relativePath}: ${snippet}`);
    });

    expect(offenders).toEqual([]);
  });

  it('planted violation: the next Update*Dto written without the option is reported', () => {
    // The exact regression this check exists to prevent — a resource added
    // later copies the four-line DTO everything else uses and silently
    // reopens `null` on every required field it carries.
    const planted = [
      "import { PartialType } from '@nestjs/swagger';",
      'export class UpdateChampionshipDto extends PartialType(CreateChampionshipDto) {}',
    ].join('\n');

    expect(partialTypesAcceptingNull(planted)).toEqual(['UpdateChampionshipDto(CreateChampionshipDto)']);
  });
});
