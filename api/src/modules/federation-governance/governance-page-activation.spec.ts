import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import type { Schema } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { PresidentMessagePagesService } from './president-message-page/president-message-page.service.js';
import { VisionMissionPagesService } from './vision-mission-page/vision-mission-page.service.js';
import { StrategicPlansPagesService } from './strategic-plans-page/strategic-plans-page.service.js';
import { AboutFederationPageSchema } from './about-federation-page/schemas/about-federation-page.schema.js';
import { PresidentMessagePageSchema } from './president-message-page/schemas/president-message-page.schema.js';
import { VisionMissionPageSchema } from './vision-mission-page/schemas/vision-mission-page.schema.js';
import { StrategicPlansPageSchema } from './strategic-plans-page/schemas/strategic-plans-page.schema.js';

/**
 * The four workflow-governed governance pages, and the switch that takes each
 * one on and off the site.
 *
 * Three properties, together, are what make the switch safe (ADR-0102 §D2, §D4):
 * it writes nothing but itself, a restore cannot move it, and a switched-off page
 * answers with no content at all. The third is the one a reader would assume and
 * the first two are the ones that break silently, so all three are pinned here
 * rather than left to the four modules' own specs.
 */

const mock = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();

const SCHEMAS = {
  aboutFederationPage: AboutFederationPageSchema,
  presidentMessagePage: PresidentMessagePageSchema,
  visionMissionPage: VisionMissionPageSchema,
  strategicPlansPage: StrategicPlansPageSchema,
} as const;

/** A field's declared options. Mongoose types `Schema.paths` loosely, and the
 *  two properties these tests are about — `select` and `default` — are what the
 *  `@Prop` decorator put there. */
const optionsOf = (schema: Schema, field: string): { select?: boolean; default?: unknown } =>
  (schema.paths[field] as unknown as { options: { select?: boolean; default?: unknown } }).options;

describe('governance page activation', () => {
  describe('the field is excluded from ordinary reads on all four', () => {
    for (const [name, schema] of Object.entries(SCHEMAS)) {
      it(`${name} keeps isActive out of a plain read`, () => {
        expect(schema.paths.isActive).toBeDefined();

        // The whole protection. `RevisionsService.snapshotOf` freezes what a
        // plain `.lean()` read returns and `PublishingService.restore` writes a
        // snapshot straight back over the row — so a selectable field here would
        // mean that restoring last month's wording also restored last month's
        // live state, taking a published page off the site with nobody asking.
        expect(optionsOf(schema, 'isActive').select).toBe(false);
      });
    }

    it('About is the one page withheld by default; the rest are served', () => {
      // About's page had never been live when its field was added, so "saved but
      // not yet shown" was the correct starting state for it and only for it
      // (ADR-0102 §D3).
      expect(optionsOf(AboutFederationPageSchema, 'isActive').default).toBe(false);
      for (const name of ['presidentMessagePage', 'visionMissionPage', 'strategicPlansPage'] as const) {
        expect(optionsOf(SCHEMAS[name], 'isActive').default).toBe(true);
      }
    });
  });

  describe("setActive writes the switch and the actor, and nothing else", () => {
    const cases = [
      {
        name: 'presidentMessagePage',
        build: (repository: unknown) =>
          new PresidentMessagePagesService(
            repository as never,
            { findLive: mock(), getPublicSnapshot: mock() } as never,
            {} as never,
            { resolvePublicImages: mock(), assertUsableImage: mock() } as never,
            { findActiveByRole: mock() } as never,
          ),
      },
      {
        name: 'visionMissionPage',
        build: (repository: unknown) =>
          new VisionMissionPagesService(
            repository as never,
            { findLive: mock(), getPublicSnapshot: mock() } as never,
            {} as never,
            { resolvePublicImages: mock(), assertUsableImage: mock() } as never,
          ),
      },
    ];

    for (const { name, build } of cases) {
      it(name, async () => {
        const id = new Types.ObjectId();
        const actor = new Types.ObjectId();
        const repository = {
          updateById: mock().mockResolvedValue({ _id: id, isActive: false }),
        };

        const service = build(repository) as { setActive: (...args: never[]) => Promise<unknown> };
        const updated = await service.setActive(
          ...([id.toString(), false, actor] as never[]),
        );

        expect(repository.updateById).toHaveBeenCalledWith(id.toString(), {
          $set: { isActive: false, updatedBy: actor },
        });
        // The response carries `_id`, which the audit-log interceptor needs to
        // record the write at all.
        expect(updated).toMatchObject({ _id: id });
      });

      it(`${name} refuses an id that names no row`, async () => {
        const repository = { updateById: mock().mockResolvedValue(null) };
        const service = build(repository) as { setActive: (...args: never[]) => Promise<unknown> };

        await expect(
          service.setActive(...([new Types.ObjectId().toString(), true, new Types.ObjectId()] as never[])),
        ).rejects.toThrow(NotFoundException);
      });
    }
  });

  describe('a switched-off page answers with the switch and no content', () => {
    it('visionMissionPage', async () => {
      const entityId = new Types.ObjectId();
      const repository = {
        find: mock().mockResolvedValue([{ _id: entityId }]),
        findByIdWithActivation: mock().mockResolvedValue({ _id: entityId, isActive: false }),
        updateById: mock(),
      };
      const publications = {
        findLive: mock().mockResolvedValue({ publishedAt: new Date('2026-09-26T00:00:00.000Z') }),
        getPublicSnapshot: mock().mockResolvedValue({
          heroTitle: { ar: 'س', en: 's' },
          heroSubtitle: { ar: 'س', en: 's' },
        }),
      };
      const media = { resolvePublicImages: mock().mockResolvedValue(new Map()), assertUsableImage: mock() };

      const service = new VisionMissionPagesService(
        repository as never,
        publications as never,
        {} as never,
        media as never,
      );

      // Not a partial response with the content still in it: the draft may be
      // mid-review, so the body carries nothing to leak.
      await expect(service.getCurrentPublic()).resolves.toEqual({ isActive: false });
    });
  });
});
