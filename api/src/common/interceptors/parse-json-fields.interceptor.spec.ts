import { BadRequestException } from '@nestjs/common';
import { ParseJsonFieldsInterceptor } from './parse-json-fields.interceptor.js';

/**
 * Multipart form parts are strings — all of them.
 *
 * A JSON request body arrives already shaped, so a nested object validates
 * directly. A multipart body does not: every text part is a string, so a
 * bilingual `{ ar, en }` reaches the handler as the characters `{"ar":…}`
 * and fails `@ValidateNested()` for being a string. This turns the named
 * parts back into objects before validation runs, and refuses anything
 * that is not one rather than passing a surprise downstream.
 *
 * `transform` is the whole of the behaviour; `intercept` only hands it the
 * request body. Testing it directly is testing the interceptor.
 */

describe('ParseJsonFieldsInterceptor', () => {
  const pipe = new ParseJsonFieldsInterceptor(['caption', 'altText']);

  /** The pipe passes a missing body straight through, so its return type is
   *  nullable; every case below supplies a body, and this keeps that fact in
   *  one place instead of a non-null assertion on each. */
  const run = (body: Record<string, unknown>) => pipe.transform(body) as Record<string, unknown>;

  it('parses the named fields into objects', () => {
    const parsed = run({
      caption: '{"ar":"تعليق","en":"Caption"}',
      altText: '{"ar":"بديل","en":"Alt"}',
    });

    expect(parsed).toEqual({
      caption: { ar: 'تعليق', en: 'Caption' },
      altText: { ar: 'بديل', en: 'Alt' },
    });
  });

  it('leaves every other field exactly as it arrived', () => {
    // `displayOrder` is still a string here; the validation pipe's own
    // `transform` converts it. This pipe has one job.
    const parsed = run({ caption: '{"ar":"ت","en":"C"}', displayOrder: '3' });
    expect(parsed.displayOrder).toBe('3');
  });

  it('leaves an absent optional field absent', () => {
    const parsed = run({ caption: '{"ar":"ت","en":"C"}' });
    expect('altText' in parsed).toBe(false);
  });

  it('leaves a field alone when it is already an object', () => {
    // The same DTO is reachable through a JSON body in tests and tooling;
    // parsing an object would throw where nothing is wrong.
    const parsed = run({ caption: { ar: 'ت', en: 'C' } });
    expect(parsed.caption).toEqual({ ar: 'ت', en: 'C' });
  });

  it('names the field when its JSON is malformed', () => {
    // The editor sees this message; "Unexpected token" alone does not say
    // which of two bilingual fields was the problem.
    expect(() => pipe.transform({ caption: '{"ar":' })).toThrow(BadRequestException);
    expect(() => pipe.transform({ caption: '{"ar":' })).toThrow(/caption/);
  });

  it('refuses valid JSON that is not an object', () => {
    // `"caption": "7"` parses cleanly to a number and would then fail
    // validation with a message about the wrong thing.
    expect(() => pipe.transform({ caption: '7' })).toThrow(BadRequestException);
    expect(() => pipe.transform({ caption: 'null' })).toThrow(BadRequestException);
    expect(() => pipe.transform({ caption: '["ar"]' })).toThrow(BadRequestException);
  });

  it('passes a missing body through rather than throwing', () => {
    // A request with no parts at all is the validation pipe's refusal to
    // make, and its message is the better one.
    expect(pipe.transform(undefined)).toBeUndefined();
  });
});
