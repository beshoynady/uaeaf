# Governance G1 (API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the API the data model and public read paths behind the board page, the committees pages and the person profile, with every name, position, order and classification entered by an admin and nothing fixed in code.

**Architecture:** Four existing collections (`federationPersonnel`, `electionCycles`, `federationAppointments`, `committees`) are extended in place; one new collection (`federationPositions`) replaces the hard-coded `roleType` enum so job titles and the organisational hierarchy become admin data (`rank`, `order`). Committee classification (`kind`, `parentCommitteeId`) and appointment lifecycle (close with reason, never delete) are enforced fail-closed in one service each, with a negative test per rule. Public reads go through per-resource allowlist mappers.

**Tech Stack:** NestJS 11, Mongoose 8, Jest (ESM, `--runInBand`), TypeScript strict.

**Spec:** `docs/design-specs/board-committees/` (README + NOTES) and the owner prompt §2/§3-أ, measured against the codebase in `docs/superpowers/reports/governance-G0.md`.

---

## Global Constraints

Copied verbatim from the prompt; every task's requirements include these.

- **Git:** read-only (`status`, `diff`, `log`, `show`, `ls-files`). No command that changes state. Work stays uncommitted. **This constraint is copied into every subagent's instructions.**
- **No script may be run against the database. No seeded names.**
- **TDD is mandatory on the backend, with a negative test for every rule.** Run only the affected files' tests.
- **No new dependency. No new index. No change to the guard, the approvals engine, the role templates, or permission logic.** New resources are registered in the catalogue using the existing pattern only.
- **Protected (do not touch):** `supersedesAppointmentId`; `AuditLogsRepository` (append-only); the Workflow Engine; the `[PUBLIC]`/`[RESTRICTED]` split — every `toPublicResponse` is an allowlist.
- **Out of scope (§6), do not build:** personnel sensitive internal data, `linkedUserId`, review/publish and versions tabs, registering new types in the approvals engine, other roles' permissions on the new resources, `own` scope, step-up.
- **Style:** arrow functions; simplest thing that works; ordinary `try/catch` where needed; no whole page in one file; repeated parts become a shared component.
- **Comments:** short TSDoc on public exports only; `//` only for a reason that is not visible; ADR reference by number. Forbidden: restating the code, its history, any mention of a task/batch/plan, first person, markdown, emoji, `Note:`, more than 3 lines. Plain English, as a teammate would write it.
- **Test command:** `cd api && npm test -- --runInBand <path>`. `npx jest` runs zero tests (ESM).

### Naming decision carried by every task

Existing field names are **kept** where an existing field is semantically the approved one. Renaming churns the workflow snapshots, the public DTOs and the built screens for no behavioural gain, and the owner did not ask for it. Applies to: `fullName`≡`name`, `displayOrder`≡`order`, `electionCycleId`≡`cycleId`, `cycleName`≡`label`. `electionCycles.isCurrent` is **derived** from the existing `status === 'Active'`, not stored twice. Only genuinely missing fields are added.

`committees.isActive` is the one exception that is *not* a rename: it is a descriptive badge with an explicit board rule (2026-09-01) that it does not affect visibility. The approved `isVisible` is therefore **added alongside it**, not mapped onto it.

---

## Review Focus

Input classes the spec implies but no task's own happy path exercises. Each has its test pinned to the task that owns the code.

1. **A cycle created through a chain of updates, not a single save** — A→B, then B→C, then C→A. The depth-limited walk must catch it at any depth, not just one level. (Task 2)
2. **A slug that is unique among live rows but held by an archived row** — archive frees the slug; restoring the archived row must not then collide. (Tasks 2 and 4)
3. **An appointment whose position was archived after the appointment opened** — the profile and the org structure must still render, not throw on a dangling `positionId`. (Task 5)
4. **A committee made sub-ordinate to a parent that is archived in the same moment** — the request-time check must run at the write, not at form load, and answer a refusal the UI can show. (Task 2)
5. **A person with no visible appointment at all** — the public profile must 404 rather than render an empty shell, and must not leak the row's existence. (Task 5)

---

## File Structure

**New module** `api/src/modules/federation-governance/federation-positions/`
- `schemas/federation-positions.schema.ts` — the collection
- `federation-positions.repository.ts` — `BaseRepository` subclass
- `federation-positions.service.ts` — CRUD + archive guard
- `federation-positions.controller.ts` — guarded routes
- `dto/{create,update}-federation-positions.dto.ts`
- `federation-positions.service.spec.ts` — rules, negative first

**Extended in place**
- `committees/schemas/committees.schema.ts` — approved fields + `kind`/`parentCommitteeId`
- `committees/committee-hierarchy.service.ts` — **new file**, the one place the four hierarchy rules live
- `committees/committee-hierarchy.service.spec.ts` — **new file**, one negative test per rule
- `federation-appointments/` — `positionId` replaces `roleType`; close-with-reason; chair change
- `federation-appointments/appointment-rules.service.ts` — **new file**, assignment rules
- `federation-personnel/` — `slug`, `honorific`, `cv`, `showPublicContact`
- `federation-personnel/schemas/personnel-cv.schema.ts` — **new file**, the five CV arrays

**Public read**
- `federation-governance/public/governance-public.service.ts` — **new file**, the four aggregates
- `federation-governance/public/governance-public.controller.ts` — **new file**, `@Public()` routes
- `federation-governance/public/dto/*.public.dto.ts` — **new files**, one allowlist class per shape

