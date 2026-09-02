import { z } from 'zod';

/**
 * Fails application startup fast when a required env var is missing or
 * malformed. Wired via ConfigModule's native `validationSchema` option,
 * which expects a Standard Schema validator (https://standardschema.dev)
 * — Zod implements this directly, so (unlike the Joi schema this replaces)
 * no `validate` bridging function is needed; `validationSchema` is passed
 * straight to `ConfigModule.forRoot()` (see BE-PLAN-010 addendum,
 * 2026-09-02).
 *
 * Undeclared env vars are stripped by this schema during validation, but
 * `ConfigModule` merges them back into the resolved config afterwards
 * (its own documented behavior for object-stripping Standard Schema
 * libraries like Zod), so they remain readable via `process.env` /
 * `ConfigService` exactly as before.
 */
export const validationSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.url(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
});
