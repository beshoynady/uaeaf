import {
  BadRequestException,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';

/**
 * Restores structured fields that multipart flattened into strings.
 *
 * A JSON request body arrives shaped, so `@ValidateNested()` sees an object.
 * A multipart body carries every text part as a string, so the same
 * bilingual field reaches the handler as `{"ar":"…","en":"…"}` — characters,
 * not an object — and validation refuses it for the wrong reason. This runs
 * before validation and turns the named parts back into what the DTO
 * declares.
 *
 * Scoped to an explicit list rather than "anything that looks like JSON":
 * a caption of `"7"` or `"[1]"` is legitimate text, and a parser that took
 * every parseable string would silently change it.
 *
 * An interceptor rather than a pipe, and not as a matter of taste: Nest
 * applies global pipes before parameter-level ones, so the global
 * `ValidationPipe` reached the still-stringified fields first and refused
 * the request with "nested property caption must be either object or
 * array". That was measured against the running API, not reasoned about.
 * Interceptors run ahead of every pipe, which is the one position from
 * which this can do its job at all.
 */
@Injectable()
export class ParseJsonFieldsInterceptor implements NestInterceptor {
  constructor(private readonly fields: readonly string[]) {}

  /** Wiring only. Every decision lives in `transform` below, which is where
   *  the tests reach it without having to construct a request. */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ body?: Record<string, unknown> }>();
    request.body = this.transform(request.body);
    return next.handle();
  }

  transform(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    // No body at all is the validation pipe's refusal to make; its message
    // about the missing required fields is more useful than one from here.
    if (!value || typeof value !== 'object') {
      return value;
    }

    for (const field of this.fields) {
      const raw = value[field];
      // Absent stays absent — optional fields are the caller's to omit —
      // and an object is already what the DTO wants, which is how the same
      // handler stays reachable through a JSON body.
      if (raw === undefined || typeof raw !== 'string') {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new BadRequestException(`"${field}" is not valid JSON.`);
      }

      // `null` and arrays are both `typeof 'object'`, and neither is the
      // shape any DTO using this pipe declares.
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new BadRequestException(`"${field}" must be a JSON object.`);
      }

      value[field] = parsed;
    }

    return value;
  }
}
