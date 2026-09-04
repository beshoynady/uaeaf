import { HeroPageDto } from '../../../common/dto/hero-page.dto.js';

/** Request body for PUT /videos-page. Singleton: there is no create-vs-update
 *  distinction on the wire, so one upsert DTO covers both. */
export class UpsertVideosPageDto extends HeroPageDto {}
