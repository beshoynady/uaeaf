import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { LiveStreamsRepository } from './live-streams.repository.js';
import { parseVideoUrl } from '../videos/resolve/url-allowlist.js';
import { isDuplicateKeyError } from '../../../common/utils/mongo-errors.util.js';
import { liveStreamState } from './dto/live-stream-admin-response.dto.js';
import { storeResolvedThumbnail } from '../videos/resolve/store-thumbnail.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import type { LiveStreamDocument } from './schemas/live-stream.schema.js';
import type { StartLiveStreamDto } from './dto/start-live-stream.dto.js';
import type { UpdateLiveStreamDto } from './dto/update-live-stream.dto.js';

/**
 * The single live broadcast, started and ended by hand.
 *
 * There is no YouTube Data API call, no automatic detection and no polling
 * anywhere in this file — that is an explicit product decision, not an
 * omission. An editor pastes a link and states when they expect it to finish;
 * the site stops showing it at that time whether or not anyone comes back.
 */

@Injectable()
export class LiveStreamsService {
  constructor(
    private readonly repository: LiveStreamsRepository,
    private readonly mediaAssets: MediaAssetsService,
  ) {}

  /**
   * Put a broadcast on the site, ending whatever was running.
   *
   * Two editors can press this at the same moment, and the partial unique
   * index is what makes the outcome safe rather than the ordering of these two
   * statements. The retry exists because the honest race — both deactivate,
   * both insert, one loses — is recoverable exactly once: the loser simply
   * repeats against the state the winner left. A second failure means
   * something other than a race, so it surfaces as a 409 naming the conflict
   * instead of looping.
   */
  async start(dto: StartLiveStreamDto): Promise<LiveStreamDocument> {
    const videoId = this.youtubeIdOf(dto.url);
    // Before `deactivateAll`, and that order is the point: the sweep below
    // takes the running broadcast off air, so validating afterwards would
    // leave the site showing nothing — the old one ended, and the new one
    // hidden by `findActive` from the moment it was written.
    this.assertEndsInFuture(dto.expectedEndAt);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await this.repository.deactivateAll(new Date());

      try {
        const started = await this.repository.create({
          url: dto.url,
          videoId,
          title: dto.title,
          venue: dto.venue ?? null,
          startedAt: new Date(),
          expectedEndAt: dto.expectedEndAt,
          endedAt: null,
          isActive: true,
          associations: (dto.associations ?? []).map((association) => ({
            ownerType: association.ownerType,
            ownerId: new Types.ObjectId(association.ownerId),
            role: association.role ?? 'Related',
            displayOrder: association.displayOrder ?? 0,
          })),
        });

        return await this.withStill(started, dto);
      } catch (error) {
        // The partial unique index on `isActive` is what makes the race safe.
        if (!isDuplicateKeyError(error)) throw error;
      }
    }

