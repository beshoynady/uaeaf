import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import { AppointmentRulesService } from './appointment-rules.service.js';
import { FederationPersonnelsService } from '../federation-personnel/federation-personnel.service.js';
import { FederationPositionsRepository } from '../federation-positions/federation-positions.repository.js';

/**
 * The public read behind the About page's leadership section.
 *
 * Two things it must never do: name someone whose term is over, and carry any
 * of the personnel record beyond the four fields a visitor is shown. The
 * personnel collection holds an `internalContact` block marked `[RESTRICTED]`,
 * so "everything about this person" is the wrong default and the response is
 * built field by field instead.
 */

const pair = (value: string) => ({ ar: value, en: value });

const personId = new Types.ObjectId();
const otherPersonId = new Types.ObjectId();

const boardMemberPosition = new Types.ObjectId();
const presidentPosition = new Types.ObjectId();
const committeeChairPosition = new Types.ObjectId();

const position = (extra: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  title: pair('Post'),
  body: 'board',
  rank: 2,
  displayOrder: 1,
  maxHolders: null,
  isVisible: true,
  ...extra,
});

const appointment = (extra: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  personId,
  positionId: boardMemberPosition,
  termStart: new Date('2025-09-01'),
  termEnd: null,
  status: 'Active',
  displayOrder: 1,
  ...extra,
});

const person = (id: Types.ObjectId, name: string) => ({
  _id: id,
  fullName: pair(name),
  photoId: new Types.ObjectId(),
  nationalityId: new Types.ObjectId(),
  status: 'Active',
  internalContact: { personalEmail: 'private@uaeaf.ae', idNumber: '784-0000' },
  publicContact: { email: 'press@uaeaf.ae', phone: '+971' },
  shortBio: pair('bio'),
  biography: pair('long bio'),
  socialLinks: [],
});

/** The positions `appointment()` and its overrides point at by default. */
const DEFAULT_POSITIONS = [
  position({ _id: presidentPosition, title: pair('President'), rank: 1 }),
  position({ _id: boardMemberPosition, title: pair('Board member'), rank: 2 }),
  position({ _id: committeeChairPosition, title: pair('Committee chair'), body: 'committee', rank: 1 }),
];

/** Honours the one filter the service queries on, so a test of "only serving
 *  officers" exercises the real mechanism rather than the stub's generosity. */
const serviceWith = (
  appointments: Record<string, unknown>[],
  people: Record<string, unknown>[],
  positions: Record<string, unknown>[] = DEFAULT_POSITIONS,
) => {
  const repository = {
    find: jest.fn(async (filter: Record<string, unknown> = {}) =>
      appointments.filter((row) => filter.status === undefined || row.status === filter.status),
    ),
  } as unknown as FederationAppointmentsRepository;
  const personnel = {
    findByIds: jest.fn(async () => people),
  } as unknown as FederationPersonnelsService;
  // Unused by currentLeadership(); present only so the constructor compiles.
  const rules = {} as unknown as AppointmentRulesService;
  const connection = {} as unknown as Connection;
  const positionsRepository = {
    findByIds: jest.fn(async (ids: string[]) =>
      positions.filter((candidate) => ids.includes(String((candidate as { _id: Types.ObjectId })._id))),
    ),
    find: jest.fn(async (filter: Record<string, unknown> = {}) =>
      positions.filter((candidate) =>
        Object.entries(filter).every(([key, value]) => (candidate as Record<string, unknown>)[key] === value),
      ),
    ),
  } as unknown as FederationPositionsRepository;
  return new FederationAppointmentsService(repository, personnel, rules, connection, positionsRepository);
};

describe('FederationAppointmentsService.currentLeadership', () => {
  it('names the people serving now, ordered by the position\'s rank', async () => {
    const service = serviceWith(
      [
        appointment({ displayOrder: 2 }),
        appointment({ personId: otherPersonId, positionId: presidentPosition, displayOrder: 1 }),
      ],
      [person(personId, 'Board member'), person(otherPersonId, 'President')],
    );

    const leaders = await service.currentLeadership();

    expect(leaders.map((leader) => leader.fullName.en)).toEqual(['President', 'Board member']);
  });

  it('carries only the five fields the page prints, and nothing restricted', async () => {
    const service = serviceWith([appointment()], [person(personId, 'Board member')]);

    const [leader] = await service.currentLeadership();

    expect(Object.keys(leader).sort()).toEqual(
      ['displayOrder', 'fullName', 'photoId', 'positionTitle', 'rank'].sort(),
    );
  });

  it('leaves out an appointment whose term has ended', async () => {
    const service = serviceWith(
      [appointment({ termEnd: new Date('2024-01-01'), status: 'Completed' })],
      [person(personId, 'Former member')],
    );

    expect(await service.currentLeadership()).toHaveLength(0);
  });

  it('keeps an appointment whose term ends in the future', async () => {
    const service = serviceWith(
      [appointment({ termEnd: new Date('2099-01-01') })],
      [person(personId, 'Serving member')],
    );

    expect(await service.currentLeadership()).toHaveLength(1);
  });

  it('leaves out an appointment that is no longer Active, whatever its dates', async () => {
    const service = serviceWith([appointment({ status: 'Resigned' })], [person(personId, 'Resigned member')]);

    expect(await service.currentLeadership()).toHaveLength(0);
  });

  /** Committee posts are a different page's subject; the About page's panel
   *  shows the federation's own leadership. */
  it('leaves out committee posts, which belong to the committees page', async () => {
    const service = serviceWith(
      [appointment({ positionId: committeeChairPosition })],
      [person(personId, 'Committee chair')],
    );

    expect(await service.currentLeadership()).toHaveLength(0);
  });

  /** An appointment pointing at a person who is gone must not produce a
   *  nameless card. */
  it('leaves out an appointment whose person record is missing', async () => {
    const service = serviceWith([appointment()], []);

    expect(await service.currentLeadership()).toHaveLength(0);
  });

  it('answers with an empty list when nobody is appointed, so the section can disappear', async () => {
    const service = serviceWith([], []);

    expect(await service.currentLeadership()).toEqual([]);
  });

  /** The point of this task: the listing is decided by `position.body`, never
   *  by anything an admin could have named a post. Two positions with
   *  different titles both count as board; the third, whatever its title,
   *  does not. */
  it('lists every board position and excludes every committee position, regardless of title', async () => {
    const firstBoardPost = new Types.ObjectId();
    const secondBoardPost = new Types.ObjectId();
    const committeePost = new Types.ObjectId();
    const firstPersonId = new Types.ObjectId();
    const secondPersonId = new Types.ObjectId();
    const thirdPersonId = new Types.ObjectId();

    const service = serviceWith(
      [
        appointment({ personId: firstPersonId, positionId: firstBoardPost, displayOrder: 1 }),
        appointment({ personId: secondPersonId, positionId: secondBoardPost, displayOrder: 2 }),
        appointment({ personId: thirdPersonId, positionId: committeePost, displayOrder: 3 }),
      ],
      [person(firstPersonId, 'A'), person(secondPersonId, 'B'), person(thirdPersonId, 'C')],
      [
        position({ _id: firstBoardPost, body: 'board', rank: 1 }),
        position({ _id: secondBoardPost, body: 'board', rank: 2 }),
        position({ _id: committeePost, body: 'committee', rank: 1 }),
      ],
    );

    const leaders = await service.currentLeadership();

    expect(leaders).toHaveLength(2);
    expect(leaders.map((leader) => leader.fullName.en).sort()).toEqual(['A', 'B']);
  });
});

