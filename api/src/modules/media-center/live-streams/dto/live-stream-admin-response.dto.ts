import { ApiProperty } from '@nestjs/swagger';
import { ContentAssociationDto } from '../../albums/dto/content-association.dto.js';
import { LiveStreamPublicResponseDto, toPublicLiveStream } from './live-stream-public-response.dto.js';
import type { LiveStreamDocument } from '../schemas/live-stream.schema.js';

/**
 * Whether this broadcast is still showing, and if not, why not.
 *
 * `ended` says somebody ended it and deliberately does NOT say who: `end()`
 * and `deactivateAll()` — the sweep a newly started broadcast runs — write the
 * same two fields, so the record genuinely does not hold the difference. A
 * screen that reads `endedAt` and concludes "an editor ended this" is wrong
 * every time a newer broadcast replaced it.
 */
export type LiveStreamState = 'live' | 'expired' | 'ended';

/**
 * The broadcast as an editor receives it.
 *
 * ── Why this exists next to the public shape ───────────────────────────────
 *
 * The public endpoint answers only the broadcast that is live *now*: a stream
 * whose `expectedEndAt` has passed is invisible to it, by design (see
 * `findActive`). That is right for a visitor and wrong for the editor who is
 * standing in front of it, because "this one ran over" and "this address names
 * nothing" are two different situations and the public shape reports both as
 * absence. An editor told "not found" about a championship that is still being
 * held goes looking for a record that was never lost.
 *
 * ── What it adds to the public shape ───────────────────────────────────────
 *
 * It *extends* that shape rather than restating it, so a field added for
 * visitors cannot be forgotten here. On top: `state`, the verdict the screen
 * actually needs; `isActive` and `endedAt`, the storage behind it; and
 * `associations`, so "start a new one with the same details" carries the event
 * link rather than quietly dropping it.
 *
 * Both languages of `title` and `venue` come through the public shape whole.
 * The editor's save writes back what it was given, so a shape translated to
 * one language would make every edit an erasure of the other.
 */
export class LiveStreamAdminResponseDto extends LiveStreamPublicResponseDto {
  @ApiProperty({ nullable: true, description: 'Set when an editor ended it, or a newer broadcast replaced it.' })
  endedAt: Date | null;

  @ApiProperty({ description: 'The flag the single-active index is built on. Still true past `expectedEndAt`.' })
  isActive: boolean;

  /**
   * The verdict, so no client has to rebuild it.
   *
   * `isActive` and `expectedEndAt` are storage, and reading them together is a
   * trick — the flag stays true past the end time because nobody pressed
   * anything. Publishing the conclusion keeps that rule where the clock and
   * the schema are, instead of in every screen that shows a broadcast.
   */
  @ApiProperty({ enum: ['live', 'expired', 'ended'] })
  state: LiveStreamState;

  @ApiProperty({ type: [ContentAssociationDto] })
  associations: ContentAssociationDto[];
}

export const liveStreamState = (stream: LiveStreamDocument, now: Date = new Date()): LiveStreamState => {
  if (!stream.isActive) return 'ended';
  // The same comparison `findActive` makes, against the same clock: a stream
  // past its stated end is one the site has already stopped showing.
  return stream.expectedEndAt.getTime() <= now.getTime() ? 'expired' : 'live';
};

export const toAdminLiveStream = (stream: LiveStreamDocument): LiveStreamAdminResponseDto => ({
  ...toPublicLiveStream(stream),
  endedAt: stream.endedAt ?? null,
  isActive: stream.isActive,
  state: liveStreamState(stream),
  associations: (stream.associations ?? []).map((association) => ({
    ownerType: association.ownerType,
    ownerId: String(association.ownerId),
    role: association.role,
    displayOrder: association.displayOrder,
  })),
});
