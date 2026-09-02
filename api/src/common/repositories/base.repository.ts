import { Model, Types } from 'mongoose';
import type { QueryFilter, UpdateQuery } from 'mongoose';

/**
 * Soft-delete-aware CRUD for a schema extending BaseSchema. HardDelete is
 * deliberately not exposed here — it is a separate, more privileged
 * operation (see `permissions.action`, BE-PLAN-010 §4.4) that a domain
 * repository opts into explicitly with its own named method, never inherited
 * for free.
 */
export abstract class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.model.findOne({ _id: id, archivedAt: null } as QueryFilter<T>).exec();
  }

  async findOne(filter: QueryFilter<T> = {}): Promise<T | null> {
    return this.model.findOne({ ...filter, archivedAt: null } as QueryFilter<T>).exec();
  }

  async find(filter: QueryFilter<T> = {}): Promise<T[]> {
    return this.model.find({ ...filter, archivedAt: null } as QueryFilter<T>).exec();
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async updateById(id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { returnDocument: 'after' }).exec();
  }

  async softDelete(id: string, archivedBy: Types.ObjectId): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, { archivedAt: new Date(), archivedBy }, { returnDocument: 'after' })
      .exec();
  }
}
