import { z } from 'zod';
import type { Metadata, NewRecord } from '../organization/types.js';
import type { OrganizationTransaction } from '../organization/repository.js';

export const actions = [
  'course.review.submit',
  'course.review.read',
  'course.review.assign',
  'course.review.decide',
  'course.release.publish',
  'course.release.read',
  'course.draft.create',
  'course.draft.read',
  'course.draft.edit',
  'course.draft.archive',
  'organization.manage',
  'unit.manage',
  'unit.read',
  'role.read',
  'grant.read',
  'user.create',
  'membership.read',
  'membership.manage',
  'employee.read',
  'progress.read',
  'assignment.read',
  'report.read',
  'audit.read',
  'content.approve',
  'content.publish',
  'security.manage',
] as const;
export const actionSchema = z.enum(actions);
export type Action = z.infer<typeof actionSchema>;
export const objectId = z.string().regex(/^[a-f\d]{24}$/);
export const scopeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('own') }),
  z.strictObject({ kind: z.literal('organization') }),
  z.strictObject({
    kind: z.literal('unit'),
    unitId: objectId,
    includeDescendants: z.boolean(),
  }),
  z.strictObject({
    kind: z.literal('resource'),
    resourceType: z.enum(['course', 'revision']),
    resourceId: objectId,
  }),
]);
export type Scope = z.infer<typeof scopeSchema>;
export interface RoleDefinition extends Metadata {
  organizationId: string;
  code: string;
  version: number;
  permissions: Action[];
  status: 'active' | 'inactive';
}
export interface RoleGrant extends Metadata {
  organizationId: string;
  userId: string;
  roleDefinitionId: string;
  roleVersion: number;
  scope: Scope;
  validFrom: Date;
  validTo: Date | null;
  grantedBy: string;
  revokedAt: Date | null;
  revokedBy: string | null;
  revocationReason: string | null;
}
export interface AuthorizationTransaction extends OrganizationTransaction {
  role(organizationId: string, id: string): Promise<RoleDefinition | null>;
  latestRole(
    organizationId: string,
    code: string,
  ): Promise<RoleDefinition | null>;
  insertRole(value: NewRecord<RoleDefinition>): Promise<RoleDefinition>;
  grants(organizationId: string, userId: string): Promise<RoleGrant[]>;
  grant(organizationId: string, id: string): Promise<RoleGrant | null>;
  insertGrant(value: NewRecord<RoleGrant>): Promise<RoleGrant>;
  revokeGrant(
    value: RoleGrant,
    actor: string,
    at: Date,
    reason: string,
  ): Promise<RoleGrant | null>;
}
export interface AuthorizationRepository {
  transaction<T>(
    work: (tx: AuthorizationTransaction) => Promise<T>,
  ): Promise<T>;
}
export type Target =
  | { kind: 'organization' }
  | { kind: 'unit'; id: string }
  | { kind: 'user'; id: string }
  | { kind: 'membership'; id: string }
  | { kind: 'course' | 'revision'; id: string };
/** Returned ONLY by a server-owned resource adapter, never deserialized from requests. */
export interface ResourceFacts {
  organizationId: string;
  kind: Target['kind'];
  id: string;
  unitIds: string[];
  ownerId: string | null;
  state: 'active' | 'review' | 'approved' | 'published' | 'archived';
  editedBy: string[];
  approval?: {
    revisionDigest: string;
    required: number;
    approverIds: string[];
    approvedDigest: string;
  };
}
export interface ResourceResolver {
  resolve(
    tx: AuthorizationTransaction,
    organizationId: string,
    target: Extract<Target, { kind: 'course' | 'revision' }>,
  ): Promise<ResourceFacts | null>;
}
/** Composition-root port for FUTURE approved SSO; implementations must verify credentials. */
export interface AuthorizationIdentityProvider {
  mode: 'disabled' | 'approved-sso' | 'synthetic-test';
  authenticate(
    credential: unknown,
  ): Promise<{ issuer: string; subject: string; synthetic: boolean } | null>;
}
export class AuthorizationError extends Error {
  readonly code = 'FORBIDDEN';
  constructor() {
    super('Operation is not authorized');
  }
}
export function deny(): never {
  throw new AuthorizationError();
}
