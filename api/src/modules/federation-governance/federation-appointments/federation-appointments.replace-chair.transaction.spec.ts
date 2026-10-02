import mongoose, { Types } from 'mongoose';
import type { Connection, Model } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { FederationAppointmentSchema } from './schemas/federation-appointments.schema.js';
import type { FederationAppointmentDocument } from './schemas/federation-appointments.schema.js';
import { FederationPositionSchema } from '../federation-positions/schemas/federation-positions.schema.js';
import type { FederationPositionDocument } from '../federation-positions/schemas/federation-positions.schema.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import { FederationPositionsRepository } from '../federation-positions/federation-positions.repository.js';
import { AppointmentRulesService } from './appointment-rules.service.js';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import type { FederationPersonnelsService } from '../federation-personnel/federation-personnel.service.js';
import { registerTestModel } from '../../../../test/utils/mongo-memory-server.js';

// Transactions need a replica set; the shared helper starts a standalone server.
const LAUNCH_TIMEOUT_MS = 25_000;

/**
 * `replaceChairOfCommittee` closes the sole holder of a capped position and
 * opens the next one inside a single transaction. Runs against a real
 * replica set because the property under test — the cap check seeing its
 * own uncommitted close — is exactly what a mocked session cannot prove: a
 * mocked session commits whatever it is handed.
 */
describe('FederationAppointmentsService.replaceChairOfCommittee — the cap check sees its own close', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let appointmentModel: Model<FederationAppointmentDocument>;
  let positionModel: Model<FederationPositionDocument>;
  let service: FederationAppointmentsService;

  const ACTOR = new Types.ObjectId();
  const title = { en: 'Chair', ar: 'رئيس' };

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [{ launchTimeout: LAUNCH_TIMEOUT_MS }],
    });
    connection = await mongoose.createConnection(replSet.getUri()).asPromise();
    appointmentModel = registerTestModel<FederationAppointmentDocument>(
      'FederationAppointment',
      FederationAppointmentSchema,
      connection,
    );
    positionModel = registerTestModel<FederationPositionDocument>(
      'FederationPosition',
      FederationPositionSchema,
      connection,
    );
    // init() waits for the collection and its index builds; a catalog change
    // still in flight when a transaction first writes makes that write fail
    // intermittently.
    await Promise.all([appointmentModel.init(), positionModel.init()]);

    const appointments = new FederationAppointmentsRepository(appointmentModel);
    const positions = new FederationPositionsRepository(positionModel);
    const rules = new AppointmentRulesService(positions, appointments);
    // Unused by replaceChairOfCommittee(); present only so the constructor compiles.
    const personnel = {} as unknown as FederationPersonnelsService;
    service = new FederationAppointmentsService(appointments, personnel, rules, connection, positions);
  }, 60_000);

  afterEach(async () => {
    await Promise.all([appointmentModel.deleteMany({}), positionModel.deleteMany({})]);
  });

  afterAll(async () => {
    await connection?.close();
    await replSet?.stop();
  });

  it('replaces the sole holder of a maxHolders:1 chair, closing the old one with the right endReason', async () => {
    const [position] = await positionModel.create([
      { title, body: 'committee', rank: 1, displayOrder: 1, maxHolders: 1, isVisible: true },
    ]);
    const committeeId = new Types.ObjectId();
    const cycleId = new Types.ObjectId();
    const oldPersonId = new Types.ObjectId();
    const newPersonId = new Types.ObjectId();

    const [oldChair] = await appointmentModel.create([
      {
        personId: oldPersonId,
        positionId: position._id,
        committeeId,
        electionCycleId: cycleId,
        termStart: new Date('2025-01-01'),
        termEnd: null,
        status: 'Active',
        displayOrder: 1,
      },
    ]);

    const created = await service.replaceChairOfCommittee(
      {
        committeeId: committeeId.toString(),
        cycleId: cycleId.toString(),
        positionId: position._id.toString(),
        personId: newPersonId.toString(),
        termStart: '2026-02-01',
        endReason: 'transitioned',
        displayOrder: 1,
      },
      ACTOR,
    );

    expect(created.personId.toString()).toBe(newPersonId.toString());
    expect(created.termEnd).toBeNull();

    const closed = await appointmentModel.findById(oldChair._id).lean();
    expect(closed?.endReason).toBe('transitioned');
    expect(closed?.status).toBe('Transitioned');
    expect(closed?.termEnd).toEqual(new Date('2026-02-01'));
  });
});
