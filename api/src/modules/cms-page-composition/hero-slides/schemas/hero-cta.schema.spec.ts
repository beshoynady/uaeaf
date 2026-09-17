import { isExternalCtaUrl, isInternalCtaUrl, isUsableCtaUrl } from './hero-cta.schema.js';

/**
 * Where a hero button may point.
 *
 * The refusals matter more than the acceptances here: an editor pasting a
 * link never sees what the browser will do with it, so everything this rule
 * lets through is something a visitor eventually clicks.
 */
describe('hero CTA URLs', () => {
  describe('internal', () => {
    it.each(['/', '/championships', '/about/governance/strategic-plan', '/news?tag=records'])(
      'accepts %s as a path the site adds the locale to',
      (url) => {
        expect(isInternalCtaUrl(url)).toBe(true);
        expect(isUsableCtaUrl(url)).toBe(true);
      },
    );

    it('refuses a protocol-relative URL, which leaves the site while looking like a path', () => {
      expect(isInternalCtaUrl('//evil.example')).toBe(false);
      expect(isUsableCtaUrl('//evil.example')).toBe(false);
    });

    it.each(['championships', './news', '../news'])('refuses the relative path %s', (url) => {
      expect(isUsableCtaUrl(url)).toBe(false);
    });
  });

  describe('external', () => {
    it.each(['https://worldathletics.org', 'https://example.com/a/b?c=d#e'])('accepts %s', (url) => {
      expect(isExternalCtaUrl(url)).toBe(true);
      expect(isUsableCtaUrl(url)).toBe(true);
    });

    it('refuses http, which silently downgrades a TLS-served site', () => {
      expect(isUsableCtaUrl('http://example.com')).toBe(false);
    });

    it.each(['javascript:alert(1)', 'data:text/html,<script>', 'mailto:a@b.c', 'tel:+97100000000', 'ftp://x.y'])(
      'refuses the scheme in %s',
      (url) => {
        expect(isUsableCtaUrl(url)).toBe(false);
      },
    );

    it('refuses an empty string and whitespace', () => {
      expect(isUsableCtaUrl('')).toBe(false);
      expect(isUsableCtaUrl('   ')).toBe(false);
    });
  });
});
