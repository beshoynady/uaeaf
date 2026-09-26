import { jest } from '@jest/globals';
import { AboutFederationPagesService } from './about-federation-page.service.js';
import { AboutFederationStatsService } from './about-federation-stats.service.js';
import { FederationAppointmentsService } from '../federation-appointments/federation-appointments.service.js';
import { AboutFederationPagesRepository } from './about-federation-page.repository.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

/**
 * What the two automatic sections would print right now.
 *
 * The dashboard draws "automatic · 7 people" and "automatic · 3 figures"
 * beside the sections an editor cannot switch off, so an editor can see why
 * one of them is about to disappear before they publish and find out. Those
 * numbers are the board module's and the record counts' — the screen has no
 * way to know them, and guessing would defeat the point of the badge.
 */

const serviceWith = (counts: Record<string, number | null>, leaders: unknown[]) =>
  new AboutFederationPagesService(
    {} as unknown as AboutFederationPagesRepository,
    {} as unknown as PublicationsService,
    {} as unknown as MediaAssetsService,
    { counts: jest.fn(async () => counts) } as unknown as AboutFederationStatsService,
    { currentLeadership: jest.fn(async () => leaders) } as unknown as FederationAppointmentsService,
  );

describe('AboutFederationPagesService.sourceCounts', () => {
  it('reports how many people the board module lists as serving', async () => {
    const service = serviceWith({ clubs: 1, athletes: 1, officials: 1, championships: null }, [{}, {}, {}]);

    expect((await service.sourceCounts()).leaders).toBe(3);
  });

  /** The badge counts tiles that will be drawn, not sources that exist: a
   *  source with no figure prints nothing. */
  it('counts only the figures that have a number behind them', async () => {
    const service = serviceWith({ clubs: 18, athletes: 1240, officials: null, championships: null }, []);

    expect((await service.sourceCounts()).stats).toBe(2);
  });

  it('counts a zero, which is a figure the page may state', async () => {
    const service = serviceWith({ clubs: 0, athletes: null, officials: null, championships: null }, []);

    expect((await service.sourceCounts()).stats).toBe(1);
  });

  it('reports nothing on either side when both sources are empty, so the screen can warn', async () => {
    const service = serviceWith({ clubs: null, athletes: null, officials: null, championships: null }, []);

    expect(await service.sourceCounts()).toEqual({ leaders: 0, stats: 0, figures: [] });
  });

  /** The read-only panel lists each source by name with its figure, so an
   *  editor can see which one is missing rather than only that one is. */
  it('names every source with its figure, including the ones with none', async () => {
    const service = serviceWith({ clubs: 18, athletes: null, officials: 45, championships: null }, []);

    expect((await service.sourceCounts()).figures).toEqual([
      { key: 'clubs', value: 18 },
      { key: 'athletes', value: null },
      { key: 'officials', value: 45 },
      { key: 'championships', value: null },
    ]);
  });
});
