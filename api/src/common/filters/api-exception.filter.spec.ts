import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter.js';

/**
 * The filter exists because the API registered none, so anything that was
 * not already an `HttpException` — a Mongoose `ValidationError`, a driver
 * duplicate-key error, a malformed ObjectId — reached the caller as a bare
 * 500. A 500 tells a client "we broke"; these are all "your request was
 * wrong", and the difference decides whether the caller retries, corrects,
 * or escalates.
 */
function hostFor(): { host: ArgumentsHost; sent: { status?: number; body?: unknown } } {
  const sent: { status?: number; body?: unknown } = {};
  const response = {
    status(code: number) {
      sent.status = code;
      return this;
    },
    json(body: unknown) {
      sent.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/api/v1/users', method: 'POST' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, sent };
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();

  it('passes an HttpException through with its own status and body', () => {
    // Every deliberate refusal in the codebase is already an HttpException.
    // The filter must not reinterpret them.
    const { host, sent } = hostFor();
    filter.catch(new ForbiddenException('System roles cannot be renamed or deleted.'), host);

    expect(sent.status).toBe(HttpStatus.FORBIDDEN);
    expect(sent.body).toMatchObject({ message: 'System roles cannot be renamed or deleted.' });
  });

  it('preserves a validation exception with its array of messages', () => {
    const { host, sent } = hostFor();
    filter.catch(new BadRequestException(['email must be an email']), host);

    expect(sent.status).toBe(HttpStatus.BAD_REQUEST);
    expect(sent.body).toMatchObject({ message: ['email must be an email'] });
  });

  it('turns a duplicate-key error into a conflict, naming the field', () => {
    // The case that made a taken email a 500: UsersService.create has no
    // duplicate handling, so E11000 escaped unwrapped.
    const { host, sent } = hostFor();
    filter.catch({ code: 11000, keyValue: { email: 'noor@uaeaf.ae' } }, host);

    expect(sent.status).toBe(HttpStatus.CONFLICT);
    expect(sent.body).toMatchObject({ statusCode: 409, message: 'A record with this email already exists.' });
  });

  it('falls back to a field-less conflict message when the driver gives no keyValue', () => {
    const { host, sent } = hostFor();
    filter.catch({ code: 11000 }, host);

    expect(sent.status).toBe(HttpStatus.CONFLICT);
    expect(sent.body).toMatchObject({ message: 'A record with these details already exists.' });
  });

  it('turns a Mongoose validation error into a bad request', () => {
    const { host, sent } = hostFor();
    filter.catch({ name: 'ValidationError', message: 'User validation failed: name: Path `name` is required.' }, host);

    expect(sent.status).toBe(HttpStatus.BAD_REQUEST);
    expect(sent.body).toMatchObject({ statusCode: 400, message: 'The request could not be applied to the record.' });
  });

  it('turns a malformed object id into a bad request, not a server error', () => {
    const { host, sent } = hostFor();
    filter.catch({ name: 'CastError', path: '_id', value: 'not-an-id' }, host);

    expect(sent.status).toBe(HttpStatus.BAD_REQUEST);
    expect(sent.body).toMatchObject({ message: 'Malformed identifier in the request.' });
  });

  it('reports anything else as a server error without echoing its detail', () => {
    // The message of an unexpected failure can carry a connection string or
    // a query. It belongs in the server log, never in the response.
    const { host, sent } = hostFor();
    filter.catch(new Error('connect ECONNREFUSED mongodb://user:secret@host:27017'), host);

    expect(sent.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(JSON.stringify(sent.body)).not.toContain('secret');
    expect(sent.body).toMatchObject({ statusCode: 500, message: 'Internal server error.' });
  });
  /**
   * Every error body carries a machine-readable `code`.
   *
   * Without one, a client that needs to tell two refusals apart has only the
   * message, and matching on English prose is a contract that breaks the
   * moment anyone edits the copy. Stamping the code here rather than at each
   * of the ninety-odd throw sites means the guarantee holds for all of them,
   * including the ones nobody has revisited.
   */
  describe('error codes', () => {
    it('stamps the status default on a refusal that names no code', () => {
      const { host, sent } = hostFor();
      filter.catch(new ForbiddenException('Missing permission: Update on roles.'), host);

      expect(sent.body).toMatchObject({
        statusCode: 403,
        code: 'forbidden',
        message: 'Missing permission: Update on roles.',
      });
    });

    it('keeps the code the thrower chose', () => {
      const { host, sent } = hostFor();
      filter.catch(
        new ForbiddenException({
          code: 'systemRole',
          message: 'System roles cannot be renamed or deleted.',
        }),
        host,
      );

      expect(sent.status).toBe(HttpStatus.FORBIDDEN);
      expect(sent.body).toMatchObject({
        statusCode: 403,
        code: 'systemRole',
        message: 'System roles cannot be renamed or deleted.',
      });
    });

    it('ignores a code outside the vocabulary', () => {
      // A typo at a throw site must degrade to the status default, not reach
      // a client that has no branch for it.
      const { host, sent } = hostFor();
      filter.catch(new ForbiddenException({ code: 'systemRoles', message: 'Nope.' }), host);

      expect(sent.body).toMatchObject({ code: 'forbidden' });
    });

    it('leaves a validation exception its array of messages and adds a code', () => {
      const { host, sent } = hostFor();
      filter.catch(new BadRequestException(['email must be an email']), host);

      expect(sent.body).toMatchObject({
        statusCode: 400,
        code: 'badRequest',
        message: ['email must be an email'],
      });
    });

    it.each([
      [new NotFoundException('Role not found.'), 'notFound'],
      [{ code: 11000, keyValue: { email: 'noor@uaeaf.ae' } }, 'conflict'],
      [{ name: 'ValidationError', message: 'x' }, 'badRequest'],
      [{ name: 'CastError', path: '_id', value: 'nope' }, 'badRequest'],
      [new Error('boom'), 'internalError'],
    ])('stamps %#  with its code', (exception, code) => {
      const { host, sent } = hostFor();
      filter.catch(exception, host);

      expect(sent.body).toMatchObject({ code });
    });
  });
});