/**
 * The guard `PresidentMessagePagesService.getCurrentPublic()` relies on: a
 * `presidentMessagePage` row's `federationAppointmentId` is validated only as
 * a Mongo id (no schema-level link to a position), so this is the one place
 * that stops a row pointed at the wrong appointment from being served as the
 * president's.
 */
describe('FederationAppointmentsService.findActiveTopOfBoard', () => {
  it('keeps only the appointment on the highest-ranked board position — not rank 1 specifically, the lowest present', async () => {
    const topPost = new Types.ObjectId();
    const midBoardPost = new Types.ObjectId();
    const committeePost = new Types.ObjectId();
    const topPersonId = new Types.ObjectId();
    const midPersonId = new Types.ObjectId();
    const committeePersonId = new Types.ObjectId();

    const service = serviceWith(
      [
        appointment({ personId: topPersonId, positionId: topPost }),
        appointment({ personId: midPersonId, positionId: midBoardPost }),
        appointment({ personId: committeePersonId, positionId: committeePost }),
      ],
      [],
      [
        // Deliberately not rank 1: the lowest number actually present must
        // decide, never a literal.
        position({ _id: topPost, body: 'board', rank: 3 }),
        position({ _id: midBoardPost, body: 'board', rank: 7 }),
        position({ _id: committeePost, body: 'committee', rank: 1 }),
      ],
    );

    const kept = await service.findActiveTopOfBoard();

    expect(kept.map((row) => row.personId)).toEqual([topPersonId]);
  });

  /** The regression this method exists to close: a message row pointed at a
   *  board member's (not the top post's) appointment must not be mistaken
   *  for the president's. */
  it('excludes an appointment on a lower-ranked board position, even though it is Active', async () => {
    const topPost = new Types.ObjectId();
    const memberPost = new Types.ObjectId();
    const memberPersonId = new Types.ObjectId();

    const service = serviceWith(
      [appointment({ personId: memberPersonId, positionId: memberPost })],
      [],
      [
        position({ _id: topPost, body: 'board', rank: 1 }),
        position({ _id: memberPost, body: 'board', rank: 2 }),
      ],
    );

    expect(await service.findActiveTopOfBoard()).toEqual([]);
  });

  it('excludes an appointment on a committee position, whatever its rank', async () => {
    const committeePost = new Types.ObjectId();

    const service = serviceWith(
      [appointment({ positionId: committeePost })],
      [],
      [position({ _id: committeePost, body: 'committee', rank: 1 })],
    );

    expect(await service.findActiveTopOfBoard()).toEqual([]);
  });

  /** `isVisible` is a display toggle everywhere else in this codebase, never
   *  an identity decision. Hiding the top post from a public listing must
   *  not silently hand the presidency to whoever holds the next one down —
   *  its holder is still kept, and the lower post is never promoted. */
  it('keeps the top-ranked position\'s holder even when that position is hidden from listings, and never promotes the next one', async () => {
    const hiddenTopPost = new Types.ObjectId();
    const nextPost = new Types.ObjectId();
    const hiddenTopPersonId = new Types.ObjectId();
    const nextPersonId = new Types.ObjectId();

    const service = serviceWith(
      [
        appointment({ personId: hiddenTopPersonId, positionId: hiddenTopPost }),
        appointment({ personId: nextPersonId, positionId: nextPost }),
      ],
      [],
      [
        position({ _id: hiddenTopPost, body: 'board', rank: 1, isVisible: false }),
        position({ _id: nextPost, body: 'board', rank: 2, isVisible: true }),
      ],
    );

    const kept = await service.findActiveTopOfBoard();

    expect(kept.map((row) => row.personId)).toEqual([hiddenTopPersonId]);
  });

  it('answers with nothing when nobody is appointed at all', async () => {
    const service = serviceWith([], []);

    expect(await service.findActiveTopOfBoard()).toEqual([]);
  });
});
