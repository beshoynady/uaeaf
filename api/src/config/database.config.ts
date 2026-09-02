import { registerAs } from '@nestjs/config';

/** MongoDB connection settings, read from MONGODB_URI (see BE-PLAN-010 §2.5). */
export const databaseConfig = registerAs('database', () => ({
  uri: process.env.MONGODB_URI,
}));
