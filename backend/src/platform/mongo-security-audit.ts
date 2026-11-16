import { Schema, type ClientSession, type Connection } from 'mongoose';
import { z } from 'zod';
import {
  assertAuthorizationService,
  type createAuthorizationService,
} from '../modules/identity/authorization/service.js';
import type { AuthorizationTransaction } from '../modules/identity/authorization/types.js';
import {
  securityAuditEventSchema,
  type TransactionalSecurityAudit,
} from './security-audit.js';
import { decode } from '../modules/identity/organization/mongo-repository.js';

const immutableId = {
  type: Schema.Types.ObjectId,
  required: true,
  immutable: true,
} as const;
export const securityAuditSchema = new Schema(
  {
    eventId: { type: String, required: true, immutable: true },
    requestId: { type: String, required: true, immutable: true },
    occurredAt: { type: Date, required: true, immutable: true },
    type: { type: String, required: true, immutable: true },
    outcome: {
      type: String,
      required: true,
      immutable: true,
      enum: ['allowed'],
    },
    organizationId: immutableId,
    actorId: immutableId,
    resourceId: immutableId,
  },
  {
    strict: 'throw',
    versionKey: false,
    autoCreate: false,
    autoIndex: false,
    bufferCommands: false,
  },
);
securityAuditSchema.index(
  { eventId: 1 },
  { unique: true, name: 'security_event_identity' },
);
securityAuditSchema.index(
  { organizationId: 1, occurredAt: 1, eventId: 1 },
  { name: 'security_event_scope_page' },
);
const pageSchema = z.strictObject({
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z
    .strictObject({ occurredAt: z.iso.datetime(), eventId: z.uuid() })
    .optional(),
});

/** Reusable local transactional storage; production composition remains deliberately unavailable. */
export function createMongoSecurityAudit(
  connection: Connection,
  sessionFor: (tx: AuthorizationTransaction) => ClientSession | undefined,
  options: {
    isolatedTest: true;
    reviewTarget?: (
      tx: AuthorizationTransaction,
      org: string,
      id: string,
    ) => Promise<boolean>;
    releaseTarget?: (
      tx: AuthorizationTransaction,
      org: string,
      id: string,
    ) => Promise<boolean>;
    courseTarget?: (
      tx: AuthorizationTransaction,
      organizationId: string,
      courseId: string,
    ) => Promise<boolean>;
  },
) {
  function guard() {
    if (
      process.env.NODE_ENV !== 'test' ||
      options.isolatedTest !== true ||
      connection.readyState !== 1 ||
      !['127.0.0.1', 'localhost', '::1'].includes(connection.host) ||
      !connection.name.startsWith('welspun_lms_test_')
    )
      throw new Error(
        'Audit storage requires an isolated local test connection',
      );
  }
  guard();
  const model = connection.model(
    'SecurityAuditEvent',
    securityAuditSchema,
    'securityAuditEvents',
  );
  function session(tx: AuthorizationTransaction) {
    guard();
    const current = sessionFor(tx);
    if (!current?.inTransaction())
      throw new Error('Audit storage requires the domain transaction');
    return current;
  }
  const adapter: TransactionalSecurityAudit = {
    durability: 'isolated-test',
    async append(tx, input) {
      const current = session(tx);
      const parsed = securityAuditEventSchema.safeParse(input);
      if (!parsed.success || parsed.data.outcome !== 'allowed')
        throw new Error('Invalid transactional security audit event');
      const event = parsed.data;
      if (!event.organizationId || !event.actorId || !event.resourceId)
        throw new Error(
          'Transactional audit requires authoritative organization, actor and resource',
        );
      const org = await tx.organization(event.organizationId),
        actor = await tx.user(event.organizationId, event.actorId);
      if (
        !org ||
        org.status !== 'active' ||
        !actor ||
        actor.status !== 'active'
      )
        throw new Error('Audit organization/actor mismatch');
      const target = event.type.startsWith('course.review.')
        ? await options.reviewTarget?.(tx, org.id, event.resourceId)
        : event.type === 'course.release.published'
          ? await options.releaseTarget?.(tx, org.id, event.resourceId)
          : event.type.startsWith('course.draft.')
            ? await options.courseTarget?.(tx, org.id, event.resourceId)
            : event.type === 'employee.provisioned'
              ? await tx.user(org.id, event.resourceId)
              : ['unit.created', 'unit.moved'].includes(event.type)
                ? await tx.unit(org.id, event.resourceId)
                : [
                      'membership.created',
                      'membership.closed',
                      'membership.transferred',
                    ].includes(event.type)
                  ? await tx.membership(org.id, event.resourceId)
                  : event.type === 'role.defined'
                    ? await tx.role(org.id, event.resourceId)
                    : ['role.granted', 'role.revoked'].includes(event.type)
                      ? await tx.grant(org.id, event.resourceId)
                      : null;
      if (!target) throw new Error('Audit resource/type mismatch');
      await model.create(
        [
          {
            ...event,
            outcome: 'allowed',
            occurredAt: new Date(event.occurredAt),
          },
        ],
        { session: current },
      );
    },
  };
  return {
    ...adapter,
    async initializeIndexes() {
      guard();
      await model.createCollection();
      await model.createIndexes();
    },
    /** Internal organization-level reads ONLY; unit-scoped event attribution is not inferred. */
    async readAuthorized(
      boundary: Pick<ReturnType<typeof createAuthorizationService>, 'within'>,
      credential: unknown,
      organizationId: string,
      input: z.input<typeof pageSchema> = {},
    ) {
      assertAuthorizationService(boundary);
      const query = pageSchema.parse(input);
      return boundary.within(
        credential,
        organizationId,
        async ({ tx, assert }) => {
          await assert('audit.read', { kind: 'organization' });
          const filter = {
            organizationId,
            ...(query.cursor
              ? {
                  $or: [
                    { occurredAt: { $gt: new Date(query.cursor.occurredAt) } },
                    {
                      occurredAt: new Date(query.cursor.occurredAt),
                      eventId: { $gt: query.cursor.eventId },
                    },
                  ],
                }
              : {}),
          };
          const rows = decode<Record<string, unknown>[]>(
            await model
              .find(filter)
              .select({ _id: 0 })
              .sort({ occurredAt: 1, eventId: 1 })
              .limit(query.limit + 1)
              .session(session(tx))
              .lean(),
          );
          const events = rows.slice(0, query.limit).map((row) =>
            Object.freeze(
              securityAuditEventSchema.parse({
                ...row,
                occurredAt: (row.occurredAt as Date).toISOString(),
              }),
            ),
          );
          const last = events.at(-1);
          return {
            events,
            nextCursor:
              rows.length > query.limit && last
                ? { occurredAt: last.occurredAt, eventId: last.eventId }
                : null,
          };
        },
      );
    },
  };
}
