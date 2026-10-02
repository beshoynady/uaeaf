import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { AlbumsModule } from '../albums/albums.module.js';
import { AlbumsService } from '../albums/albums.service.js';
import { VideosModule } from '../videos/videos.module.js';
import { VideosService } from '../videos/videos.service.js';
import { SeasonRangeResolver } from './season-range-resolver.js';

/**
 * Both list services take the resolver as `@Optional()`, so a module that
 * stopped providing it would still start — and every slug in a `season`
 * parameter would quietly be ignored. This is the check that it is provided
 * and asked for.
 */
describe('season range resolver wiring', () => {
  it.each([
    ['AlbumsModule', AlbumsModule, AlbumsService],
    ['VideosModule', VideosModule, VideosService],
  ])('%s provides SeasonRangeResolver, and its service asks for it', (_name, module, service) => {
    const providers = (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) ?? []) as unknown[];
    const params = (Reflect.getMetadata('design:paramtypes', service) ?? []) as unknown[];

    expect(providers).toContain(SeasonRangeResolver);
    expect(params).toContain(SeasonRangeResolver);
  });
});
