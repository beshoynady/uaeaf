import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACTIVATABLE_COLLECTIONS } from '../../bootstrap/backfill-page-activation.js';

/**
 * Every page that carries `isActive` must also carry the route that changes it,
 * gated on `Publish`.
 *
 * Read off the source in the style of `permission-catalogue.spec.ts`, rather
 * than through a Nest context: the assertion is about the decorators, fifteen
 * controllers would be fifteen module graphs to build, and a route that exists
 * with the wrong permission is exactly the drift a source read catches.
 *
 * The pairing with `ACTIVATABLE_COLLECTIONS` is deliberate. A page added to the
 * backfill and not to its controller is a page with a stored switch nobody can
 * throw; a page added to a controller and not to the backfill is a page that
 * goes dark on deploy. One list, checked both ways.
 */
describe('page activation routes', () => {
  const sourceRoot = join(process.cwd(), 'src', 'modules');

  /** Where each activatable page's controller lives, and whether the route
   *  takes an id. Singletons have one row and no `:id` — a path parameter
   *  would be a second way to name the row there is only one of. */
  const CONTROLLERS: Readonly<Record<string, { file: string; path: string }>> = {
    athletesPage: { file: 'cms-page-composition/athletes-page/athletes-page.controller.ts', path: 'active' },
    clubsPage: { file: 'cms-page-composition/clubs-page/clubs-page.controller.ts', path: 'active' },
    coachesPage: { file: 'cms-page-composition/coaches-page/coaches-page.controller.ts', path: 'active' },
    disciplinesPage: {
      file: 'cms-page-composition/disciplines-page/disciplines-page.controller.ts',
      path: 'active',
    },
    newsPage: { file: 'cms-page-composition/news-page/news-page.controller.ts', path: 'active' },
    recordsPage: { file: 'cms-page-composition/records-page/records-page.controller.ts', path: 'active' },
    resultsRankingsPage: {
      file: 'cms-page-composition/results-rankings-page/results-rankings-page.controller.ts',
      path: 'active',
    },
    albumsPage: { file: 'media-center/albums-page/albums-page.controller.ts', path: 'active' },
    videosPage: { file: 'media-center/videos-page/videos-page.controller.ts', path: 'active' },
    boardMembersPage: {
      file: 'federation-governance/board-members-page/board-members-page.controller.ts',
      path: 'active',
    },
    committeesPage: {
      file: 'federation-governance/committees-page/committees-page.controller.ts',
      path: 'active',
    },
    contactUsPage: {
      file: 'federation-governance/contact-us-page/contact-us-page.controller.ts',
      path: 'active',
    },
    // Workflow-governed: many rows, so the route takes the id.
    presidentMessagePage: {
      file: 'federation-governance/president-message-page/president-message-page.controller.ts',
      path: ':id/active',
    },
    visionMissionPage: {
      file: 'federation-governance/vision-mission-page/vision-mission-page.controller.ts',
      path: ':id/active',
    },
    strategicPlansPage: {
      file: 'federation-governance/strategic-plans-page/strategic-plans-page.controller.ts',
      path: ':id/active',
    },
  };

  const source = (resource: string): string =>
    readFileSync(join(sourceRoot, CONTROLLERS[resource].file), 'utf8');

  /**
   * The decorator line this spec looks for, assembled rather than written out.
   *
   * `permission-catalogue.spec.ts` derives the guarded pairs by grepping every
   * `.ts` file under `src` for `@RequirePermission(` followed by two quoted
   * strings. A literal form of that call anywhere in this file — even inside a
   * template placeholder — is read as a real guard on a resource named
   * `${resource}`, and that spec then fails over a pair no route uses. Splitting
   * the name from the parenthesis keeps this file invisible to it.
   */
  const publishGuard = (resource: string): string =>
    `@RequirePermission` + `('${resource}', 'Publish')`;

  it('has a controller listed for every collection the backfill touches', () => {
    expect(Object.keys(CONTROLLERS).sort()).toEqual([...ACTIVATABLE_COLLECTIONS].sort());
  });

  for (const resource of ACTIVATABLE_COLLECTIONS) {
    describe(resource, () => {
      it(`declares @Patch('${CONTROLLERS[resource].path}')`, () => {
        expect(source(resource)).toContain(`@Patch('${CONTROLLERS[resource].path}')`);
      });

      it('gates that route on Publish, not Update', () => {
        // Deciding what the public sees is a publishing decision. An editor who
        // may rewrite the page still may not decide the moment it appears.
        const text = source(resource);
        const patchAt = text.indexOf(`@Patch('${CONTROLLERS[resource].path}')`);
        const guard = text.slice(patchAt, patchAt + 200);
        expect(guard).toContain(publishGuard(resource));
      });

      it('takes the shared one-field body', () => {
        // Not a per-page DTO: the shape is identical everywhere, and a copy per
        // page is a copy that can grow a second field and smuggle an edit past
        // the review the content goes through.
        expect(source(resource)).toContain('ToggleActiveDto');
      });
    });
  }
});
