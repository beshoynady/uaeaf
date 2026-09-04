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
    senderEmail: 'citizen@example.com',
    messageBody: 'Body text.',
  };

  it('accepts a submission within every field\'s limit', async () => {
    const dto = plainToInstance(CreateContactMessageDto, validSubmission);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
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

  it('rejects senderEmail over 254 characters', async () => {
    const dto = plainToInstance(CreateContactMessageDto, {
      ...validSubmission,
      senderEmail: `${'a'.repeat(250)}@a.co`,
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'senderEmail')).toBe(true);
  });
});
