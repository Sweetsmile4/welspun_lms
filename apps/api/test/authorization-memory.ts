import { Types } from 'mongoose';
import { MemoryOrganizationRepository } from './organization-memory.js';
import type {
  AuthorizationRepository,
  RoleDefinition,
  RoleGrant,
} from '../src/modules/identity/authorization/types.js';

/** Test-only serial, rollback-capable extension; never used by runtime composition. */
export function memoryAuthorizationRepository() {
  const base = new MemoryOrganizationRepository();
  let roles: RoleDefinition[] = [];
  let grants: RoleGrant[] = [];
  const disabled = new Set<string>();
  const repository: AuthorizationRepository = {
    transaction: (work) =>
      base.transaction(async (tx) => {
        const r = structuredClone(roles),
          g = structuredClone(grants);
        const result = await work({
          ...tx,
          userByIdentity: async (...args) => {
            const user = await tx.userByIdentity(...args);
            return user && disabled.has(user.id)
              ? { ...user, status: 'inactive' }
              : user;
          },
          user: async (...args) => {
            const user = await tx.user(...args);
            return user && disabled.has(user.id)
              ? { ...user, status: 'inactive' }
              : user;
          },
          role: async (org, id) =>
            r.find((v) => v.organizationId === org && v.id === id) ?? null,
          latestRole: async (org, code) =>
            r
              .filter((v) => v.organizationId === org && v.code === code)
              .sort((a, b) => b.version - a.version)[0] ?? null,
          insertRole: async (value) => {
            const row = { ...value, id: new Types.ObjectId().toHexString() };
            r.push(row);
            return row;
          },
          grants: async (org, user) =>
            g.filter((v) => v.organizationId === org && v.userId === user),
          grant: async (org, id) =>
            g.find((v) => v.organizationId === org && v.id === id) ?? null,
          insertGrant: async (value) => {
            const row = { ...value, id: new Types.ObjectId().toHexString() };
            g.push(row);
            return row;
          },
          revokeGrant: async (value, actor, at, reason) => {
            const row = g.find(
              (v) =>
                v.id === value.id &&
                v.organizationId === value.organizationId &&
                v.revision === value.revision &&
                !v.revokedAt,
            );
            if (!row) return null;
            Object.assign(row, {
              revision: row.revision + 1,
              revokedAt: at,
              revokedBy: actor,
              revocationReason: reason,
              updatedBy: actor,
            });
            return row;
          },
        });
        roles = r;
        grants = g;
        return result;
      }),
  };
  return {
    repository,
    disable: async (id: string) => {
      disabled.add(id);
    },
  };
}
