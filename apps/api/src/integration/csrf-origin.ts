import { hashOpaqueSecret, hashesEqual } from './session-crypto.js';
import { parseLoopbackOrigin } from './config.js';
import {
  isSessionUsable,
  type DevelopmentSessionRecord,
} from './session-store.js';

export const safeMutationMethods = Object.freeze([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);
const jsonContentTypes = new Set([
  'application/json',
  'application/json; charset=utf-8',
]);

export type CsrfCheck = Readonly<{
  session: DevelopmentSessionRecord;
  token: unknown;
  origin: unknown;
  method: unknown;
  contentType: unknown;
  allowedOrigins: readonly string[];
  now: Date;
}>;

export function assertExactBrowserOrigin(
  origin: unknown,
  allowedOrigins: readonly string[],
) {
  if (
    !allowedOrigins.length ||
    allowedOrigins.some((allowed) => {
      try {
        return parseLoopbackOrigin(allowed) !== allowed;
      } catch {
        return true;
      }
    }) ||
    typeof origin !== 'string' ||
    origin.length > 256 ||
    !allowedOrigins.includes(origin)
  )
    throw new Error('Browser origin is not allowed');
  return origin;
}

export function verifyMutationCsrf(input: CsrfCheck): true {
  if (!isSessionUsable(input.session, input.now))
    throw new Error('Session is not active');
  const method =
    typeof input.method === 'string' ? input.method.toUpperCase() : '';
  if (
    !safeMutationMethods.includes(
      method as (typeof safeMutationMethods)[number],
    )
  )
    throw new Error('Mutation method is not allowed');
  assertExactBrowserOrigin(input.origin, input.allowedOrigins);
  if (
    typeof input.contentType !== 'string' ||
    !jsonContentTypes.has(input.contentType.toLowerCase())
  )
    throw new Error('Mutation content type is not allowed');
  if (
    typeof input.token !== 'string' ||
    !hashesEqual(hashOpaqueSecret(input.token), input.session.csrfBindingHash)
  )
    throw new Error('CSRF token is not valid');
  return true;
}

export function assertNoUnsafeOriginForSafeRequest(
  method: unknown,
  origin: unknown,
  allowedOrigins: readonly string[],
) {
  const normalized = typeof method === 'string' ? method.toUpperCase() : '';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(normalized))
    throw new Error('Request method is not safe');
  if (origin !== undefined) assertExactBrowserOrigin(origin, allowedOrigins);
  return true;
}

/** Always re-read through the server lifecycle; a cached record cannot establish current validity. */
export async function verifyCurrentMutationCsrf(
  lifecycle: {
    verify(token: unknown): Promise<DevelopmentSessionRecord | null>;
  },
  input: Omit<CsrfCheck, 'session'> & { sessionToken: unknown },
) {
  assertExactBrowserOrigin(input.origin, input.allowedOrigins);
  const current = await lifecycle.verify(input.sessionToken);
  if (!current) throw new Error('Session is not active');
  return verifyMutationCsrf({ ...input, session: current });
}
