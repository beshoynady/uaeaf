import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * The body of every `PATCH …/active` — one field, and deliberately nothing
 * else.
 *
 * Switching a page off is not an edit, and this route must not become a way to
 * smuggle one past the review the content itself goes through. A body with any
 * other key is refused by the global pipe's `forbidNonWhitelisted`.
 *
 * One DTO for sixteen routes rather than sixteen copies of the same one field:
 * sixteen copies is sixteen chances for one of them to grow a second field
 * (ADR-0102 §D2).
 */
export class ToggleActiveDto {
  @ApiProperty({
    description: 'True serves the page; false shows visitors the "in preparation" page at the same URL.',
  })
  @IsBoolean()
  isActive: boolean;
}
