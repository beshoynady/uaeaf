import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSION_KEY } from '../../../common/decorators/permissions.decorator.js';
import type { RequiredPermission } from '../../../common/decorators/permissions.decorator.js';
import { AboutFederationPagesController } from './about-federation-page.controller.js';

/**
 * Switching the About page on and off is a publishing act, and it is guarded
 * on the route rather than only in the screen that offers it.
 *
 * The dashboard hides the button without the grant, which is the courtesy. The
 * refusal is this: `PATCH :id/active` takes a page live for every visitor, and
 * a hidden button is not a control — anyone who can reach the API can send the
 * request whatever the screen showed them.
 *
 * `isActive` sits deliberately outside the editorial workflow (owner decision
 * ق5): it is not a draft state and does not pass through submit/approve. That
 * is exactly why it needs its own grant — nothing else on the way to it checks
 * one.
 */
describe('the About page activation route', () => {
  const permissionOn = (handler: keyof AboutFederationPagesController) =>
    Reflect.getMetadata(
      REQUIRED_PERMISSION_KEY,
      AboutFederationPagesController.prototype[handler] as object,
    ) as RequiredPermission | undefined;

  it('requires the Publish grant, not merely an editing one', () => {
    expect(permissionOn('setActive')).toEqual({ resourceType: 'aboutFederationPage', action: 'Publish' });
  });

  it('is the PATCH :id/active route, so the guard cannot drift off it', () => {
    const handler = AboutFederationPagesController.prototype.setActive as object;

    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.PATCH);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/active');
  });

  it('guards every route that writes, so none is reachable ungranted', () => {
    const WRITES = new Set([RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PUT, RequestMethod.DELETE]);

    const writes = Object.getOwnPropertyNames(AboutFederationPagesController.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => ({
        name,
        handler: (AboutFederationPagesController.prototype as unknown as Record<string, object>)[name],
      }))
      .filter(({ handler }) => WRITES.has(Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod));

    // Named rather than counted, and asserted before the guard check: a scan
    // that matched no route at all — a renamed metadata key, a controller
    // reshaped — would otherwise report every route guarded and never fail.
    expect(writes.map(({ name }) => name).sort()).toEqual([
      'publish',
      'publishApproved',
      'remove',
      'restore',
      'setActive',
      'submit',
      'update',
    ]);

    const ungranted = writes
      .filter(({ handler }) => Reflect.getMetadata(REQUIRED_PERMISSION_KEY, handler) === undefined)
      .map(({ name }) => name);

    expect(ungranted).toEqual([]);
  });
});
