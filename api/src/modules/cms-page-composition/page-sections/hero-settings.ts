import { BadRequestException } from '@nestjs/common';
import { HERO_TEXT_LIMITS, heroTextLength } from '../hero-slides/schemas/hero-text.schema.js';

/**
 * The HERO section's own settings, stored in its free-form `configuration`
 * (owner decisions 2026-09-17):
 *
 * - `nextEvent`: the next-event bar, typed by hand. There is no events entity
 *   (ADR-0081 stays Proposed), so the bar carries no link.
 *   `{ isVisible, label{ar,en}, name{ar,en}, venue{ar,en}, startsAt, endsAt }`,
 *   the two times as instants an editor types in Dubai time.
 * - `playback`: `{ autoplay, intervalMs }`, the interval one of the durations
 *   the site supports (each includes the transition).
 *
 * `configuration` stays free-form for every other section type; these rules
 * apply to a HERO section only (`PageSectionsService`).
 */

/** The slide durations the site supports, in milliseconds. The web and the
 *  dashboard read the same list from `@uaeaf/content/hero` (`HERO_PLAYBACK`). */
export const HERO_PLAYBACK_INTERVALS: readonly number[] = [5000, 7000, 9000];

type Localized = { ar?: unknown; en?: unknown } | null | undefined;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const blank = (value: unknown) => text(value).trim().length === 0;
const readableInstant = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

const assertLengths = (event: Record<string, unknown>): void => {
  const limits = { label: HERO_TEXT_LIMITS.eventLabel, name: HERO_TEXT_LIMITS.eventName, venue: HERO_TEXT_LIMITS.eventVenue };
  for (const [field, limit] of Object.entries(limits)) {
    for (const language of ['ar', 'en'] as const) {
      const value = text((event[field] as Localized)?.[language]);
      if (heroTextLength(value) > limit) {
        throw new BadRequestException({
          code: 'heroTextTooLong',
          message: `"nextEvent.${field}.${language}" is ${heroTextLength(value)} characters; at most ${limit} fit the bar at 390px.`,
          field: `nextEvent.${field}.${language}`,
          limit,
        });
      }
    }
  }
};

const assertNextEvent = (event: unknown): void => {
  if (event === undefined || event === null) return;
  const record = event as Record<string, unknown>;
  assertLengths(record);

  // An end before the start is refused whether or not the bar is shown: a bar
  // switched on tomorrow would inherit it.
  if (readableInstant(record.startsAt) && readableInstant(record.endsAt)) {
    if (Date.parse(record.endsAt as string) < Date.parse(record.startsAt as string)) {
      throw new BadRequestException({
        code: 'nextEventEndsBeforeStart',
        message: 'nextEvent.endsAt must not be earlier than nextEvent.startsAt.',
        field: 'nextEvent.endsAt',
      });
    }
  }

  if (record.isVisible !== true) return;
  const missing: string[] = [];
  for (const field of ['label', 'name', 'venue'] as const) {
    for (const language of ['ar', 'en'] as const) {
      if (blank((record[field] as Localized)?.[language])) missing.push(`${field}.${language}`);
    }
  }
  for (const field of ['startsAt', 'endsAt'] as const) {
    if (!readableInstant(record[field])) missing.push(field);
  }
  if (missing.length > 0) {
    throw new BadRequestException({
      code: 'incompleteNextEvent',
      message: `The next-event bar is visible, so it needs ${missing.join(', ')}.`,
      missing,
    });
  }
};

const assertPlayback = (playback: unknown): void => {
  if (playback === undefined || playback === null) return;
  const record = playback as Record<string, unknown>;
  if (typeof record.autoplay !== 'boolean' || !HERO_PLAYBACK_INTERVALS.includes(record.intervalMs as number)) {
    throw new BadRequestException({
      code: 'invalidPlayback',
      message: `playback needs autoplay (true or false) and intervalMs, one of ${HERO_PLAYBACK_INTERVALS.join(', ')}.`,
      field: 'playback',
    });
  }
};

/**
 * @throws BadRequestException (`incompleteNextEvent` with `missing`,
 *   `nextEventEndsBeforeStart`, `heroTextTooLong`, `invalidPlayback`).
 */
export const assertHeroSettings = (configuration: Record<string, unknown> | null | undefined): void => {
  if (!configuration) return;
  assertNextEvent(configuration.nextEvent);
  assertPlayback(configuration.playback);
};
