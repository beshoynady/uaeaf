import 'reflect-metadata';
import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { AgeCategoriesService } from '../../modules/athletics/age-categories/age-categories.service.js';
import { UpdateAgeCategoryDto } from '../../modules/athletics/age-categories/dto/update-age-category.dto.js';
import { AthleteCoachHistoryService } from '../../modules/people-organizations/athlete-coach-history/athlete-coach-history.service.js';
import { UpdateAthleteCoachHistoryDto } from '../../modules/people-organizations/athlete-coach-history/dto/update-athlete-coach-history.dto.js';
import { AthleteGuardianRelationshipsService } from '../../modules/people-organizations/athlete-guardian-relationships/athlete-guardian-relationships.service.js';
import { UpdateAthleteGuardianRelationshipDto } from '../../modules/people-organizations/athlete-guardian-relationships/dto/update-athlete-guardian-relationship.dto.js';
import { AthleteNationalTeamHistoryService } from '../../modules/people-organizations/athlete-national-team-history/athlete-national-team-history.service.js';
import { UpdateAthleteNationalTeamHistoryDto } from '../../modules/people-organizations/athlete-national-team-history/dto/update-athlete-national-team-history.dto.js';
import { AthleteProfilesService } from '../../modules/people-organizations/athlete-profiles/athlete-profiles.service.js';
import { UpdateAthleteProfileDto } from '../../modules/people-organizations/athlete-profiles/dto/update-athlete-profile.dto.js';
import { AthletesService } from '../../modules/people-organizations/athletes/athletes.service.js';
import { UpdateAthleteDto } from '../../modules/people-organizations/athletes/dto/update-athlete.dto.js';
import { ClubTeamsService } from '../../modules/people-organizations/club-teams/club-teams.service.js';
import { UpdateClubTeamDto } from '../../modules/people-organizations/club-teams/dto/update-club-team.dto.js';
import { ClubsService } from '../../modules/people-organizations/clubs/clubs.service.js';
import { UpdateClubDto } from '../../modules/people-organizations/clubs/dto/update-club.dto.js';
import { CoachesService } from '../../modules/people-organizations/coaches/coaches.service.js';
import { UpdateCoachDto } from '../../modules/people-organizations/coaches/dto/update-coach.dto.js';
import { CommitteesService } from '../../modules/federation-governance/committees/committees.service.js';
import { UpdateCommitteeDto } from '../../modules/federation-governance/committees/dto/update-committees.dto.js';
import { CountriesService } from '../../modules/people-organizations/countries/countries.service.js';
import { UpdateCountryDto } from '../../modules/people-organizations/countries/dto/update-country.dto.js';
import { DisciplinesService } from '../../modules/athletics/disciplines/disciplines.service.js';
import { UpdateDisciplineDto } from '../../modules/athletics/disciplines/dto/update-discipline.dto.js';
import { DocumentsService } from '../../modules/documents/documents/documents.service.js';
import { UpdateDocumentDto } from '../../modules/documents/documents/dto/update-document.dto.js';
import { ElectionCyclesService } from '../../modules/federation-governance/election-cycles/election-cycles.service.js';
import { UpdateElectionCycleDto } from '../../modules/federation-governance/election-cycles/dto/update-election-cycles.dto.js';
import { FederationsService } from '../../modules/federation-governance/federation/federation.service.js';
import { UpdateFederationDto } from '../../modules/federation-governance/federation/dto/update-federation.dto.js';
import { FederationAppointmentsService } from '../../modules/federation-governance/federation-appointments/federation-appointments.service.js';
import { UpdateFederationAppointmentDto } from '../../modules/federation-governance/federation-appointments/dto/update-federation-appointments.dto.js';
import { FederationPersonnelsService } from '../../modules/federation-governance/federation-personnel/federation-personnel.service.js';
import { UpdateFederationPersonnelDto } from '../../modules/federation-governance/federation-personnel/dto/update-federation-personnel.dto.js';
import { GovernanceDocumentsService } from '../../modules/federation-governance/governance-documents/governance-documents.service.js';
import { UpdateGovernanceDocumentDto } from '../../modules/federation-governance/governance-documents/dto/update-governance-documents.dto.js';
import { MediaAssetsService } from '../../modules/media-center/media-assets/media-assets.service.js';
import { UpdateMediaAssetDto } from '../../modules/media-center/media-assets/dto/update-media-asset.dto.js';
import { NavigationMenusService } from '../../modules/cms-page-composition/navigation-menus/navigation-menus.service.js';
import { UpdateNavigationMenuDto } from '../../modules/cms-page-composition/navigation-menus/dto/update-navigation-menus.dto.js';
import { OfficialAssignmentsService } from '../../modules/people-organizations/official-assignments/official-assignments.service.js';
import { UpdateOfficialAssignmentDto } from '../../modules/people-organizations/official-assignments/dto/update-official-assignment.dto.js';
import { OfficialProfilesService } from '../../modules/people-organizations/official-profiles/official-profiles.service.js';
import { UpdateOfficialProfileDto } from '../../modules/people-organizations/official-profiles/dto/update-official-profile.dto.js';
import { OfficialsService } from '../../modules/people-organizations/officials/officials.service.js';
import { UpdateOfficialDto } from '../../modules/people-organizations/officials/dto/update-official.dto.js';
import { PagesService } from '../../modules/cms-page-composition/pages/pages.service.js';
import { UpdatePageDto } from '../../modules/cms-page-composition/pages/dto/update-pages.dto.js';
import { VenuesService } from '../../modules/people-organizations/venues/venues.service.js';
import { UpdateVenueDto } from '../../modules/people-organizations/venues/dto/update-venue.dto.js';
import { WorkflowDefinitionsService } from '../../modules/workflow/workflow-definitions/workflow-definitions.service.js';
import { UpdateWorkflowDefinitionDto } from '../../modules/workflow/workflow-definitions/dto/update-workflow-definition.dto.js';
import { WorkflowStepsService } from '../../modules/workflow/workflow-steps/workflow-steps.service.js';
import { UpdateWorkflowStepDto } from '../../modules/workflow/workflow-steps/dto/update-workflow-step.dto.js';
import { PageSectionsService } from '../../modules/cms-page-composition/page-sections/page-sections.service.js';
import { UpdatePageSectionDto } from '../../modules/cms-page-composition/page-sections/dto/update-page-sections.dto.js';
import { SponsorshipsService } from '../../modules/sponsorship-relations/sponsorships/sponsorships.service.js';
import { UpdateSponsorshipDto } from '../../modules/sponsorship-relations/sponsorships/dto/create-sponsorship.dto.js';
import { MembershipsService } from '../../modules/sponsorship-relations/memberships/memberships.service.js';
import { UpdateMembershipDto } from '../../modules/sponsorship-relations/memberships/dto/create-membership.dto.js';
import { PartnershipsService } from '../../modules/sponsorship-relations/partnerships/partnerships.service.js';
import { UpdatePartnershipDto } from '../../modules/sponsorship-relations/partnerships/dto/create-partnership.dto.js';

