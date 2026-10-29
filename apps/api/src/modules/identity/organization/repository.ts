import type {
  Membership,
  NewRecord,
  Organization,
  OrgUnit,
  User,
} from './types.js';

/** Every operation runs in the same snapshot/transaction; no nested transactions. */
export interface OrganizationTransaction {
  organization(id: string): Promise<Organization | null>;
  organizationByCode(code: string): Promise<Organization | null>;
  insertOrganization(record: NewRecord<Organization>): Promise<Organization>;
  lockOrganization(
    id: string,
    revision: number,
    treeChange: boolean,
    actor: string,
    at: Date,
  ): Promise<Organization | null>;
  unit(organizationId: string, id: string): Promise<OrgUnit | null>;
  unitByCode(
    organizationId: string,
    parentId: string | null,
    code: string,
  ): Promise<OrgUnit | null>;
  insertUnit(record: NewRecord<OrgUnit>): Promise<OrgUnit>;
  subtree(organizationId: string, id: string): Promise<OrgUnit[]>;
  moveUnit(
    record: OrgUnit,
    parentId: string,
    ancestors: string[],
    treeRevision: number,
    actor: string,
    at: Date,
  ): Promise<OrgUnit | null>;
  user(organizationId: string, id: string): Promise<User | null>;
  userByIdentity(
    organizationId: string,
    issuer: string,
    subject: string,
  ): Promise<User | null>;
  userByEmployeeId(
    organizationId: string,
    employeeId: string,
  ): Promise<User | null>;
  insertUser(record: NewRecord<User>): Promise<User>;
  membership(organizationId: string, id: string): Promise<Membership | null>;
  memberships(organizationId: string, userId: string): Promise<Membership[]>;
  insertMembership(record: NewRecord<Membership>): Promise<Membership>;
  closeMembership(
    record: Membership,
    validTo: Date,
    actor: string,
    at: Date,
  ): Promise<Membership | null>;
}
export interface OrganizationRepository {
  /** Must roll back all writes on failure, retry transient write conflicts, and use primary/snapshot reads. */
  transaction<T>(
    work: (transaction: OrganizationTransaction) => Promise<T>,
  ): Promise<T>;
}
