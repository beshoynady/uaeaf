import { jest } from '@jest/globals';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator.js';

describe('RateLimitGuard', () => {
  const makeContext = (ip: string, handlerName = 'testHandler', className = 'TestController'): ExecutionContext =>
    ({
      getHandler: () => ({ name: handlerName }),
      getClass: () => ({ name: className }),
      switchToHttp: () => ({ getRequest: () => ({ ip }) }),
    }) as unknown as ExecutionContext;

  const makeReflector = (options: unknown) =>
    ({ getAllAndOverride: jest.fn().mockReturnValue(options) }) as unknown as Reflector;

  it('allows requests under the route-declared @RateLimit() limit', () => {
    const guard = new RateLimitGuard(makeReflector({ limit: 2, windowSeconds: 60 }));
    const context = makeContext('1.1.1.1');

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws 429 once the limit is exceeded within the window', () => {
    const guard = new RateLimitGuard(makeReflector({ limit: 2, windowSeconds: 60 }));
    const context = makeContext('1.1.1.1');

    guard.canActivate(context);
    guard.canActivate(context);

    expect(() => guard.canActivate(context)).toThrow(HttpException);
    try {
      guard.canActivate(context);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('tracks each client IP independently — one IP hitting the limit does not affect another', () => {
    const guard = new RateLimitGuard(makeReflector({ limit: 1, windowSeconds: 60 }));

    expect(guard.canActivate(makeContext('1.1.1.1'))).toBe(true);
    expect(() => guard.canActivate(makeContext('1.1.1.1'))).toThrow(HttpException);
    expect(guard.canActivate(makeContext('2.2.2.2'))).toBe(true);
  });

  it('tracks each route independently — one route hitting the limit does not affect another', () => {
    const guard = new RateLimitGuard(makeReflector({ limit: 1, windowSeconds: 60 }));

    expect(guard.canActivate(makeContext('1.1.1.1', 'create'))).toBe(true);
    expect(() => guard.canActivate(makeContext('1.1.1.1', 'create'))).toThrow(HttpException);
    expect(guard.canActivate(makeContext('1.1.1.1', 'login'))).toBe(true);
  });

  it('applies the generous global default when the route declares no @RateLimit()', () => {
    const guard = new RateLimitGuard(makeReflector(undefined));
    const context = makeContext('1.1.1.1');

    for (let i = 0; i < 100; i += 1) {
      expect(guard.canActivate(context)).toBe(true);
    }
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('resets the counter once the window has elapsed', () => {
    const guard = new RateLimitGuard(makeReflector({ limit: 1, windowSeconds: 60 }));
    const context = makeContext('1.1.1.1');
    const realNow = Date.now;
    let now = realNow();
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);

    now += 61_000;
    expect(guard.canActivate(context)).toBe(true);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('reads the RATE_LIMIT_KEY metadata from the handler and class', () => {
    const reflector = makeReflector({ limit: 5, windowSeconds: 60 });
    const guard = new RateLimitGuard(reflector);

    guard.canActivate(makeContext('1.1.1.1'));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(RATE_LIMIT_KEY, expect.any(Array));
  });
});