/**
 * The ES2023 partial-update trap (Task 6, Batch 2), asserted once per real
 * service rather than once against one DTO with the pattern assumed for the
 * other 26 (independent review amendment, Task 6: "the trap is per-service,
 * so only a per-service assertion covers it").
 *
 * `ValidationPipe({ transform: true })` hands a service a DTO instance, and
 * under ES2023 class-field semantics every property the DTO class declares
 * is an own property of that instance — `undefined` when the request did not
 * send it. A service that merges by spreading the DTO (`{ ...dto }`,
 * `repository.updateById(id, dto)`, or any hand-rolled presence check other
 * than `!== undefined`) therefore writes `undefined` over every field the
 * caller did not mention — this codebase's `updatePreferences` bug: setting
 * the theme wiped the language on every call, because the presence check
 * used `in`, which is `true` for a declared field whether or not it was
 * sent. The shared `partialUpdate()` helper (`common/utils/partial-update.util.ts`)
 * fixes this once; this file proves each of the 27 Task 6 services actually
 * calls it rather than re-deriving (and possibly getting wrong) the same
 * merge inline.
 *
 * Deliberately narrow, and that is the point: each row sends exactly ONE
 * field and asserts the object hitting the mocked repository has EXACTLY
 * that one key. A service that spreads the whole DTO fails immediately,
 * because every other declared field of that DTO would appear too (as
 * `undefined`, but still an own key `Object.keys` reports).
 *
 * `partialUpdate()`'s own contract — filters by `!== undefined`, keeps an
 * explicit `null` (a clear), and returns `{}` for an empty body — is unit
 * tested directly, once, in `common/utils/partial-update.util.spec.ts`. That
 * is a different question from this file's: whether the function is
 * *correct*, versus whether all 27 services actually *call* it. Repeating
 * the null/empty-body cases 27 times here would test the same pure function
 * 27 times without touching the risk this file exists for.
 *
 * Every row's "extra" constructor dependencies (a second service, a second
 * Mongoose model, a storage provider, ...) are stubbed as `{}` rather than
 * mocked in any detail: each row's chosen field is one none of the 27
 * `update()` methods needs a second service to validate for THIS assertion
 * (verified by reading every `update()` body while writing this table). If a
 * stub were ever actually called, the row fails loudly (`stub.method is not
 * a function`) rather than silently — nothing here swallows that failure.
 *
 * Fix round 2 addendum — the blind spot the reviewer found in this file's
 * own reasoning. The claim above ("the null/empty-body cases are answered
 * once, not repeated 27 times") quietly stops holding for exactly the
 * resources whose `update()` does something with a field AFTER
 * `partialUpdate()` — a manual `setObjectIdField`/`setDateField`/
 * `setObjectIdArrayField` call. For those, `null` is not "whatever
 * `partialUpdate` already proved safe" — it is a THIRD code path with its
 * own bug class (Fix round 2:
 * `new Types.ObjectId(null)` mints a random id instead of refusing or
 * clearing), and this file's first version picked exactly one payload per
 * row without ever sending `null` through one of those paths. The blind spot
 * was not random: it sat precisely where the shared reasoning stopped
 * applying.
 *
 * `NULL_CASES` below is the fix: one row per field any `update()` in this
 * batch hands to a setter, asserting the schema-correct outcome — `null`
 * written when the field is nullable, refused with `BadRequestException`
 * when it is not. Ten resources carried at least one as of Fix round 2:
 * `disciplines`, `documents`, `electionCycles`, `federation`,
 * `federationAppointments`, `federationPersonnel`, `officialAssignments`,
 * `pages`, `venues` and `workflowSteps` — the reviewer's own list of 8 plus
 * `federation.logoId` and `pages.seo.ogImageId`, found during the same
 * migration and fixed the same way. `governanceDocuments` is NOT in this
 * list even though the reviewer's `fileId` finding was about it: Fix
 * round 1 omitted `fileId` from `UpdateGovernanceDocumentDto` entirely (a
 * relink field, made unreachable rather than merely null-safe), so its
 * `update()` no longer calls a setter for it at all.
 *
 * Fix round 4 added four more resources, migrated off the raw-cast scan's
 * exclusion list in the same change that fixed the live defect each one
 * carried: `pageSections` (`items`, plus `visibleFrom`/`visibleUntil`,
 * already-safe fields migrated for the guard's zero-tolerance rule rather
 * than because they were broken), `sponsorships`, `memberships` and
 * `partnerships` (`startDate`, plus each one's own nullable `endDate` and
 * logo/banner reference field).
 */

