import { ApiProperty } from '@nestjs/swagger';

/**
 * What a page answers while it is switched off: the switch, and nothing else.
 *
 * The absence is the point. A withheld page's draft may be mid-review, or may
 * be a version nobody has approved — so the response carries no content at all
 * rather than content the caller is expected not to render. There is then
 * nothing to leak whatever a client does with the body (ADR-0102 §D2).
 *
 * The route still answers **200**, not 404: the address is real, the page is
 * named, and its content is not ready. The public site draws the "in
 * preparation" page and marks itself `noindex`.
 */
export class WithheldPageDto {
  @ApiProperty({ enum: [false], description: 'Always false. A served page answers its own shape.' })
  isActive: false;
}

/** The one value of that shape. Frozen, because it is shared by every page's
 *  public read and a caller that mutated it would change what the next one
 *  answers. */
export const WITHHELD_PAGE: WithheldPageDto = Object.freeze({ isActive: false as const });