**Catalogue**
- `common/constants/permission-resources.ts` — add `federationPositions`
- `common/authz/capability-map.ts` — add its row

**Migration (written, never run)**
- `api/src/bootstrap/migrate-appointments-to-positions.ts`

---

## Task 1: `federationPositions` collection

The admin-defined job. Replaces the fixed `roleType` enum; nothing about a chair, a vice or a treasurer is named in code from here on.

**Files:**
- Create: `api/src/modules/federation-governance/federation-positions/schemas/federation-positions.schema.ts`
- Create: `api/src/modules/federation-governance/federation-positions/federation-positions.repository.ts`
- Create: `api/src/modules/federation-governance/federation-positions/federation-positions.service.ts`
- Create: `api/src/modules/federation-governance/federation-positions/federation-positions.controller.ts`
- Create: `api/src/modules/federation-governance/federation-positions/federation-positions.module.ts`
- Create: `api/src/modules/federation-governance/federation-positions/dto/create-federation-positions.dto.ts`
- Create: `api/src/modules/federation-governance/federation-positions/dto/update-federation-positions.dto.ts`
- Test: `api/src/modules/federation-governance/federation-positions/federation-positions.service.spec.ts`
- Modify: `api/src/common/constants/permission-resources.ts` (add `'federationPositions'`, alphabetical)
- Modify: `api/src/common/authz/capability-map.ts` (add its row, alphabetical)
- Modify: `api/src/app.module.ts` (register `FederationPositionsModule`)

**Interfaces:**
- Produces: `POSITION_BODIES = ['board', 'committee'] as const`; `FederationPosition` with `title: LocalizedText`, `body: PositionBody`, `rank: number`, `displayOrder: number`, `maxHolders: number | null`, `isVisible: boolean`; `FederationPositionsService.assertArchivable(id)`, `.findById(id)`, `.create(dto)`, `.update(id, dto)`, `.archive(id, by)`, `.restore(id)`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing tests** — `federation-positions.service.spec.ts`

```ts
import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { ConflictException } from '@nestjs/common';
import { FederationPositionsService } from './federation-positions.service.js';
import { FederationPositionsRepository } from './federation-positions.repository.js';
import { FederationAppointmentsRepository } from '../federation-appointments/federation-appointments.repository.js';

const makeRepository = () =>
  ({ create: jest.fn(), find: jest.fn(), findById: jest.fn(), updateById: jest.fn(), softDelete: jest.fn(), restore: jest.fn() }) as unknown as jest.Mocked<FederationPositionsRepository>;
const makeAppointments = () =>
  ({ find: jest.fn() }) as unknown as jest.Mocked<FederationAppointmentsRepository>;

describe('FederationPositionsService', () => {
  it('refuses to archive a position that still has open appointments', async () => {
    const positions = makeRepository();
    const appointments = makeAppointments();
    const id = new Types.ObjectId();
    positions.findById.mockResolvedValue({ _id: id } as never);
    appointments.find.mockResolvedValue([{ _id: new Types.ObjectId() }] as never);
    const service = new FederationPositionsService(positions, appointments);

    await expect(service.assertArchivable(id.toString())).rejects.toBeInstanceOf(ConflictException);
    expect(positions.softDelete).not.toHaveBeenCalled();
  });

  it('allows archiving once every appointment on the position is closed', async () => {
    const positions = makeRepository();
    const appointments = makeAppointments();
    const id = new Types.ObjectId();
    positions.findById.mockResolvedValue({ _id: id } as never);
    appointments.find.mockResolvedValue([] as never);
    const service = new FederationPositionsService(positions, appointments);

    await expect(service.assertArchivable(id.toString())).resolves.toBeUndefined();
  });

  it('asks for open appointments only, so a closed term never blocks archiving', async () => {
    const positions = makeRepository();
    const appointments = makeAppointments();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId() } as never);
    appointments.find.mockResolvedValue([] as never);
    const service = new FederationPositionsService(positions, appointments);

    await service.assertArchivable(new Types.ObjectId().toString());

    expect(appointments.find).toHaveBeenCalledWith(expect.objectContaining({ termEnd: null }));
  });

  it('stores maxHolders as null when the admin leaves it empty', async () => {
    const positions = makeRepository();
    positions.create.mockResolvedValue({} as never);
    const service = new FederationPositionsService(positions, makeAppointments());

    await service.create({ title: { ar: 'أ', en: 'A' }, body: 'board', rank: 1, displayOrder: 0 } as never);

    expect(positions.create).toHaveBeenCalledWith(expect.objectContaining({ maxHolders: null, isVisible: true }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/federation-positions/federation-positions.service.spec.ts`
Expected: FAIL — cannot resolve `./federation-positions.service.js`.

- [ ] **Step 3: Write the schema**

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type FederationPositionDocument = HydratedDocument<FederationPosition>;

export const POSITION_BODIES = ['board', 'committee'] as const;
export type PositionBody = (typeof POSITION_BODIES)[number];

/** An admin-defined post. Job titles, their level in the organisational
 *  chart and their order within a level are data, not code, so no role is
 *  named anywhere in the application. */
@Schema({ collection: 'federationPositions', timestamps: true })
export class FederationPosition extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: String, enum: POSITION_BODIES, required: true })
  body: PositionBody;

  /** Level in the chart, 1 being the highest. Positions sharing a rank
   *  render on one row. */
  @Prop({ type: Number, required: true })
  rank: number;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  /** How many people may hold the post at once in one cycle. Null is
   *  unlimited. */
  @Prop({ type: Number, default: null })
  maxHolders: number | null;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;
}