const asDelivered = <T extends object>(Dto: new () => T, body: object): T => plainToInstance(Dto, body);

/**
 * `findById` defaults to resolving `null`: harmless for the 26 resources
 * whose `update()` never calls it. `workflowSteps.update()` is the one
 * exception (Fix round 1, CLAUDE.md §31 — it merges the patch onto the
 * CURRENT stored step to re-check `unsatisfiableStep`), so that row alone
 * passes a real stored step to resolve instead.
 */
const repositoryStub = (findByIdResult: unknown = null) => ({
  updateById: jest.fn(async (id: string, update: Record<string, unknown>) => ({ _id: id, ...update })),
  findById: jest.fn(async () => findByIdResult),
});

interface Row {
  resource: string;
  build: () => { update: (id: string, dto: object) => Promise<unknown> };
  repo: ReturnType<typeof repositoryStub>;
  Dto: new () => Record<string, unknown>;
  payload: Record<string, unknown>;
}

/** One row per Task 6 resource — the 27, in the same order the task's own
 *  derivation lists them. `repo` is created outside `build()` so the test
 *  can read `repo.updateById.mock.calls` after calling `service.update()`. */
const rows: readonly Row[] = (() => {
  const table: { resource: string; repo: ReturnType<typeof repositoryStub>; row: Row }[] = [];
  const add = <T extends object>(
    resource: string,
    ServiceCtor: new (repo: never, ...rest: never[]) => { update: (id: string, dto: T) => Promise<unknown> },
    Dto: new () => T,
    payload: Record<string, unknown>,
    extraArgCount: number,
    findByIdResult: unknown = null,
    // Per-position override for an extra ctor dependency that `update()`
    // actually calls (rather than merely holds) — every other position still
    // gets the blank `{}` the file header describes. `committees` is the
    // first row to need this: its `update()` reads the row via `findById`
    // (like `workflowSteps`, covered by `findByIdResult` above) AND calls
    // `hierarchyService.assertPlacementAllowed`, so that one extra needs a
    // callable stub or the row fails on "not a function", not on the thing
    // this table exists to check.
    extraStubs: readonly unknown[] = [],
  ) => {
    const repo = repositoryStub(findByIdResult);
    const extras = Array.from({ length: extraArgCount }, (_unused, i) => (extraStubs[i] ?? {}) as never);
    const service = new ServiceCtor(repo as never, ...extras);
    table.push({
      resource,
      repo,
      row: { resource, build: () => service, repo, Dto, payload } as unknown as Row,
    });
  };

  add('ageCategories', AgeCategoriesService, UpdateAgeCategoryDto, { minAge: 21 }, 0);
  add('athleteCoachHistory', AthleteCoachHistoryService, UpdateAthleteCoachHistoryDto, { endDate: '2027-01-01' }, 0);
  add(
    'athleteGuardianRelationships',
    AthleteGuardianRelationshipsService,
    UpdateAthleteGuardianRelationshipDto,
    { isActive: false },
    0,
  );
  add(
    'athleteNationalTeamHistory',
    AthleteNationalTeamHistoryService,
    UpdateAthleteNationalTeamHistoryDto,
    { endDate: '2027-01-01' },
    0,
  );
  add('athleteProfiles', AthleteProfilesService, UpdateAthleteProfileDto, { status: 'Inactive' }, 2);
  add('athletes', AthletesService, UpdateAthleteDto, { residencyType: 'Guest' }, 0);
  add('clubTeams', ClubTeamsService, UpdateClubTeamDto, { gender: 'Female' }, 0);
  add('clubs', ClubsService, UpdateClubDto, { status: 'Inactive' }, 0);
  add('coaches', CoachesService, UpdateCoachDto, { status: 'Inactive' }, 0);
  add(
    'committees',
    CommitteesService,
    UpdateCommitteeDto,
    { isActive: false },
    3,
    // Unclassified, no parent — the guard returns on the first check, so the
    // stored shape need only supply what `update()` actually reads.
    { kind: null, parentCommitteeId: null },
    [{}, {}, { assertPlacementAllowed: async () => undefined }],
  );
  add('countries', CountriesService, UpdateCountryDto, { type: 'Emirate' }, 0);
  add('disciplines', DisciplinesService, UpdateDisciplineDto, { isInternationallyCertified: true }, 0);
  add('documents', DocumentsService, UpdateDocumentDto, { documentType: 'Bylaw' }, 2);
  add('electionCycles', ElectionCyclesService, UpdateElectionCycleDto, { cycleNumber: 5 }, 0);
  add('federation', FederationsService, UpdateFederationDto, { status: 'Inactive' }, 1);
  add(
    'federationAppointments',
    FederationAppointmentsService,
    UpdateFederationAppointmentDto,
    { status: 'Completed' },
    1,
  );
  add(
    'federationPersonnel',
    FederationPersonnelsService,
    UpdateFederationPersonnelDto,
    { status: 'Inactive' },
    1,
    // Task 4: update() now loads the existing row first, to refuse a
    // changed slug — a truthy stand-in so that check passes through.
    { slug: 'existing-slug' },
  );
  add('governanceDocuments', GovernanceDocumentsService, UpdateGovernanceDocumentDto, { documentVersion: 'v2' }, 3);
  add('mediaAssets', MediaAssetsService, UpdateMediaAssetDto, { isFeatured: true }, 2);
  add('navigationMenus', NavigationMenusService, UpdateNavigationMenuDto, { location: 'Footer' }, 0);
  add('officialAssignments', OfficialAssignmentsService, UpdateOfficialAssignmentDto, { role: 'Referee' }, 0);
  add('officialProfiles', OfficialProfilesService, UpdateOfficialProfileDto, { status: 'Inactive' }, 2);
  add('officials', OfficialsService, UpdateOfficialDto, { residencyType: 'Guest' }, 0);
  add('pages', PagesService, UpdatePageDto, { status: 'Draft' }, 1);
  add('venues', VenuesService, UpdateVenueDto, { latitude: 25.2 }, 0);
  add('workflowDefinitions', WorkflowDefinitionsService, UpdateWorkflowDefinitionDto, { isActive: false }, 0);
  add(
    'workflowSteps',
    WorkflowStepsService,
    UpdateWorkflowStepDto,
    { stepType: 'Parallel' },
    0,
    // A self-consistent stored step (1 required approval, 1 distinct
    // assignee) so the merged-state `unsatisfiableStep` re-check (Fix round
    // 1) passes trivially — this row's payload touches neither field.
    { requiredApprovals: 1, assigneeIds: ['000000000000000000000002'] },
  );

  return table.map(({ row }) => row);
})();

