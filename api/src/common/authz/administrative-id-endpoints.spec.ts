import { ADMINISTRATIVE_ID_ENDPOINTS } from './administrative-id-endpoints.js';

describe('ADMINISTRATIVE_ID_ENDPOINTS', () => {
  const endpoints = ADMINISTRATIVE_ID_ENDPOINTS.map((entry) => entry.endpoint);

  it('is not empty', () => {
    expect(ADMINISTRATIVE_ID_ENDPOINTS.length).toBeGreaterThanOrEqual(12);
  });

  it('names each endpoint once', () => {
    const repeated = endpoints.filter((endpoint, index) => endpoints.indexOf(endpoint) !== index);
    expect(repeated).toEqual([]);
  });

  it.each(endpoints)('%s is an HTTP method followed by an absolute path', (endpoint) => {
    expect(endpoint).toMatch(/^(GET|POST|PATCH|PUT|DELETE) \//);
  });

  it.each(ADMINISTRATIVE_ID_ENDPOINTS.map((entry) => [entry.endpoint, entry.reason]))(
    '%s states a reason',
    (_endpoint, reason) => {
      expect(reason.trim().length).toBeGreaterThan(20);
    },
  );

  it('holds no public route', () => {
    expect(endpoints.filter((endpoint) => endpoint.includes('public'))).toEqual([]);
  });
});
