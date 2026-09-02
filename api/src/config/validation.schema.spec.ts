import { validationSchema } from './validation.schema.js';

describe('validationSchema', () => {
  const validEnv = {
    MONGODB_URI: 'mongodb://127.0.0.1:27017/uaeaf',
    JWT_SECRET: 'a'.repeat(32),
  };

  it('accepts a minimal valid env and fills in defaults', () => {
    const result = validationSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.PORT).toBe(3000);
      expect(result.data.JWT_ACCESS_EXPIRY).toBe('15m');
      expect(result.data.JWT_REFRESH_EXPIRY).toBe('7d');
    }
  });

  it('coerces a string PORT env var to a number', () => {
    const result = validationSchema.safeParse({ ...validEnv, PORT: '4000' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(4000);
    }
  });

  it('fails fast when MONGODB_URI is missing', () => {
    const { MONGODB_URI: _omit, ...withoutMongoUri } = validEnv;

    expect(validationSchema.safeParse(withoutMongoUri).success).toBe(false);
  });

  it('fails fast when MONGODB_URI is not a valid URI', () => {
    const result = validationSchema.safeParse({ ...validEnv, MONGODB_URI: 'not-a-uri' });

    expect(result.success).toBe(false);
  });

  it('fails fast when JWT_SECRET is missing', () => {
    const { JWT_SECRET: _omit, ...withoutSecret } = validEnv;

    expect(validationSchema.safeParse(withoutSecret).success).toBe(false);
  });

  it('fails fast when JWT_SECRET is shorter than 32 characters', () => {
    const result = validationSchema.safeParse({ ...validEnv, JWT_SECRET: 'too-short' });

    expect(result.success).toBe(false);
  });

  it('fails fast when NODE_ENV is not one of the allowed values', () => {
    const result = validationSchema.safeParse({ ...validEnv, NODE_ENV: 'staging' });

    expect(result.success).toBe(false);
  });
});
