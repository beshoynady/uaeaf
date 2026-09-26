import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { ActivatableSingletonPageService } from './singleton-page.service.js';
import type { BaseRepository } from '../repositories/base.repository.js';

interface Row {
  _id: Types.ObjectId;
  isActive?: boolean;
}

/** The abstract base, made concrete with nothing added — the twelve hero-page
 *  services differ only in their `upsert`, which this file is not about. */
class PageUnderTest extends ActivatableSingletonPageService<Row> {
  constructor(repository: BaseRepository<Row>) {
    super(repository);
  }
}

/**
 * The switch that takes a page on and off the site, and the read that can see
 * it at all.
 *
 * `isActive` is `select: false` on the shared schema (ADR-0102 §D4), so an
 * ordinary `findOne` cannot report it. Every test here is about that: the read
 * asks for it by name, and the write touches nothing else.
 */
describe('SingletonPageService activation', () => {
  const makeRepository = (row: Row | null) => {
    const updateOneWithActivation = jest.fn(async (update: Record<string, unknown>) =>
      row ? { ...row, ...(update.$set as Partial<Row>) } : null,
    );

    return {
      findOne: jest.fn(async () => (row ? { ...row, isActive: undefined } : null)),
      findOneWithActivation: jest.fn(async () => row),
      updateOneWithActivation,
      updateById: jest.fn(),
      create: jest.fn(),
    } as unknown as BaseRepository<Row> & {
      findOne: jest.Mock;
      findOneWithActivation: jest.Mock;
      updateOneWithActivation: jest.Mock;
      updateById: jest.Mock;
    };
  };

  it('reads the row through the activation-aware read', async () => {
    const row = { _id: new Types.ObjectId(), isActive: false };
    const repository = makeRepository(row);

    await expect(new PageUnderTest(repository).get()).resolves.toEqual(row);
    // The plain `findOne` would answer without the field, and a page that reads
    // back `undefined` is a page the public gate withholds.
    expect(repository.findOneWithActivation).toHaveBeenCalled();
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('answers null before the page has ever been saved', async () => {
    await expect(new PageUnderTest(makeRepository(null)).get()).resolves.toBeNull();
  });

  it('refuses to switch a page that has never been saved', async () => {
    const service = new PageUnderTest(makeRepository(null));

    // Not an upsert: creating a row to hold a switch would put a page with no
    // title and no subtitle on the site.
    await expect(service.setActive(true, new Types.ObjectId())).rejects.toThrow(NotFoundException);
  });

  it('writes the switch and the actor, and nothing else', async () => {
    const row = { _id: new Types.ObjectId(), isActive: true };
    const repository = makeRepository(row);
    const actor = new Types.ObjectId();

    const updated = await new PageUnderTest(repository).setActive(false, actor);

    expect(updated.isActive).toBe(false);
    expect(repository.updateOneWithActivation).toHaveBeenCalledWith({
      $set: { isActive: false, updatedBy: actor },
    });
  });

  it('writes in one statement, not a read then a write', async () => {
    const repository = makeRepository({ _id: new Types.ObjectId(), isActive: true });

    await new PageUnderTest(repository).setActive(false, new Types.ObjectId());

    // Between a separate read and write another request can archive the row,
    // and the write would then resurrect a field on a deleted page.
    expect(repository.findOneWithActivation).not.toHaveBeenCalled();
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('answers the document, so the audit log can name the record', async () => {
    const row = { _id: new Types.ObjectId(), isActive: false };

    const updated = await new PageUnderTest(makeRepository(row)).setActive(true, new Types.ObjectId());

    // The audit-log interceptor records a write only when it can name the
    // record; a response without `_id` leaves the change untraceable.
    expect(updated._id).toEqual(row._id);
  });
});
