import { assertOpaqueSecret } from './session-crypto.js';

export const developmentSessionCookieName = '__Host-welspun-dev-session';

/** Serialization only. No endpoint sets this cookie in Phase 2D.2D.1. */
export function serializeDevelopmentSessionCookie(
  sessionToken: unknown,
): string {
  assertOpaqueSecret(sessionToken);
  return [
    `${developmentSessionCookieName}=${sessionToken}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function clearDevelopmentSessionCookie(): string {
  return [
    `${developmentSessionCookieName}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}