describe('partial update — the ES2023 trap, per service', () => {
  it('covers exactly the 27 resources Task 6 adds Update to', () => {
    // A count that silently drops matters as much as one that grows it: 27
    // rows proving the trap is avoided is worth nothing if a 28th resource
    // slipped in unnoticed, or one of the 27 was quietly dropped.
    expect(rows).toHaveLength(27);
    expect(new Set(rows.map((row) => row.resource)).size).toBe(27);
  });

  describe.each(rows.map((row) => [row.resource, row] as const))(
    '%s',
    (_resource, { build, repo, Dto, payload }) => {
      it('leaves every field the request never mentioned untouched', async () => {
        const service = build();
        const dto = asDelivered(Dto, payload);

        await service.update('000000000000000000000001', dto);

        expect(repo.updateById).toHaveBeenCalledTimes(1);
        const written = repo.updateById.mock.calls[0]?.[1] as Record<string, unknown>;
        expect(Object.keys(written)).toEqual(Object.keys(payload));
      });
    },
  );
});

const ID = '000000000000000000000001';
const REF_A = '000000000000000000000002';
const REF_B = '000000000000000000000003';

interface NullCase {
  resource: string;
  field: string;
  nullable: boolean;
  build: () => { update: (id: string, dto: object) => Promise<unknown> };
  repo: ReturnType<typeof repositoryStub>;
  Dto: new () => Record<string, unknown>;
  /** Usually `{ [field]: null }` — `pages` nests it under `seo`. */
  payload: Record<string, unknown>;
  /** Reads the field back out of the captured write for a `nullable: true`
   *  row — the field itself, except `pages`, which nests it under `seo`. */
  readWritten: (written: Record<string, unknown>) => unknown;
}

