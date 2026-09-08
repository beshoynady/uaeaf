import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { duplicateKeyField, isDuplicateKeyError } from '../utils/mongo-errors.util.js';
import { codeForStatus, isApiErrorCode } from '../errors/api-error-code.js';

/**
 * The one place an exception becomes an HTTP response.
 *
 * Named for what it covers: every exception, not only the database ones it
 * was introduced for. It also stamps the machine-readable `code` that clients
 * branch on — see `withCode` below and `../errors/api-error-code.ts`.
 *
 * The API registered no filter at all until 2026-09-08, so anything that was
 * not already an `HttpException` reached the caller as a bare 500 — a
 * duplicate email, a Mongoose `required` violation, a malformed id in a path
 * param. Each of those is the caller's request being wrong, and a 500 tells
 * them the opposite: retry later, nothing you can fix.
 *
 * Two rules govern what it does:
 *
 * 1. **It never reinterprets a deliberate refusal.** Every intentional
 *    rejection in this codebase is already an `HttpException`; those pass
 *    through with their own status and body untouched.
 *
 * 2. **It never echoes the detail of an unexpected failure.** A driver error
 *    message can carry a connection string, a query, or a document. That
 *    goes to the server log; the response says only that something failed.
 *
 * This is a safety net, not a substitute for handling: `UsersService.create`
 * still catches its own duplicate key so it can say something specific about
 * the email. The net is what stops the *next* unhandled case from being a
 * 500 for a 400-shaped problem.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<{
      status(code: number): { json(body: unknown): unknown };
    }>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(this.withCode(status, exception.getResponse()));
      return;
    }

    const { status, message } = this.translate(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      const request = http.getRequest<{ method?: string; url?: string }>();
      // Logged in full here precisely so it does not have to be in the
      // response.
      this.logger.error(
        `Unhandled exception on ${request?.method ?? '?'} ${request?.url ?? '?'}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(this.withCode(status, { message }));
  }

  /**
   * The one place a body acquires its `code`.
   *
   * Doing it here rather than at each throw site is what makes the guarantee
   * total: ninety-odd `throw new NotFoundException(...)` calls across the
   * modules keep their own wording and still answer with a code a client can
   * branch on. A site that needs to be told apart from its neighbours opts in
   * by throwing an object instead of a string.
   *
   * A code outside the vocabulary is discarded rather than forwarded, so a
   * typo degrades to the status default instead of reaching a client with no
   * branch for it.
   */
  private withCode(status: number, original: string | object): Record<string, unknown> {
    const body: Record<string, unknown> =
      typeof original === 'object' && original !== null
        ? { ...(original as Record<string, unknown>) }
        : { message: original };

    body.statusCode = status;
    body.code = isApiErrorCode(body.code) ? body.code : codeForStatus(status);
    return body;
  }

  private translate(exception: unknown): { status: number; message: string } {
    if (isDuplicateKeyError(exception)) {
      const field = duplicateKeyField(exception);
      return {
        status: HttpStatus.CONFLICT,
        message: field
          ? `A record with this ${field} already exists.`
          : 'A record with these details already exists.',
      };
    }

    const name = (exception as { name?: unknown } | null)?.name;

    if (name === 'ValidationError') {
      // Mongoose's own schema validation. Reaching here means a rule exists
      // in the schema that no DTO expresses — worth knowing, but it is still
      // the request that cannot be applied, not the server that broke.
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'The request could not be applied to the record.',
      };
    }

    if (name === 'CastError') {
      // A path parameter that is not a valid ObjectId. Common enough from a
      // hand-typed URL that a 500 would be actively misleading.
      return { status: HttpStatus.BAD_REQUEST, message: 'Malformed identifier in the request.' };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error.' };
  }
}
