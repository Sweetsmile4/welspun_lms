import { createHash } from 'node:crypto';
import { z } from 'zod';
import { HttpError } from '../../../platform/errors.js';
import type { ReceiptKey } from './store.js';

export function fingerprint(value: unknown): string {
  function canonical(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(canonical);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => [k, canonical(v)]),
      );
    return item;
  }
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}
export const receiptVersions = {
  schemaVersion: 1,
  commandVersion: 1,
  responseVersion: 1,
} as const;
const id = z.string().regex(/^[a-f\d]{24}$/);
const hash = z.string().regex(/^[a-f\d]{64}$/);
export const receiptSchema = z.strictObject({
  organizationId: id,
  actorId: id,
  operation: z.enum([
    'course.review.command.v1',
    'course.release.publish.v1',
    'course.draft.command.v1',
    'employee.provision',
    'unit.create',
    'unit.move',
    'membership.create',
    'membership.close',
    'membership.transfer',
    'role.define',
    'grant.create',
    'grant.revoke',
  ]),
  keyHash: hash,
  fingerprint: hash,
  createdAt: z.date(),
  data: z.unknown(),
  schemaVersion: z.literal(1),
  commandVersion: z.literal(1),
  responseVersion: z.literal(1),
  responseDigest: hash,
});
/** Fail closed: legacy, corrupt or unsupported receipts must NEVER fall through to execute again. */
export function validateReceipt(value: unknown, key: ReceiptKey) {
  try {
    const row = receiptSchema.parse(value);
    if (
      Object.entries(key).some(
        ([name, expected]) => row[name as keyof typeof row] !== expected,
      ) ||
      JSON.stringify(row.data).length > 16384 ||
      fingerprint(row.data) !== row.responseDigest
    )
      throw new Error('Receipt validation');
    return row;
  } catch {
    throw new HttpError(
      503,
      'REPLAY_UNAVAILABLE',
      'Stored command replay requires reconciliation',
    );
  }
}
