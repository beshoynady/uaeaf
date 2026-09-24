import { parseVideoUrl } from './url-allowlist.js';

/**
 * The only thing standing between a pasted link and an outbound request.
 *
 * The refusals matter more than the acceptances. Everything this lets through
 * becomes a URL the server fetches and a frame a visitor's browser loads, so a
 * host that slips past here is a request made from inside the network on
 * somebody else's instruction (SSRF). Host matching is therefore **equality
 * against a fixed set**, never `endsWith` — `youtube.com.evil.test` ends with
 * nothing suspicious and is entirely attacker-controlled.
 */
describe('parseVideoUrl', () => {
  describe('the shapes editors actually paste', () => {
    it.each([
      ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', 'video'],
      ['https://youtu.be/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', 'video'],
      ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ', 'video'],
      ['https://www.youtube.com/shorts/abc123', 'youtube', 'abc123', 'reel'],
      // Task 5 resolves a broadcast link through this same parser.
      ['https://www.youtube.com/live/LIVEID', 'youtube', 'LIVEID', 'video'],
      ['https://www.instagram.com/reel/XYZ/', 'instagram', 'XYZ', 'reel'],
      ['https://www.instagram.com/p/XYZ/', 'instagram', 'XYZ', 'video'],
      ['https://www.instagram.com/tv/XYZ/', 'instagram', 'XYZ', 'video'],
      ['https://www.tiktok.com/@uaeaf/video/7300', 'tiktok', '7300', 'reel'],
      ['https://x.com/uaeaf/status/1800', 'x', '1800', 'video'],
      ['https://twitter.com/uaeaf/status/1800', 'x', '1800', 'video'],
      ['https://twitter.com/i/status/1800', 'x', '1800', 'video'],
      ['https://www.facebook.com/uaeaf/videos/1234/', 'facebook', '1234', 'video'],
    ])('reads %s', (url, platform, externalId, kind) => {
      expect(parseVideoUrl(url)).toEqual({ platform, externalId, kind });
    });

    it('ignores the tracking parameters platforms append when you press share', () => {
      const plain = parseVideoUrl('https://www.youtube.com/watch?v=abc');

      for (const noisy of [
        'https://www.youtube.com/watch?v=abc&si=AbCdEf',
        'https://www.youtube.com/watch?v=abc&t=42s',
        'https://www.youtube.com/watch?v=abc&feature=share&t=42s',
      ]) {
        expect(parseVideoUrl(noisy)).toEqual(plain);
      }

      expect(parseVideoUrl('https://youtube.com/live/LIVEID?si=AbCdEf')!.externalId).toBe('LIVEID');
    });

    it('treats a live URL as an ordinary video shape — "live" is a state, not a frame', () => {
      expect(parseVideoUrl('https://www.youtube.com/live/LIVEID')!.kind).toBe('video');
    });

    it('recognises the short TikTok host without pretending to know its id', () => {
      // vm.tiktok.com carries no video id; only a redirect reveals it, which
      // is `followShortLink`'s job. What matters here is that the host is
      // allowed, so the redirect may be attempted at all.
      expect(parseVideoUrl('https://vm.tiktok.com/ZMabcdef/')).toEqual({
        platform: 'tiktok',
        externalId: null,
        kind: 'reel',
      });
    });
  });

  describe('refusals', () => {
    it.each([
      // The suffix attack the exact-match rule exists to stop.
      'https://youtube.com.evil.test/watch?v=a',
      'https://notyoutube.com/watch?v=a',
      // Credentials before the host: everything left of @ is ignored by the
      // browser, so this is a request to 127.0.0.1 that reads as YouTube.
      'https://youtube.com@127.0.0.1/',
      'https://www.youtube.com:pass@169.254.169.254/',
      // Cloud metadata and the loopback family.
      'https://169.254.169.254/latest/meta-data/',
      'https://127.0.0.1/watch?v=a',
      'https://localhost/watch?v=a',
      'https://10.0.0.5/watch?v=a',
      'https://192.168.1.1/watch?v=a',
      // Schemes that are not a fetch at all.
      'file:///etc/passwd',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      // Plain http, which would send the request in clear and is never a
      // canonical share link from any of these platforms.
      'http://www.youtube.com/watch?v=a',
      // Protocol-relative: no scheme, so `new URL` cannot anchor it.
      '//www.youtube.com/watch?v=a',
      'https://evil.test/watch?v=a',
      '',
      'not a url at all',
    ])('refuses %s', (url) => {
      expect(parseVideoUrl(url)).toBeNull();
    });

    it.each([
      'https://user:pass@www.youtube.com/watch?v=abc',
      'https://user@www.youtube.com/watch?v=abc',
      'https://user:pass@www.tiktok.com/@uaeaf/video/7300',
    ])('refuses credentials on an otherwise allowed host: %s', (url) => {
      // The isolating case. Every other credential test also carries a host
      // that is independently refused, so without this one the userinfo guard
      // could be deleted and the suite would stay green — which is how a
      // future refactor removes it silently.
      expect(parseVideoUrl(url)).toBeNull();
    });

    it.each([
      // Fails closed today; pinned so a future "tidy the trailing dot" edit
      // cannot loosen the host rule without going red.
      'https://youtube.com./watch?v=abc',
      // Punycode homograph: Cyrillic 'е' in "youtubе.com".
      'https://xn--youtub-8of.com/watch?v=abc',
      // Alternate IP encodings, all of which new URL canonicalises before the
      // guard sees them.
      'https://2852039166/',
      'https://0177.0.0.1/',
      'https://0/',
    ])('refuses the encoded host %s', (url) => {
      expect(parseVideoUrl(url)).toBeNull();
    });

    it('refuses an allowed host whose path names no video', () => {
      // The host is real; there is simply nothing to embed. Accepting this
      // would store a row whose player cannot be built.
      expect(parseVideoUrl('https://www.youtube.com/')).toBeNull();
      expect(parseVideoUrl('https://www.youtube.com/feed/subscriptions')).toBeNull();
      expect(parseVideoUrl('https://www.instagram.com/uaeaf/')).toBeNull();
    });
  });
});
