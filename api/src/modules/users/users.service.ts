import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { UsersRepository } from './users.repository.js';
import type { UserDocument } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LOCKOUT_DURATION_MINUTES, LOCKOUT_THRESHOLD } from '../../config/auth.config.js';

const PASSWORD_HASH_ROUNDS = 10;

/** Implements: users collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7819). */
@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  /** Hashes the plaintext password and stores it as the user's Local
   *  authMethod entry — the plaintext value itself is never persisted. */
  async create(dto: CreateUserDto): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);
    return this.repository.create({
      name: dto.name,
      email: dto.email,
      accountStatus: 'Active',
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });
  }

  async findAll(): Promise<UserDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.repository.findById(id);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.repository.findByEmail(email);
  }

  async assignRoles(id: string, roleIds: Types.ObjectId[]): Promise<UserDocument | null> {
    return this.repository.updateById(id, { roleIds });
  }

  async recordSuccessfulLogin(id: string): Promise<void> {
    await this.repository.updateById(id, {
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  /** @param currentAttempts the caller's already-fetched
   *  `user.failedLoginAttempts`, so this does one write, not a
   *  read-then-write against a value that could have moved. Sets
   *  `lockedUntil` the moment the incremented count reaches
   *  LOCKOUT_THRESHOLD. */
  async recordFailedLogin(id: string, currentAttempts: number): Promise<void> {
    const failedLoginAttempts = currentAttempts + 1;
    const update: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts };
    if (failedLoginAttempts >= LOCKOUT_THRESHOLD) {
      update.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    }
    await this.repository.updateById(id, update);
  }
}
