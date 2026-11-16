import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  unavailable,
  type Verification,
  type VerifiedWorkload,
} from './boundaries.js';
export const workloadAlgorithm = 'hmac-sha256-v1';
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const keyId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const audience = z
  .string()
  .max(256)
  .refine((v) => {
    try {
      const u = new URL(v);
      return (
        u.protocol === 'https:' && u.origin === v && !u.username && !u.password
      );
    } catch {
      return false;
    }
  });
const bindingSchema = z.strictObject({
  keyId,
  audience,
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z
    .string()
    .max(2048)
    .regex(/^\/integration\/api\/v1\/[a-z0-9/_-]+(?:\?[^#\r\n]*)?$/),
  requestId: z.uuid(),
  bodyDigest: hash,
  headersDigest: hash,
  timestamp: z.number().int().safe(),
  nonce: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
});
const proofSchema = z.strictObject({
  algorithm: z.literal(workloadAlgorithm),
  keyId,
  timestamp: z.number().int().safe(),
  nonce: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
  signature: hash,
});
export type WorkloadProof = z.infer<typeof proofSchema>;
type Binding = z.infer<typeof bindingSchema>;
function canonical(input: Binding) {
  return JSON.stringify([
    workloadAlgorithm,
    input.keyId,
    input.audience,
    input.method,
    input.path,
    input.requestId,
    input.bodyDigest,
    input.headersDigest,
    input.timestamp,
    input.nonce,
  ]);
}
export function signWorkloadRequest(
  input: Binding & { secret: Uint8Array },
): string {
  try {
    const { secret, ...binding } = input;
    if (!(secret instanceof Uint8Array) || secret.length < 32)
      throw new Error();
    return createHmac('sha256', secret)
      .update(canonical(bindingSchema.parse(binding)))
      .digest('hex');
  } catch {
    throw new Error('Workload signing input is invalid');
  }
}
/** Cryptographic integrity only: replay consumption/workload identity adapter remains disabled. */
export function verifyWorkloadProof(input: {
  proof: unknown;
  secret: Uint8Array;
  keyId: string;
  audience: string;
  method: string;
  path: string;
  requestId: string;
  bodyDigest: string;
  headersDigest: string;
  nowMs: number;
  maxSkewMs?: number;
}): boolean {
  try {
    const proof = proofSchema.parse(input.proof),
      skew = input.maxSkewMs ?? 30000;
    if (
      !Number.isSafeInteger(input.nowMs) ||
      !Number.isSafeInteger(skew) ||
      skew < 1 ||
      skew > 30000 ||
      Math.abs(input.nowMs - proof.timestamp) > skew ||
      proof.keyId !== input.keyId
    )
      return false;
    const expected = signWorkloadRequest({
      secret: input.secret,
      keyId: input.keyId,
      audience: input.audience,
      method: input.method as Binding['method'],
      path: input.path,
      requestId: input.requestId,
      bodyDigest: input.bodyDigest,
      headersDigest: input.headersDigest,
      timestamp: proof.timestamp,
      nonce: proof.nonce,
    });
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(proof.signature, 'hex'),
    );
  } catch {
    return false;
  }
}
/** No secret loader or accepting workload adapter is enabled in this phase. */
export function disabledWorkloadAuthenticator(): {
  verify(credential: unknown): Promise<Verification<VerifiedWorkload>>;
} {
  return Object.freeze({
    async verify(_credential: unknown) {
      return unavailable;
    },
  });
}
