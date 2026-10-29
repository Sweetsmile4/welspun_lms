import { fingerprint, receiptVersions, validateReceipt } from './receipts.js';
export { fingerprint } from './receipts.js';
import { Types, type PipelineStage } from 'mongoose';
import { z } from 'zod';
import { HttpError } from '../../../platform/errors.js';
import type { TransactionalSecurityAudit } from '../../../platform/security-audit.js';
import {
  createHttpApplicationService,
  type HttpSecurity,
} from '../http-security.js';
import type {
  AuthorizationRepository,
  Scope,
  Target,
} from '../authorization/types.js';
import type { ManagementStore } from './store.js';
import { managementScope } from './policy.js';
import { dto, project, type Entity, type ListQuery } from './contracts.js';

export type Operation =
  | 'employee.provision'
  | 'unit.create'
  | 'unit.move'
  | 'membership.create'
  | 'membership.close'
  | 'membership.transfer'
  | 'role.define'
  | 'grant.create'
  | 'grant.revoke';
type Command = {
  operation: Operation;
  organizationId: string;
  resourceId?: string;
  body: Record<string, unknown>;
  precondition?: number;
  key: string;
};
const managementServices = new WeakSet<object>();
export function assertManagementService(value: unknown) {
  if (!value || typeof value !== 'object' || !managementServices.has(value))
    throw new Error('Protected management application service required');
}
/** This factory is intentionally unavailable outside explicit isolated HTTP tests. */
export function createManagementService(
  repository: AuthorizationRepository,
  store: ManagementStore,
  security: HttpSecurity,
  audit: TransactionalSecurityAudit,
  options: { isolatedTest: true; clock?: () => Date },
) {
  const core = createHttpApplicationService(
    repository,
    security,
    audit,
    options,
  );
  const conflict = () => {
    throw new HttpError(
      409,
      'IDEMPOTENCY_CONFLICT',
      'Command key conflicts with the original request',
    );
  };
  const service = {
    async list(
      credential: unknown,
      org: string,
      entity: Exclude<Entity, 'membership'>,
      query: ListQuery,
    ) {
      return core.within(credential, org, async ({ tx, actor, now }) => {
        const stages = await managementScope(tx, actor, entity, now);
        const filters: Record<string, unknown> = {};
        if (query.namePrefix)
          filters[entity === 'employee' ? 'displayName' : 'name'] = {
            $regex:
              '^' + query.namePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            $options: 'i',
          };
        if (query.status) filters.status = query.status;
        if (query.userId) filters.userId = new Types.ObjectId(query.userId);
        if (Object.keys(filters).length)
          stages.push({ $match: filters } as PipelineStage);
        const result = await store.page(tx, entity, stages, query);
        return {
          ...result,
          items: result.items.map((row) => project(entity, row)),
        };
      });
    },
    async employee(credential: unknown, org: string, id: string) {
      return core.within(credential, org, async ({ tx, assert }) => {
        await assert('employee.read', { kind: 'user', id });
        return project(
          'employee',
          (await tx.user(org, id))! as unknown as Record<string, unknown>,
        );
      });
    },
    history: (credential: unknown, org: string, id: string, current: boolean) =>
      core.within(credential, org, async ({ tx }) => {
        const service = createHttpApplicationService(
          { transaction: (callback) => callback(tx) },
          security,
          audit,
          options,
        );
        const rows = await (current
          ? service.currentMemberships(credential, org, id)
          : service.membershipHistory(credential, org, id));
        return rows.map((row) =>
          project('membership', row as unknown as Record<string, unknown>),
        );
      }),
    preview: (
      credential: unknown,
      org: string,
      id: string,
      parentId: string,
      expectedTreeRevision: number,
    ) =>
      core.within(credential, org, ({ tx }) =>
        createHttpApplicationService(
          { transaction: (callback) => callback(tx) },
          security,
          audit,
          options,
        ).validateUnitMove(credential, {
          organizationId: org,
          unitId: id,
          parentId,
          expectedTreeRevision,
        }),
      ),
    async command(
      credential: unknown,
      command: Command,
    ): Promise<{ data: unknown; replayed: boolean }> {
      return core.within(
        credential,
        command.organizationId,
        async ({ tx, actor, now, assert }) => {
          const {
            operation,
            organizationId: org,
            resourceId,
            body,
            precondition,
          } = command;
          const service = createHttpApplicationService(
            { transaction: (callback) => callback(tx) },
            security,
            audit,
            options,
          );
          // Current authorization is rechecked even for a stored replay. No durable authorization capabilities.
          const target = (scope: Scope): Target =>
            scope.kind === 'unit'
              ? { kind: 'unit', id: scope.unitId }
              : scope.kind === 'resource'
                ? { kind: scope.resourceType, id: scope.resourceId }
                : { kind: 'organization' };
          if (operation === 'employee.provision')
            await assert('user.create', { kind: 'organization' });
          if (operation === 'role.define' || operation === 'grant.revoke')
            await assert('security.manage', { kind: 'organization' });
          if (operation === 'grant.create') {
            await assert('security.manage', target(body.scope as Scope));
            await service.validateRoleGrant(credential, org, {
              userId: String(body.userId),
              roleDefinitionId: String(body.roleDefinitionId),
              scope: body.scope as Scope,
              validFrom: new Date(String(body.validFrom)),
              validTo: body.validTo ? new Date(String(body.validTo)) : null,
            });
          }
          if (operation === 'unit.create')
            await assert('unit.manage', {
              kind: 'unit',
              id: String(body.parentId),
            });
          if (operation === 'unit.move') {
            const subtree = await tx.subtree(org, resourceId!);
            if (subtree.length > 1000)
              throw new HttpError(
                409,
                'CONFLICT',
                'Operation exceeds the subtree limit',
              );
            for (const unit of subtree)
              await assert('unit.manage', { kind: 'unit', id: unit.id });
            await assert('unit.manage', { kind: 'unit', id: resourceId! });
            await assert('unit.manage', {
              kind: 'unit',
              id: String(body.parentId),
            });
          }
          if (operation === 'membership.create') {
            await assert('membership.manage', {
              kind: 'user',
              id: String(body.userId),
            });
            await assert('membership.manage', {
              kind: 'unit',
              id: String(body.orgUnitId),
            });
          }
          if (
            operation === 'membership.close' ||
            operation === 'membership.transfer'
          )
            await assert('membership.manage', {
              kind: 'membership',
              id: resourceId!,
            });
          if (operation === 'membership.transfer')
            await assert('membership.manage', {
              kind: 'unit',
              id: String(body.targetOrgUnitId),
            });
          const key = {
            organizationId: org,
            actorId: actor.id,
            operation,
            keyHash: fingerprint(command.key),
          };
          const hash = fingerprint({
            operation,
            organizationId: org,
            resourceId,
            body,
            precondition,
          });
          const previous = await store.receipt(tx, key);
          const schema =
            operation === 'membership.transfer'
              ? z.strictObject({
                  closed: dto.membership,
                  membership: dto.membership,
                })
              : dto[
                  operation.startsWith('employee')
                    ? 'employee'
                    : operation.startsWith('unit')
                      ? 'unit'
                      : operation.startsWith('membership')
                        ? 'membership'
                        : operation.startsWith('role')
                          ? 'role'
                          : 'grant'
                ];
          if (previous) {
            const valid = validateReceipt(previous, key);
            if (valid.fingerprint !== hash) return conflict();
            try {
              return { data: schema.parse(valid.data), replayed: true };
            } catch {
              throw new HttpError(
                500,
                'INTERNAL_ERROR',
                'An unexpected error occurred',
              );
            }
          }
          const stale = () => {
            throw new HttpError(
              409,
              'CONFLICT',
              'Operation conflicts with current state',
            );
          };
          if (
            operation === 'role.define' &&
            ((await tx.latestRole(org, String(body.code)))?.version ?? 0) !==
              precondition
          )
            stale();
          if (operation === 'grant.revoke') {
            const grant = await tx.grant(org, resourceId!);
            if (!grant || grant.revision !== precondition || grant.revokedAt)
              stale();
          }
          if (operation === 'grant.create') {
            const existing = await tx.grants(org, String(body.userId));
            if (
              existing.some(
                (grant) =>
                  !grant.revokedAt &&
                  grant.roleDefinitionId === body.roleDefinitionId &&
                  fingerprint(grant.scope) === fingerprint(body.scope) &&
                  grant.validFrom.getTime() ===
                    new Date(String(body.validFrom)).getTime() &&
                  (grant.validTo?.getTime() ?? null) ===
                    (body.validTo
                      ? new Date(String(body.validTo)).getTime()
                      : null),
              )
            )
              stale();
          }
          const record = <T>(value: Record<string, unknown>) => value as T;
          let value: unknown;
          switch (operation) {
            case 'employee.provision':
              value = await service.createUser(
                credential,
                record<Parameters<typeof service.createUser>[1]>({
                  ...body,
                  organizationId: org,
                }),
              );
              break;
            case 'unit.create':
              value = await service.createUnit(
                credential,
                record<Parameters<typeof service.createUnit>[1]>({
                  ...body,
                  organizationId: org,
                  expectedTreeRevision: precondition,
                }),
              );
              break;
            case 'unit.move':
              value = await service.moveUnit(credential, {
                organizationId: org,
                unitId: resourceId!,
                parentId: String(body.parentId),
                expectedTreeRevision: precondition!,
              });
              break;
            case 'membership.create':
              value = await service.createMembership(
                credential,
                record<Parameters<typeof service.createMembership>[1]>({
                  ...body,
                  organizationId: org,
                  validFrom: new Date(String(body.validFrom)),
                  validTo: body.validTo ? new Date(String(body.validTo)) : null,
                }),
              );
              break;
            case 'membership.close':
              value = await service.closeMembership(credential, {
                organizationId: org,
                membershipId: resourceId!,
                expectedRevision: precondition!,
                validTo: new Date(String(body.validTo)),
              });
              break;
            case 'membership.transfer':
              value = await service.transferMembership(credential, {
                organizationId: org,
                membershipId: resourceId!,
                expectedRevision: precondition!,
                targetOrgUnitId: String(body.targetOrgUnitId),
                effectiveAt: new Date(String(body.effectiveAt)),
              });
              break;
            case 'role.define':
              value = await service.defineRole(
                credential,
                org,
                record<Parameters<typeof service.defineRole>[2]>({
                  ...body,
                  version: precondition! + 1,
                }),
              );
              break;
            case 'grant.create':
              value = await service.grantRole(
                credential,
                org,
                record<Parameters<typeof service.grantRole>[2]>({
                  ...body,
                  validFrom: new Date(String(body.validFrom)),
                  validTo: body.validTo ? new Date(String(body.validTo)) : null,
                }),
              );
              break;
            case 'grant.revoke':
              value = await service.revokeGrant(
                credential,
                org,
                resourceId!,
                precondition!,
                String(body.reason),
              );
              break;
          }
          const raw = value as Record<string, unknown>;
          const data = schema.parse(
            operation === 'membership.transfer'
              ? {
                  closed: project(
                    'membership',
                    raw.closed as Record<string, unknown>,
                  ),
                  membership: project(
                    'membership',
                    raw.membership as Record<string, unknown>,
                  ),
                }
              : project(
                  operation.startsWith('employee')
                    ? 'employee'
                    : operation.startsWith('unit')
                      ? 'unit'
                      : operation.startsWith('membership')
                        ? 'membership'
                        : operation.startsWith('role')
                          ? 'role'
                          : 'grant',
                  raw,
                ),
          );
          if (JSON.stringify(data).length > 16384)
            throw new HttpError(
              503,
              'COMMAND_RESULT_LIMIT',
              'Command result exceeds the replay limit',
            );
          await store.saveReceipt(tx, {
            ...key,
            ...receiptVersions,
            responseDigest: fingerprint(data),
            fingerprint: hash,
            data,
            createdAt: now,
          });
          return { data, replayed: false };
        },
      );
    },
  };
  managementServices.add(service);
  return service;
}
