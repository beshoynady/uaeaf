import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { CreateRevisionDto } from './create-revision.dto.js';

/**
 * The request names the record to freeze and nothing else. The snapshot is
 * built by the server from what is stored, so a body that brings its own is
 * refused rather than silently ignored — a caller relying on it would
 * otherwise believe their text had been frozen when it had not.
 */
describe('CreateRevisionDto', () => {
  const entityId = new Types.ObjectId().toString();

  const propertiesRefused = async (body: object) => {
    const errors = await validate(plainToInstance(CreateRevisionDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return errors.map((error) => error.property);
  };

  it('accepts the entity type and id alone', async () => {
    expect(await propertiesRefused({ entityType: 'presidentMessagePage', entityId })).toEqual([]);
  });

  it('refuses a snapshot supplied by the caller', async () => {
    const refused = await propertiesRefused({
      entityType: 'presidentMessagePage',
      entityId,
      snapshotData: { messageBody: 'text nobody reviewed' },
    });

    expect(refused).toContain('snapshotData');
  });
});
