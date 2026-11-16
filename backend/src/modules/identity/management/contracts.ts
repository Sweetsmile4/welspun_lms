import { z } from 'zod';
import {
  employeeSummarySchema,
  membershipSummarySchema,
  resourceIdSchema,
} from '@welspun/contracts';
import { actionSchema, scopeSchema } from '../authorization/types.js';

export const revision = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
export const organizationParams = z.strictObject({
  organizationId: resourceIdSchema,
});
export const resourceParams = organizationParams.extend({
  resourceId: resourceIdSchema,
});
export const listQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: resourceIdSchema.optional(),
  namePrefix: z.string().trim().min(1).max(50).optional(),
  userId: resourceIdSchema.optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
export type ListQuery = z.infer<typeof listQuery>;
const name = z.string().trim().min(1).max(200);
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9_-]{0,63}$/);
export const provisionBody = z.strictObject({
  identityIssuer: z.string().min(1).max(512),
  identitySubject: z.string().min(1).max(256),
  displayName: name,
  employeeId: z.string().trim().min(1).max(100).optional(),
});
export const unitBody = z.strictObject({
  parentId: resourceIdSchema,
  type: z.enum(['plant', 'department']),
  code,
  name,
});
export const moveBody = z.strictObject({ parentId: resourceIdSchema });
export const membershipBody = z.strictObject({
  userId: resourceIdSchema,
  orgUnitId: resourceIdSchema,
  validFrom: z.iso.datetime(),
  validTo: z.iso.datetime().nullable().default(null),
  primary: z.boolean().default(false),
});
export const closeBody = z.strictObject({ validTo: z.iso.datetime() });
export const transferBody = z.strictObject({
  targetOrgUnitId: resourceIdSchema,
  effectiveAt: z.iso.datetime(),
});
export const roleBody = z.strictObject({
  code,
  permissions: z
    .array(actionSchema)
    .min(1)
    .max(50)
    .refine((v) => new Set(v).size === v.length),
  status: z.enum(['active', 'inactive']),
});
export const grantBody = z.strictObject({
  userId: resourceIdSchema,
  roleDefinitionId: resourceIdSchema,
  scope: scopeSchema,
  validFrom: z.iso.datetime(),
  validTo: z.iso.datetime().nullable(),
});
export const revokeBody = z.strictObject({
  reason: z.string().trim().min(1).max(500),
});
export const unitDto = z.strictObject({
  id: resourceIdSchema,
  code: z.string(),
  name: z.string(),
  type: z.enum(['organization', 'plant', 'department']),
  parentId: resourceIdSchema.nullable(),
  status: z.enum(['active', 'inactive']),
  revision,
  treeRevision: revision,
});
export const roleDto = z.strictObject({
  id: resourceIdSchema,
  code: z.string(),
  version: revision,
  permissions: z.array(actionSchema),
  status: z.enum(['active', 'inactive']),
  revision,
});
export const grantDto = z.strictObject({
  id: resourceIdSchema,
  userId: resourceIdSchema,
  roleDefinitionId: resourceIdSchema,
  roleVersion: revision,
  scope: scopeSchema,
  validFrom: z.iso.datetime(),
  validTo: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  revision,
});
export const movePreviewDto = z.strictObject({
  unitId: resourceIdSchema,
  ancestorIds: z.array(resourceIdSchema),
  expectedTreeRevision: revision,
  affectedUnitCount: z.number().int().positive(),
});
export const transferDto = z.strictObject({
  closed: membershipSummarySchema,
  membership: membershipSummarySchema,
});
export function pageDto<S extends z.ZodType>(item: S) {
  return z.strictObject({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    nextCursor: resourceIdSchema.nullable(),
  });
}
export const dto = {
  employee: employeeSummarySchema,
  membership: membershipSummarySchema,
  unit: unitDto,
  role: roleDto,
  grant: grantDto,
};
export type Entity = keyof typeof dto;
/** Explicit allowlist projections; never spread a stored record into a response. */
export function project(entity: Entity, row: Record<string, unknown>) {
  const date = (value: unknown) =>
    value instanceof Date ? value.toISOString() : value;
  if (entity === 'employee')
    return employeeSummarySchema.parse({
      id: row.id,
      displayName: row.displayName,
      status: row.status,
      revision: row.revision,
    });
  if (entity === 'membership')
    return membershipSummarySchema.parse({
      id: row.id,
      userId: row.userId,
      orgUnitId: row.orgUnitId,
      validFrom: date(row.validFrom),
      validTo: date(row.validTo),
      primary: row.primary,
      revision: row.revision,
    });
  if (entity === 'unit')
    return unitDto.parse({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      parentId: row.parentId,
      status: row.status,
      revision: row.revision,
      treeRevision: row.treeRevision,
    });
  if (entity === 'role')
    return roleDto.parse({
      id: row.id,
      code: row.code,
      version: row.version,
      permissions: row.permissions,
      status: row.status,
      revision: row.revision,
    });
  return grantDto.parse({
    id: row.id,
    userId: row.userId,
    roleDefinitionId: row.roleDefinitionId,
    roleVersion: row.roleVersion,
    scope: row.scope,
    validFrom: date(row.validFrom),
    validTo: date(row.validTo),
    revokedAt: date(row.revokedAt),
    revision: row.revision,
  });
}