/**
 * One row per field a Task 6 `update()` hands to `setObjectIdField`/
 * `setDateField`/`setObjectIdArrayField` — see the file header for why this
 * table exists separately from `rows` above. `nullable` is read from each
 * resource's OWN schema file (never inferred from the DTO), matching how the
 * production code itself decided it; the corresponding schema/line is named
 * in each service's own Fix round 2 comment.
 */
const NULL_CASES: readonly NullCase[] = (() => {
  const cases: NullCase[] = [];
  const add = <T extends object>(
    resource: string,
    field: string,
    nullable: boolean,
    ServiceCtor: new (repo: never, ...rest: never[]) => { update: (id: string, dto: T) => Promise<unknown> },
    Dto: new () => T,
    payload: Record<string, unknown>,
    extraArgCount: number,
    options: { findByIdResult?: unknown; readWritten?: (written: Record<string, unknown>) => unknown } = {},
  ) => {
    const repo = repositoryStub(options.findByIdResult ?? null);
    const extras = Array.from({ length: extraArgCount }, () => ({}) as never);
    const service = new ServiceCtor(repo as never, ...extras);
    cases.push({
      resource,
      field,
      nullable,
      build: () => service,
      repo,
      Dto,
      payload,
      readWritten: options.readWritten ?? ((written) => written[field]),
    } as unknown as NullCase);
  };

  add('disciplines', 'coverImage', true, DisciplinesService, UpdateDisciplineDto, { coverImage: null }, 0);

  add('documents', 'ownerId', true, DocumentsService, UpdateDocumentDto, { ownerId: null }, 2);
  add('documents', 'effectiveDate', false, DocumentsService, UpdateDocumentDto, { effectiveDate: null }, 2);
  add('documents', 'expiryDate', true, DocumentsService, UpdateDocumentDto, { expiryDate: null }, 2);

  add(
    'electionCycles',
    'federationId',
    false,
    ElectionCyclesService,
    UpdateElectionCycleDto,
    { federationId: null },
    0,
  );
  add('electionCycles', 'startDate', false, ElectionCyclesService, UpdateElectionCycleDto, { startDate: null }, 0);
  add('electionCycles', 'endDate', false, ElectionCyclesService, UpdateElectionCycleDto, { endDate: null }, 0);

  add('federation', 'logoId', false, FederationsService, UpdateFederationDto, { logoId: null }, 1);

  add(
    'federationAppointments',
    'personId',
    false,
    FederationAppointmentsService,
    UpdateFederationAppointmentDto,
    { personId: null },
    1,
  );
  add(
    'federationAppointments',
    'supersedesAppointmentId',
    true,
    FederationAppointmentsService,
    UpdateFederationAppointmentDto,
    { supersedesAppointmentId: null },
    1,
  );
  add(
    'federationAppointments',
    'committeeId',
    true,
    FederationAppointmentsService,
    UpdateFederationAppointmentDto,
    { committeeId: null },
    1,
  );
  add(
    'federationAppointments',
    'electionCycleId',
    true,
    FederationAppointmentsService,
    UpdateFederationAppointmentDto,
    { electionCycleId: null },
    1,
  );
  add(
    'federationAppointments',
    'termStart',
    false,
    FederationAppointmentsService,
    UpdateFederationAppointmentDto,
    { termStart: null },
    1,
  );
  add(
    'federationAppointments',
    'termEnd',
    true,
    FederationAppointmentsService,
    UpdateFederationAppointmentDto,
    { termEnd: null },
    1,
  );

  add(
    'federationPersonnel',
    'photoId',
    true,
    FederationPersonnelsService,
    UpdateFederationPersonnelDto,
    { photoId: null },
    1,
    // Task 4: update() now loads the existing row first, to refuse a
    // changed slug — a truthy stand-in so that check passes through.
    { findByIdResult: { slug: 'existing-slug' } },
  );
  add(
    'federationPersonnel',
    'nationalityId',
    false,
    FederationPersonnelsService,
    UpdateFederationPersonnelDto,
    { nationalityId: null },
    1,
    { findByIdResult: { slug: 'existing-slug' } },
  );

  add(
    'officialAssignments',
    'officialId',
    false,
    OfficialAssignmentsService,
    UpdateOfficialAssignmentDto,
    { officialId: null },
    0,
  );
  add(
    'officialAssignments',
    'targetId',
    false,
    OfficialAssignmentsService,
    UpdateOfficialAssignmentDto,
    { targetId: null },
    0,
  );

  add('pages', 'ogImageId', true, PagesService, UpdatePageDto, { seo: { ogImageId: null } }, 1, {
    readWritten: (written) => (written.seo as Record<string, unknown> | null)?.ogImageId,
  });

  add('venues', 'countryId', false, VenuesService, UpdateVenueDto, { countryId: null }, 0);
  add('venues', 'ownerClubId', true, VenuesService, UpdateVenueDto, { ownerClubId: null }, 0);

  // workflowSteps.update() fetches the current step before writing, so every
  // row needs a self-consistent stored step to merge against — same as the
  // `rows` table above.
  const storedStep = { requiredApprovals: 1, assigneeIds: [REF_A] };
  add(
    'workflowSteps',
    'workflowDefinitionId',
    false,
    WorkflowStepsService,
    UpdateWorkflowStepDto,
    { workflowDefinitionId: null },
    0,
    { findByIdResult: storedStep },
  );
  add(
    'workflowSteps',
    'assigneeIds',
    false,
    WorkflowStepsService,
    UpdateWorkflowStepDto,
    { assigneeIds: null },
    0,
    { findByIdResult: storedStep },
  );
  // `workflowSteps.requiredApprovals` has no row here: it reaches no setter,
  // so the only thing that could refuse it at this layer was a hand-written
  // `=== null` check in the service. `UpdateWorkflowStepDto` is built with
  // `PartialType(…, { skipNullProperties: false })`, which refuses it at the
  // validation boundary for every plain field of every resource at once —
  // asserted in `common/utils/update-dto-null.spec.ts`, and held there by
  // `raw-dto-cast-scan.spec.ts`'s scan of every `Update*Dto`.

  // Fix round 4: the four resources migrated off the raw-cast scan's
  // exclusion list, each needing a truthy `findById` stub because their
  // `update()` fetches the current row before writing (same reason
  // `workflowSteps` needs one above).
  const storedSection = {
    visibleFrom: null,
    visibleUntil: null,
    sectionType: 'TEXT',
    configuration: null,
    ctaText: null,
    ctaUrl: null,
  };
  add('pageSections', 'visibleFrom', true, PageSectionsService, UpdatePageSectionDto, { visibleFrom: null }, 0, {
    findByIdResult: storedSection,
  });
  add('pageSections', 'visibleUntil', true, PageSectionsService, UpdatePageSectionDto, { visibleUntil: null }, 0, {
    findByIdResult: storedSection,
  });
  add('pageSections', 'items', false, PageSectionsService, UpdatePageSectionDto, { items: null }, 0, {
    findByIdResult: storedSection,
  });

  // `targetType: 'Federation'` so `assertEndForTarget` does not also demand
  // a truthy `endDate` for these rows, which are testing `startDate`/
  // `endDate`/`bannerAssetId` in isolation.
  const storedSponsorship = { startDate: new Date('2026-01-01'), endDate: null, targetType: 'Federation', targetId: null };
  add('sponsorships', 'startDate', false, SponsorshipsService, UpdateSponsorshipDto, { startDate: null }, 3, {
    findByIdResult: storedSponsorship,
  });
  add('sponsorships', 'endDate', true, SponsorshipsService, UpdateSponsorshipDto, { endDate: null }, 3, {
    findByIdResult: storedSponsorship,
  });
  add('sponsorships', 'bannerAssetId', true, SponsorshipsService, UpdateSponsorshipDto, { bannerAssetId: null }, 3, {
    findByIdResult: storedSponsorship,
  });

  const storedMembership = { startDate: new Date('2026-01-01'), endDate: null };
  add('memberships', 'startDate', false, MembershipsService, UpdateMembershipDto, { startDate: null }, 2, {
    findByIdResult: storedMembership,
  });
  add('memberships', 'endDate', true, MembershipsService, UpdateMembershipDto, { endDate: null }, 2, {
    findByIdResult: storedMembership,
  });
  add(
    'memberships',
    'organizationLogoId',
    true,
    MembershipsService,
    UpdateMembershipDto,
    { organizationLogoId: null },
    2,
    { findByIdResult: storedMembership },
  );

  const storedPartnership = { startDate: new Date('2026-01-01'), endDate: null };
  add('partnerships', 'startDate', false, PartnershipsService, UpdatePartnershipDto, { startDate: null }, 2, {
    findByIdResult: storedPartnership,
  });
  add('partnerships', 'endDate', true, PartnershipsService, UpdatePartnershipDto, { endDate: null }, 2, {
    findByIdResult: storedPartnership,
  });
  add('partnerships', 'partnerLogoId', true, PartnershipsService, UpdatePartnershipDto, { partnerLogoId: null }, 2, {
    findByIdResult: storedPartnership,
  });

  return cases;
})();

