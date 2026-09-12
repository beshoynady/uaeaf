import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { PRESIDENT_MESSAGE_CONTENT } from './president-message-content.js';
import { DEV_FIXTURE_SETS } from './seed-dev.js';
import { richTextParagraphs } from '../common/rich-text/rich-text-plain-text.js';
import { validateRichText } from '../common/rich-text/validate-rich-text.js';

const { EJSON } = mongoose.mongo.BSON;

/**
 * The seed fixture and the content module are generated from the same
 * approved copy, and this is what keeps them that way.
 *
 * They are separate artefacts on purpose — the fixture is Extended JSON the
 * seed inserts, the module is what code reads — so nothing but a test stops
 * one from being corrected and the other forgotten.
 */
describe("President's Message seed fixture", () => {
  const seedDir = join(process.cwd(), 'seed', 'dev');

  const load = async <T>(collection: string): Promise<T[]> =>
    EJSON.parse(await readFile(join(seedDir, `${collection}.json`), 'utf8'), {
      relaxed: true,
    }) as T[];

  let message: Record<string, unknown>;
  let appointments: Record<string, unknown>[];

  beforeAll(async () => {
    [message] = await load<Record<string, unknown>>('presidentMessagePage');
    appointments = await load<Record<string, unknown>>('federationAppointments');
  });

  it('is registered in the seed, after the appointment it points at', () => {
    const order = DEV_FIXTURE_SETS.map((set) => set.collection);

    expect(order).toContain('presidentMessagePage');
    expect(order).toContain('federationAppointments');
    expect(order.indexOf('federationAppointments')).toBeLessThan(order.indexOf('presidentMessagePage'));
    expect(DEV_FIXTURE_SETS.find((set) => set.collection === 'presidentMessagePage')?.singleton).toBe(true);
  });

  it('points at an appointment that is in the seed and currently active', () => {
    const appointment = appointments.find(
      (row) => String(row._id) === String(message.federationAppointmentId),
    );

    expect(appointment).toBeDefined();
    expect(appointment!.roleType).toBe('President');
    // The public route resolves the current message through the sitting
    // term (ADR-0069 D3); a Completed appointment would resolve to nothing.
    expect(appointment!.status).toBe('Active');
  });

  it('carries the same body as the content module, character for character', () => {
    const body = message.messageBody as Record<string, unknown>;

    expect(richTextParagraphs(body.ar)).toEqual(
      richTextParagraphs(PRESIDENT_MESSAGE_CONTENT.messageBody.ar),
    );
    expect(richTextParagraphs(body.en)).toEqual(
      richTextParagraphs(PRESIDENT_MESSAGE_CONTENT.messageBody.en),
    );
  });

  it('carries the same hero, quote, values title and signatory as the content module', () => {
    expect(message.heroTitle).toEqual(PRESIDENT_MESSAGE_CONTENT.heroTitle);
    expect(message.heroSubtitle).toEqual(PRESIDENT_MESSAGE_CONTENT.heroSubtitle);
    expect(message.pullQuote).toEqual(PRESIDENT_MESSAGE_CONTENT.pullQuote);
    expect(message.valuesTitle).toEqual(PRESIDENT_MESSAGE_CONTENT.valuesTitle);
    expect(message.signatoryName).toEqual(PRESIDENT_MESSAGE_CONTENT.signatoryName);
    expect(message.signatoryTitle).toEqual(PRESIDENT_MESSAGE_CONTENT.signatoryTitle);
  });

  it('carries the same five values, in order', () => {
    expect(message.values).toEqual(PRESIDENT_MESSAGE_CONTENT.values.map((value) => ({ ...value })));
  });

  it('stores a body the per-language allowlist accepts', () => {
    const body = message.messageBody as Record<string, unknown>;

    expect(validateRichText(body.ar, 'ar')).toEqual([]);
    expect(validateRichText(body.en, 'en')).toEqual([]);
  });

  it('seeds as a Draft — the seed never publishes anything', () => {
    // Publishing is a decision taken through the policy, by a person with
    // the Publish permission (ADR-0069 D5). A fixture that seeded `Live`
    // would put content on the public site with nobody having chosen to.
    expect(message.publicationState).toBe('Draft');
  });

  it('leaves the portrait absent rather than pointing at an invented asset', () => {
    // §7.5-6(c): the master portrait has not been supplied. A missing image
    // is not a string, so the pending-content marker cannot express it —
    // the editor surfaces it, the publish guard does not.
    expect(message.featuredImageId).toBeNull();
    expect(message.heroImageId).toBeNull();
  });
});
