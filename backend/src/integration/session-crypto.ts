import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const tokenBytes = 32;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function createOpaqueSecret(): string {
  return randomBytes(tokenBytes).toString('base64url');
}

export function hashOpaqueSecret(secret: unknown): string {
  if (typeof secret !== 'string' || !tokenPattern.test(secret))
    throw new Error('Opaque session secret is invalid');
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function hashesEqual(left: unknown, right: unknown): boolean {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right))
    return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

export function assertOpaqueSecret(secret: unknown): asserts secret is string {
  if (typeof secret !== 'string' || !tokenPattern.test(secret))
    throw new Error('Opaque session secret is invalid');
}
