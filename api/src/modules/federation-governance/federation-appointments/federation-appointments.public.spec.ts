import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import { FederationPersonnelsService } from '../federation-personnel/federation-personnel.service.js';

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

const appointment = (extra: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  personId,
  roleType: 'BoardMember',
  positionTitle: pair('Board member'),
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

/** Honours the one filter the service queries on, so a test of "only serving
 *  officers" exercises the real mechanism rather than the stub's generosity. */
const serviceWith = (appointments: Record<string, unknown>[], people: Record<string, unknown>[]) => {
  const repository = {
    find: jest.fn(async (filter: Record<string, unknown> = {}) =>
      appointments.filter((row) => filter.status === undefined || row.status === filter.status),
    ),
  } as unknown as FederationAppointmentsRepository;
  const personnel = {
    findByIds: jest.fn(async () => people),
  } as unknown as FederationPersonnelsService;
  return new FederationAppointmentsService(repository, personnel);
};

describe('FederationAppointmentsService.currentLeadership', () => {
  it('names the people serving now, in the order the board set', async () => {
    const service = serviceWith(
      [
        appointment({ displayOrder: 2 }),
        appointment({ personId: otherPersonId, roleType: 'President', positionTitle: pair('President'), displayOrder: 1 }),
      ],
      [person(personId, 'Board member'), person(otherPersonId, 'President')],
    );

    const leaders = await service.currentLeadership();

    expect(leaders.map((leader) => leader.fullName.en)).toEqual(['President', 'Board member']);
  });

  it('carries only the four fields the page prints, and nothing restricted', async () => {
    const service = serviceWith([appointment()], [person(personId, 'Board member')]);

    const [leader] = await service.currentLeadership();

    expect(Object.keys(leader).sort()).toEqual(
      ['displayOrder', 'fullName', 'photoId', 'positionTitle', 'roleType'].sort(),
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
  it('leaves out committee roles, which belong to the committees page', async () => {
    const service = serviceWith(
      [appointment({ roleType: 'CommitteeChair' })],
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
});