describe('partial update — explicit null on a field the update() post-processes', () => {
  it('covers every field a Task 6+ update() hands to a setter, across the 14 resources that have one', () => {
    expect(new Set(NULL_CASES.map((c) => c.resource)).size).toBe(14);
    expect(NULL_CASES.length).toBe(35);
  });

  describe.each(NULL_CASES.map((c) => [`${c.resource}.${c.field}`, c] as const))(
    '%s',
    (_label, { field, nullable, build, repo, Dto, payload, readWritten }) => {
      if (nullable) {
        it('clears the field rather than inventing a fresh id or the Unix epoch', async () => {
          const service = build();
          const dto = asDelivered(Dto, payload);

          await service.update(ID, dto);

          expect(repo.updateById).toHaveBeenCalledTimes(1);
          const written = repo.updateById.mock.calls[0]?.[1] as Record<string, unknown>;
          expect(readWritten(written)).toBeNull();
        });
      } else {
        it('refuses null rather than writing it or inventing a fresh id', async () => {
          const service = build();
          const dto = asDelivered(Dto, payload);

          await expect(service.update(ID, dto)).rejects.toThrow(BadRequestException);
          expect(repo.updateById).not.toHaveBeenCalled();
        });
      }
    },
  );
});

/**
 * The inverse of the merged-state refusal above (Fix round 1's own test
 * already covers "raised alone, refused"): raising `requiredApprovals`
 * WHILE sending enough new assignees in the SAME patch still has to
 * succeed. Kept here, beside the null cases, because it is the other half
 * of the same review finding — a fix that made every `requiredApprovals`
 * edit refuse null would also have to prove it does not refuse a legitimate
 * raise.
 */
describe('workflowSteps.update — raising requiredApprovals with enough new assignees still succeeds', () => {
  it('succeeds when the merged assignee count meets the merged threshold', async () => {
    const repo = repositoryStub({ requiredApprovals: 1, assigneeIds: [REF_A] });
    const service = new WorkflowStepsService(repo as never);

    await service.update(
      ID,
      asDelivered(UpdateWorkflowStepDto, { requiredApprovals: 2, assigneeIds: [REF_A, REF_B] }),
    );

    expect(repo.updateById).toHaveBeenCalledTimes(1);
  });
});
