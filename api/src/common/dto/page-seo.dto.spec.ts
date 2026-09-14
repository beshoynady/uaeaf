import { Types } from 'mongoose';
import { toPageSeo } from './page-seo.dto.js';

/** How a validated `seo` body becomes the stored embed, shared by every page
 *  that carries one (ADR-0070 D3). */
describe('toPageSeo', () => {
  it('stores the share image as an ObjectId, so it can be resolved like any image ref', () => {
    const id = new Types.ObjectId().toString();

    const seo = toPageSeo({ metaTitle: { ar: 'ع', en: 't' }, metaDescription: { ar: 'و', en: 'd' }, ogImageId: id });

    expect(seo.ogImageId).toBeInstanceOf(Types.ObjectId);
    expect(String(seo.ogImageId)).toBe(id);
    expect(seo.metaTitle).toEqual({ ar: 'ع', en: 't' });
    expect(seo.metaDescription).toEqual({ ar: 'و', en: 'd' });
  });

  it('stores every field left out as null, as the schema defaults it', () => {
    expect(toPageSeo({})).toEqual({ metaTitle: null, metaDescription: null, ogImageId: null });
  });
});
