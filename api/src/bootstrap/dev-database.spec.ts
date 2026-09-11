import { assertSafeDevTarget } from './dev-database.js';

describe('assertSafeDevTarget', () => {
  it.each([
    'mongodb://127.0.0.1:27017/uaeaf',
    'mongodb://localhost/uaeaf',
    'mongodb://dev:pass@localhost:27017/uaeaf?replicaSet=rs0',
    'mongodb://[::1]:27017/uaeaf',
  ])('accepts a local database: %s', (uri) => {
    expect(() => assertSafeDevTarget(uri, 'development')).not.toThrow();
    expect(() => assertSafeDevTarget(uri, undefined)).not.toThrow();
  });

  it('refuses production even when the database is local', () => {
    expect(() => assertSafeDevTarget('mongodb://127.0.0.1:27017/uaeaf', 'production')).toThrow(/production/);
  });

  it.each([
    'mongodb+srv://dev:pass@cluster0.abcde.mongodb.net/uaeaf',
    'mongodb://10.0.0.5:27017/uaeaf',
    'mongodb://localhost:27017,db2.example.com:27017/uaeaf',
    'mongodb://localhost.example.com/uaeaf',
  ])('refuses anything that is not this machine: %s', (uri) => {
    expect(() => assertSafeDevTarget(uri, 'development')).toThrow(/local/);
  });

  it('refuses when there is no database address at all', () => {
    expect(() => assertSafeDevTarget(undefined, 'development')).toThrow(/MONGODB_URI/);
  });

  it('never repeats the credentials in its refusal', () => {
    // The refusal is printed to a terminal and often to CI logs.
    expect(() => assertSafeDevTarget('mongodb://dev:hunter2-secret@db.example.com/uaeaf', 'development')).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2-secret') }),
    );
  });
});
