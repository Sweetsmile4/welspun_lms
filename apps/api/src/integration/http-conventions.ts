import { z } from 'zod';
import {
  commandMetadataSchema,
  errorCodeSchema,
  errorDefinitions,
  revisionSchema,
  reviewBindingSchema,
  safeErrorEnvelopeSchema,
  transportLimits,
  type ErrorCode,
  type SafeErrorEnvelope,
  type CommandMetadata,
} from '@welspun/contracts/integration/v1';

export class CommandMetadataError extends Error {
  readonly code: 'VALIDATION_ERROR' | 'PRECONDITION_REQUIRED';
  constructor(
    code: 'VALIDATION_ERROR' | 'PRECONDITION_REQUIRED' = 'VALIDATION_ERROR',
  ) {
    super('Invalid HTTP command metadata.');
    this.code = code;
  }
}
/** Only the raw command-header subset; never cookies/bearers. Preserve duplicates before parsing. */
export function parseCommandMetadata(
  raw: unknown,
  kind: CommandMetadata['kind'],
  body: unknown = {},
) {
  try {
    const pairs = z
      .array(z.tuple([z.string(), z.string().max(256)]))
      .max(4)
      .parse(raw);
    const headers = new Map<string, string>();
    for (const [name, value] of pairs) {
      const key = name.toLowerCase();
      if (
        ![
          'if-match',
          'idempotency-key',
          'x-request-id',
          'content-type',
        ].includes(key) ||
        headers.has(key) ||
        /[\r\n]/.test(value)
      )
        throw new Error();
      headers.set(key, value);
    }
    if (headers.get('content-type') !== 'application/json') throw new Error();
    const match = headers.get('if-match');
    if (kind !== 'create' && !match)
      throw new CommandMetadataError('PRECONDITION_REQUIRED');
    if (kind === 'create' && match !== undefined) throw new Error();
    if (match !== undefined && !/^"(0|[1-9]\d*)"$/.test(match))
      throw new Error();
    const expected =
      match === undefined
        ? undefined
        : revisionSchema.parse(Number(match.slice(1, -1)));
    const base = {
      schemaVersion: 1,
      kind,
      idempotencyKey: headers.get('idempotency-key'),
      requestId: headers.get('x-request-id'),
    };
    if (kind === 'create') {
      z.strictObject({}).parse(body);
      return commandMetadataSchema.parse(base);
    }
    if (kind === 'draft') {
      z.strictObject({}).parse(body);
      return commandMetadataSchema.parse({
        ...base,
        expectedDraftRevision: expected,
      });
    }
    const binding =
      kind === 'publish'
        ? z
            .strictObject({
              binding: reviewBindingSchema,
              expectedReleaseNumber: revisionSchema,
            })
            .parse(body)
        : z.strictObject({ binding: reviewBindingSchema }).parse(body);
    return commandMetadataSchema.parse({
      ...base,
      expectedDraftRevision: expected,
      ...binding,
    });
  } catch (error) {
    if (error instanceof CommandMetadataError) throw error;
    throw new CommandMetadataError();
  }
}
export function publicError(
  code: ErrorCode,
  requestId: string,
): { status: number; body: SafeErrorEnvelope } {
  const checked = errorCodeSchema.safeParse(code);
  const safe = checked.success ? checked.data : 'INTERNAL_ERROR';
  const definition = errorDefinitions[safe];
  return {
    status: definition.status,
    body: safeErrorEnvelopeSchema.parse({
      error: { code: safe, message: definition.message, details: [] },
      requestId,
    }),
  };
}
/** Advice only; no retry loop, sleeps or network requests. Attempts include the first send. */
export function retryAdvice(
  code: ErrorCode | 'NETWORK_FAILURE',
  attempt: number,
  hasStableIntent: boolean,
) {
  if (
    !Number.isSafeInteger(attempt) ||
    attempt < 1 ||
    attempt >= transportLimits.maxAttempts
  )
    return { retry: false as const, action: 'reconcile' as const };
  const checked = errorCodeSchema.safeParse(code);
  const action =
    code === 'NETWORK_FAILURE'
      ? 'same-intent'
      : checked.success
        ? errorDefinitions[checked.data].retry
        : 'reconcile';
  if (action !== 'same-intent' || !hasStableIntent)
    return { retry: false as const, action };
  return {
    retry: true as const,
    action: 'same-intent' as const,
    delayMs: Math.min(250 * 2 ** (attempt - 1), transportLimits.maxBackoffMs),
  };
}
export function assertPayloadSize(bytes: unknown, kind: 'command' | 'small') {
  const limit =
    kind === 'command'
      ? transportLimits.commandBodyBytes
      : transportLimits.smallBodyBytes;
  if (
    typeof bytes !== 'number' ||
    !Number.isSafeInteger(bytes) ||
    bytes < 0 ||
    bytes > limit
  )
    throw new Error('HTTP payload size is not permitted.');
}
