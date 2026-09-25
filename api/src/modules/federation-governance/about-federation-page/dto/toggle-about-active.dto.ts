import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * The body of `PATCH /about-federation-page/:id/active` — one field, and
 * deliberately nothing else.
 *
 * Switching the page off is not an edit, and this route must not become a way
 * to smuggle one past the review the content itself goes through. A body with
 * any other key is refused by the global pipe's `forbidNonWhitelisted`.
 */
export class ToggleAboutActiveDto {
  @ApiProperty({ description: 'True serves the page; false shows visitors the "in preparation" screen.' })
  @IsBoolean()
  isActive: boolean;
}
