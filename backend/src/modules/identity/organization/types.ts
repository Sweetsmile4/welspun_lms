export type Status = 'active' | 'inactive';
export type UnitType = 'organization' | 'plant' | 'department';
export interface Metadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  revision: number;
}
export interface Organization extends Metadata {
  code: string;
  name: string;
  timeZone: string;
  status: Status;
  treeRevision: number;
}
export interface OrgUnit extends Metadata {
  organizationId: string;
  type: UnitType;
  parentId: string | null;
  ancestorIds: string[];
  code: string;
  name: string;
  status: Status;
  treeRevision: number;
}
export interface User extends Metadata {
  organizationId: string;
  identityIssuer: string;
  identitySubject: string;
  employeeId?: string;
  displayName: string;
  status: Status;
}
export interface Membership extends Metadata {
  organizationId: string;
  userId: string;
  orgUnitId: string;
  validFrom: Date;
  validTo: Date | null;
  primary: boolean;
}
export type NewRecord<T extends Metadata> = Omit<T, 'id'>;
/** Internal caller identity only; not a browser-supplied authorization claim. */
export interface ActorContext {
  actorId: string;
}
export class OrganizationError extends Error {
  constructor(
    public readonly code:
      | 'VALIDATION'
      | 'NOT_FOUND'
      | 'CROSS_ORGANIZATION'
      | 'INVALID_HIERARCHY'
      | 'CYCLE'
      | 'DUPLICATE'
      | 'STALE_REVISION'
      | 'MEMBERSHIP_OVERLAP'
      | 'HISTORY_CLOSED'
      | 'LIMIT_EXCEEDED'
      | 'DATABASE_UNAVAILABLE',
    message: string,
  ) {
    super(message);
  }
}
