import { UnprocessableEntityException } from '@nestjs/common';

/** The affiliation half of a create/update request. */
export interface AffiliationShape {
  championshipId?: string | null;
  competitionId?: string | null;
  publicEventId?: string | null;
  athleteIds?: string[];
  clubIds?: string[];
}

/**
 * Checks that an album's affiliation fields make sense together.
 *
 * Only their shape, which is all that can be known today: none of the four
 * collections exists, so whether an id resolves — and whether a championship
 * really sits in the season the editor named — has to wait for the modules.
 * Those are different questions from whether the combination is coherent, and
 * this one has an answer now.
 *
 * Two rules:
 *
 * - **A competition names its championship.** A competition belongs to one, so
 *   an album that names the deeper without the shallower has lost information
 *   the championship filter needs, and would vanish from a filter it belongs
 *   in.
 * - **The branches are exclusive.** An occasion is a competition or an
 *   institutional event, never both, and an album claiming both describes
 *   nothing real.
 *
 * There is no season rule, because there is no season field: a season is
 * derived from `eventDate` (`videos/season.ts`), so it cannot be inconsistent
 * with anything.
 *
 * Athletes and clubs are outside both rules on purpose. They say who appears,
 * not where the album sits, and an album of an athlete at a press conference
 * is as ordinary as one of her in a final.
 *
 * 422 rather than 409: the request is well-formed and nothing conflicts with
 * stored state — the combination of fields is simply not one the domain has.
 *
 * @throws UnprocessableEntityException when the combination is incoherent.
 */
export const assertAffiliationShape = (affiliation: AffiliationShape): void => {
  const { championshipId, competitionId, publicEventId } = affiliation;

  if (championshipId && publicEventId) {
    throw new UnprocessableEntityException(
      'An album cannot belong to both a championship and a public event. Choose the one the occasion actually was.',
    );
  }

  if (competitionId && !championshipId) {
    throw new UnprocessableEntityException(
      'A competition belongs to a championship. Choose the championship this competition was part of.',
    );
  }
};