    throw new ConflictException('Another broadcast is already live. Refresh and try again.');
  }

  /** The broadcast to show right now, or nothing.
   *
   *  A stream whose `expectedEndAt` has passed is still `isActive` in the
   *  database — nobody pressed anything — and is hidden here by comparing the
   *  clock. That is what removes the need for a scheduled job. */
  async findActive(): Promise<LiveStreamDocument | null> {
    return this.repository.findActive(new Date());
  }

  async countActive(): Promise<number> {
    return this.repository.countActive();
  }

  /**
   * One broadcast by id, whether or not it is still running.
   *
   * `findActive` deliberately hides a stream past its end time, which is right
   * for the site and wrong for the editor screen: an editor who opens a
   * broadcast that ran over must be told it ran over, not that it does not
   * exist. So this reads by id alone and lets the caller judge the clock.
   *
   * A malformed id answers `null` rather than throwing. Mongoose would raise a
   * CastError on `_id: 'nonsense'`, which surfaces as a 500 — and a
   * hand-edited address is a wrong address, which is a 404.
   */
  async findForEditor(id: string): Promise<LiveStreamDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.repository.findById(id);
  }

  /**
   * Correct the broadcast that is running.
   *
   * Only that one. A broadcast that is over is not editable — the site has
   * already stopped showing it, and the way to carry on is to start another
   * with the same details. The screen sends a finished one to its own page
   * instead of the form, but the screen is the layer that cannot enforce it.
   */
  async update(id: string, patch: UpdateLiveStreamDto): Promise<LiveStreamDocument | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;

    if (liveStreamState(existing) !== 'live') {
      throw new ConflictException(
        'This broadcast is no longer showing. Start a new one with the same details instead.',
      );
    }
    if (patch.expectedEndAt !== undefined) this.assertEndsInFuture(patch.expectedEndAt);

    const changes: Record<string, unknown> = { ...patch };
    // Changing the link changes which video is embedded, so the id it is
    // played from has to move with it or the two would describe different
    // broadcasts.
    if (patch.url !== undefined) {
      changes.videoId = this.youtubeIdOf(patch.url);
      // And the still with it, for the same reason: a picture of the old video
      // under the new one's title is worse than no picture, and the
      // placeholder is a state every surface already draws.
      changes.thumbnailId = null;
    }

    return this.repository.updateById(id, changes);
  }

  /**
   * The still, fetched and stored after the broadcast is already on air.
   *
   * ── Why after, and not before the insert ───────────────────────────────
   *
   * Capturing first put an oEmbed round trip, a CDN fetch with a five-second
   * ceiling and a storage upload in front of "go live" — measured at four
   * seconds on a good day, for an editor standing at an event. It also left an
   * orphaned asset behind whenever the insert then lost its race and threw a
   * 409, because the picture had already been uploaded for a broadcast that
   * was never written.
   *
   * Doing it here costs a window in which the broadcast is live with no
   * picture. That window is invisible: the public reads are cached for sixty
   * seconds, so the first render a visitor gets already has the still.
   *
   * Best effort by construction — `storeResolvedThumbnail` answers null for
   * every failure rather than throwing, because a platform that would not give
   * us a picture is not a reason to take a live event off the air.
   */
  private async withStill(started: LiveStreamDocument, dto: StartLiveStreamDto): Promise<LiveStreamDocument> {
    const thumbnailId = await storeResolvedThumbnail(dto.url, this.mediaAssets, {
      caption: dto.title,
      altText: dto.title,
    });
    if (!thumbnailId) return started;

    return (await this.repository.updateById(String(started._id), { thumbnailId })) ?? started;
  }

  /**
   * A broadcast that ends in the past never appears on the site at all.
   *
   * `findActive` hides it the instant it is written, so the editor presses the
   * button and sees nothing happen — with the previous broadcast gone as well,
   * on a start. `@IsDate()` on the DTO cannot catch this: the value is a
   * perfectly good date, it is just the wrong side of now.
   */
  private assertEndsInFuture(expectedEndAt: Date): void {
    if (expectedEndAt.getTime() > Date.now()) return;

    throw new BadRequestException(
      'The expected end time must be in the future, or the broadcast would never show on the site.',
    );
  }

  /** End it now. Idempotent: two editors can both press the banner's button,
   *  and the second press must not fail or move the recorded end time. */
  async end(id: string): Promise<LiveStreamDocument | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    if (!existing.isActive) return existing;

    return this.repository.updateById(id, { isActive: false, endedAt: new Date() });
  }

  /**
   * YouTube only — the broadcast player is built for it and nothing else.
   *
   * Format is all that is checked. This deliberately does NOT claim the stream
   * is genuinely live: only YouTube could answer that, and asking it would
   * mean the Data API that is explicitly out of scope.
   */
  private youtubeIdOf(url: string): string {
    const parsed = parseVideoUrl(url);
    if (!parsed || parsed.platform !== 'youtube' || !parsed.externalId) {
      throw new BadRequestException('A live broadcast needs a YouTube link, for example https://www.youtube.com/live/ID');
    }
    return parsed.externalId;
  }
}
