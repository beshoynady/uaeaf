/** Narrows a caught error to MongoDB's duplicate-key shape (`code: 11000`)
 *  so a unique-index violation can be turned into a clean `ConflictException`
 *  at the service layer instead of leaking a raw driver error to the client. */
export function isDuplicateKeyError(
  error: unknown,
): error is { code: 11000; keyValue?: Record<string, unknown> } {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

/** The field name reported by a duplicate-key error, when available. */
export function duplicateKeyField(error: { keyValue?: Record<string, unknown> }): string | undefined {
  return error.keyValue ? Object.keys(error.keyValue)[0] : undefined;
}
