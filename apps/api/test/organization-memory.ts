import { Types } from 'mongoose';
import type {
  OrganizationRepository,
  OrganizationTransaction,
} from '../src/modules/identity/organization/repository.js';
import {
  OrganizationError,
  type Organization,
  type OrgUnit,
  type User,
  type Membership,
  type Metadata,
  type NewRecord,
} from '../src/modules/identity/organization/types.js';

/** Test double only: serial rollback-capable storage. It is not MongoDB integration evidence. */
export class MemoryOrganizationRepository implements OrganizationRepository {
  private state: {
    organizations: Organization[];
    units: OrgUnit[];
    users: User[];
    memberships: Membership[];
  } = { organizations: [], units: [], users: [], memberships: [] };
  private tail = Promise.resolve();
  async transaction<T>(
    work: (tx: OrganizationTransaction) => Promise<T>,
  ): Promise<T> {
    const before = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await before;
    const data = structuredClone(this.state);
    function insert<R extends Metadata>(rows: R[], value: NewRecord<R>): R {
      const record = { ...value, id: new Types.ObjectId().toHexString() } as R;
      rows.push(record);
      return record;
    }
    const tx: OrganizationTransaction = {
      organization: async (id) =>
        data.organizations.find((r) => r.id === id) ?? null,
      organizationByCode: async (code) =>
        data.organizations.find((r) => r.code === code) ?? null,
      insertOrganization: async (r) => insert(data.organizations, r),
      lockOrganization: async (id, revision, tree, actor, at) => {
        const row = data.organizations.find(
          (r) => r.id === id && r.revision === revision,
        );
        if (!row) return null;
        row.revision++;
        if (tree) row.treeRevision++;
        row.updatedBy = actor;
        row.updatedAt = at;
        return row;
      },
      unit: async (org, id) =>
        data.units.find((r) => r.organizationId === org && r.id === id) ?? null,
      unitByCode: async (org, parent, code) =>
        data.units.find(
          (r) =>
            r.organizationId === org &&
            r.parentId === parent &&
            r.code === code,
        ) ?? null,
      insertUnit: async (r) => insert(data.units, r),
      subtree: async (org, id) =>
        data.units.filter(
          (r) =>
            r.organizationId === org &&
            (r.id === id || r.ancestorIds.includes(id)),
        ),
      moveUnit: async (r, parentId, ancestorIds, treeRevision, actor, at) => {
        const row = data.units.find(
          (v) => v.id === r.id && v.revision === r.revision,
        );
        if (!row) return null;
        Object.assign(row, {
          parentId,
          ancestorIds,
          treeRevision,
          revision: row.revision + 1,
          updatedBy: actor,
          updatedAt: at,
        });
        return row;
      },
      user: async (org, id) =>
        data.users.find((r) => r.organizationId === org && r.id === id) ?? null,
      userByIdentity: async (org, issuer, subject) =>
        data.users.find(
          (r) =>
            r.organizationId === org &&
            r.identityIssuer === issuer &&
            r.identitySubject === subject,
        ) ?? null,
      userByEmployeeId: async (org, employeeId) =>
        data.users.find(
          (r) => r.organizationId === org && r.employeeId === employeeId,
        ) ?? null,
      insertUser: async (r) => insert(data.users, r),
      membership: async (org, id) =>
        data.memberships.find((r) => r.organizationId === org && r.id === id) ??
        null,
      memberships: async (org, userId) =>
        data.memberships
          .filter((r) => r.organizationId === org && r.userId === userId)
          .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime()),
      insertMembership: async (r) => insert(data.memberships, r),
      closeMembership: async (r, validTo, actor, at) => {
        const row = data.memberships.find(
          (v) =>
            v.id === r.id && v.revision === r.revision && v.validTo === null,
        );
        if (!row) return null;
        Object.assign(row, {
          validTo,
          revision: row.revision + 1,
          updatedBy: actor,
          updatedAt: at,
        });
        return row;
      },
    };
    try {
      const result = await work(tx);
      this.state = data;
      return structuredClone(result);
    } catch (error) {
      if (error instanceof OrganizationError) throw error;
      throw error;
    } finally {
      release();
    }
  }
}
