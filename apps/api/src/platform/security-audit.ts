import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AuthorizationTransaction } from '../modules/identity/authorization/types.js';

export const securityEventTypes = [
  'course.review.submitted',
  'course.review.assigned',
  'course.review.decided',
  'course.review.superseded',
  'course.release.published',
  'course.draft.created',
  'course.draft.changed',
  'course.draft.archived',
  'identity.verified',
  'identity.rejected',
  'authorization.denied',
  'employee.provisioned',
  'unit.created',
  'unit.moved',
  'membership.created',
  'membership.closed',
  'membership.transferred',
  'role.defined',
  'role.granted',
  'role.revoked',
] as const;
export const securityAuditEventSchema = z.strictObject({
  eventId: z.uuid(),
  requestId: z.uuid(),
  occurredAt: z.iso.datetime(),
  type: z.enum(securityEventTypes),
  outcome: z.enum(['allowed', 'denied']),
  organizationId: z
    .string()
    .regex(/^[a-f\d]{24}$/)
    .optional(),
  actorId: z
    .string()
    .regex(/^[a-f\d]{24}$/)
    .optional(),
  resourceId: z
    .string()
    .regex(/^[a-f\d]{24}$/)
    .optional(),
});
export type SecurityAuditEvent = Readonly<
  z.infer<typeof securityAuditEventSchema>
>;
export function securityEvent(
  value: Omit<SecurityAuditEvent, 'eventId' | 'occurredAt'>,
  at = new Date(),
): SecurityAuditEvent {
  return Object.freeze(
    securityAuditEventSchema.parse({
      ...value,
      eventId: randomUUID(),
      occurredAt: at.toISOString(),
    }),
  );
}
/** Append only: no update/delete API. Implementations must minimize access to these sensitive records. */
export interface SecurityAuditSink {
  append(event: SecurityAuditEvent): Promise<void>;
}
/** Must persist using the supplied domain transaction/session; throwing MUST roll back the domain change. */
export interface TransactionalSecurityAudit {
  durability: 'isolated-test' | 'transactional-persistent';
  append(
    tx: AuthorizationTransaction,
    event: SecurityAuditEvent,
  ): Promise<void>;
}
export interface MutationAuditContext {
  sink: TransactionalSecurityAudit;
  requestId: (credential: unknown) => string;
}
