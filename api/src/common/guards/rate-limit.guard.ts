import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator.js';
import type { RateLimitOptions } from '../decorators/rate-limit.decorator.js';

/** The limit every route gets unless it declares its own `@RateLimit()`
 *  (BE-PLAN-010 §7.6-style directness: a plain in-process counter, not a
 *  generic throttling framework — `@nestjs/throttler`'s latest release
 *  (6.5.0) has no published version supporting this project's NestJS 12,
 *  so this guard exists in its place rather than force-installing an
 *  untested peer-dependency combination). */
const DEFAULT_OPTIONS: RateLimitOptions = { limit: 100, windowSeconds: 60 };

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window request counter, keyed by `${controller}.${handler}:${ip}`,
 * registered globally via APP_GUARD so every route gets the generous
 * `DEFAULT_OPTIONS` window unless it declares a tighter `@RateLimit()` —
 * applied to `POST /contact-messages` (the platform's only unauthenticated
 * write) and `POST /auth/login` (schema-audit-2026-09-04.md §3.7/§6.7, P1
 * finding: neither had any request-rate defense beyond the account-level
 * lockout, which is a different, complementary control, not a substitute).
 *
 * In-memory: correct for this project's current single-process deployment
 * (the same simplifying assumption the JWT-cached-permissions design
 * already makes, BE-PLAN-010 §4.4) but does not share counters across
 * multiple instances — flagged, not solved here, same as this project's
 * other "acceptable at current scale" deferrals.
 *
 * @throws HttpException (429 Too Many Requests) once the window's limit
 *   is exceeded for that route+IP pair.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? DEFAULT_OPTIONS;

    const request = context.switchToHttp().getRequest<{ ip?: string }>();
    const key = `${context.getClass().name}.${context.getHandler().name}:${request.ip ?? 'unknown'}`;

    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 });
      return true;
    }

    if (bucket.count >= options.limit) {
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    return true;
  }
}
