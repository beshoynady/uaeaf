import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { CreateFederationAppointmentDto } from './create-federation-appointments.dto.js';

/**
 * `positionId` is the sole source of what an appointment is — no `roleType`
 * exists to fall back on — so a request that omits it must be refused here,
 * the same pipeline the global `ValidationPipe` runs.
 */
const errorsOf = async (body: Record<string, unknown>) =>
  validate(plainToInstance(CreateFederationAppointmentDto, body));

const validBody = () => ({
  personId: new Types.ObjectId().toString(),
  positionId: new Types.ObjectId().toString(),
  termStart: '2026-01-01',
  status: 'Active',
  displayOrder: 1,
});

describe('CreateFederationAppointmentDto — positionId', () => {
  it('refuses a body with no positionId at all', async () => {
    const { positionId: _omitted, ...body } = validBody();

    const errors = await errorsOf(body);

    expect(errors.map((error) => error.property)).toContain('positionId');
  });

  it('refuses a positionId that is not a Mongo id', async () => {
    const errors = await errorsOf({ ...validBody(), positionId: 'not-an-id' });

    expect(errors.map((error) => error.property)).toContain('positionId');
  });

  it('accepts a body carrying a real positionId', async () => {
    const errors = await errorsOf(validBody());

    expect(errors.map((error) => error.property)).not.toContain('positionId');
  });
});
