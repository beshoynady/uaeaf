import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateContactMessageDto } from './create-contact-messages.dto.js';

/**
 * Length limits added schema-audit-2026-09-04.md §3.7 (P1 finding): this is
 * the platform's only unauthenticated write route, so every free-text field
 * needed an explicit bound. Validated here via the real `class-validator`
 * pipeline (the same one `main.ts`'s global `ValidationPipe` runs), not by
 * re-implementing the check — a decorator dropped from the DTO fails this
 * test rather than only being caught in a live 400 response.
 */
describe('CreateContactMessageDto length limits', () => {
  const validSubmission = {
    messageType: 'Complaint',
    senderName: 'Citizen',
    senderPhone: '+971 50 123 4567',
    messageBody: 'Body text.',
  };

  it('accepts a submission within every field\'s limit', async () => {
    const dto = plainToInstance(CreateContactMessageDto, validSubmission);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("accepts the form's subject line", async () => {
    // The public form has a Subject input (Figma `2616:1382`). Without a field
    // to carry it the endpoint would accept the submission and silently drop
    // what the citizen typed.
    const dto = plainToInstance(CreateContactMessageDto, {
      ...validSubmission,
      subject: 'Question about the national championship calendar',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects subject over 200 characters', async () => {
    const dto = plainToInstance(CreateContactMessageDto, {
      ...validSubmission,
      subject: 'a'.repeat(201),
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'subject')).toBe(true);
  });

  it('rejects senderName over 200 characters', async () => {
    const dto = plainToInstance(CreateContactMessageDto, {
      ...validSubmission,
      senderName: 'a'.repeat(201),
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'senderName')).toBe(true);
  });

  it('rejects messageBody over 5000 characters', async () => {
    const dto = plainToInstance(CreateContactMessageDto, {
      ...validSubmission,
      messageBody: 'a'.repeat(5001),
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'messageBody')).toBe(true);
  });

  it('rejects senderPhone over 30 characters', async () => {
    const dto = plainToInstance(CreateContactMessageDto, {
      ...validSubmission,
      senderPhone: '1'.repeat(31),
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'senderPhone')).toBe(true);
  });

  it('requires a telephone number', async () => {
    // ADR-0067 D10. The pair inverted on 2026-09-10: a telephone reaches a
    // citizen in this country more reliably than an address, and
    // `replyChannel` already models both as equals.
    const { senderPhone: _omitted, ...withoutPhone } = validSubmission;
    const dto = plainToInstance(CreateContactMessageDto, withoutPhone);

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'senderPhone')).toBe(true);
  });

  it('rejects a blank telephone number, not only a missing one', async () => {
    // `@IsString()` alone accepts `''`, which would let the form's own
    // requirement be bypassed by anything posting directly.
    const dto = plainToInstance(CreateContactMessageDto, {
      ...validSubmission,
      senderPhone: '   ',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'senderPhone')).toBe(true);
  });

  it('accepts a submission with no email address at all', async () => {
    const dto = plainToInstance(CreateContactMessageDto, validSubmission);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('still rejects an email address that is present and malformed', async () => {
    // Optional is not unchecked: an address that cannot receive is worse than
    // none, because it looks like a channel.
    const dto = plainToInstance(CreateContactMessageDto, {
      ...validSubmission,
      senderEmail: 'not-an-address',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'senderEmail')).toBe(true);
  });

  it('says what is wrong in both languages on the pair that changed', async () => {
    // ADR-0058 leaves `message` to humans and gives clients `code`; these two
    // fields changed meaning, so an integrator built against the old contract
    // is told what happened in a language they read.
    const { senderPhone: _omitted, ...withoutPhone } = validSubmission;
    const dto = plainToInstance(CreateContactMessageDto, withoutPhone);

    const errors = await validate(dto);
    const message = Object.values(errors.find((e) => e.property === 'senderPhone')!.constraints!)
      .join(' ');

    expect(message).toMatch(/[\u0600-\u06FF]/);
    expect(message).toMatch(/phone number is required/i);
  });

  it('rejects senderEmail over 254 characters', async () => {
    const dto = plainToInstance(CreateContactMessageDto, {
      ...validSubmission,
      senderEmail: `${'a'.repeat(250)}@a.co`,
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'senderEmail')).toBe(true);
  });
});