export const FederationPositionSchema = SchemaFactory.createForClass(FederationPosition);
```

- [ ] **Step 4: Write the repository, service, DTOs, controller and module**

Repository copies `CommitteesRepository` exactly (extend `BaseRepository<FederationPositionDocument>`, inject the model, nothing else).

Service:

```ts
/** @throws ConflictException when the post still has an open appointment. */
assertArchivable = async (id: string): Promise<void> => {
  const open = await this.appointments.find({ positionId: new Types.ObjectId(id), termEnd: null });
  if (open.length > 0) {
    throw new ConflictException(`Position ${id} still has ${open.length} open appointment(s).`);
  }
};
```

`create` maps the DTO with `maxHolders: dto.maxHolders ?? null` and `isVisible: dto.isVisible ?? true`. `archive` calls `assertArchivable` then `repository.softDelete`. `update` uses `partialUpdate(dto)` like `CommitteesService.update`.

Controller mirrors `committees.controller.ts`: `@RequirePermission('federationPositions', 'Read' | 'Create' | 'Update' | 'Archive' | 'Restore')` on `@Get()`, `@Get(':id')`, `@Post()`, `@Patch(':id')`, `@Delete(':id')`, `@Post(':id/unarchive')`. No `@Public()` route here — positions reach the site only through Task 5's aggregates.

- [ ] **Step 5: Register in the catalogue**

`permission-resources.ts`: add `'federationPositions',` in alphabetical place. `capability-map.ts`: add, matching the `federationAppointments` row exactly in shape —

```ts
{
  resourceType: 'federationPositions',
  group: 'federation-governance',
  actions: ['Read', 'Create', 'Update', 'Archive', 'Restore'],
  purgeable: false,
  superAdminOnly: [],
  sensitiveFields: [],
  scopes: [],
},
```

Nothing else. The Super Admin reaches it through the existing sync; no template, guard or permission logic is touched.

- [ ] **Step 6: Run to verify it passes**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/federation-positions/ src/common/authz/ src/common/constants/`
Expected: PASS, including the catalogue coverage specs that assert every resource has a capability row.

---

## Task 2: Committee classification and the hierarchy rules

**Files:**
- Modify: `api/src/modules/federation-governance/committees/schemas/committees.schema.ts`
- Create: `api/src/modules/federation-governance/committees/schemas/committee-duty.schema.ts`
- Create: `api/src/modules/federation-governance/committees/schemas/formation-decision.schema.ts`
- Create: `api/src/modules/federation-governance/committees/committee-hierarchy.service.ts`
- Test: `api/src/modules/federation-governance/committees/committee-hierarchy.service.spec.ts`
- Modify: `api/src/modules/federation-governance/committees/committees.service.ts` (call the guard on create and update)
- Modify: `api/src/modules/federation-governance/committees/dto/{create,update}-committees.dto.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `COMMITTEE_KINDS = ['standing', 'sub'] as const`; `CommitteeHierarchyService.assertPlacementAllowed(input: { id: string | null; kind: CommitteeKind; parentCommitteeId: string | null }): Promise<void>`; `Committee.slug`, `.summary`, `.about`, `.duties`, `.formationDecision`, `.documentIds`, `.isVisible`, `.kind`, `.parentCommitteeId`.

- [ ] **Step 1: Write the failing tests** — one negative per rule, plus the two Review Focus cases

```ts
import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommitteeHierarchyService } from './committee-hierarchy.service.js';
import { CommitteesRepository } from './committees.repository.js';

const id = () => new Types.ObjectId().toString();
const makeRepository = () => ({ findById: jest.fn() }) as unknown as jest.Mocked<CommitteesRepository>;

describe('CommitteeHierarchyService.assertPlacementAllowed', () => {
  it('refuses a standing committee that carries a parent', async () => {
    const service = new CommitteeHierarchyService(makeRepository());

    await expect(
      service.assertPlacementAllowed({ id: id(), kind: 'standing', parentCommitteeId: id() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a standing committee with no parent', async () => {
    const service = new CommitteeHierarchyService(makeRepository());

    await expect(
      service.assertPlacementAllowed({ id: id(), kind: 'standing', parentCommitteeId: null }),
    ).resolves.toBeUndefined();
  });

  it('refuses a committee that is its own parent', async () => {
    const self = id();
    const service = new CommitteeHierarchyService(makeRepository());

    await expect(
      service.assertPlacementAllowed({ id: self, kind: 'sub', parentCommitteeId: self }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a cycle formed at depth, not just one level up', async () => {
    // C is being pointed at A, while A already descends through B to C.
    const [a, b, c] = [id(), id(), id()];
    const repository = makeRepository();
    repository.findById.mockImplementation(async (lookup: string) => {
      if (lookup === a) return { _id: new Types.ObjectId(a), kind: 'sub', parentCommitteeId: new Types.ObjectId(b), archivedAt: null } as never;
      if (lookup === b) return { _id: new Types.ObjectId(b), kind: 'sub', parentCommitteeId: new Types.ObjectId(c), archivedAt: null } as never;
      return null;
    });
    const service = new CommitteeHierarchyService(repository);

    await expect(
      service.assertPlacementAllowed({ id: c, kind: 'sub', parentCommitteeId: a }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a parent that does not exist', async () => {
    const repository = makeRepository();
    repository.findById.mockResolvedValue(null as never);
    const service = new CommitteeHierarchyService(repository);

    await expect(
      service.assertPlacementAllowed({ id: id(), kind: 'sub', parentCommitteeId: id() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a parent archived between form load and save', async () => {
    const repository = makeRepository();
    // `findById` scopes to archivedAt: null, so an archived parent reads as absent
    // at the moment of the write — which is the moment that decides (CLAUDE.md §31).
    repository.findById.mockResolvedValue(null as never);
    const service = new CommitteeHierarchyService(repository);

    await expect(
      service.assertPlacementAllowed({ id: id(), kind: 'sub', parentCommitteeId: id() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a sub-committee with no parent, which follows the board directly', async () => {
    const service = new CommitteeHierarchyService(makeRepository());

    await expect(
      service.assertPlacementAllowed({ id: id(), kind: 'sub', parentCommitteeId: null }),
    ).resolves.toBeUndefined();
  });

  it('stops walking after the depth limit rather than looping forever on corrupt data', async () => {
    const repository = makeRepository();
    const loop = new Types.ObjectId();
    repository.findById.mockResolvedValue({ _id: loop, kind: 'sub', parentCommitteeId: loop, archivedAt: null } as never);
    const service = new CommitteeHierarchyService(repository);

    await expect(
      service.assertPlacementAllowed({ id: id(), kind: 'sub', parentCommitteeId: loop.toString() }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/committees/committee-hierarchy.service.spec.ts`
Expected: FAIL — cannot resolve `./committee-hierarchy.service.js`.

- [ ] **Step 3: Extend the schema**

Add to `Committee`, leaving `description`, `displayOrder`, `isActive`, `committeeType`, `committeeGroup` and `publicationState` untouched:

```ts
export const COMMITTEE_KINDS = ['standing', 'sub'] as const;
export type CommitteeKind = (typeof COMMITTEE_KINDS)[number];
```

```ts
  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: LocalizedTextSchema, default: null })
  summary: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  about: LocalizedText | null;

  @Prop({ type: [CommitteeDutySchema], default: [] })
  duties: CommitteeDuty[];

  @Prop({ type: FormationDecisionSchema, default: null })
  formationDecision: FormationDecision | null;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Document' }], default: [] })
  documentIds: Types.ObjectId[];

  /** The admin's own show/hide switch. Separate from `isActive`, which the
   *  2026-09-01 rule above keeps descriptive, and from `publicationState`,
   *  which remains the approvals engine's gate (ADR-0020, ADR-0125). */
  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  /** Null until an admin classifies the committee; the dashboard lists such
   *  rows under "not yet classified" and the pre-publish check refuses them. */
  @Prop({ type: String, enum: COMMITTEE_KINDS, default: null })
  kind: CommitteeKind | null;

  /** Set only on a sub-committee. Null there means it follows the board. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Committee', default: null })
  parentCommitteeId: Types.ObjectId | null;
```

`committee-duty.schema.ts` holds `title: LocalizedText`, `desc: LocalizedText`, `order: number`. `formation-decision.schema.ts` holds `number: string`, `date: Date`, `documentId: Types.ObjectId | null`.

**No index is added** — `slug` uniqueness is enforced in the service by `assertSlugFree` (Step 4). The matching partial unique index is the codebase convention and is raised for approval in the report, not applied here.

- [ ] **Step 4: Write the hierarchy service**

```ts
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CommitteesRepository } from './committees.repository.js';
import type { CommitteeKind } from './schemas/committees.schema.js';

/** Depth beyond which the parent chain is treated as corrupt rather than
 *  walked further. Higher than any real committee tree. */
const MAX_DEPTH = 32;

/** The one place a committee's classification and parent are judged. Every
 *  write goes through it, so a bad shape cannot reach the collection even
 *  when the dashboard's own checks are bypassed. */
@Injectable()
export class CommitteeHierarchyService {
  constructor(private readonly repository: CommitteesRepository) {}

  /**
   * @throws BadRequestException when the placement is one of the four
   * refused shapes: standing with a parent, self-parent, a cycle, or a
   * parent that is missing or archived.
   * @throws ConflictException when the existing chain exceeds MAX_DEPTH.
   */
  assertPlacementAllowed = async (input: {
    id: string | null;
    kind: CommitteeKind | null;
    parentCommitteeId: string | null;
  }): Promise<void> => {
    const { id, kind, parentCommitteeId } = input;

    if (kind === 'standing' && parentCommitteeId) {
      throw new BadRequestException('A standing committee cannot follow another committee.');
    }
    if (!parentCommitteeId) return;
    if (id && parentCommitteeId === id) {
      throw new BadRequestException('A committee cannot follow itself.');
    }

    // Walked at the write, not at form load: the parent can be archived in
    // between, and `findById` scopes to live rows (CLAUDE.md §31).
    let cursor: string | null = parentCommitteeId;
    for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
      if (!cursor) return;
      const parent = await this.repository.findById(cursor);
      if (!parent) {
        throw new BadRequestException('That parent committee no longer exists.');
      }
      if (id && parent._id.toString() === id) {
        throw new BadRequestException('That parent already follows this committee.');
      }
      cursor = parent.parentCommitteeId ? parent.parentCommitteeId.toString() : null;
    }
    throw new ConflictException('The committee hierarchy is too deep to verify.');
  };
}
```

Note the self-parent case is caught twice deliberately: once directly for the clear message, and once by the walk for a chain that returns to `id` at depth.

- [ ] **Step 5: Call the guard from the writes and add `assertSlugFree`**

In `CommitteesService`, inject `CommitteeHierarchyService`, and in both `create` and `update` call `assertPlacementAllowed` **before** the repository write, passing the id (null on create) and the post-update kind/parent. Add, copying `ArticlesService.assertSlugFree`:

```ts
/** @throws ConflictException when another live committee holds the slug. */
private assertSlugFree = async (slug: string, selfId: Types.ObjectId | null): Promise<void> => {
  const holder = await this.repository.findOne({ slug });
  if (holder && (!selfId || holder._id.toString() !== selfId.toString())) {
    throw new ConflictException(`Slug "${slug}" is already in use.`);
  }
};
```

`update` refuses a slug change only when `dto.slug !== undefined`. Register `CommitteeHierarchyService` as a provider in `committees.module.ts`.

- [ ] **Step 6: Run to verify it passes**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/committees/`
Expected: PASS, including the existing `committees.service.spec.ts` (the `isActive`/publications assertions must still hold — `isVisible` is additive).

---

## Task 3: Appointments point at positions

**Files:**
- Modify: `api/src/modules/federation-governance/federation-appointments/schemas/federation-appointments.schema.ts`
- Create: `api/src/modules/federation-governance/federation-appointments/appointment-rules.service.ts`
- Test: `api/src/modules/federation-governance/federation-appointments/appointment-rules.service.spec.ts`
- Modify: `api/src/modules/federation-governance/federation-appointments/federation-appointments.service.ts`
- Modify: `api/src/modules/federation-governance/federation-appointments/dto/*.dto.ts`
- Create: `api/src/modules/federation-governance/federation-appointments/dto/close-appointment.dto.ts`

**Interfaces:**
- Consumes: `FederationPositionsRepository`, `POSITION_BODIES` (Task 1); `Committee` (Task 2).
- Produces: `APPOINTMENT_END_REASONS = ['completed','resigned','removed','transitioned','deceased'] as const`; `FederationAppointment.positionId`; `AppointmentRulesService.assertAssignable(input)`; `FederationAppointmentsService.close(id, dto, by)`, `.replaceChairOfCommittee(...)`.

Schema changes: `roleType` and `positionTitle` are **removed**; `positionId: Types.ObjectId` (ref `FederationPosition`, required) and `endReason: AppointmentEndReason | null` and `isVisible: boolean` are added. `status` is **kept** but narrows to `Active`/`Closed` semantics carried by `termEnd`; the five reasons move to `endReason`. `supersedesAppointmentId` is untouched.

- [ ] **Step 1: Write the failing tests**

```ts
import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentRulesService } from './appointment-rules.service.js';

const id = () => new Types.ObjectId().toString();
const makePositions = () => ({ findById: jest.fn() }) as never;
const makeAppointments = () => ({ find: jest.fn() }) as never;

describe('AppointmentRulesService.assertAssignable', () => {
  it('refuses a board position assigned inside a committee', async () => {
    const positions = makePositions();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'board', maxHolders: null } as never);
    const service = new AppointmentRulesService(positions, makeAppointments());

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: id(), cycleId: id(), personId: id() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a committee position assigned with no committee', async () => {
    const positions = makePositions();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'committee', maxHolders: null } as never);
    const service = new AppointmentRulesService(positions, makeAppointments());

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: null, cycleId: id(), personId: id() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses an assignment beyond maxHolders in the same cycle and body', async () => {
    const positions = makePositions();
    const appointments = makeAppointments();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'board', maxHolders: 1 } as never);
    appointments.find.mockResolvedValue([{ personId: new Types.ObjectId() }] as never);
    const service = new AppointmentRulesService(positions, appointments);

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: null, cycleId: id(), personId: id() }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('counts open appointments only, so a closed term frees the seat', async () => {
    const positions = makePositions();
    const appointments = makeAppointments();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'board', maxHolders: 1 } as never);
    appointments.find.mockResolvedValue([] as never);
    const service = new AppointmentRulesService(positions, appointments);

    await service.assertAssignable({ positionId: id(), committeeId: null, cycleId: id(), personId: id() });

    expect(appointments.find).toHaveBeenCalledWith(expect.objectContaining({ termEnd: null }));
  });

  it('refuses the same person twice in one committee in one cycle', async () => {
    const positions = makePositions();
    const appointments = makeAppointments();
    const person = id();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'committee', maxHolders: null } as never);
    appointments.find.mockResolvedValue([{ personId: new Types.ObjectId(person) }] as never);
    const service = new AppointmentRulesService(positions, appointments);

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: id(), cycleId: id(), personId: person }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses an assignment to a position that no longer exists', async () => {
    const positions = makePositions();
    positions.findById.mockResolvedValue(null as never);
    const service = new AppointmentRulesService(positions, makeAppointments());

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: null, cycleId: id(), personId: id() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

And in `federation-appointments.service.spec.ts`:

```ts
it('closes an appointment with a date and a reason and never deletes it', async () => {
  const repository = makeRepository();
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(), termEnd: null } as never);
  repository.updateById.mockResolvedValue({} as never);
  const service = makeService(repository);

  await service.close('abc', { termEnd: new Date('2026-01-01'), endReason: 'resigned' } as never, new Types.ObjectId());

  expect(repository.updateById).toHaveBeenCalledWith('abc', expect.objectContaining({ endReason: 'resigned' }));
  expect(repository.softDelete).not.toHaveBeenCalled();
});

it('refuses to close an appointment that is already closed', async () => {
  const repository = makeRepository();
  repository.findById.mockResolvedValue({ _id: new Types.ObjectId(), termEnd: new Date('2025-01-01') } as never);
  const service = makeService(repository);

  await expect(
    service.close('abc', { termEnd: new Date('2026-01-01'), endReason: 'completed' } as never, new Types.ObjectId()),
  ).rejects.toBeInstanceOf(ConflictException);
});

it('closes the old chair and opens the new one in a single session', async () => {
  const session = { withTransaction: jest.fn(async (fn: () => Promise<void>) => fn()), endSession: jest.fn() };
  const connection = { startSession: jest.fn(async () => session) };
  const repository = makeRepository();
  repository.find.mockResolvedValue([{ _id: new Types.ObjectId(), positionId: new Types.ObjectId() }] as never);
  repository.updateById.mockResolvedValue({} as never);
  repository.create.mockResolvedValue({} as never);
  const service = makeService(repository, connection);

  await service.replaceChairOfCommittee({ committeeId: 'c', cycleId: 'y', positionId: 'p', personId: 'new', termStart: new Date(), endReason: 'transitioned' } as never, new Types.ObjectId());

  expect(session.withTransaction).toHaveBeenCalled();
  expect(repository.updateById).toHaveBeenCalledWith('...', expect.objectContaining({ endReason: 'transitioned' }), expect.anything());
  expect(repository.create).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/federation-appointments/`
Expected: FAIL — `appointment-rules.service.js` missing; `close` is not a function.

- [ ] **Step 3: Implement `AppointmentRulesService`**

```ts
/**
 * @throws BadRequestException when the position is missing, or its body
 * does not match where it is being assigned.
 * @throws ConflictException when the post is full for the cycle, or the
 * person already holds a post in the same committee and cycle.
 */
assertAssignable = async (input: {
  positionId: string;
  committeeId: string | null;
  cycleId: string;
  personId: string;
}): Promise<void> => {
  const position = await this.positions.findById(input.positionId);
  if (!position) throw new BadRequestException('That position no longer exists.');

  const wantsCommittee = position.body === 'committee';
  if (wantsCommittee !== Boolean(input.committeeId)) {
    throw new BadRequestException(
      wantsCommittee
        ? 'A committee position must name its committee.'
        : 'A board position cannot be assigned inside a committee.',
    );
  }

  const scope = {
    electionCycleId: new Types.ObjectId(input.cycleId),
    committeeId: input.committeeId ? new Types.ObjectId(input.committeeId) : null,
    termEnd: null,
  };

  if (input.committeeId) {
    const held = await this.appointments.find(scope);
    if (held.some((a) => a.personId.toString() === input.personId)) {
      throw new ConflictException('That person already holds a post in this committee for this cycle.');
    }
  }

  if (position.maxHolders !== null) {
    const onPost = await this.appointments.find({ ...scope, positionId: position._id });
    if (onPost.length >= position.maxHolders) {
      throw new ConflictException(`That position already has its ${position.maxHolders} holder(s) for this cycle.`);
    }
  }
};
```

- [ ] **Step 4: Implement `close` and `replaceChairOfCommittee`**

`close` reads the row, throws `ConflictException` if `termEnd` is already set, then `updateById` with `{ termEnd, endReason, status: 'Closed', updatedBy }`. There is no delete path.

`replaceChairOfCommittee` opens a session from the injected `@InjectConnection()` and runs both writes inside `session.withTransaction`: close every open appointment on that committee whose `positionId` matches the chair position, then create the new one. It calls `assertAssignable` **inside** the transaction, after the close, so the seat freed by the close is visible to the count.

- [ ] **Step 5: Run to verify it passes**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/federation-appointments/`
Expected: PASS.

---

## Task 4: Personnel slug, honorific, CV and contact switch

**Files:**
- Modify: `api/src/modules/federation-governance/federation-personnel/schemas/federation-personnel.schema.ts`
- Create: `api/src/modules/federation-governance/federation-personnel/schemas/personnel-cv.schema.ts`
- Modify: `api/src/modules/federation-governance/federation-personnel/federation-personnel.service.ts`
- Modify: `api/src/modules/federation-governance/federation-personnel/dto/*.dto.ts`
- Test: `api/src/modules/federation-governance/federation-personnel/federation-personnel.service.spec.ts`

**Interfaces:**
- Produces: `FederationPersonnel.slug`, `.honorific`, `.cv`, `.showPublicContact`; `PersonnelCv` with `qualifications`, `certifications`, `previousPositions`, `experience`, `achievements`, each `CvEntry[]` where `CvEntry = { text: LocalizedText; isVisible: boolean; order: number }`.

`internalContact` is left exactly as it is and is not read, written or exposed by anything in this batch (§6).

- [ ] **Step 1: Write the failing tests**

```ts
it('refuses a slug already held by another live person', async () => {
  const repository = makeRepository();
  repository.findOne.mockResolvedValue({ _id: new Types.ObjectId() } as never);
  const service = makeService(repository);

  await expect(service.create({ slug: 'taken', fullName: { ar: 'أ', en: 'A' } } as never))
    .rejects.toBeInstanceOf(ConflictException);
});

it('keeps the slug fixed after creation', async () => {
  const repository = makeRepository();
  const existing = new Types.ObjectId();
  repository.findById.mockResolvedValue({ _id: existing, slug: 'original' } as never);
  const service = makeService(repository);

  await expect(service.update(existing.toString(), { slug: 'changed' } as never))
    .rejects.toBeInstanceOf(BadRequestException);
});

it('accepts an update that leaves the slug out', async () => {
  const repository = makeRepository();
  const existing = new Types.ObjectId();
  repository.findById.mockResolvedValue({ _id: existing, slug: 'original' } as never);
  repository.updateById.mockResolvedValue({ _id: existing } as never);
  const service = makeService(repository);

  await expect(service.update(existing.toString(), { honorific: { ar: 'د.', en: 'Dr.' } } as never))
    .resolves.toBeDefined();
});

it('leaves showPublicContact off unless the admin turns it on', async () => {
  const repository = makeRepository();
  repository.findOne.mockResolvedValue(null as never);
  repository.create.mockResolvedValue({} as never);
  const service = makeService(repository);

  await service.create({ slug: 'free', fullName: { ar: 'أ', en: 'A' }, nationalityId: new Types.ObjectId().toString() } as never);

  expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ showPublicContact: false }));
});

it('lets a slug freed by archiving be taken again', async () => {
  const repository = makeRepository();
  // findOne scopes to live rows, so an archived holder reads as absent.
  repository.findOne.mockResolvedValue(null as never);
  repository.create.mockResolvedValue({} as never);
  const service = makeService(repository);

  await expect(service.create({ slug: 'recycled', fullName: { ar: 'أ', en: 'A' }, nationalityId: new Types.ObjectId().toString() } as never))
    .resolves.toBeDefined();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/federation-personnel/`
Expected: FAIL.

- [ ] **Step 3: Write `personnel-cv.schema.ts`**

```ts
/** One CV line. Each is shown or hidden and ordered on its own, so an
 *  admin can publish part of a record without deleting the rest. */
@Schema({ _id: false })
export class CvEntry {
  @Prop({ type: LocalizedTextSchema, required: true })
  text: LocalizedText;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  @Prop({ type: Number, required: true })
  order: number;
}
```

`PersonnelCv` holds the five arrays, each `@Prop({ type: [CvEntrySchema], default: [] })`.

- [ ] **Step 4: Extend the personnel schema and service**

Add `slug: string` (required), `honorific: LocalizedText | null`, `cv: PersonnelCv` (`default: () => ({})`), `showPublicContact: boolean` (`default: false`). `create` calls `assertSlugFree` and sets `showPublicContact: dto.showPublicContact ?? false`. `update` throws `BadRequestException` when `dto.slug !== undefined && dto.slug !== existing.slug`, and `UpdateFederationPersonnelDto` omits `slug` entirely.

No index; same reasoning as Task 2.

- [ ] **Step 5: Run to verify it passes**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/federation-personnel/`
Expected: PASS.

---

## Task 5: Public read paths

Four `@Public()` aggregates, each answering only allowlisted fields and only visible, live, unarchived rows.

**Files:**
- Create: `api/src/modules/federation-governance/public/governance-public.service.ts`
- Create: `api/src/modules/federation-governance/public/governance-public.controller.ts`
- Create: `api/src/modules/federation-governance/public/governance-public.module.ts`
- Create: `api/src/modules/federation-governance/public/dto/committee-public.dto.ts`
- Create: `api/src/modules/federation-governance/public/dto/person-public.dto.ts`
- Create: `api/src/modules/federation-governance/public/dto/board-page-public.dto.ts`
- Test: `api/src/modules/federation-governance/public/governance-public.service.spec.ts`

**Interfaces:**
- Consumes: every repository and service from Tasks 1–4.
- Produces: `GET /public/board-page`, `GET /public/committees`, `GET /public/committees/:slug`, `GET /public/people/:slug`.

**Routes** (all `@Public()`, read-only):

| Method | Path | Answers |
|---|---|---|
| GET | `/public/board-page` | page settings + positions, appointments and people grouped by `rank` then `displayOrder`; committees grouped by `kind` |
| GET | `/public/committees` | standing committees each with their subs, then subs following the board |
| GET | `/public/committees/:slug` | one committee, its chair and members, and its subs or its parent |
| GET | `/public/people/:slug` | one person, current and past appointments across every cycle |

The chair of a committee is **derived**: among that committee's open appointments, the one whose position has the lowest `rank`. No role name appears in the query.

- [ ] **Step 1: Write the failing tests**

```ts
it('answers only allowlisted fields for a committee, never the raw row', async () => {
  const service = makeService({ committee: { slug: 'x', isVisible: true, kind: 'standing', internalNote: 'secret', publicationState: 'Published' } });

  const result = await service.findCommitteeBySlug('x');

  expect(Object.keys(result!)).toEqual(
    expect.arrayContaining(['id', 'slug', 'name', 'summary', 'about', 'duties', 'formationDecision', 'kind']),
  );
  expect(result).not.toHaveProperty('internalNote');
  expect(result).not.toHaveProperty('publicationState');
  expect(result).not.toHaveProperty('isActive');
});

it('hides a committee the admin has switched off', async () => {
  const service = makeService({ committee: { slug: 'x', isVisible: false } });
  await expect(service.findCommitteeBySlug('x')).resolves.toBeNull();
});

it('omits a person contact block unless showPublicContact is on', async () => {
  const service = makeService({ person: { slug: 'p', showPublicContact: false, publicContact: { email: 'a@b.c', phone: '1' } } });

  const result = await service.findPersonBySlug('p');

  expect(result!.publicContact).toBeNull();
});

it('never answers internalContact for a person', async () => {
  const service = makeService({ person: { slug: 'p', internalContact: { personalEmail: 'x@y.z', idNumber: '1' } } });

  const result = await service.findPersonBySlug('p');

  expect(JSON.stringify(result)).not.toContain('x@y.z');
  expect(result).not.toHaveProperty('internalContact');
});

it('answers null for a person with no visible appointment rather than an empty profile', async () => {
  const service = makeService({ person: { slug: 'p' }, appointments: [] });
  await expect(service.findPersonBySlug('p')).resolves.toBeNull();
});

it('still renders an appointment whose position was archived after it opened', async () => {
  const service = makeService({
    person: { slug: 'p' },
    appointments: [{ positionId: new Types.ObjectId(), termEnd: null, isVisible: true }],
    positions: [],
  });

  const result = await service.findPersonBySlug('p');

  expect(result).not.toBeNull();
  expect(result!.appointments[0].title).toBeNull();
});

it('reads the chair as the lowest rank on the committee, with no role name in the query', async () => {
  const service = makeService({
    committee: { slug: 'x', isVisible: true },
    positions: [{ _id: 'lo', rank: 2 }, { _id: 'hi', rank: 1 }],
    appointments: [{ positionId: 'lo', termEnd: null, isVisible: true }, { positionId: 'hi', termEnd: null, isVisible: true }],
  });

  const result = await service.findCommitteeBySlug('x');

  expect(result!.chair!.positionId).toBe('hi');
});

it('drops an empty section so the page and its index can hide it', async () => {
  const service = makeService({ committee: { slug: 'x', isVisible: true, duties: [] } });

  const result = await service.findCommitteeBySlug('x');

  expect(result!.duties).toEqual([]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/public/`
Expected: FAIL — module missing.

- [ ] **Step 3: Write the allowlist DTOs**

One class per shape, listing fields explicitly — never `...spread` of a document. `CommitteePublicDto`: `id, slug, name, summary, about, duties, formationDecision, documentIds, kind, parentCommitteeId, chair, members, subCommittees`. `PersonPublicDto`: `id, slug, fullName, honorific, photoId, shortBio, biography, cv, publicContact, socialLinks, appointments`. Nothing else crosses.

- [ ] **Step 4: Write the service and controller**

Each mapper is an arrow function returning the DTO by naming every field. Visible-only filters applied at every level: `isVisible !== false`, `archivedAt === null`, and for CV entries `isVisible !== false` before sorting by `order`. `publicContact` is answered as `null` unless `showPublicContact`. A missing position resolves to `title: null` rather than throwing.

- [ ] **Step 5: Run to verify it passes**

Run: `cd api && npm test -- --runInBand src/modules/federation-governance/`
Expected: PASS across the whole domain.

---

## Task 6: Migration script, written and not run

**Files:**
- Create: `api/src/bootstrap/migrate-appointments-to-positions.ts`
- Test: `api/src/bootstrap/migrate-appointments-to-positions.spec.ts`

Creates one `federationPositions` row for each legacy `roleType` still present (`President` → rank 1, `BoardMember` → rank 2, both `body: 'board'`), then points each appointment's `positionId` at the matching row.

**Dry-run is the default and the script is never executed in this batch** (§9). Writing requires an explicit `--apply` argument. Running twice with `--apply` must change nothing the second time.

- [ ] **Step 1: Write the failing test**

```ts
it('changes nothing without --apply', async () => {
  const positions = makeRepository();
  const appointments = makeRepository();
  appointments.find.mockResolvedValue([{ _id: new Types.ObjectId(), roleType: 'President' }] as never);

  const plan = await planMigration({ positions, appointments, apply: false });

  expect(plan.positionsToCreate).toHaveLength(1);
  expect(positions.create).not.toHaveBeenCalled();
  expect(appointments.updateById).not.toHaveBeenCalled();
});

it('creates nothing on a second --apply run', async () => {
  const positions = makeRepository();
  positions.find.mockResolvedValue([{ _id: new Types.ObjectId(), title: { en: 'President' }, body: 'board' }] as never);
  const appointments = makeRepository();
  appointments.find.mockResolvedValue([] as never);

  await planMigration({ positions, appointments, apply: true });

  expect(positions.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd api && npm test -- --runInBand src/bootstrap/migrate-appointments-to-positions.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `planMigration`**

Pure over its injected repositories, so the test never reaches a database. The executable wrapper at the bottom of the file reads `process.argv` and defaults `apply` to `false`.

- [ ] **Step 4: Run to verify it passes**

Run: `cd api && npm test -- --runInBand src/bootstrap/migrate-appointments-to-positions.spec.ts`
Expected: PASS.

---

## Batch close (§5.4)

- [ ] `/simplify` on this batch's changed files only — no behaviour or shape change, protected areas untouched, anything larger than a local simplification recorded and not applied. Re-run the affected files' tests after.
- [ ] Independent review via `superpowers:requesting-code-review` on a subagent that did not implement. Its instructions carry the Git constraint verbatim.
- [ ] `superpowers:verification-before-completion`: `npx tsc --noEmit` (never `nest build` — it kills a running watch server), lint, and the affected tests.
- [ ] Report to `docs/superpowers/reports/governance-G1.md` in the §14 shape, then **⏸ stop**.
